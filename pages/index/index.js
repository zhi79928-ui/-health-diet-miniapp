const { calculateProfile } = require('../../utils/health');
const { FOODS, MEAT_OPTIONS, meatReference, buildFoodPlan } = require('../../utils/foods');

const SEX_OPTIONS = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' }
];

const ACTIVITY_OPTIONS = [
  { label: '久坐少动', detail: '几乎不运动', value: 'sedentary' },
  { label: '轻度活动', detail: '每周运动 1～3 次', value: 'light' },
  { label: '中度活动', detail: '每周运动 3～5 次', value: 'moderate' },
  { label: '高度活动', detail: '每周运动 6～7 次', value: 'active' },
  { label: '非常活跃', detail: '高强度训练或体力工作', value: 'veryActive' }
];

Page({
  data: {
    sexOptions: SEX_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    sexIndex: 0,
    activityIndex: 2,
    weightUnit: 'jin',
    chickenMode: 'raw',
    meatOptions: MEAT_OPTIONS,
    meatIndex: 0,
    meatGrams: '100',
    meatBasis: meatReference('chicken', 100),
    meatResult: meatReference('chicken', 100),
    meatError: '',
    foodReferences: Object.keys(FOODS).map(id => ({ id, ...FOODS[id] })),
    showFoods: false,
    form: {
      heightCm: '180',
      weight: '180',
      age: '30'
    },
    result: null,
    showMethod: false
  },

  onLoad() {
    const saved = wx.getStorageSync('healthForm');
    if (saved && saved.form) {
      this.setData({
        form: saved.form,
        weightUnit: saved.weightUnit || 'jin',
        chickenMode: saved.chickenMode === 'cooked' ? 'cooked' : 'raw',
        sexIndex: Number.isInteger(saved.sexIndex) ? saved.sexIndex : 0,
        activityIndex: Number.isInteger(saved.activityIndex) ? saved.activityIndex : 2
      });
    }
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value, result: null });
  },

  onSexChange(event) {
    this.setData({ sexIndex: Number(event.detail.value), result: null });
  },

  onActivityChange(event) {
    this.setData({ activityIndex: Number(event.detail.value), result: null });
  },

  setWeightUnit(event) {
    const nextUnit = event.currentTarget.dataset.unit;
    const currentUnit = this.data.weightUnit;
    if (nextUnit === currentUnit) return;

    const currentWeight = Number(this.data.form.weight);
    let nextWeight = this.data.form.weight;
    if (currentWeight) {
      nextWeight = nextUnit === 'jin'
        ? String(Math.round(currentWeight * 2 * 10) / 10)
        : String(Math.round(currentWeight / 2 * 10) / 10);
    }

    this.setData({
      weightUnit: nextUnit,
      'form.weight': nextWeight,
      result: null
    });
  },

  calculate() {
    const { form, weightUnit, sexIndex, activityIndex, chickenMode } = this.data;

    try {
      const result = calculateProfile({
        ...form,
        weightUnit,
        chickenMode,
        sex: SEX_OPTIONS[sexIndex].value,
        activityLevel: ACTIVITY_OPTIONS[activityIndex].value
      });

      this.setData({ result, showMethod: false });
      wx.setStorageSync('healthForm', { form, weightUnit, sexIndex, activityIndex, chickenMode });

      wx.nextTick(() => {
        wx.pageScrollTo({ selector: '#result', duration: 350 });
      });
    } catch (error) {
      wx.showToast({ title: error.message || '请检查输入', icon: 'none' });
    }
  },

  toggleMethod() {
    this.setData({ showMethod: !this.data.showMethod });
  },

  setChickenMode(event) {
    const chickenMode = event.currentTarget.dataset.mode;
    if (!['raw', 'cooked'].includes(chickenMode)) return;
    const patch = { chickenMode };
    if (this.data.result) {
      const result = this.data.result;
      const foodPlan = buildFoodPlan({ calories: result.targetCalories, ...result.macros }, chickenMode);
      patch.result = { ...result, meals: foodPlan.meals, foodPlan };
    }
    this.setData(patch);
    const saved = wx.getStorageSync('healthForm');
    if (saved && saved.form) wx.setStorageSync('healthForm', { ...saved, chickenMode });
  },

  onMeatChange(event) {
    const meatIndex = Number(event.detail.value);
    if (!Number.isInteger(meatIndex) || meatIndex < 0 || meatIndex >= MEAT_OPTIONS.length) return;
    this.updateMeatLookup(meatIndex, this.data.meatGrams);
  },

  onMeatInput(event) {
    this.updateMeatLookup(this.data.meatIndex, event.detail.value);
  },

  updateMeatLookup(meatIndex, meatGrams) {
    const meatId = MEAT_OPTIONS[meatIndex].id;
    const patch = { meatIndex, meatGrams, meatBasis: meatReference(meatId, 100) };
    try {
      this.setData({ ...patch, meatResult: meatReference(meatId, meatGrams), meatError: '' });
    } catch (error) {
      this.setData({ ...patch, meatResult: null, meatError: error.message });
    }
  },

  toggleFoods() {
    this.setData({ showFoods: !this.data.showFoods });
  },

  copyFoodSource(event) {
    const food = FOODS[event.currentTarget.dataset.id];
    if (food) wx.setClipboardData({ data: `https://fdc.nal.usda.gov/food-details/${food.sourceId}/nutrients` });
  },

  reset() {
    wx.removeStorageSync('healthForm');
    this.setData({
      sexIndex: 0,
      activityIndex: 2,
      weightUnit: 'jin',
      chickenMode: 'raw',
      meatIndex: 0,
      meatGrams: '100',
      meatBasis: meatReference('chicken', 100),
      meatResult: meatReference('chicken', 100),
      meatError: '',
      showFoods: false,
      form: { heightCm: '', weight: '', age: '' },
      result: null,
      showMethod: false
    });
  }
});
