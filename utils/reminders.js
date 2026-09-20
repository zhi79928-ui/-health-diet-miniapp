const config = require('../config/reminders');
const cloudConfig = require('../config/cloud');
const { readCheckins } = require('./habits');
const KEY = 'reminderPreferenceV1';
function ready() { return !!config.enabled && !!config.templateId && !!cloudConfig.envId && !!wx.cloud && typeof wx.requestSubscribeMessage === 'function'; }
function preference() {
  const value = wx.getStorageSync(KEY);
  if (value === '' || value === undefined || value === null) return { time: '20:30' };
  if (!value || typeof value.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time) || (value.subscribed !== undefined && typeof value.subscribed !== 'boolean')) throw new Error('提醒偏好读取失败，请保留本机数据');
  return value;
}
function saveTime(time) {
  preference();
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('提醒时间无效');
  const next = { ...preference(), time }; wx.setStorageSync(KEY, next); return next;
}
async function call(action, data = {}) {
  if (!ready()) throw new Error('微信推送暂未开通，目前只保存时间偏好');
  const response = await wx.cloud.callFunction({ name: 'habitReminder', config: { env: cloudConfig.envId }, data: { action, ...data } });
  if (!response || !response.result || !response.result.ok) throw new Error('提醒服务暂不可用，请重试');
  return response.result;
}
async function syncCheckin(force = false) {
  if (!ready() || (!force && !preference().subscribed)) return;
  const date = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  if (readCheckins()[date]) await call('checkin', { date });
}
// 必须由用户点击直接触发系统订阅弹窗，不在页面打开时请求。
function subscribe(time) {
  if (!ready()) return Promise.reject(new Error('微信推送暂未开通，目前只保存时间偏好'));
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return Promise.reject(new Error('提醒时间无效'));
  return new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({ tmplIds: [config.templateId], success: async result => {
      if (result[config.templateId] !== 'accept') return reject(new Error('未同意订阅，不会新增提醒'));
      try {
        await syncCheckin(true);
        const result = await call('schedule', { time, templateId: config.templateId });
        wx.setStorageSync(KEY, { time, subscribed: true }); resolve(result);
      }
      catch (error) { reject(error); }
    }, fail: () => reject(new Error('订阅未完成，请检查微信设置后重试')) });
  });
}
async function cancel() {
  const result = await call('cancel'); wx.setStorageSync(KEY, { ...preference(), subscribed: false }); return result;
}
module.exports = { ready, preference, saveTime, subscribe, syncCheckin, status: () => call('status'), cancel };
