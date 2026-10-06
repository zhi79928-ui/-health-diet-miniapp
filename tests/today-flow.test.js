const assert = require('assert');
const tracker = require('../utils/tracker');
let storage = {}, definition, fail = false, destination;
global.wx = {
  getStorageSync: key => storage[key],
  setStorageSync(key, value) { if (fail) throw new Error('full'); storage[key] = JSON.parse(JSON.stringify(value)); },
  showToast() {}, pageScrollTo(value) { destination = value.selector; }, switchTab() {}
};
global.Page = value => { definition = value; };
require('../pages/today/index');
function page() { return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(value) { Object.assign(this.data, value); } }; }
const tap = meal => ({ currentTarget: { dataset: { meal } } });
let screen = page(); screen.onShow(); assert.equal(screen.data.guideOpen, true);
screen.closeGuide(); screen = page(); screen.onShow(); assert.equal(screen.data.guideOpen, false);
screen.openGuide(); assert.equal(screen.data.guideOpen, true);
screen.persist(tracker.addFood(tracker.createDiary(tracker.dateKey()), 0, 'oats', 60));
fail = true; screen.toggleMeal(tap(0)); assert.equal(screen.data.day.completed, 0); assert.equal(screen.data.mealFeedback, '');
fail = false; screen.toggleMeal(tap(0)); assert.equal(screen.data.day.completed, 1);
assert.equal(screen.data.habit.done, false); assert.match(screen.data.mealFeedback, /现在可以完成今日打卡/);
screen.goCheckin(); assert.equal(destination, '#daily-checkin');
screen.jumpMeal(tap(0)); assert.equal(destination, '#meal-0');
assert.equal(screen.data.expandedMeal, 0); screen.toggleMealDetails(tap(0)); assert.equal(screen.data.expandedMeal, -1);
screen.jumpMeal(tap('bad')); assert.equal(destination, '#meal-0');
screen.completeCheckin(); assert.equal(screen.data.habit.done, true);
screen.toggleMeal(tap(0)); assert.match(screen.data.mealFeedback, /已取消/);
const yesterday = tracker.previousDate(tracker.dateKey());
screen.loadDay(yesterday); screen.persist(tracker.addFood(tracker.createDiary(yesterday), 0, 'oats', 60));
screen.toggleMeal(tap(0)); assert.match(screen.data.mealFeedback, /历史餐次不会计入今日打卡/);
assert.equal(screen.data.tasks.meals, 0);
console.log('Today flow: guide persistence, failed save, meal feedback, explicit check-in and historical dates passed.');
