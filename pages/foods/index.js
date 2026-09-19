const { FOODS, MEAT_OPTIONS, meatReference } = require('../../utils/foods');
const { emptyForm, validateForm, readSavedMeats, lookupOptions, lookupReference } = require('../../utils/custom-meats');
Page({
  data: {
    meatOptions: lookupOptions([]),
    presetMeatCount: MEAT_OPTIONS.length,
    meatQuery: '',
    savedMeats: [],
    customForm: emptyForm(),
    meatIsCustom: false,
    meatSaveMessage: '',
    selectedCookedLabel: MEAT_OPTIONS[0].cookedLabel,
    energyUnits: ['kcal', 'kJ'],
    meatIndex: 0,
    meatGrams: '100',
    meatBasis: meatReference('chicken', 100),
    meatResult: meatReference('chicken', 100),
    meatError: '',
    foodReferences: Object.keys(FOODS).map(id => ({ id, ...FOODS[id] })),
    showFoods: false,
  },
  onLoad() {
    try {
      const savedMeats = readSavedMeats(wx.getStorageSync('customMeatsV1'));
      this.setData({ savedMeats, meatOptions: lookupOptions(savedMeats) });
    } catch (_) { this.setData({ meatSaveMessage: '无法读取自定义肉类，请保留本地数据并重试。' }); }
  },
  onMeatChange(event) {
    const meatIndex = Number(event.detail.value);
    if (!Number.isInteger(meatIndex) || meatIndex < 0 || meatIndex >= this.data.meatOptions.length) return;
    const selected = this.data.meatOptions[meatIndex];
    if (selected.custom) this.setData({ customForm: { ...(selected.form || emptyForm()) } });
    this.setData({ meatSaveMessage: '' });
    this.updateMeatLookup(meatIndex, this.data.meatGrams);
  },

  onMeatSearch(event) {
    const meatQuery = event.detail.value;
    const previousId = this.data.meatOptions[this.data.meatIndex].id;
    const meatOptions = lookupOptions(this.data.savedMeats, meatQuery);
    const meatIndex = Math.max(0, meatOptions.findIndex(item => item.id === previousId));
    this.setData({ meatQuery, meatOptions });
    if (meatOptions[meatIndex].id !== previousId) {
      const selected = meatOptions[meatIndex];
      if (selected.custom) this.setData({ customForm: { ...(selected.form || { ...emptyForm(), name: String(meatQuery).trim().slice(0, 40) }) } });
    }
    this.updateMeatLookup(meatIndex, this.data.meatGrams);
  },

  onCustomMeatInput(event) {
    const field = event.currentTarget.dataset.field;
    if (!Object.prototype.hasOwnProperty.call(emptyForm(), field) || field === 'energyUnit') return;
    this.setData({ [`customForm.${field}`]: event.detail.value, meatSaveMessage: '' });
    this.updateMeatLookup(this.data.meatIndex, this.data.meatGrams);
  },

  onEnergyUnitChange(event) {
    const index = Number(event.detail.value);
    if (index !== 0 && index !== 1) return;
    this.setData({ 'customForm.energyUnit': this.data.energyUnits[index], meatSaveMessage: '' });
    this.updateMeatLookup(this.data.meatIndex, this.data.meatGrams);
  },

  saveCustomMeat() {
    if (!this.data.meatIsCustom) return;
    try {
      const form = validateForm(this.data.customForm);
      const selected = this.data.meatOptions[this.data.meatIndex];
      if (selected.id === 'custom' && this.data.savedMeats.length >= 50) throw new Error('最多保存 50 项，请先删除不用的自定义肉类');
      const id = selected.id === 'custom' ? `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` : selected.id;
      const savedMeats = this.data.savedMeats.filter(entry => entry.id !== id).concat({ id, form });
      wx.setStorageSync('customMeatsV1', savedMeats);
      const meatOptions = lookupOptions(savedMeats);
      const meatIndex = meatOptions.findIndex(item => item.id === id);
      this.setData({ savedMeats, meatOptions, meatQuery: '', customForm: form, meatSaveMessage: '已保存在本机，下次可直接选择。' });
      this.updateMeatLookup(meatIndex, this.data.meatGrams);
    } catch (error) {
      this.setData({ meatSaveMessage: error.message || '保存失败，请检查本机存储后重试。' });
    }
  },

  deleteCustomMeat() {
    const selected = this.data.meatOptions[this.data.meatIndex];
    if (!selected.custom || selected.id === 'custom') return;
    const savedMeats = this.data.savedMeats.filter(entry => entry.id !== selected.id);
    try {
      wx.setStorageSync('customMeatsV1', savedMeats);
      this.setData({ savedMeats, meatOptions: lookupOptions(savedMeats), meatQuery: '', customForm: emptyForm(), meatSaveMessage: '已删除这项自定义肉类。' });
      this.updateMeatLookup(0, this.data.meatGrams);
    } catch (_) {
      this.setData({ meatSaveMessage: '删除失败，请稍后重试。' });
    }
  },

  onMeatInput(event) {
    this.updateMeatLookup(this.data.meatIndex, event.detail.value);
  },

  updateMeatLookup(meatIndex, meatGrams) {
    const selected = this.data.meatOptions[meatIndex];
    const form = this.data.customForm;
    const patch = { meatIndex, meatGrams, meatIsCustom: !!selected.custom, meatBasis: null,
      selectedCookedLabel: selected.custom ? (form.cookedLabel || '按录入做法') : selected.cookedLabel };
    try {
      patch.meatBasis = lookupReference(selected, form, 100);
      this.setData({ ...patch, meatResult: lookupReference(selected, form, meatGrams), meatError: '' });
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

});
