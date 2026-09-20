const keys = ['calories', 'protein', 'carbs', 'fat'];
const r1 = n => Math.round((n + Number.EPSILON) * 10) / 10;
function labelBasis(form) {
  const name = String(form.name || '').trim(), state = String(form.state || '').trim();
  if (!name || name.length > 60 || !state || state.length > 60) throw new Error('请填写食物名称和称量状态（最多 60 字）');
  const unit = form.unit || 'g';
  if (!['g', 'mL'].includes(unit)) throw new Error('请选择 g 或 mL');
  const result = { name, state, unit };
  ['protein', 'carbs', 'fat'].forEach(key => {
    if (String(form[key] == null ? '' : form[key]).trim() === '') throw new Error('蛋白质、碳水和脂肪都需填写，没有请填 0');
    const n = Number(form[key]);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('每 100 份的营养值应在 0～100 g 之间');
    result[key] = n;
  });
  if (unit === 'g' && result.protein + result.carbs + result.fat > 105) throw new Error('三大营养素合计超出每 100 g，请核对标签');
  const energy = String(form.calories == null ? '' : form.calories).trim();
  result.estimated = energy === '';
  result.calories = result.estimated ? (result.protein + result.carbs) * 4 + result.fat * 9 : Number(energy) / (form.energyUnit === 'kJ' ? 4.184 : 1);
  if (!Number.isFinite(result.calories) || result.calories < 0 || result.calories > 1000) throw new Error('请核对每 100 份的热量');
  return result;
}
function labelPortion(form, quantity) {
  const basis = labelBasis(form), amount = Number(quantity);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) throw new Error('请输入大于 0 且不超过 2000 的份量');
  const row = { id: 'labelFood', ...basis, basis, grams: amount, note: basis.estimated ? '用户填写的营养标签；热量按蛋白/碳水 4、脂肪 9 kcal/g 估算' : '用户填写的营养标签；按每 100 ' + basis.unit + ' 计算' };
  keys.forEach(key => { row[key] = r1(basis[key] * amount / 100); });
  return row;
}
function validLabelRow(row) {
  try {
    if (row.id !== 'labelFood' || !row.basis) return false;
    const expected = labelPortion(row.basis, row.grams);
    return row.name === expected.name && row.state === expected.state && row.unit === expected.unit && keys.every(key => row[key] === expected[key]);
  } catch (_) { return false; }
}
module.exports = { labelBasis, labelPortion, validLabelRow };
