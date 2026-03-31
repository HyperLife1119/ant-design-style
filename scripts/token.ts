import { theme } from 'antd';

const { initComponentToken } = await import('antd/es/input/style/token');
console.log(initComponentToken(theme.getDesignToken({
  token: { colorPrimary: '#eb2f96', },
  algorithm: theme.defaultAlgorithm
})));
