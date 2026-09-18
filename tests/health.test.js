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

console.log('All health calculation tests passed.');
