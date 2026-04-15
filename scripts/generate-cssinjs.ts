import { globSync } from 'glob';
import url from 'node:url';
import path from 'path';
import React from 'react';

type UseStyleFn = (prefixCls: string, rootCls?: string) => [
  wrapCSSVar: (node: React.ReactElement) => React.ReactElement,
  hashId: string,
  cssVarCls: string
];

interface GenCssinjsOptions {
  prefix?: string;
  render: (Component: React.FC, componentName: string) => void;
}

const styleFiles = globSync(
  path
    .join(
      process.cwd(),
      // auto-complete 用的是 select 的样式
      // col/row 的样式在 grid 目录下
      // time-picker 的样式在 date-picker 目录下
      // qrcode 的样式在 qr-code 目录下
      'node_modules/antd/lib/!(config-provider|icon|auto-complete|col|row|time-picker|qrcode)/style/index.js',
    )
    .replaceAll(path.sep, '/')
);

// componentName => styleFilePath
const styleFileMap = new Map<string, string>(
  [
    ...styleFiles.map((file) => {
      const pathArr = file.split(path.sep);
      let styleIndex = pathArr.lastIndexOf('style')
      const componentName = pathArr[styleIndex - 1]!;
      return [componentName, file] as const;
    }),
    // 特例处理一些组件样式文件不在 style 目录下的情况
    [
      'wave',
      path.join('node_modules', 'antd', 'lib', '_util', 'wave', 'style.js')
    ]
  ]
);

export const generateCssinjs = ({ prefix, render }: GenCssinjsOptions) => {
  prefix ??= 'ant';

  return Promise.all(
    styleFileMap.entries().map(async ([componentName, file]) => {
      const absPath = url.pathToFileURL(file).href;
      let useStyle: UseStyleFn

      if (file.includes('grid')) {
        const { useColStyle, useRowStyle } = await import(absPath);
        useStyle = (prefixCls) => {
          const rowPrefixCls = prefixCls.replace('grid', 'row');
          const colPrefixCls = prefixCls.replace('grid', 'col');
          const [wrapRowCSSVar] = useRowStyle(rowPrefixCls, useCSSVarCls(rowPrefixCls));
          const [wrapColCSSVar] = useColStyle(colPrefixCls, useCSSVarCls(colPrefixCls));
          return [
            (node: React.ReactElement) => {
              wrapRowCSSVar(node);
              wrapColCSSVar(node);
              return node
            },
            'hashId',
            'cssVarCls',
          ]
        };
      } else if (file.includes('button')) {
        const originalUseStyle = (await import(absPath)).default;
        useStyle = (prefixCls) => {
          prefixCls = prefixCls.replace('button', 'btn')
          return originalUseStyle(prefixCls);
        }
      } else if (file.includes('/input/')) {
        const { default: originalUseStyle, useSharedStyle } = await import(absPath);
        const useTextareaStyle = (await import(absPath.replace('index.js', 'textarea.js'))).default;
        const useOtpStyle = (await import(absPath.replace('index.js', 'otp.js'))).default;
        useStyle = (prefixCls, rootCls) => {
          const [wrapInputSharedCSSVar] = useSharedStyle(prefixCls, rootCls);
          const [wrapTextareaCSSVar] = useTextareaStyle(prefixCls, rootCls);
          const [wrapOtpCSSVar] = useOtpStyle(prefixCls, rootCls);
          const [wrapInputCSSVar] = originalUseStyle(prefixCls, rootCls);

          return [
            (node: React.ReactElement) => {
              wrapInputSharedCSSVar(node);
              wrapTextareaCSSVar(node);
              wrapOtpCSSVar(node);
              return wrapInputCSSVar(node);
            },
            'hashId',
            'cssVarCls',
          ]
        }
      } else if (file.includes('tree-select')) {
        const originalUseStyle = (await import(absPath)).default;
        useStyle = (prefixCls) =>
          originalUseStyle(prefixCls, `${prefixCls}-select-tree`, useCSSVarCls(prefixCls));
      } else {
        useStyle = (await import(absPath)).default;
      }

      const Demo: React.FC = () => {
        const prefixCls = `${prefix}-${componentName}`;
        const rootCls = useCSSVarCls(prefixCls);
        // TODO 不是所有组件都需要设置 rootCls，像 button 就不需要，但为了简化处理，暂时统一设置了，后续可以根据需要调整
        const [wrapCSSVar] = useStyle(prefixCls, rootCls);
        const node = React.createElement('div');

        return wrapCSSVar(node);
      };

      render(Demo, componentName);
    }),
  );
}

function useCSSVarCls(prefixCls: string) {
  return `${prefixCls}-css-var`;
}
