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

function getGoal(bmiLevel) {
  if (bmiLevel.key === 'low') {
    return {
      key: 'gain',
      label: '健康增重',
      summary: '建议小幅增加热量，以力量训练和优质蛋白为主。',
      calorieFactor: 1.1,
      proteinPerKg: 1.8
    };
  }

  if (bmiLevel.key === 'high' || bmiLevel.key === 'obese') {
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
    summary: '体重在健康区间，可保持热量并通过训练改善线条。',
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
  if (!age || age < 18 || age > 80) {
    throw new Error('本工具适用于 18～80 岁成年人');
  }
  if (input.sex !== 'male' && input.sex !== 'female') {
    throw new Error('请选择性别');
  }
  if (!ACTIVITY_FACTORS[input.activityLevel]) {
    throw new Error('请选择日常活动量');
  }

  return { heightCm, weightKg, age };
}

function buildMeals(calories, protein, carbs, fat) {
  const meals = [
    {
      name: '早餐',
      ratio: 0.25,
      suggestion: '燕麦/全麦主食 + 鸡蛋 + 牛奶或无糖豆浆 + 1份水果'
    },
    {
      name: '午餐',
      ratio: 0.35,
      suggestion: '1拳主食 + 1～2掌瘦肉/鱼虾 + 2拳蔬菜'
    },
    {
      name: '加餐',
      ratio: 0.1,
      suggestion: '无糖酸奶/牛奶 + 水果，或少量坚果'
    },
    {
      name: '晚餐',
      ratio: 0.3,
      suggestion: '适量主食 + 1掌优质蛋白 + 2拳蔬菜，少油烹调'
    }
  ];

  return meals.map((meal) => ({
    ...meal,
    calories: roundToTen(calories * meal.ratio),
    protein: Math.round(protein * meal.ratio),
    carbs: Math.round(carbs * meal.ratio),
    fat: Math.round(fat * meal.ratio),
    percent: Math.round(meal.ratio * 100)
  }));
}

function calculateProfile(input) {
  const { heightCm, weightKg, age } = validateInput(input);
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const bmiLevel = getBmiLevel(bmi);
  const goal = getGoal(bmiLevel);
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

  const protein = Math.round(weightKg * goal.proteinPerKg);
  const fat = Math.round(weightKg * 0.8);
  const remainingCalories = targetCalories - protein * 4 - fat * 9;
  const carbs = Math.max(80, Math.round(remainingCalories / 4));

  const normalMinKg = 18.5 * heightM * heightM;
  const normalMaxKg = 23.9 * heightM * heightM;

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
    bmr: roundToTen(bmr),
    tdee: roundToTen(tdee),
    targetCalories,
    macros: {
      protein,
      carbs,
      fat
    },
    water: round(weightKg * 35 / 1000, 1),
    vegetable: '至少 500 g',
    meals: buildMeals(targetCalories, protein, carbs, fat),
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
