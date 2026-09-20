const { FOODS, foodPortion, sumNutrition } = require('./foods');
const { labelPortion, validLabelRow } = require('./label-foods');
const KEYS = ['calories', 'protein', 'carbs', 'fat'];
const r1 = n => Math.round((n + Number.EPSILON) * 10) / 10;
const copy = value => JSON.parse(JSON.stringify(value));
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d)) === value;
}
function previousDate(value) {
  if (!validDate(value)) throw new Error('日期无效');
  const [y, m, d] = value.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}
function validNutrition(row) {
  return row && KEYS.every(key => Number.isFinite(row[key]) && row[key] >= 0);
}
function checkDay(day) {
  if (!day || !validDate(day.date) || !validNutrition(day.target) || (day.target.calories <= 0 && day.diaryOnly !== true) || !Array.isArray(day.meals) || day.meals.length !== 4) throw new Error('饮食记录格式异常，无法安全读取');
  day.meals.forEach(meal => {
    if (!meal || typeof meal.name !== 'string' || typeof meal.logged !== 'boolean' || !Array.isArray(meal.foods) || meal.foods.length > 40) throw new Error('餐次记录格式异常');
    meal.foods.forEach(food => {
      if (!validNutrition(food) || !(Object.prototype.hasOwnProperty.call(FOODS, food.id) || validLabelRow(food)) || !Number.isFinite(food.grams) || food.grams <= 0 || food.grams > 2000) throw new Error('食物记录格式异常');
    });
  });
  return day;
}
function refreshDay(day) {
  checkDay(day);
  const result = copy(day);
  result.meals = result.meals.map((meal, mealIndex) => ({ ...meal, foods: meal.foods.map((food, i) => ({ ...food, rowKey: `${mealIndex}-${i}` })), ...sumNutrition(meal.foods) }));
  result.planned = sumNutrition(result.meals);
  result.consumed = sumNutrition(result.meals.filter(meal => meal.logged));
  result.completed = result.meals.filter(meal => meal.logged).length;
  result.summary = KEYS.map((key, i) => ({ key, label: ['热量', '蛋白质', '碳水', '脂肪'][i], unit: key === 'calories' ? 'kcal' : 'g',
    target: result.target[key], consumed: result.consumed[key], planned: result.planned[key],
    remaining: r1(Math.max(0, result.target[key] - result.consumed[key])), over: r1(Math.max(0, result.consumed[key] - result.target[key])),
    percent: result.target[key] > 0 ? Math.min(100, Math.round(result.consumed[key] / result.target[key] * 100)) : 0,
    delta: r1(result.planned[key] - result.target[key])
  }));
  return result;
}
function createDay(profile, date, oldDay) {
  if (!validDate(date)) throw new Error('日期无效');
  if (oldDay) checkDay(oldDay);
  return refreshDay({ date, target: { calories: profile.targetCalories, ...profile.macros }, goal: profile.goal.label, warnings: Array.isArray(profile.warnings) ? profile.warnings.slice() : [],
    meals: profile.meals.map((meal, i) => oldDay && oldDay.meals[i].logged ? copy(oldDay.meals[i]) : { name: meal.name, foods: copy(meal.foods), logged: false }) });
}
function copyPlan(day, date, currentDay) {
  checkDay(day);
  if (day.diaryOnly) return refreshDay({ ...copy(day), date, meals: day.meals.map((meal, i) => currentDay && currentDay.meals[i].logged ? copy(currentDay.meals[i]) : { ...copy(meal), logged: false }), ...(currentDay ? { target: copy(currentDay.target), goal: currentDay.goal, diaryOnly: !!currentDay.diaryOnly } : {}) });
  return createDay({ targetCalories: day.target.calories, macros: { protein: day.target.protein, carbs: day.target.carbs, fat: day.target.fat }, goal: { label: day.goal }, meals: day.meals, warnings: day.warnings }, date, currentDay);
}
function createDiary(date) {
  return refreshDay({ date, diaryOnly: true, target: { calories: 0, protein: 0, carbs: 0, fat: 0 }, goal: '我的饮食记录', warnings: [], meals: ['早餐', '午餐', '加餐', '晚餐'].map(name => ({ name, logged: false, foods: [] })) });
}
function setLabelFood(day, mealIndex, foodIndex, form, grams) {
  const next = editableMeal(day, mealIndex), row = labelPortion(form, grams);
  if (foodIndex === null) {
    if (next.meals[mealIndex].foods.length >= 40) throw new Error('每餐最多 40 项食物');
    next.meals[mealIndex].foods.push(row);
  } else {
    if (!Number.isInteger(foodIndex) || !next.meals[mealIndex].foods[foodIndex]) throw new Error('请选择有效食物');
    next.meals[mealIndex].foods[foodIndex] = row;
  }
  return refreshDay(next);
}
function editableMeal(day, mealIndex) {
  checkDay(day);
  if (!Number.isInteger(mealIndex) || !day.meals[mealIndex]) throw new Error('请选择有效餐次');
  if (day.meals[mealIndex].logged) throw new Error('这餐已经记录，请先取消记录再修改实际食物');
  return copy(day);
}
function replaceFood(day, mealIndex, foodIndex, id, grams) {
  const result = editableMeal(day, mealIndex);
  if (!Number.isInteger(foodIndex) || !result.meals[mealIndex].foods[foodIndex]) throw new Error('请选择有效食物');
  result.meals[mealIndex].foods[foodIndex] = foodPortion(id, grams);
  return refreshDay(result);
}
function addFood(day, mealIndex, id, grams) {
  const result = editableMeal(day, mealIndex);
  if (result.meals[mealIndex].foods.length >= 40) throw new Error('每餐最多 40 项食物');
  result.meals[mealIndex].foods.push(foodPortion(id, grams));
  return refreshDay(result);
}
function removeFood(day, mealIndex, foodIndex) {
  const result = editableMeal(day, mealIndex);
  if (!Number.isInteger(foodIndex) || !result.meals[mealIndex].foods[foodIndex]) throw new Error('请选择有效食物');
  result.meals[mealIndex].foods.splice(foodIndex, 1);
  return refreshDay(result);
}
function toggleMeal(day, mealIndex) {
  checkDay(day);
  if (!Number.isInteger(mealIndex) || !day.meals[mealIndex]) throw new Error('请选择有效餐次');
  const result = copy(day);
  if (!result.meals[mealIndex].foods.length) throw new Error('请先添加实际吃的食物');
  result.meals[mealIndex].logged = !result.meals[mealIndex].logged;
  return refreshDay(result);
}
function replacementGrams(original, id, mode) {
  if (!original || !validNutrition(original) || !Object.prototype.hasOwnProperty.call(FOODS, id)) throw new Error('请选择有效食物');
  if (!['protein', 'calories', 'carbs'].includes(mode)) throw new Error('请选择替换依据');
  if (original[mode] <= 0 || FOODS[id][mode] <= 0) throw new Error('此食物不能按该营养等量替换，请改选热量或手动填克数');
  const grams = r1(original[mode] / FOODS[id][mode] * 100);
  foodPortion(id, grams); // 超出边界时不静默截断，也不声称等量。
  return grams;
}
function readDays() {
  const stored = wx.getStorageSync('nutritionDaysV1');
  if (!stored) return {};
  if (typeof stored !== 'object' || Array.isArray(stored)) throw new Error('本地饮食记录无法读取，请保留数据并反馈');
  Object.keys(stored).forEach(date => { if (!stored[date] || date !== stored[date].date) throw new Error('记录日期异常'); checkDay(stored[date]); });
  return stored;
}
function saveDay(day) {
  const clean = refreshDay(day);
  const days = readDays();
  wx.setStorageSync('nutritionDaysV1', { ...days, [day.date]: clean });
  return clean;
}
function weightEntry(date, value, unit, today = dateKey()) {
  if (!validDate(date) || date > today) throw new Error('请选择今天或之前的日期');
  if (!['kg', 'jin'].includes(unit)) throw new Error('请选择体重单位');
  const kg = Number(value) / (unit === 'jin' ? 2 : 1);
  if (!Number.isFinite(kg) || kg < 30 || kg > 250) throw new Error('请输入 30～250 kg（60～500 斤）的体重');
  return { date, kg: r1(kg) };
}
function readWeights() {
  const rows = wx.getStorageSync('weightHistoryV1');
  if (!rows) return [];
  if (!Array.isArray(rows) || rows.some(row => !row || !validDate(row.date) || !Number.isFinite(row.kg) || row.kg < 30 || row.kg > 250)) throw new Error('本地体重记录无法读取，请保留数据并反馈');
  return rows.slice().sort((a, b) => a.date.localeCompare(b.date));
}
function weightTrend(rows, today = dateKey()) {
  let start = today;
  for (let i = 0; i < 6; i++) start = previousDate(start);
  const week = rows.filter(row => row.date >= start && row.date <= today);
  const ordered = rows.filter(row => row.date <= today).slice().sort((a,b) => a.date.localeCompare(b.date));
  return { latest: ordered.length ? ordered[ordered.length - 1].kg : null,
    change: ordered.length > 1 ? r1(ordered[ordered.length - 1].kg - ordered[0].kg) : null,
    weekAverage: week.length ? r1(week.reduce((sum, row) => sum + row.kg, 0) / week.length) : null, weekCount: week.length };
}
module.exports = { createDiary, setLabelFood, dateKey, previousDate, validDate, refreshDay, createDay, copyPlan, replaceFood, addFood, removeFood, toggleMeal, replacementGrams, readDays, saveDay, weightEntry, readWeights, weightTrend };
