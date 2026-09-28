const { foodPortion, sumNutrition } = require('./foods');
const { refreshDay, dateKey } = require('./tracker');
// Fixed food-library combinations; bounded portion adjustment, not a medical prescription.
const mains = [
  ['鸡胸米饭配西兰花', [['rice',180],['chickenRaw',140],['broccoli',200],['oil',8]]],
  ['牛肉土豆配胡萝卜', [['potatoBoiled',250],['beefRaw',140],['carrot',180],['oil',8]]],
  ['鳕鱼红薯配菠菜', [['sweetPotatoBoiled',220],['codRaw',180],['spinach',200],['oil',10]]],
  ['牛肉米饭配西兰花', [['rice',180],['beefRaw',130],['broccoli',200],['oil',5]]],
  ['鸡胸土豆配菠菜', [['potatoBoiled',250],['chickenRaw',140],['spinach',200],['oil',8]]],
  ['鳕鱼米饭配胡萝卜', [['rice',200],['codRaw',180],['carrot',180],['oil',10]]]
];
const breakfasts = [
  ['豆浆燕麦配苹果', [['soyMilk',300],['oats',60],['apple',150]]],
  ['牛奶燕麦配香蕉', [['milk',250],['oats',50],['banana',100]]],
  ['豆浆红薯配杏仁', [['soyMilk',300],['sweetPotatoBoiled',200],['almonds',15]]],
  ['牛奶燕麦配苹果', [['milk',250],['oats',50],['apple',150]]],
  ['豆浆燕麦配香蕉', [['soyMilk',300],['oats',50],['banana',100]]],
  ['牛奶红薯配杏仁', [['milk',250],['sweetPotatoBoiled',180],['almonds',15]]]
];
const snacks = [
  ['苹果与牛奶', [['apple',150],['milk',200]]],
  ['香蕉与豆浆', [['banana',100],['soyMilk',250]]],
  ['苹果与杏仁', [['apple',150],['almonds',15]]],
  ['红薯与豆浆', [['sweetPotatoBoiled',100],['soyMilk',200]]],
  ['香蕉与牛奶', [['banana',80],['milk',150]]],
  ['豆浆与杏仁', [['soyMilk',200],['almonds',15]]]
];
function suggest(day, index, batch = 0, today = dateKey()) {
  const clean = refreshDay(day);
  if (clean.date !== today) throw new Error('请切换到今天，再搭配下一餐');
  if (!Number.isInteger(index) || !clean.meals[index] || clean.meals[index].logged) throw new Error('请选择尚未记录的餐次');
  const weights = [0.25,0.35,0.1,0.3];
  const pendingWeight = clean.meals.reduce((sum, meal, i) => sum + (meal.logged ? 0 : weights[i]), 0);
  const targeted = !clean.diaryOnly && clean.target.calories > clean.consumed.calories;
  const keys = ['calories','protein','carbs','fat'];
  const budget = {};
  keys.forEach(key => { budget[key] = Math.max(0, clean.target[key] - clean.consumed[key]) * weights[index] / pendingWeight; });
  const templates = index === 0 ? breakfasts : index === 2 ? snacks : mains;
  const ranked = templates.map(([name, ingredients], id) => {
    let best;
    const scales = targeted ? [0.8,0.9,1,1.1,1.2] : [1];
    scales.forEach(scale => {
      const foods = ingredients.map(([food, grams]) => foodPortion(food, Math.round(grams * scale)));
      const totals = sumNutrition(foods);
      const score = targeted ? keys.reduce((sum, key) => sum + (key === 'calories' ? 2 : 1) * Math.abs(totals[key] - budget[key]) / Math.max(budget[key], key === 'calories' ? 100 : 10), 0) : 0;
      if (!best || score < best.score) best = { id, name, foods, ...totals, score };
    });
    return best;
  }).sort((a,b) => a.score - b.score || a.id - b.id);
  const offset = (Number.isInteger(batch) && batch >= 0 ? batch : 0) % 2 * 3;
  return {
    choices: ranked.slice(offset, offset + 3),
    explanation: targeted
      ? `已参考今天已记录的 ${clean.completed} 餐和当前目标，按未记录餐次的预设比例分配参考余量。只在模板份量的 80%～120% 内调整，不保证补齐目标。`
      : clean.diaryOnly ? '尚未设置饮食目标：以下是一般搭配示例，不代表你的个人摄入需求。'
        : '已记录热量达到或超过参考目标：以下仅提供一般搭配示例，不建议因此跳餐或强行补齐营养。'
  };
}
module.exports = { suggest };
