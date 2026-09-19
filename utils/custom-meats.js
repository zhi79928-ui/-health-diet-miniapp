const { MEAT_OPTIONS, meatReference } = require('./foods');
const CUSTOM_OPTION = { id: 'custom', label: '＋ 自定义肉类 / 按包装录入', custom: true };
const r1 = value => Math.round((value + Number.EPSILON) * 10) / 10;
const emptyForm = () => ({ name: '', rawProtein: '', rawCalories: '', cookedProtein: '', cookedCalories: '', energyUnit: 'kcal', cookedLabel: '', source: '' });
const isBlank = value => value === undefined || value === null || String(value).trim() === '';

function validateForm(input) {
  if (!input || typeof input !== 'object') throw new Error('请填写肉类营养数据');
  const form = {};
  Object.keys(emptyForm()).forEach(key => { form[key] = String(input[key] == null ? '' : input[key]).trim(); });
  if (!form.name || form.name.length > 40) throw new Error('请填写 1～40 字的肉类名称和部位');
  if (!['kcal', 'kJ'].includes(form.energyUnit)) throw new Error('请选择 kcal 或 kJ');
  if (form.source.length > 120 || form.cookedLabel.length > 30) throw new Error('来源限 120 字，熟重做法限 30 字');
  if (isBlank(form.rawProtein) && isBlank(form.cookedProtein)) throw new Error('至少填写生重或熟重的一项每 100 g 蛋白质');
  ['raw', 'cooked'].forEach(state => {
    const label = state === 'raw' ? '生重' : '熟重';
    const protein = form[state + 'Protein'];
    const energy = form[state + 'Calories'];
    if (!isBlank(protein) && (!Number.isFinite(Number(protein)) || Number(protein) < 0 || Number(protein) > 100)) throw new Error(`${label}每 100 g 蛋白质应为 0～100 g`);
    if (!isBlank(energy)) {
      if (isBlank(protein)) throw new Error(`填写${label}热量时，也请填写对应蛋白质`);
      const kcal = Number(energy) / (form.energyUnit === 'kJ' ? 4.184 : 1);
      if (!Number.isFinite(kcal) || kcal < 0 || kcal > 900) throw new Error(`${label}热量应为 0～900 kcal（或 0～3765.6 kJ）`);
    }
  });
  return form;
}

function customReference(input, grams) {
  const form = validateForm(input);
  const weight = Number(grams);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) throw new Error('请输入大于 0 且不超过 2000 的克数');
  const result = {};
  ['raw', 'cooked'].forEach(state => {
    if (isBlank(form[state + 'Protein'])) { result[state] = null; return; }
    const energy = form[state + 'Calories'];
    result[state] = { name: form.name, state: state === 'raw' ? '生重' : '熟重', grams: weight,
      protein: r1(Number(form[state + 'Protein']) * weight / 100),
      calories: isBlank(energy) ? null : r1(Number(energy) / (form.energyUnit === 'kJ' ? 4.184 : 1) * weight / 100),
      note: state === 'raw' ? '按你录入的生重可食部数据计算' : `按你录入的熟重数据计算：${form.cookedLabel || '做法未注明，请核对包装'}`,
      source: form.source || '用户录入，未填写来源'
    };
  });
  return result;
}

function readSavedMeats(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.slice(0, 50).reduce((items, entry) => {
    try {
      if (!entry || !/^custom-[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) return items;
      const form = validateForm(entry.form);
      ids.add(entry.id);
      items.push({ id: entry.id, form });
    } catch (_) { /* 忽略损坏或旧格式条目，不让速查无法打开。 */ }
    return items;
  }, []);
}

function lookupOptions(saved, query = '') {
  const all = MEAT_OPTIONS.concat(saved.map(entry => ({ id: entry.id, label: `${entry.form.name}（自定义）`, custom: true, form: entry.form })));
  const keyword = String(query).trim().toLowerCase();
  return all.filter(item => item.label.toLowerCase().includes(keyword)).concat(CUSTOM_OPTION);
}

function lookupReference(option, form, grams) {
  return option.custom ? customReference(form, grams) : meatReference(option.id, grams);
}
module.exports = { emptyForm, validateForm, customReference, readSavedMeats, lookupOptions, lookupReference };
