// 每 100 g 可食部；多数为 USDA SR Legacy 近似值。豆浆来源另见 docs/food-diary.md。
// 生熟肉是独立条目，不是同一批肉烹调前后的精确换算。
const { EXTRA_FOODS, EXTRA_OPTIONS } = require('./extra-meats');
const { STAPLES } = require('./staples');
const { PRODUCE } = require('./produce');
const FOODS = {
  ...PRODUCE,
  ...STAPLES,
  soyMilk: { name: '无糖豆浆（通用参考）', state: '即饮净重', note: '浓度、品牌及过滤方式会影响营养；此条目为通用估算。克数不等同毫升。参考：en.wikipedia.org/wiki/Soy_milk 的每 100 g 营养表', calories: 33, protein: 2.9, carbs: 1.7, fat: 1.6, sourceId: 'soy-milk-generic' },
  ...EXTRA_FOODS,
  chickenRaw: { name: '去皮去骨鸡胸肉', state: '生重', note: '烹调前去皮去骨称重；需充分做熟后食用', calories: 120, protein: 22.5, carbs: 0, fat: 2.6, sourceId: '171077' },
  chickenCooked: { name: '烤鸡胸肉（纯肉）', state: '熟重', note: '烤熟后去皮去骨称重；额外用油另计，不通用于水煮、油炸或腌制品', calories: 165, protein: 31, carbs: 0, fat: 3.6, sourceId: '171477' },
  beefRaw: { name: '牛眼肉（去骨瘦肉）', state: '生重', note: 'USDA Select 级眼肉，去骨、去可分离脂肪；不代表肥牛、牛腩或所有牛肉', calories: 142, protein: 22.5, carbs: 0, fat: 5.8, sourceId: '173382' },
  beefCooked: { name: '烤牛眼肉（去骨瘦肉）', state: '熟重', note: 'USDA Select 级眼肉瘦肉，烤熟后称重；额外用油另计，不通用于炖牛腩', calories: 191, protein: 29.2, carbs: 0, fat: 8.4, sourceId: '173381' },
  porkRaw: { name: '猪绞肉', state: '生重', note: '普通新鲜猪绞肉，包含脂肪；不同肥瘦比例差异较大，不代表纯瘦肉或五花肉', calories: 263, protein: 16.9, carbs: 0, fat: 21.2, sourceId: '167902' },
  porkCooked: { name: '熟猪绞肉', state: '熟重', note: '数据库普通熟猪绞肉条目，未细分烹调方法；肥瘦比例不同会影响估算', calories: 297, protein: 25.7, carbs: 0, fat: 20.8, sourceId: '167903' },
  codRaw: { name: '大西洋鳕鱼', state: '生重', note: '烹调前可食鱼肉净重，不含骨；不代表银鳕鱼或其他鱼种', calories: 82, protein: 17.8, carbs: 0, fat: 0.7, sourceId: '171955' },
  codCooked: { name: '干热烹调大西洋鳕鱼', state: '熟重', note: '烘烤等干热烹调后的鱼肉净重；额外用油另计，不通用于油炸或裹粉鱼排', calories: 105, protein: 22.8, carbs: 0, fat: 0.9, sourceId: '171956' },
  rice: { name: '白米饭', state: '熟重', note: '煮熟后称重，不是干大米', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, sourceId: '168878' },
  oats: { name: '原味燕麦', state: '干重', note: '加水或牛奶前称重；非煮好的燕麦粥', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, sourceId: '169705' },
  broccoli: { name: '西兰花', state: '生重·可食部', note: '去掉不可食部分后、烹调前称重，油另计', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, sourceId: '170379' },
  milk: { name: '全脂纯牛奶', state: '即饮净重', note: '这里以克计，不把毫升当克；有包装时以营养标签为准', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, sourceId: '171265' },
  apple: { name: '苹果', state: '生重·可食部', note: '带皮去核后称重', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, sourceId: '171688' },
  almonds: { name: '原味杏仁', state: '可食部净重', note: '不含壳；非糖衣或油炸制品', calories: 579, protein: 21.1, carbs: 21.5, fat: 49.9, sourceId: '170567' },
  oil: { name: '橄榄油', state: '实际摄入净重', note: '按吃进的油计算，不包含留在锅里的油', calories: 884, protein: 0, carbs: 0, fat: 100, sourceId: '171413' }
};
const MEAT_OPTIONS = [
  { id: 'chicken', label: '鸡胸肉（去皮去骨）', rawId: 'chickenRaw', cookedId: 'chickenCooked', cookedLabel: '烤熟纯肉' },
  { id: 'beef', label: '牛肉（眼肉·去骨瘦肉）', rawId: 'beefRaw', cookedId: 'beefCooked', cookedLabel: '烤熟瘦肉' },
  { id: 'pork', label: '猪肉（普通绞肉）', rawId: 'porkRaw', cookedId: 'porkCooked', cookedLabel: '熟绞肉' },
  { id: 'cod', label: '鱼肉（大西洋鳕鱼）', rawId: 'codRaw', cookedId: 'codCooked', cookedLabel: '干热烹调' }
].concat(EXTRA_OPTIONS);
const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'];
const round1 = n => Math.round((n + Number.EPSILON) * 10) / 10;

// USDA 官方 FDC 条目，2026-09-22 核对纤维；缺失值不补成零。
const fiberBySource = {
  170440: 1.8, 168484: 2.5, 168483: 3.3, 169999: 2.4, 168875: 1.8,
  169702: 8.5, 168871: 1.3, 168917: 2.8, 170686: 2.7, 168878: 0.4,
  169705: 10.6, 170379: 2.6, 171688: 2.4, 170567: 12.5,
  173627: 0, 172388: 0, 173625: 0, 173612: 0, 172393: 0, 171496: 0,
  167904: 0, 167895: 0, 167897: 0, 174330: 0, 174331: 0, 175167: 0,
  175168: 0, 173706: 0, 173707: 0, 175176: 0, 175177: 0, 171077: 0,
  171477: 0, 173382: 0, 173381: 0, 167902: 0, 167903: 0, 171955: 0,
  171956: 0, 171265: 0, 171413: 0
};
Object.values(FOODS).forEach(food => {
  if (Object.prototype.hasOwnProperty.call(fiberBySource, food.sourceId)) food.fiber = fiberBySource[food.sourceId];
});
FOODS.apple.category = 'fruits';
FOODS.broccoli.category = 'vegetables';
function withFiber(row) {
  const basis = FOODS[row.id];
  const fiber = Number.isFinite(row.fiber) && row.fiber >= 0 ? row.fiber :
    (!row.basis && basis && Number.isFinite(basis.fiber) && Number.isFinite(row.grams) ? round1(basis.fiber * row.grams / 100) : null);
  return { ...row, fiber, fiberLabel: fiber === null ? '暂无数据' : fiber + ' g' };
}

function foodPortion(id, grams) {
  if (!Object.prototype.hasOwnProperty.call(FOODS, id)) throw new Error('请选择有效食物');
  const weight = Number(grams);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) {
    throw new Error('请输入大于 0 且不超过 2000 的克数');
  }
  const food = FOODS[id];
  const result = { ...food, id, grams: weight };
  NUTRIENTS.forEach(key => { result[key] = round1(food[key] * weight / 100); });
  return withFiber({ ...result, fiber: Number.isFinite(food.fiber) ? round1(food.fiber * weight / 100) : null });
}

// 汇总已显示的分项，避免用户把页面上的数字相加却对不上总数。
function sumNutrition(rows) {
  const total = {};
  NUTRIENTS.forEach(key => {
    total[key] = round1(rows.reduce((sum, row) => sum + row[key], 0));
  });
  const parts = rows.map(row => Array.isArray(row.foods) ? sumNutrition(row.foods) : withFiber(row));
  total.fiber = round1(parts.reduce((sum, row) => sum + (row.fiber || 0), 0));
  total.fiberMissing = parts.reduce((sum, row) => sum + (row.fiberMissing || (row.fiber === null ? 1 : 0)), 0);
  total.fiberLabel = total.fiberMissing ? total.fiber + ' g（已知合计，部分食物暂无数据）' : total.fiber + ' g';
  return total;
}

function chickenReference(grams) {
  return meatReference('chicken', grams);
}

function meatReference(meatId, grams) {
  const meat = MEAT_OPTIONS.find(item => item.id === meatId);
  if (!meat) throw new Error('请选择有效肉类');
  return { raw: meat.rawId ? foodPortion(meat.rawId, grams) : null,
    cooked: meat.cookedId ? foodPortion(meat.cookedId, grams) : null };
}

function buildFoodPlan(target, mode = 'raw') {
  if (mode !== 'raw' && mode !== 'cooked') throw new Error('请选择鸡胸肉称重方式');
  NUTRIENTS.forEach(key => {
    if (!Number.isFinite(target[key]) || target[key] <= 0) throw new Error('营养目标无效');
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const step5 = value => Math.round(value / 5) * 5;
  const chickenId = mode === 'raw' ? 'chickenRaw' : 'chickenCooked';
  const breakfast = [foodPortion('oats', step5(clamp(60 * target.calories / 2000, 35, 100))), foodPortion('milk', 250)];
  const snack = [foodPortion('milk', 200), foodPortion('apple', 200), foodPortion('almonds', 15)];
  const vegetables = [foodPortion('broccoli', 250), foodPortion('broccoli', 250)];
  const fixed = sumNutrition(breakfast.concat(snack, vegetables));

  // 从全天碳水、蛋白目标扣除其他食物的贡献，再安排米饭和鸡胸肉。
  // 分量设上限；目标超出模板能力时显示差额，不假装已经达标。
  const riceGrams = step5(clamp((target.carbs - fixed.carbs) / FOODS.rice.carbs * 100, 100, 1200));
  const riceTotal = foodPortion('rice', riceGrams);
  const chickenGrams = step5(clamp((target.protein - fixed.protein - riceTotal.protein) / FOODS[chickenId].protein * 100, 60, mode === 'raw' ? 700 : 510));
  const chickenTotal = foodPortion(chickenId, chickenGrams);
  const oilGrams = Math.round(clamp(target.fat - fixed.fat - riceTotal.fat - chickenTotal.fat, 0, 40));
  const lunchRice = step5(riceGrams * 0.55);
  const lunchChicken = step5(chickenGrams * 0.55);
  const lunchOil = Math.round(oilGrams * 0.55);
  const lunch = [foodPortion('rice', lunchRice), foodPortion(chickenId, lunchChicken), vegetables[0]];
  const dinner = [foodPortion('rice', riceGrams - lunchRice), foodPortion(chickenId, chickenGrams - lunchChicken), vegetables[1]];
  if (lunchOil > 0) lunch.push(foodPortion('oil', lunchOil));
  if (oilGrams - lunchOil > 0) dinner.push(foodPortion('oil', oilGrams - lunchOil));

  const meals = [
    { name: '早餐', foods: breakfast },
    { name: '午餐', foods: lunch },
    { name: '加餐', foods: snack },
    { name: '晚餐', foods: dinner }
  ].map(meal => ({ ...meal, ...sumNutrition(meal.foods) }));
  const total = sumNutrition(meals);
  const differences = NUTRIENTS.map((key, i) => {
    const delta = round1(total[key] - target[key]);
    return { key, label: ['热量', '蛋白质', '碳水', '脂肪'][i], unit: key === 'calories' ? 'kcal' : 'g', target: target[key], actual: total[key], delta: delta > 0 ? `+${delta}` : String(delta) };
  });
  const needsAdjustment = NUTRIENTS.some(key => Math.abs(total[key] - target[key]) / target[key] > 0.1);
  return { meals, total, differences, needsAdjustment, mode };
}

module.exports = { FOODS, MEAT_OPTIONS, foodPortion, sumNutrition, withFiber, meatReference, chickenReference, buildFoodPlan };
