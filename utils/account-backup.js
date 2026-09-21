const KEYS = [
  'healthForm',
  'nutritionDaysV1',
  'weightHistoryV1',
  'habitCheckinsV1',
  'customMeatsV1',
  'favoriteMealsV1'
];
const MAX_BYTES = 800 * 1024;
const ARRAY_KEYS = new Set(['weightHistoryV1', 'customMeatsV1', 'favoriteMealsV1']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function byteLength(value) { return encodeURIComponent(value).replace(/%[0-9A-F]{2}/gi, 'x').length; }

function collect() {
  const data = {};
  KEYS.forEach(key => {
    const value = wx.getStorageSync(key);
    if (value !== undefined && value !== null && value !== '') {
      const valid = ARRAY_KEYS.has(key) ? Array.isArray(value) : typeof value === 'object' && !Array.isArray(value);
      if (!valid) throw new Error('本机记录格式异常，请先检查记录页面');
      data[key] = clone(value);
    }
  });
  const bytes = byteLength(JSON.stringify(data));
  if (bytes > MAX_BYTES) throw new Error('本机记录过多，暂时无法备份');
  return { version: 1, data };
}

function restore(backup) {
  if (!backup || backup.version !== 1 || !backup.data || Array.isArray(backup.data) || typeof backup.data !== 'object') throw new Error('云端备份格式无效');
  const unexpected = Object.keys(backup.data).filter(key => !KEYS.includes(key));
  if (unexpected.length || byteLength(JSON.stringify(backup.data)) > MAX_BYTES) throw new Error('云端备份格式无效');
  Object.keys(backup.data).forEach(key => {
    const value = backup.data[key], valid = ARRAY_KEYS.has(key) ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value);
    if (!valid) throw new Error('云端备份格式无效');
  });
  const previous = {};
  KEYS.forEach(key => { previous[key] = wx.getStorageSync(key); });
  try {
    KEYS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(backup.data, key)) wx.setStorageSync(key, clone(backup.data[key]));
      else wx.removeStorageSync(key);
    });
  } catch (error) {
    KEYS.forEach(key => {
      if (previous[key] === undefined || previous[key] === null || previous[key] === '') wx.removeStorageSync(key);
      else wx.setStorageSync(key, previous[key]);
    });
    throw error;
  }
}

module.exports = { KEYS, collect, restore };
