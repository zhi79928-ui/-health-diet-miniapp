const KEYS = [
  'healthForm',
  'nutritionDaysV1',
  'weightHistoryV1',
  'waistHistoryV1',
  'habitCheckinsV1',
  'customMeatsV1',
  'favoriteMealsV1'
];
const MAX_BYTES = 800 * 1024;
const ARRAY_KEYS = new Set(['weightHistoryV1', 'waistHistoryV1', 'customMeatsV1', 'favoriteMealsV1']);

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

// Store the confirmed snapshot, not a timestamp alone: edits made during upload remain pending.
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function remember(accountId, updatedAt, payload) {
  try { wx.setStorageSync('backupCheckpointV1', { accountId, updatedAt, snapshot: canonical(payload) }); return true; }
  catch (_) { return false; }
}
function status(accountId, meta) {
  if (!meta) return '本机记录尚未备份到当前账号。';
  try {
    const saved = wx.getStorageSync('backupCheckpointV1');
    if (!saved || saved.accountId !== accountId || saved.updatedAt !== meta.updatedAt) return '云端已有备份；尚未确认与本机记录是否一致。';
    return saved.snapshot === canonical(collect()) ? '本机记录与最近备份一致。' : '本机有新记录或修改尚未备份。';
  } catch (_) { return '暂时无法比较备份，请保留本机记录。'; }
}
module.exports = { KEYS, collect, restore, remember, status };
