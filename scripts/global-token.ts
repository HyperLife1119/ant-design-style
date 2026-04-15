import { theme } from 'antd';

const { default: formatToken } = await import('antd/es/theme/util/alias');

// SeedToken > Derivative (algorithm) > AliasToken

console.log({
  default: formatToken(theme.defaultAlgorithm(theme.defaultSeed)),
  dark: formatToken(theme.darkAlgorithm(theme.defaultSeed)),
  compact: formatToken(theme.compactAlgorithm(theme.defaultSeed)),
});
