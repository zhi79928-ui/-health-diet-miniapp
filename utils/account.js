const config = require('../config/cloud');
const PROFILE_KEY = 'accountProfileV1';
let profile = null, generation = 0;
function available() { return !!config.envId && typeof wx !== 'undefined' && !!wx.cloud && typeof wx.cloud.callFunction === 'function'; }
function valid(value) { return value && typeof value.accountId === 'string' && /^[a-f0-9]{24}$/.test(value.accountId); }
function current() {
  if (valid(profile)) return profile;
  const stored = typeof wx !== 'undefined' && wx.getStorageSync ? wx.getStorageSync(PROFILE_KEY) : null;
  profile = valid(stored) ? { accountId: stored.accountId } : null;
  return profile;
}
async function call(action, data = {}) {
  if (!available()) throw new Error('账号服务暂未开放，可以继续免登录使用');
  const response = await wx.cloud.callFunction({ name: 'accountLogin', config: { env: config.envId }, data: { action, ...data } });
  const result = response && response.result;
  if (!result || result.ok !== true || !valid(result)) throw new Error('微信身份验证失败，请稍后重试');
  const session = current();
  if (action !== 'login' && (!session || result.accountId !== session.accountId)) {
    logout();
    throw new Error('微信账号已变更，请重新登录');
  }
  return result;
}
async function login(consent) {
  if (!consent) throw new Error('请先阅读并同意账号说明');
  if (!available()) throw new Error('账号服务暂未开放，可以继续免登录使用');
  const requestGeneration = ++generation;
  const result = await call('login');
  if (requestGeneration !== generation) throw new Error('登录已取消，请重新操作');
  profile = { accountId: result.accountId };
  wx.setStorageSync(PROFILE_KEY, profile);
  return profile;
}
async function backup(payload) { if (!current()) throw new Error('请先登录'); return call('backup', { backup: payload }); }
async function backupStatus() { if (!current()) throw new Error('请先登录'); return call('status'); }
async function restore() { if (!current()) throw new Error('请先登录'); return call('restore'); }
async function deleteBackup() { if (!current()) throw new Error('请先登录'); return call('deleteBackup'); }
function logout() { generation++; profile = null; if (typeof wx !== 'undefined' && wx.removeStorageSync) wx.removeStorageSync(PROFILE_KEY); }
module.exports = { available, current, login, logout, backup, backupStatus, restore, deleteBackup };
