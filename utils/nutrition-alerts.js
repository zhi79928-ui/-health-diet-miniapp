// Gentle plausibility checks for diary input. These are recording prompts,
// not diagnoses, limits or reasons to block saving.
const unique = rows => [...new Set(rows.filter(Boolean))];

function portionAlerts(food) {
  if (!food) return [];
  const rows = [];
  if (food.id === 'oil' && food.grams > 60) rows.push('食用油超过 60 g，请确认填的是实际吃下的油，而不是下锅用量。');
  else if (String(food.state || '').includes('干重') && food.grams > 300) rows.push('干重超过 300 g，请确认没有把煮熟后的重量填到干重条目。');
  else if (food.grams > 1000) rows.push('单项食物超过 1000 g，请确认克数和可食部分是否填写正确。');
  if (food.calories > 1200) rows.push('这一项超过 1200 kcal，请核对食物、称重状态和克数。');
  return unique(rows);
}

function mealAlerts(meal) {
  if (!meal) return [];
  const rows = [];
  if (meal.calories > 1600) rows.push('这餐超过 1600 kcal，建议再核对各项克数及生重、熟重。');
  if (meal.fat > 90) rows.push('这餐脂肪超过 90 g，请检查食用油、坚果或肥肉的份量。');
  return unique(rows);
}

function dayAlerts(day) {
  if (!day || !day.completed) return [];
  const rows = [];
  if (!day.diaryOnly && day.target.calories > 0 && day.consumed.calories > day.target.calories * 1.2)
    rows.push(`已记录热量比参考目标高出 20% 以上；这是核对提醒，不代表需要跳过下一餐。`);
  if (!day.diaryOnly && day.target.fat > 0 && day.consumed.fat > day.target.fat * 1.5)
    rows.push('已记录脂肪明显高于参考目标，请核对食用油和高脂食物份量。');
  if (day.completed >= 3 && day.consumed.fiber < 15)
    rows.push('已记录至少 3 餐，但膳食纤维仍低于 15 g；下一餐可优先考虑蔬菜、水果或全谷物。');
  if (day.consumed.fiberMissing)
    rows.push('部分食物缺少膳食纤维数据，当前纤维仅为已知项目合计。');
  return unique(rows);
}

module.exports = { portionAlerts, mealAlerts, dayAlerts };
