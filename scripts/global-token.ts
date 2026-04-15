import { theme } from 'antd';

const { default: formatToken } = await import('antd/es/theme/util/alias');

// SeedToken > Derivative (algorithm) > AliasToken

console.log({
  default: formatToken(
    theme.getDesignToken({
      token: {},
      algorithm: theme.defaultAlgorithm
    })
  ),
  dark: formatToken(
    theme.getDesignToken({
      token: {},
      algorithm: theme.darkAlgorithm
    })
  ),
  compact: formatToken(
    theme.getDesignToken({
      token: {},
      algorithm: theme.compactAlgorithm
    })
  ),
});
