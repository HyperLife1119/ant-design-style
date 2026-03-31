import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider, theme } from 'antd';
import fs from 'fs-extra';
import path from 'path';
import * as postcss from 'postcss';
import DiscardDuplicatesPlugin from 'postcss-discard-duplicates';
import prettier from 'prettier';
import ReactDOMServer from 'react-dom/server';
import { generateCssinjs } from './generate-cssinjs';
import { RemoveRulePlugin } from './postcss';

const distDir = path.join('dist');
const componentDir = path.join(distDir, 'components');
const themeDir = path.join(distDir, 'theme');

fs.removeSync(distDir)

// copy reset style
fs.copySync(
  path.join('node_modules', 'antd', 'dist', 'reset.css'),
  path.join(distDir, 'reset.scss'),
)
// copy icon style
const { iconStyles } = await import('@ant-design/icons/es/utils')
fs.outputFile(
  path.join(componentDir, 'icon', 'style.scss'),
  await format(iconStyles)
)

const COMMON_STYLE_KEYS = ['Shared', 'ant-design-icons'];
const ATTR_CACHE_MAP = 'data-ant-cssinjs-cache-path';
const CSS_VAR_KEY = 'css-var-key'; // 这个 key class 主要是用来做多主题/局部主题样式隔离的，我们暂时不支持这个功能，生成样式后需要把这个 class 移除掉

function format(value: string) {
  return prettier.format(value, {
    parser: 'scss',
  })
}

async function processWithPostcss(css: string) {
  const result = await postcss.default([
    RemoveRulePlugin({ selector: `.${ATTR_CACHE_MAP}` }), // 移除 ant-cssinjs 的缓存路径样式
    DiscardDuplicatesPlugin(), // 样式去重
  ]).process(css, { from: undefined });

  return result.css
    .replaceAll(`.${CSS_VAR_KEY}`, '') // 移除 css 变量样式中的 key class
    .replaceAll('.root', ':root')
}

function isCommonStyleKey(key: string) {
  return COMMON_STYLE_KEYS.some((pattern) => key.includes(pattern));
}

function cloneCache(
  sourceCache: ReturnType<typeof createCache>,
  predicate: (key: string) => boolean,
) {
  const targetCache = createCache();

  for (const [key, value] of sourceCache.cache.entries()) {
    if (predicate(key)) {
      targetCache.cache.set(key, value);
    }
  }

  return targetCache;
}

// component style
await generateCssinjs({
  async render(Component: React.FC, componentName: string) {
    const cache = createCache();
    ReactDOMServer.renderToString(
      <StyleProvider cache={cache}>
        <ConfigProvider theme={{ cssVar: { key: CSS_VAR_KEY }, hashed: false }}>
          <Component />
        </ConfigProvider>
      </StyleProvider>,
    );

    const clonedCache = cloneCache(cache, (key) => !isCommonStyleKey(key));
    const style = extractStyle(clonedCache, { types: 'style', plain: true });
    const variable = extractStyle(clonedCache, { types: 'cssVar', plain: true });
    const stylePath = path.join(componentDir, componentName, `${componentName}.scss`);
    const variablePath = path.join(componentDir, componentName, 'theme', `default.scss`);
    fs.outputFile(stylePath, await format(await processWithPostcss(style)));
    fs.outputFile(variablePath, await format(await processWithPostcss(variable)));
  },
});
// component dark theme
await generateCssinjs({
  async render(Component: React.FC, componentName: string) {
    const cache = createCache();
    ReactDOMServer.renderToString(
      <StyleProvider cache={cache}>
        <ConfigProvider theme={{ cssVar: { key: CSS_VAR_KEY }, hashed: false, algorithm: theme.darkAlgorithm }}>
          <Component />
        </ConfigProvider>
      </StyleProvider>,
    );

    const clonedCache = cloneCache(cache, (key) => !isCommonStyleKey(key));
    const variable = extractStyle(clonedCache, { types: 'cssVar', plain: true });
    const variablePath = path.join(componentDir, componentName, 'theme', `dark.scss`);
    fs.outputFile(variablePath, await format(await processWithPostcss(variable)));
  },
});
// component compact theme
await generateCssinjs({
  async render(Component: React.FC, componentName: string) {
    const cache = createCache();
    ReactDOMServer.renderToString(
      <StyleProvider cache={cache}>
        <ConfigProvider theme={{ cssVar: { key: CSS_VAR_KEY }, hashed: false, algorithm: theme.compactAlgorithm }}>
          <Component />
        </ConfigProvider>
      </StyleProvider>,
    );

    const clonedCache = cloneCache(cache, (key) => !isCommonStyleKey(key));
    const variable = extractStyle(clonedCache, { types: 'cssVar', plain: true });
    const variablePath = path.join(componentDir, componentName, 'theme', `compact.scss`);
    fs.outputFile(variablePath, await format(await processWithPostcss(variable)));
  },
});
// common style
{
  const cache = createCache();
  await generateCssinjs({
    render(Component: React.FC) {
      ReactDOMServer.renderToString(
        <StyleProvider cache={cache}>
          <ConfigProvider theme={{ cssVar: true, hashed: false }}>
            <Component />
          </ConfigProvider>
        </StyleProvider>,
      );
    },
  });
  const clonedCache = cloneCache(cache, isCommonStyleKey);
  const style = extractStyle(clonedCache, { types: 'style', plain: true });
  const stylePath = path.join(distDir, `common.scss`);
  fs.outputFile(stylePath, await format(await processWithPostcss(style)));
}
// default theme
{
  const cache = createCache();
  await generateCssinjs({
    render(Component: React.FC) {
      ReactDOMServer.renderToString(
        <StyleProvider cache={cache}>
          <ConfigProvider theme={{ cssVar: { key: 'root' }, hashed: false }}>
            <Component />
          </ConfigProvider>
        </StyleProvider>,
      );
    },
  });
  const style = extractStyle(cache, { types: 'token', plain: true })
  const stylePath = path.join(themeDir, `default.scss`);
  fs.outputFile(stylePath, await format(await processWithPostcss(style)));
}
// dark theme
{
  const cache = createCache();
  await generateCssinjs({
    render(Component: React.FC) {
      ReactDOMServer.renderToString(
        <StyleProvider cache={cache}>
          <ConfigProvider theme={{ cssVar: { key: 'root' }, hashed: false, algorithm: theme.darkAlgorithm }}>
            <Component />
          </ConfigProvider>
        </StyleProvider>,
      );
    },
  });
  const style = extractStyle(cache, { types: 'token', plain: true })
  const stylePath = path.join(themeDir, `dark.scss`);
  fs.outputFile(stylePath, await format(await processWithPostcss(style)));
}
// compact theme
{
  const cache = createCache();
  await generateCssinjs({
    render(Component: React.FC) {
      ReactDOMServer.renderToString(
        <StyleProvider cache={cache}>
          <ConfigProvider theme={{ cssVar: { key: 'root' }, hashed: false, algorithm: theme.compactAlgorithm }}>
            <Component />
          </ConfigProvider>
        </StyleProvider>,
      );
    },
  });
  const style = extractStyle(cache, { types: 'token', plain: true })
  const stylePath = path.join(themeDir, `compact.scss`);
  fs.outputFile(stylePath, await format(await processWithPostcss(style)));
}

// TODO motion style

console.log(`✅  CSS-in-JS check passed.`);
