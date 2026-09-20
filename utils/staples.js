// USDA FoodData Central，每 100 g 可食部。2026-09-20 通过官方 API 核对。
// 不使用固定生熟换算比例；数据库条目不代表所有品种、含水量和做法。
const STAPLES = {
  potatoBoiled: { name: '土豆（去皮水煮）', state: '熟重·可食部', calories: 86, protein: 1.71, carbs: 20.01, fat: 0.1, sourceId: '170440', note: '去皮水煮后沥水称重；不含油，不适用于薯条或加奶土豆泥' },
  sweetPotatoBoiled: { name: '红薯 / 地瓜（去皮水煮）', state: '熟重·可食部', calories: 76, protein: 1.37, carbs: 17.7, fat: 0.14, sourceId: '168484', note: '去皮水煮后的重量；蒸、烤红薯含水量不同，不作同一数值使用' },
  sweetPotatoBaked: { name: '红薯 / 地瓜（烤制）', state: '熟重·去皮薯肉', calories: 90, protein: 2.01, carbs: 20.71, fat: 0.15, sourceId: '168483', note: '带皮烤制后，仅称薯肉；不含额外糖或油，品种和失水程度有差异' },
  cornBoiled: { name: '甜玉米（水煮玉米粒）', state: '熟重·去芯净重', calories: 96, protein: 3.41, carbs: 21, fat: 1.5, sourceId: '169999', note: '只称可食玉米粒，不含玉米芯；不是糯玉米，不含黄油或沙拉酱' },
  brownRice: { name: '糙米饭', state: '熟重', calories: 112, protein: 2.32, carbs: 23.51, fat: 0.83, sourceId: '168875', note: '中粒糙米煮熟后称重，不是干糙米；含水量会影响每 100 g 数值' },
  milletDry: { name: '小米', state: '干重', calories: 378, protein: 11.02, carbs: 72.85, fat: 4.22, sourceId: '169702', note: '淘洗和加水前称干粮；不能填煮好的小米粥重量' },
  milletCooked: { name: '小米饭（非小米粥）', state: '熟重', calories: 119, protein: 3.51, carbs: 23.7, fat: 1, sourceId: '168871', note: '煮熟成饭状的小米，不能用于稀粥；小米粥请按干小米投入量分摊' },
  quinoaCooked: { name: '藜麦饭', state: '熟重', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.92, sourceId: '168917', note: '煮熟后的纯藜麦，不含油、酱汁或混合米饭' },
  buckwheatCooked: { name: '荞麦粒饭', state: '熟重', calories: 92, protein: 3.38, carbs: 19.9, fat: 0.62, sourceId: '170686', note: '烘烤荞麦粒加水煮熟后的重量；不是荞麦面条' }
};
const STAPLE_IDS = ['rice', 'oats', ...Object.keys(STAPLES)];
module.exports = { STAPLES, STAPLE_IDS };
