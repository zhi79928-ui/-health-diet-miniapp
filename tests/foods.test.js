const assert = require('assert');
const { FOODS, MEAT_OPTIONS, foodPortion, meatReference, chickenReference, buildFoodPlan } = require('../utils/foods');
const { calculateProfile } = require('../utils/health');
const round1 = n => Math.round((n + Number.EPSILON) * 10) / 10;

assert.strictEqual(chickenReference(100).raw.protein, 22.5);
assert.strictEqual(chickenReference(100).cooked.protein, 31);
assert.strictEqual(chickenReference(200).raw.protein, 45);
assert.strictEqual(chickenReference(200).cooked.protein, 62);
assert.strictEqual(chickenReference(150).raw.protein, 33.8);
assert.strictEqual(chickenReference(150).cooked.protein, 46.5);
assert.strictEqual(chickenReference('125.5').raw.protein, 28.2);
assert.strictEqual(foodPortion('rice', 200).carbs, 56.4);
assert.strictEqual(foodPortion('oil', 10).calories, 88.4);
for (const bad of ['', ' ', 0, -1, 'abc', NaN, Infinity, 2001]) {
  assert.throws(() => chickenReference(bad), /克数/);
}
assert.throws(() => foodPortion('toString', 100), /食物/);
assert.throws(() => meatReference('unknown', 100), /肉类/);
assert.throws(() => meatReference('toString', 100), /肉类/);
// Independently specified examples for the four food/state pairs.
const expected = [
  ['chicken', 45, 62, 240, 330],
  ['beef', 45, 58.4, 284, 382],
  ['pork', 33.8, 51.4, 526, 594],
  ['cod', 35.6, 45.6, 164, 210]
];
assert.deepStrictEqual(MEAT_OPTIONS.map(item => item.id), expected.map(item => item[0]));
expected.forEach(([id, rawProtein, cookedProtein, rawCalories, cookedCalories]) => {
  const value = meatReference(id, 200);
  assert.deepStrictEqual([value.raw.protein, value.cooked.protein, value.raw.calories, value.cooked.calories], [rawProtein, cookedProtein, rawCalories, cookedCalories]);
  for (const bad of ['', ' ', 0, -1, 'abc', NaN, Infinity, 2001]) assert.throws(() => meatReference(id, bad), /克数/);
});
assert.strictEqual(meatReference('cod', '125.5').cooked.protein, 28.6);

const example = { heightCm: 180, weight: 180, weightUnit: 'jin', age: 30, sex: 'male', activityLevel: 'moderate' };
for (const mode of ['raw', 'cooked']) {
  for (const input of [example, { ...example, heightCm: 165, weight: 110, sex: 'female', activityLevel: 'sedentary' }, { ...example, weight: 154, heightCm: 183 }]) {
    const result = calculateProfile({ ...input, chickenMode: mode });
    assert.strictEqual(result.meals.length, 4);
    for (const meal of result.meals) {
      for (const food of meal.foods) {
        assert.ok(food.grams > 0 && food.state && food.note && food.sourceId);
        for (const key of ['calories', 'protein', 'carbs', 'fat']) {
          assert.strictEqual(food[key], round1(FOODS[food.id][key] * food.grams / 100));
        }
        if (food.id.startsWith('chicken')) assert.strictEqual(food.id, mode === 'raw' ? 'chickenRaw' : 'chickenCooked');
      }
      for (const key of ['calories', 'protein', 'carbs', 'fat']) {
        assert.strictEqual(meal[key], round1(meal.foods.reduce((sum, food) => sum + food[key], 0)));
      }
    }
    for (const diff of result.foodPlan.differences) {
      const actual = round1(result.meals.reduce((sum, meal) => sum + meal[diff.key], 0));
      assert.strictEqual(diff.actual, actual);
      assert.strictEqual(Number(diff.delta), round1(actual - diff.target));
    }
  }
  const result = calculateProfile({ ...example, chickenMode: mode });
  assert.ok(Math.abs(result.foodPlan.total.protein - 162) < 2);
  assert.ok(Math.abs(result.foodPlan.total.calories - 2480) < 50);
  assert.strictEqual(result.foodPlan.needsAdjustment, false);
}
const capped = buildFoodPlan({ calories: 6000, protein: 500, carbs: 700, fat: 150 });
assert.strictEqual(capped.needsAdjustment, true);
assert.throws(() => buildFoodPlan({ calories: 2000, protein: 100, carbs: 200, fat: 60 }, 'invalid'), /称重/);
console.log('Food weights, state-specific nutrition, meal totals and mismatch warnings passed.');
