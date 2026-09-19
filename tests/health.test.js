const assert = require('assert');
const { calculateProfile, validateInput } = require('../utils/health');

function testExampleProfile() {
  const result = calculateProfile({
    heightCm: 180,
    weight: 180,
    weightUnit: 'jin',
    age: 30,
    sex: 'male',
    activityLevel: 'moderate'
  });

  assert.strictEqual(result.input.weightKg, 90);
  assert.strictEqual(result.bmi, 27.8);
  assert.strictEqual(result.bmiLevel.label, '超重');
  assert.strictEqual(result.goal.key, 'lose');
  assert.strictEqual(result.bodyFat, 24);
  assert.strictEqual(result.targetCalories, 2480);
  assert.strictEqual(result.macros.protein, 162);
  assert.strictEqual(result.meals.length, 4);
}

function testHealthyProfile() {
  const result = calculateProfile({
    heightCm: 165,
    weight: 55,
    weightUnit: 'kg',
    age: 28,
    sex: 'female',
    activityLevel: 'light'
  });

  assert.strictEqual(result.bmi, 20.2);
  assert.strictEqual(result.goal.key, 'maintain');
  assert.ok(result.targetCalories >= 1200);
}

function testValidation() {
  assert.throws(() => validateInput({
    heightCm: 80,
    weight: 60,
    weightUnit: 'kg',
    age: 20,
    sex: 'male',
    activityLevel: 'light'
  }), /身高/);
}

testExampleProfile();
testHealthyProfile();
testValidation();

const base = { heightCm: 150, weight: 100, weightUnit: 'kg', age: 60, sex: 'female', activityLevel: 'sedentary' };
const formerlyInconsistent = calculateProfile(base);
assert.strictEqual(formerlyInconsistent.targetCalories, 1510);
assert.ok(formerlyInconsistent.warnings.length);
for (const sex of ['male', 'female']) for (const heightCm of [120, 150, 183, 220]) for (const weight of [30, 77, 100, 250]) for (const goalChoice of ['auto', 'maintain', 'gain']) {
  const value = calculateProfile({ ...base, sex, heightCm, weight, goalChoice });
  const energy = 4 * value.macros.protein + 4 * value.macros.carbs + 9 * value.macros.fat;
  assert.ok(Math.abs(energy - value.targetCalories) <= 0.21, `macro energy mismatch: ${energy} / ${value.targetCalories}`);
  assert.ok(Object.values(value.macros).every(n => Number.isFinite(n) && n > 0));
}
assert.strictEqual(calculateProfile({ ...base, goalChoice: 'maintain' }).goal.key, 'maintain');
assert.strictEqual(calculateProfile({ ...base, heightCm: 183, weight: 77, goalChoice: 'gain' }).goal.key, 'gain');
assert.throws(() => calculateProfile({ ...base, heightCm: 180, weight: 45, goalChoice: 'lose' }), /偏轻/);
assert.throws(() => calculateProfile({ ...base, goalChoice: 'invalid' }), /目标/);
assert.throws(() => calculateProfile({ ...base, activityLevel: 'toString' }), /活动/);
assert.throws(() => calculateProfile({ ...base, age: 25.5 }), /成年人/);
assert.throws(() => calculateProfile({ ...base, weightUnit: 'lb' }), /单位/);

console.log('All health calculation tests passed.');
