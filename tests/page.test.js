// Exercise Page event handlers without claiming to emulate WeChat rendering.
const assert = require('assert');
let definition;
let saved;
let clipboard;
global.Page = value => { definition = value; };
global.wx = {
  getStorageSync: () => saved,
  setStorageSync: (key, value) => { saved = value; },
  removeStorageSync: () => { saved = undefined; },
  nextTick: callback => callback(),
  pageScrollTo: () => {},
  setClipboardData: ({ data }) => { clipboard = data; },
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
page.onMeatInput({ detail: { value: '150' } });
assert.strictEqual(page.data.meatResult.cooked.protein, 46.5);
const originalPlan = JSON.stringify(page.data.result);
page.onMeatChange({ detail: { value: '1' } });
assert.strictEqual(page.data.meatGrams, '150');
assert.strictEqual(page.data.meatResult.cooked.protein, 43.8);
assert.strictEqual(page.data.meatBasis.raw.sourceId, '173382');
assert.strictEqual(JSON.stringify(page.data.result), originalPlan);
// Every choice changes both states and the links; no chicken data left behind.
for (let i = 0; i < page.data.meatOptions.length; i++) {
  page.onMeatChange({ detail: { value: String(i) } });
  const selected = page.data.meatOptions[i];
  assert.strictEqual(page.data.meatResult.raw.id, selected.rawId);
  assert.strictEqual(page.data.meatResult.cooked.id, selected.cookedId);
  for (const state of ['raw', 'cooked']) {
    const food = page.data.meatBasis[state];
    page.copyFoodSource({ currentTarget: { dataset: { id: food.id } } });
    assert.strictEqual(clipboard, `https://fdc.nal.usda.gov/food-details/${food.sourceId}/nutrients`);
  }
}
const selectedIndex = page.data.meatIndex;
for (const bad of ['-1', '4', '1.5', 'bad']) {
  page.onMeatChange({ detail: { value: bad } });
  assert.strictEqual(page.data.meatIndex, selectedIndex);
}
for (const bad of ['', '0', '-1', '2001', 'abc']) {
  page.onMeatInput({ detail: { value: bad } });
  assert.strictEqual(page.data.meatResult, null);
  assert.ok(page.data.meatError);
}
page.onMeatChange({ detail: { value: '1' } });
assert.strictEqual(page.data.meatResult, null);
assert.strictEqual(page.data.meatBasis.raw.id, 'beefRaw');
page.onMeatInput({ detail: { value: '100' } });
assert.strictEqual(page.data.meatError, '');
assert.strictEqual(page.data.meatResult.cooked.protein, 29.2);
page.onFieldInput({ currentTarget: { dataset: { field: 'weight' } }, detail: { value: '160' } });
assert.strictEqual(page.data.result, null);
page.reset();
assert.strictEqual(page.data.meatIndex, 0);
assert.strictEqual(page.data.meatGrams, '100');
assert.strictEqual(page.data.meatResult.raw.protein, 22.5);
assert.strictEqual(page.data.meatBasis.cooked.id, 'chickenCooked');
assert.strictEqual(saved, undefined);
// Older saved forms have no chickenMode; retain backward compatibility.
saved = { form: { heightCm: '180', weight: '180', age: '30' }, weightUnit: 'jin', sexIndex: 0, activityIndex: 2 };
page.onLoad();
assert.strictEqual(page.data.chickenMode, 'raw');
page.calculate();
console.log('Page handlers: meat selection, source links, input validation, stale result clearing, meal independence, reset and old storage passed.');
