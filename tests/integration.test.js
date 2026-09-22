// Event integration with mocked WeChat APIs, not a native rendering test.
const assert = require('assert');
const { dateKey, previousDate } = require('../utils/tracker');
const storage = {};
let definition, lastToast, clipboard, tab, failWrite = false;
global.Page = value => { definition = value; };
global.wx = {
  getStorageSync: key => storage[key],
  setStorageSync: (key, value) => { if (failWrite) throw new Error('storage unavailable'); storage[key] = JSON.parse(JSON.stringify(value)); },
  removeStorageSync: key => { delete storage[key]; },
  nextTick: fn => fn(), pageScrollTo: () => {},
  showToast: value => { lastToast = value.title; },
  switchTab: ({ url }) => { tab = url; },
  setClipboardData: ({ data }) => { clipboard = data; }
};
function page(path) {
  delete require.cache[require.resolve(path)]; require(path);
  return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(patch) {
    Object.keys(patch).forEach(key => { const parts = key.split('.'); let target = this.data; parts.slice(0, -1).forEach(part => { target = target[part]; }); target[parts[parts.length - 1]] = patch[key]; });
  } };
}
const ev = value => ({ detail: { value } });
const tap = dataset => ({ currentTarget: { dataset } });
const plan = page('../pages/index/index'); plan.onLoad();
assert.strictEqual(plan.data.form.heightCm, '');
plan.setData({ form: { heightCm: '180', weight: '180', age: '30' } }); plan.calculate();
assert.strictEqual(plan.data.result.goal.key, 'lose');
plan.onGoalChange(ev('2')); assert.strictEqual(plan.data.result, null); plan.calculate();
assert.strictEqual(plan.data.result.goal.key, 'maintain');
assert.strictEqual(storage.healthForm.goalIndex, 2);
plan.setChickenMode(tap({ mode: 'cooked' }));
assert.ok(plan.data.result.meals[1].foods.some(food => food.id === 'chickenCooked'));
plan.saveTodayPlan(); assert.strictEqual(tab, '/pages/today/index');
const today = page('../pages/today/index'); today.onShow();
assert.strictEqual(today.data.day.completed, 0);
today.toggleMeal(tap({ meal: '0' })); assert.strictEqual(today.data.day.completed, 1);
const breakfast = JSON.stringify(today.data.day.meals[0]);
plan.onGoalChange(ev('3')); plan.calculate(); plan.saveTodayPlan(); today.onShow();
assert.strictEqual(JSON.stringify(today.data.day.meals[0]), breakfast);
today.openEditor(tap({ meal: '0', food: '0' })); assert.ok(lastToast.includes('取消记录'));
today.openEditor(tap({ meal: '1', food: '1' })); today.onSwapMode(ev('0'));
today.onSwapFood(ev(String(today.data.foodOptions.findIndex(item => item.id === 'beefCooked'))));
assert.ok(today.data.editor.preview && !today.data.editor.error);
today.applyEditor(); assert.strictEqual(today.data.day.meals[1].foods[1].id, 'beefCooked');
today.openEditor(tap({ meal: '1', food: '1' })); today.onSwapGrams(ev(''));
assert.strictEqual(today.data.editor.preview, null);
const beforeInvalid = JSON.stringify(storage.nutritionDaysV1);
today.applyEditor(); assert.strictEqual(JSON.stringify(storage.nutritionDaysV1), beforeInvalid);
today.onSwapGrams(ev('200')); failWrite = true; today.applyEditor();
assert.strictEqual(JSON.stringify(storage.nutritionDaysV1), beforeInvalid);
assert.ok(today.data.editor); failWrite = false; today.applyEditor();
assert.strictEqual(today.data.day.meals[1].foods[1].grams, 200);
today.toggleMeal(tap({ meal: '1' })); assert.strictEqual(today.data.day.completed, 2);
const reopened = page('../pages/today/index'); reopened.onShow(); assert.strictEqual(reopened.data.day.completed, 2);
const yesterday = previousDate(dateKey());
today.onDateChange(ev(yesterday)); assert.strictEqual(today.data.day, null);
today.onDateChange(ev(dateKey())); assert.strictEqual(today.data.day.completed, 2);
today.setData({ today: yesterday, selectedDate: yesterday }); today.toggleMeal(tap({ meal: '0' }));
assert.ok(lastToast.includes('日期已更新')); assert.strictEqual(today.data.day.completed, 2);
plan.reset(); assert.ok(storage.nutritionDaysV1[dateKey()]);
storage.healthForm = { form: { heightCm: '180', weight: '180', age: '30' }, sexIndex: 99, activityIndex: -1 };
plan.onLoad(); assert.strictEqual(plan.data.goalIndex, 0); assert.strictEqual(plan.data.sexIndex, 0); assert.strictEqual(plan.data.activityIndex, 2);
const foods = page('../pages/foods/index'); foods.onLoad();
for (let i = 0; i < foods.data.presetMeatCount; i++) {
  foods.onMeatChange(ev(String(i))); const selected = foods.data.meatOptions[i];
  for (const state of ['raw', 'cooked']) {
    const row = foods.data.meatBasis[state]; assert.strictEqual(row ? row.id : null, selected[state + 'Id']);
    if (row) { foods.copyFoodSource(tap({ id: row.id })); assert.ok(clipboard.includes(row.sourceId)); }
  }
}
foods.onMeatSearch(ev('鸭胸')); assert.strictEqual(foods.data.meatOptions.length, 0); assert.strictEqual(foods.data.meatResult, null);
foods.onMeatSearch(ev('鸡腿')); assert.ok(foods.data.meatResult);
assert.ok(!foods.data.meatOptions.some(item => item.id === 'custom'));
// Historical custom references stay readable, with no new packaging form.
storage.customMeatsV1 = [{ id: 'custom-duck', form: { name: '鸭胸', rawProtein: '20', rawCalories: '100', cookedProtein: '', cookedCalories: '', cookedLabel: '', source: '', energyUnit: 'kcal' } }];
const foodReload = page('../pages/foods/index'); foodReload.onLoad(); foodReload.onMeatSearch(ev('鸭胸'));
assert.strictEqual(foodReload.data.meatResult.raw.protein, 20);
const progress = page('../pages/progress/index'); progress.onShow(); progress.onWeightInput(ev('77')); progress.onUnitChange(ev('1'));
assert.strictEqual(progress.data.weight, '154'); progress.saveWeight(); assert.strictEqual(storage.weightHistoryV1[0].kg, 77);
progress.onWeightInput(ev('152')); progress.saveWeight(); assert.strictEqual(storage.weightHistoryV1.length, 1); assert.strictEqual(progress.data.trend.latest, 76);
progress.onDateChange(ev(yesterday)); progress.onWeightInput(ev('154')); progress.saveWeight(); assert.strictEqual(storage.weightHistoryV1.length, 2);
assert.strictEqual(progress.data.trend.weekAverage, 76.5); assert.strictEqual(progress.data.trend.change, -1);
assert.strictEqual(progress.data.dayRows[0].completed, 2);
const weightBefore = JSON.stringify(storage.weightHistoryV1); failWrite = true; progress.saveWeight(); failWrite = false;
assert.strictEqual(JSON.stringify(storage.weightHistoryV1), weightBefore); assert.ok(progress.data.message.includes('unavailable'));
progress.editWeight(tap({ date: yesterday })); assert.strictEqual(progress.data.unitIndex, 0); assert.strictEqual(progress.data.weight, '77');
progress.deleteWeight(tap({ date: yesterday })); assert.strictEqual(storage.weightHistoryV1.length, 1);
storage.nutritionDaysV1 = 'bad'; reopened.onShow(); assert.ok(reopened.data.error); assert.strictEqual(storage.nutritionDaysV1, 'bad');
console.log('Four-page integration: goals, save, swaps, logs, reload, custom foods, weights, storage failures and rollover passed.');
