const config = require('../config/cloud');
let profile = null, generation = 0;
function available() { return !!config.envId && typeof wx !== 'undefined' && !!wx.cloud && typeof wx.cloud.callFunction === 'function'; }
function current() { return profile; }
async function login(consent) {
  if (!consent) throw new Error('请先阅读并同意账号说明');
  if (!available()) throw new Error('账号服务暂未开放，可以继续免登录使用');
  const requestGeneration = ++generation;
  const response = await wx.cloud.callFunction({ name: 'accountLogin', config: { env: config.envId }, data: {} });
  if (requestGeneration !== generation) throw new Error('登录已取消，请重新操作');
  const result = response && response.result;
  if (!result || result.ok !== true || typeof result.accountId !== 'string' || !/^[a-f0-9]{24}$/.test(result.accountId)) throw new Error('微信身份验证失败，请稍后重试');
  profile = { accountId: result.accountId };
  return profile;
}
function logout() { generation++; profile = null; }
module.exports = { available, current, login, logout };
