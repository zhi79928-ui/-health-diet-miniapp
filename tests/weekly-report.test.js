const assert = require('assert');
const fs = require('fs');
let storage = {};
global.wx = { getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; }, switchTab() {}, pageScrollTo() {} };
const tracker = require('../utils/tracker');
const weekly = require('../utils/weekly-report');
const { foodPortion } = require('../utils/foods');

function recordedDay(date, meals, food = 'oats') {
  const day = tracker.createDiary(date);
  for (let index = 0; index < meals; index++) {
    day.meals[index].foods = [foodPortion(food, 100 + index * 10)];
    day.meals[index].logged = true;
  }
  return tracker.refreshDay(day);
}

assert.deepStrictEqual(weekly.periodDates('2026-09-30'), {
  start: '2026-09-24', end: '2026-09-30', previousStart: '2026-09-17', previousEnd: '2026-09-23'
});
assert.equal(weekly.moveDate('2026-03-01', -1), '2026-02-28');
assert.equal(weekly.moveDate('2024-02-28', 1), '2024-02-29');
assert.throws(() => weekly.moveDate('2026-02-30', 1));

const days = {
  '2026-09-17': recordedDay('2026-09-17', 1),
  '2026-09-22': recordedDay('2026-09-22', 4),
  '2026-09-24': recordedDay('2026-09-24', 2),
  '2026-09-28': recordedDay('2026-09-28', 4),
  // Existing plan with no recorded meal must not count as a recorded day or zero intake.
  '2026-09-30': tracker.createDiary('2026-09-30')
};
const weights = [
  { date: '2026-09-18', kg: 80 }, { date: '2026-09-23', kg: 78 },
  { date: '2026-09-25', kg: 77 }, { date: '2026-09-29', kg: 76 }
];
const waists = [{ date: '2026-09-20', cm: 86 }, { date: '2026-09-27', cm: 84 }];
const report = weekly.build(days, weights, waists, '2026-09-30');
assert.equal(report.current.recordedDays, 2);
assert.equal(report.current.meals, 6);
assert.equal(report.current.completeDays, 1);
assert.deepStrictEqual(report.current.dates.map(row => row.meals), [2,0,0,0,4,0,0]);
assert.equal(report.previous.recordedDays, 2);
assert.equal(report.previous.meals, 5);
const currentCalories = (days['2026-09-24'].consumed.calories + days['2026-09-28'].consumed.calories) / 2;
assert.equal(report.nutrition.calories.current, Math.round(currentCalories * 10) / 10);
assert.notEqual(report.nutrition.calories.current, Math.round(currentCalories / 7 * 10) / 10);
assert.deepStrictEqual(report.weight.current, { count: 2, average: 76.5, latest: 76, latestDate: '2026-09-29' });
assert.deepStrictEqual(report.weight.previous, { count: 2, average: 79, latest: 78, latestDate: '2026-09-23' });
assert.equal(report.weight.difference, -2.5);
assert.equal(report.waist.difference, -2);

const empty = weekly.build({}, [], [], '2026-09-30');
assert.equal(empty.current.recordedDays, 0);
assert.equal(empty.nutrition.protein.current, null);
assert.equal(empty.weight.difference, null);

storage = { nutritionDaysV1: days, weightHistoryV1: weights, waistHistoryV1: waists };
let definition;
global.Page = value => { definition = value; };
require('../pages/report/index');
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(value) { Object.assign(this.data, value); } };
const originalDateKey = tracker.dateKey;
// Page rendering itself is covered without relying on the machine's current date.
page.loadReport();
assert.ok(page.data.report && page.data.nutrientRows.length === 5 && page.data.bodyRows.length === 2);
const firstEnd = page.data.report.end;
page.changePeriod({ currentTarget: { dataset: { step: -1 } } });
assert.equal(page.data.offset, -1);
assert.equal(page.data.report.end, weekly.moveDate(firstEnd, -7));
page.changePeriod({ currentTarget: { dataset: { step: 1 } } });
assert.equal(page.data.offset, 0);
page.changePeriod({ currentTarget: { dataset: { step: 1 } } });
assert.equal(page.data.offset, 0);
assert.equal(originalDateKey, tracker.dateKey);
const app = JSON.parse(fs.readFileSync(require.resolve('../app.json'), 'utf8'));
assert.ok(app.pages.includes('pages/report/index'));
const reportWxml = fs.readFileSync(require.resolve('../pages/report/index.wxml'), 'utf8');
const progressWxml = fs.readFileSync(require.resolve('../pages/progress/index.wxml'), 'utf8');
assert.match(reportWxml, /bindtap="changePeriod"/);
assert.match(reportWxml, /未记录日期不会补成 0/);
assert.match(progressWxml, /bindtap="goReport"/);
for (const method of ['changePeriod','goToday','goProgress']) assert.equal(typeof definition[method], 'function');
console.log('weekly report: complete periods, sparse records, comparisons and navigation passed');
