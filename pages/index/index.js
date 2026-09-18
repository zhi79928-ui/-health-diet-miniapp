const { calculateProfile } = require('../../utils/health');

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
        sexIndex: Number.isInteger(saved.sexIndex) ? saved.sexIndex : 0,
        activityIndex: Number.isInteger(saved.activityIndex) ? saved.activityIndex : 2
      });
    }
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
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
    const { form, weightUnit, sexIndex, activityIndex } = this.data;

    try {
      const result = calculateProfile({
        ...form,
        weightUnit,
        sex: SEX_OPTIONS[sexIndex].value,
        activityLevel: ACTIVITY_OPTIONS[activityIndex].value
      });

      this.setData({ result, showMethod: false });
      wx.setStorageSync('healthForm', { form, weightUnit, sexIndex, activityIndex });

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

  reset() {
    wx.removeStorageSync('healthForm');
    this.setData({
      sexIndex: 0,
      activityIndex: 2,
      weightUnit: 'jin',
      form: { heightCm: '', weight: '', age: '' },
      result: null,
      showMethod: false
    });
  }
});
