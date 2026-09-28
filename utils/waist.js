const { dateKey, validDate, weightTrend } = require('./tracker');
function entry(date, value, today = dateKey()) {
  if (!validDate(date) || date > today) throw new Error('请选择今天或之前的日期');
  const cm = Number(value);
  if (!Number.isFinite(cm) || cm < 30 || cm > 250) throw new Error('请输入 30～250 cm 的腰围');
  return { date, cm: Math.round(cm * 10) / 10 };
}
function read() {
  const rows = wx.getStorageSync('waistHistoryV1');
  if (!rows) return [];
  if (!Array.isArray(rows) || rows.some(row => !row || !validDate(row.date) || !Number.isFinite(row.cm) || row.cm < 30 || row.cm > 250)) throw new Error('本地腰围记录无法读取，请保留数据并反馈');
  return rows.slice().sort((a,b) => a.date.localeCompare(b.date));
}
function trend(rows, today) { return weightTrend(rows.map(row => ({ date: row.date, kg: row.cm })), today); }
module.exports = { entry, read, trend };
