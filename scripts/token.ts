import { theme } from 'antd';

const { initComponentToken } = await import('antd/es/input/style/token');
const { prepareComponentToken } = await import('antd/es/button/style/token');

const designToken = theme.getDesignToken({
  token: { colorPrimary: '#eb2f96', },
  algorithm: theme.defaultAlgorithm
})

console.log(initComponentToken(designToken));
console.log(prepareComponentToken(designToken));
