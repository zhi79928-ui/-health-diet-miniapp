const crypto = require('crypto');
const chinaDate = now => new Date(now + 8 * 3600000).toISOString().slice(0, 10);
function ownerId(openid, appid) { return crypto.createHash('sha256').update(appid + ':' + openid).digest('hex'); }
function nextSlot(time, now, checkedToday) {
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('提醒时间无效');
  let date = chinaDate(now), dueAt = Date.parse(`${date}T${time}:00+08:00`);
  if (dueAt <= now || checkedToday) { dueAt += 86400000; date = chinaDate(dueAt); }
  return { date, dueAt, time };
}
function decision(job, now, checked) {
  if (job.status !== 'pending' || job.dueAt > now) return 'wait';
  if (job.date !== chinaDate(now)) return 'expired';
  return checked ? 'skipped' : 'send';
}
function messageData(json, now) {
  const spec = JSON.parse(json || '{}');
  if (!spec || Array.isArray(spec) || !Object.keys(spec).length) throw new Error('未配置订阅模板字段');
  const date = chinaDate(now), time = new Date(now + 8 * 3600000).toISOString().slice(11, 16);
  const result = {};
  Object.keys(spec).forEach(key => {
    if (!/^(thing|time|date|phrase|character_string)\d+$/.test(key) || typeof spec[key] !== 'string') throw new Error('模板字段配置不正确');
    const value = spec[key].replace(/\{date\}/g, date).replace(/\{time\}/g, `${date} ${time}`);
    if (!value || (key.startsWith('thing') && value.length > 20) || (key.startsWith('phrase') && value.length > 5)) throw new Error('模板文案长度不正确');
    result[key] = { value };
  });
  return result;
}
module.exports = { chinaDate, ownerId, nextSlot, decision, messageData };
