const { calculateProfile } = require('../../utils/health');
const { buildFoodPlan } = require('../../utils/foods');
const { dateKey, readDays, createDay, saveDay } = require('../../utils/tracker');
const GOAL_OPTIONS = [
  { label: '按基础信息推荐', value: 'auto' },
  { label: '减脂减重', value: 'lose' },
  { label: '维持体重 / 改善线条', value: 'maintain' },
  { label: '增重 / 配合增肌训练', value: 'gain' }
];

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
    goalOptions: GOAL_OPTIONS,
    goalIndex: 0,
    weightUnit: 'jin',
    chickenMode: 'raw',
    form: {
      heightCm: '',
      weight: '',
      age: ''
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
        sexIndex: [0, 1].includes(saved.sexIndex) ? saved.sexIndex : 0,
        goalIndex: [0, 1, 2, 3].includes(saved.goalIndex) ? saved.goalIndex : 0,
        activityIndex: Number.isInteger(saved.activityIndex) && ACTIVITY_OPTIONS[saved.activityIndex] ? saved.activityIndex : 2
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

  onGoalChange(event) {
    const goalIndex = Number(event.detail.value);
    if (Number.isInteger(goalIndex) && GOAL_OPTIONS[goalIndex]) this.setData({ goalIndex, result: null });
  },

  saveTodayPlan() {
    try {
      if (!this.data.result) throw new Error('请先生成饮食方案');
      const date = dateKey();
      saveDay(createDay(this.data.result, date, readDays()[date]));
      wx.switchTab({ url: '/pages/today/index' });
    } catch (error) { wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' }); }
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
    const { form, weightUnit, sexIndex, activityIndex, chickenMode, goalIndex } = this.data;

    try {
      const result = calculateProfile({
        ...form,
        weightUnit,
        chickenMode,
        goalChoice: GOAL_OPTIONS[goalIndex].value,
        sex: SEX_OPTIONS[sexIndex].value,
        activityLevel: ACTIVITY_OPTIONS[activityIndex].value
      });

      this.setData({ result, showMethod: false });
      wx.setStorageSync('healthForm', { form, weightUnit, sexIndex, activityIndex, chickenMode, goalIndex });

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

  reset() {
    wx.removeStorageSync('healthForm');
    this.setData({
      sexIndex: 0,
      activityIndex: 2,
      goalIndex: 0,
      weightUnit: 'jin',
      chickenMode: 'raw',
      form: { heightCm: '', weight: '', age: '' },
      result: null,
      showMethod: false
    });
  }
});
