// Exercise Page event handlers without claiming to emulate WeChat rendering.
const assert = require('assert');
let definition;
let saved;
global.Page = value => { definition = value; };
global.wx = {
  getStorageSync: () => saved,
  setStorageSync: (key, value) => { saved = value; },
  removeStorageSync: () => { saved = undefined; },
  nextTick: callback => callback(),
  pageScrollTo: () => {},
  showToast: ({ title }) => { throw new Error(title); }
};
require('../pages/index/index');
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(patch) {
  for (const key of Object.keys(patch)) {
    const parts = key.split('.');
    let target = this.data;
    parts.slice(0, -1).forEach(part => { target = target[part]; });
    target[parts[parts.length - 1]] = patch[key];
  }
} };
page.onLoad();
page.calculate();
const rawGrams = page.data.result.meals[1].foods.find(food => food.id === 'chickenRaw').grams;
page.setChickenMode({ currentTarget: { dataset: { mode: 'cooked' } } });
const cooked = page.data.result.meals[1].foods.find(food => food.id === 'chickenCooked');
assert.ok(cooked && cooked.grams < rawGrams);
assert.strictEqual(saved.chickenMode, 'cooked');
page.setChickenMode({ currentTarget: { dataset: { mode: 'raw' } } });
assert.strictEqual(page.data.result.meals[1].foods.find(food => food.id === 'chickenRaw').grams, rawGrams);
page.onChickenInput({ detail: { value: '150' } });
assert.strictEqual(page.data.chickenResult.cooked.protein, 46.5);
page.onChickenInput({ detail: { value: '' } });
assert.strictEqual(page.data.chickenResult, null);
assert.ok(page.data.chickenError);
page.onChickenInput({ detail: { value: '100' } });
assert.strictEqual(page.data.chickenError, '');
page.onFieldInput({ currentTarget: { dataset: { field: 'weight' } }, detail: { value: '160' } });
assert.strictEqual(page.data.result, null);
page.reset();
assert.strictEqual(page.data.chickenResult.raw.protein, 22.5);
assert.strictEqual(saved, undefined);
// Older saved forms have no chickenMode; retain backward compatibility.
saved = { form: { heightCm: '180', weight: '180', age: '30' }, weightUnit: 'jin', sexIndex: 0, activityIndex: 2 };
page.onLoad();
assert.strictEqual(page.data.chickenMode, 'raw');
page.calculate();
console.log('Page handlers: mode switching, input validation, stale result clearing, reset and old storage passed.');
