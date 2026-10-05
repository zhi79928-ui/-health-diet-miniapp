const assert = require('assert');
const { FOODS, foodPortion } = require('../utils/foods');
const { portionAlerts, mealAlerts, dayAlerts } = require('../utils/nutrition-alerts');

assert.ok(portionAlerts(foodPortion('oil', 80)).some(row => row.includes('食用油')));
assert.ok(portionAlerts(foodPortion('oats', 350)).some(row => row.includes('干重')));
assert.equal(portionAlerts(foodPortion('rice', 200)).length, 0);
assert.ok(mealAlerts({ calories: 1700, fat: 20, foods: [] }).some(row => row.includes('1600')));
assert.ok(dayAlerts({ completed: 3, diaryOnly: false, target: { calories: 2000, fat: 60 }, consumed: { calories: 2500, fat: 50, fiber: 10, fiberMissing: 0 } }).length >= 2);

const pairs = new Set();
for (const [id, food] of Object.entries(FOODS)) {
  assert.ok(Number.isFinite(food.fiber) && food.fiber >= 0, `${id} has dietary fiber`);
  assert.ok(food.sourceId && food.sourceLabel && food.sourceUrl && food.sourceDescription, `${id} has normalized source metadata`);
  assert.ok(['raw', 'cooked', 'ready'].includes(food.measurement), `${id} has measurement type`);
  const key = `${food.name}|${food.state}`;
  assert.ok(!pairs.has(key), `duplicate food/state: ${key}`); pairs.add(key);
}
console.log('Nutrition alerts and normalized food metadata passed.');
