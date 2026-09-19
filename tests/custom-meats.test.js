const assert = require('assert');
const { emptyForm, validateForm, customReference, readSavedMeats, lookupOptions } = require('../utils/custom-meats');
const raw = { ...emptyForm(), name: '鸭胸（去皮）', rawProtein: '20', rawCalories: '125', source: '包装每100克' };
assert.deepStrictEqual([customReference(raw, 150).raw.protein, customReference(raw, 150).raw.calories], [30, 187.5]);
assert.strictEqual(customReference(raw, 150).cooked, null);
const proteinOnly = { ...emptyForm(), name: '兔肉', cookedProtein: '28', cookedLabel: '水煮' };
assert.strictEqual(customReference(proteinOnly, 200).raw, null);
assert.strictEqual(customReference(proteinOnly, 200).cooked.calories, null);
assert.strictEqual(customReference(proteinOnly, 200).cooked.protein, 56);
// Chinese packaging commonly uses kJ; do not treat it as kcal.
const kj = { ...raw, rawCalories: '418.4', energyUnit: 'kJ', cookedProtein: '25', cookedCalories: '627.6' };
assert.strictEqual(customReference(kj, 200).raw.calories, 200);
assert.strictEqual(customReference(kj, 200).cooked.calories, 300);
assert.strictEqual(customReference({ ...raw, rawCalories: '0', rawProtein: '0' }, 100).raw.calories, 0);
for (const patch of [{ name: '' }, { rawProtein: '' }, { rawProtein: '101' }, { rawProtein: '-1' }, { rawProtein: 'Infinity' }, { rawCalories: '901' }, { energyUnit: 'kJ', rawCalories: '3766' }, { cookedCalories: '100' }, { energyUnit: 'cal' }]) {
  assert.throws(() => validateForm({ ...raw, ...patch }));
}
for (const grams of ['', 0, -1, 2001, Infinity, 'bad']) assert.throws(() => customReference(raw, grams), /克数/);
const saved = [{ id: 'custom-duck', form: raw }];
assert.deepStrictEqual(readSavedMeats(saved), saved);
assert.strictEqual(readSavedMeats([{ id: 'custom-x', form: {} }, ...saved, ...saved, null]).length, 1);
assert.deepStrictEqual(readSavedMeats({}), []);
assert.strictEqual(lookupOptions(saved, '鸭胸')[0].id, 'custom-duck');
assert.strictEqual(lookupOptions(saved, '不存在').length, 1);
assert.strictEqual(lookupOptions(saved, '不存在')[0].id, 'custom');
assert.strictEqual(lookupOptions([], '鸡腿')[0].id, 'thigh');
console.log('Custom meats: missing states/energy, kJ conversion, validation, search and damaged storage passed.');
