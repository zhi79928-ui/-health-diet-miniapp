const { dateKey, validDate, previousDate, readDays, readWeights } = require('./tracker');
const KEY = 'habitCheckinsV1';
function readCheckins() {
  const value = wx.getStorageSync(KEY);
  if (value === '' || value === undefined || value === null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('打卡记录异常，请保留本地数据');
  Object.keys(value).forEach(date => {
    const row = value[date];
    if (!validDate(date) || !row || !Number.isInteger(row.meals) || row.meals < 0 || row.meals > 4 || typeof row.weight !== 'boolean' || (!row.meals && !row.weight)) throw new Error('打卡记录异常，请保留本地数据');
  });
  return value;
}
function evidence(today = dateKey()) {
  const day = readDays()[today];
  return { meals: day ? day.meals.filter(meal => meal.logged).length : 0, weight: readWeights().some(row => row.date === today) };
}
function checkIn(expectedDate) {
  const today = dateKey();
  if (expectedDate !== today) throw new Error('日期已更新，请回到今天重新打卡');
  const records = readCheckins();
  if (records[today]) return records;
  const row = evidence(today);
  if (!row.meals && !row.weight) throw new Error('先记录一餐或保存今天的体重，再来打卡');
  const next = { ...records, [today]: row };
  wx.setStorageSync(KEY, next);
  return next;
}
function statistics(records, today = dateKey()) {
  const dates = Object.keys(records).filter(date => date <= today).sort();
  let run = 0, longest = 0, last = '';
  dates.forEach(date => { run = previousDate(date) === last ? run + 1 : 1; longest = Math.max(longest, run); last = date; });
  let cursor = records[today] ? today : previousDate(today), streak = 0;
  while (records[cursor]) { streak++; cursor = previousDate(cursor); }
  const total = dates.length;
  return { total, streak, longest, done: !!records[today], badges: [3, 7, 14, 30].map(days => ({ days, earned: total >= days })) };
}
function monthCells(month, records, today = dateKey()) {
  if (!validDate(`${month}-01`)) throw new Error('无效月份');
  const [year, m] = month.split('-').map(Number);
  const first = new Date(year, m - 1, 1).getDay();
  const count = new Date(year, m, 0).getDate();
  const cells = Array.from({ length: first }, (_, i) => ({ key: `empty-${i}`, blank: true }));
  for (let n = 1; n <= count; n++) {
    const date = `${month}-${String(n).padStart(2, '0')}`;
    cells.push({ key: date, date, n, done: date <= today && !!records[date], today: date === today, future: date > today });
  }
  return cells;
}
module.exports = { readCheckins, evidence, checkIn, statistics, monthCells };
