const { buildFoodPlan } = require('./foods');
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9
};

function round(value, digits = 0) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function roundToTen(value) {
  return Math.round(value / 10) * 10;
}

function getBmiLevel(bmi) {
  if (bmi < 18.5) return { key: 'low', label: '偏轻', color: '#4C8FD5' };
  if (bmi < 24) return { key: 'normal', label: '正常', color: '#2E9B66' };
  if (bmi < 28) return { key: 'high', label: '超重', color: '#E49A2F' };
  return { key: 'obese', label: '肥胖', color: '#D85C53' };
}

function getGoal(bmiLevel, choice = 'auto') {
  if (!['auto', 'lose', 'maintain', 'gain'].includes(choice)) throw new Error('请选择有效目标');
  if (choice === 'lose' && bmiLevel.key === 'low') throw new Error('体重偏轻时不生成减脂计划，请选择维持或增重');
  if (choice === 'gain' || (choice === 'auto' && bmiLevel.key === 'low')) {
    return {
      key: 'gain',
      label: '健康增重',
      summary: '建议小幅增加热量，以力量训练和优质蛋白为主。',
      calorieFactor: 1.1,
      proteinPerKg: 1.8
    };
  }

  if (choice === 'lose' || (choice === 'auto' && (bmiLevel.key === 'high' || bmiLevel.key === 'obese'))) {
    return {
      key: 'lose',
      label: '减脂减重',
      summary: '建议温和制造热量缺口，优先保留肌肉而不是快速节食。',
      calorieFactor: 0.85,
      proteinPerKg: 1.8
    };
  }

  return {
    key: 'maintain',
    label: '维持塑形',
    summary: '以维持热量为起点，结合训练和体重趋势观察变化。',
    calorieFactor: 1,
    proteinPerKg: 1.6
  };
}

function validateInput(input) {
  const heightCm = Number(input.heightCm);
  const weight = Number(input.weight);
  const age = Number(input.age);

  if (!heightCm || heightCm < 120 || heightCm > 220) {
    throw new Error('请输入 120～220 cm 之间的身高');
  }
  if (!weight || weight <= 0) {
    throw new Error('请输入正确的体重');
  }

  const weightKg = input.weightUnit === 'jin' ? weight / 2 : weight;
  if (weightKg < 30 || weightKg > 250) {
    throw new Error('请输入 30～250 kg（60～500 斤）之间的体重');
  }
  if (!Number.isInteger(age) || age < 18 || age > 80) {
    throw new Error('本工具适用于 18～80 岁成年人');
  }
  if (input.sex !== 'male' && input.sex !== 'female') {
    throw new Error('请选择性别');
  }
  if (!['jin', 'kg'].includes(input.weightUnit)) throw new Error('请选择体重单位');
  if (!Object.prototype.hasOwnProperty.call(ACTIVITY_FACTORS, input.activityLevel)) {
    throw new Error('请选择日常活动量');
  }

  return { heightCm, weightKg, age };
}

function calculateProfile(input) {
  const { heightCm, weightKg, age } = validateInput(input);
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const bmiLevel = getBmiLevel(bmi);
  const recommendedGoal = getGoal(bmiLevel);
  const goal = getGoal(bmiLevel, input.goalChoice || 'auto');
  const maleFlag = input.sex === 'male' ? 1 : 0;

  // Deurenberg 成人体脂估算公式。它用于趋势参考，不代替体脂秤或医学检测。
  const rawBodyFat = 1.2 * bmi + 0.23 * age - 10.8 * maleFlag - 5.4;
  const bodyFat = Math.min(60, Math.max(3, rawBodyFat));

  // Mifflin-St Jeor 基础代谢公式。
  const sexAdjustment = input.sex === 'male' ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment;
  const tdee = bmr * ACTIVITY_FACTORS[input.activityLevel];
  const calorieFloor = input.sex === 'male' ? 1500 : 1200;
  const targetCalories = Math.max(calorieFloor, roundToTen(tdee * goal.calorieFactor));

  let protein = Math.round(weightKg * goal.proteinPerKg);
  let fat = Math.round(weightKg * 0.8);
  // 原模板的按体重目标可能超过热量预算。保留 80 g 碳水预算后缩放，
  // 明确提示目标冲突；这是软件预算约束，不是个体营养处方。
  const scale = Math.min(1, (targetCalories - 80 * 4) / (protein * 4 + fat * 9));
  protein = round(protein * scale, 1);
  fat = round(fat * scale, 1);
  const remainingCalories = targetCalories - protein * 4 - fat * 9;
  const carbs = round(remainingCalories / 4, 1);
  const warnings = [];
  if (scale < 1) warnings.push('按体重计算的蛋白质和脂肪超出热量预算，已按比例调整以保证总量一致。此组合需进一步评估，请向营养专业人士确认适用性。');
  if (goal.key === 'gain' && bmi >= 24) warnings.push('你选择了增重，但 BMI 已偏高；请结合肌肉量、腰围和专业评估确认目标。');
  if (targetCalories > tdee && goal.key === 'lose') warnings.push('热量下限高于估算维持热量，此方案不保证形成热量缺口，请进一步评估。');

  const normalMinKg = 18.5 * heightM * heightM;
  const normalMaxKg = 23.9 * heightM * heightM;
  const foodPlan = buildFoodPlan({ calories: targetCalories, protein, carbs, fat }, input.chickenMode || 'raw');

  return {
    input: {
      heightCm,
      weightKg: round(weightKg, 1),
      age,
      sex: input.sex,
      activityLevel: input.activityLevel
    },
    bmi: round(bmi, 1),
    bmiLevel,
    bodyFat: round(bodyFat, 1),
    bodyFatLabel: '公式估算',
    normalWeightRange: `${round(normalMinKg, 1)}～${round(normalMaxKg, 1)} kg`,
    goal,
    recommendedGoal,
    goalChoice: input.goalChoice || 'auto',
    warnings,
    macroShares: { protein: round(protein * 4 / targetCalories * 100), carbs: round(carbs * 4 / targetCalories * 100), fat: round(fat * 9 / targetCalories * 100) },
    bmr: roundToTen(bmr),
    tdee: roundToTen(tdee),
    targetCalories,
    macros: {
      protein,
      carbs,
      fat
    },
    water: round(weightKg * 35 / 1000, 1),
    vegetable: '500 g 生重·可食部',
    meals: foodPlan.meals,
    foodPlan,
    tips: [
      goal.key === 'lose'
        ? '每周体重下降约 0.3～0.7 kg 更容易长期坚持。'
        : goal.key === 'gain'
          ? '每周体重增加约 0.1～0.3 kg，优先通过力量训练增肌。'
          : '维持体重的同时，每周进行 2～4 次力量训练。',
      '蛋白质分散到 3～4 餐，每餐尽量包含一掌心优质蛋白。',
      '连续执行 2 周后，根据体重和腰围趋势将热量上下调整 100～200 kcal。'
    ]
  };
}

module.exports = {
  ACTIVITY_FACTORS,
  calculateProfile,
  getBmiLevel,
  validateInput
};
