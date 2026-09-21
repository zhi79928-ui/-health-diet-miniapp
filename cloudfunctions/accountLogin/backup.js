const ALLOWED_KEYS = new Set([
  'healthForm',
  'nutritionDaysV1',
  'weightHistoryV1',
  'habitCheckinsV1',
  'customMeatsV1',
  'favoriteMealsV1'
]);
const MAX_BYTES = 800 * 1024;
const ARRAY_KEYS = new Set(['weightHistoryV1', 'customMeatsV1', 'favoriteMealsV1']);

function validateBackup(backup) {
  if (!backup || backup.version !== 1 || !backup.data || Array.isArray(backup.data) || typeof backup.data !== 'object') throw new Error('备份格式无效');
  if (Object.keys(backup.data).some(key => !ALLOWED_KEYS.has(key))) throw new Error('备份包含未知数据');
  Object.keys(backup.data).forEach(key => {
    const value = backup.data[key], valid = ARRAY_KEYS.has(key) ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value);
    if (!valid) throw new Error('备份格式无效');
  });
  const serialized = JSON.stringify(backup);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) throw new Error('备份数据过大');
  return JSON.parse(serialized);
}

module.exports = { validateBackup };
