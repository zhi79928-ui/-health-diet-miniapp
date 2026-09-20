const { FOODS, foodPortion } = require('../../utils/foods');
const { labelPortion } = require('../../utils/label-foods');
const { createDiary, setLabelFood } = require('../../utils/tracker');
const { readCheckins, evidence, checkIn, statistics } = require('../../utils/habits');
const { dateKey, validDate, previousDate, refreshDay, copyPlan, replaceFood, addFood, removeFood, toggleMeal, replacementGrams, readDays, saveDay } = require('../../utils/tracker');
const options = Object.keys(FOODS).map(id => ({ id, label: `${FOODS[id].name} · ${FOODS[id].state}` }));
Page({
  data: { today: dateKey(), selectedDate: dateKey(), day: null, error: '', editor: null, foodOptions: options,
    habit: {}, tasks: {}, habitError: '', swapModes: ['尽量保持蛋白质', '尽量保持热量', '手动填写克数'] },
  onShow() {
    const next = dateKey();
    const selected = this.data.selectedDate === this.data.today ? next : this.data.selectedDate;
    this.loadDay(selected);
    this.loadHabits();
  },
  loadHabits() {
    try { this.setData({ habit: statistics(readCheckins()), tasks: evidence(), habitError: '' }); }
    catch (error) { this.setData({ habitError: error.message }); }
  },
  goProgress() { wx.switchTab({ url: '/pages/progress/index' }); },
  completeCheckin() {
    try { checkIn(this.data.today); this.loadHabits(); wx.showToast({ title: '今天的一小步，已记下', icon: 'none' }); }
    catch (error) { this.report(error); this.loadDay(dateKey()); this.loadHabits(); }
  },
  loadDay(selectedDate) {
    try {
      if (!validDate(selectedDate) || selectedDate > dateKey()) throw new Error('请选择今天或之前的日期');
      const days = readDays();
      this.setData({ today: dateKey(), selectedDate, day: days[selectedDate] ? refreshDay(days[selectedDate]) : null, error: '', editor: null });
    } catch (error) { this.setData({ day: null, editor: null, error: error.message || '读取失败，请保留本地数据并重试' }); }
  },
  onDateChange(event) { this.loadDay(event.detail.value); },
  goPlan() { wx.switchTab({ url: '/pages/index/index' }); },
  goFoods() { wx.switchTab({ url: '/pages/foods/index' }); },
  startDiary() {
    try { this.checkRollover(); if (!this.data.day) this.persist(createDiary(this.data.selectedDate)); }
    catch (error) { this.report(error); }
  },
  checkRollover() {
    if (this.data.selectedDate === this.data.today && this.data.today !== dateKey()) {
      this.loadDay(dateKey());
      throw new Error('日期已更新，请在新的一天重新操作');
    }
    if (this.data.error) throw new Error('请先重新进入页面读取记录');
  },
  report(error) { wx.showToast({ title: error.message || '操作失败，请重试', icon: 'none' }); },
  persist(day) {
    const saved = saveDay(day); // 写入成功后才更新界面，失败保留原记录。
    this.setData({ day: saved, error: '', editor: null });
    this.loadHabits();
  },
  copyYesterday() {
    try {
      this.checkRollover();
      const previous = readDays()[previousDate(this.data.selectedDate)];
      if (!previous) throw new Error('前一天没有计划，请先生成饮食方案');
      this.persist(copyPlan(previous, this.data.selectedDate, this.data.day));
    } catch (error) { this.report(error); }
  },
  toggleMeal(event) {
    try { this.checkRollover(); this.persist(toggleMeal(this.data.day, Number(event.currentTarget.dataset.meal))); }
    catch (error) { this.report(error); }
  },
  openEditor(event) {
    try {
      this.checkRollover();
      const mealIndex = Number(event.currentTarget.dataset.meal);
      const meal = this.data.day && this.data.day.meals[mealIndex];
      if (!meal || meal.logged) throw new Error('已记录的餐请先取消记录，再修改实际食物');
      const adding = event.currentTarget.dataset.add === 'yes';
      const foodIndex = adding ? null : Number(event.currentTarget.dataset.food);
      const original = adding ? null : meal.foods[foodIndex];
      if (!adding && !original) throw new Error('请选择有效食物');
      const optionIndex = original ? options.findIndex(item => item.id === original.id) : options.findIndex(item => item.id === 'rice');
      this.setData({ foodOptions: options, foodQuery: '', editor: { mealIndex, foodIndex, original, optionIndex: Math.max(0, optionIndex), custom: !!(original && original.basis), form: original && original.basis ? { ...original.basis, calories: original.basis.estimated ? '' : String(original.basis.calories) } : { name: '', state: '即食净重', protein: '', carbs: '', fat: '', calories: '', unit: 'g', energyUnit: 'kcal' }, modeIndex: 2, grams: original ? String(original.grams) : '100', preview: null, error: '' } });
      this.previewEditor(false);
    } catch (error) { this.report(error); }
  },
  closeEditor() { this.setData({ editor: null }); },
  onFoodSearch(event) {
    if (!this.data.editor) return;
    const foodQuery = event.detail.value;
    const foodOptions = options.filter(item => item.label.includes(foodQuery.trim()));
    this.setData({ foodQuery, foodOptions, 'editor.optionIndex': 0, 'editor.modeIndex': 2 });
    this.previewEditor(false);
  },
  setEntryMode(event) {
    if (!this.data.editor) return;
    this.setData({ 'editor.custom': event.currentTarget.dataset.mode === 'label', 'editor.modeIndex': 2 }); this.previewEditor(false);
  },
  onLabelField(event) {
    const field = event.currentTarget.dataset.field;
    if (!this.data.editor || !['name', 'state', 'protein', 'carbs', 'fat', 'calories'].includes(field)) return;
    this.setData({ [`editor.form.${field}`]: event.detail.value }); this.previewEditor(false);
  },
  onLabelUnit(event) {
    if (!this.data.editor) return;
    const unit = event.currentTarget.dataset.unit;
    if (!['g', 'mL'].includes(unit)) return;
    if (unit !== this.data.editor.form.unit) this.setData({ 'editor.form.unit': unit, 'editor.grams': '' });
    this.previewEditor(false);
  },
  onEnergyUnit(event) {
    if (!this.data.editor) return;
    const unit = event.currentTarget.dataset.unit;
    if (!['kcal', 'kJ'].includes(unit)) return;
    this.setData({ 'editor.form.energyUnit': unit }); this.previewEditor(false);
  },
  onSwapFood(event) {
    const optionIndex = Number(event.detail.value);
    if (!Number.isInteger(optionIndex) || !this.data.foodOptions[optionIndex] || !this.data.editor) return;
    this.setData({ 'editor.optionIndex': optionIndex });
    this.previewEditor(true);
  },
  onSwapMode(event) {
    const modeIndex = Number(event.detail.value);
    if (![0, 1, 2].includes(modeIndex) || !this.data.editor) return;
    this.setData({ 'editor.modeIndex': modeIndex }); this.previewEditor(true);
  },
  onSwapGrams(event) {
    if (!this.data.editor) return;
    this.setData({ 'editor.grams': event.detail.value, 'editor.modeIndex': 2 }); this.previewEditor(false);
  },
  previewEditor(recalculate) {
    const editor = this.data.editor;
    if (!editor) return;
    try {
      if (editor.custom) {
        this.setData({ 'editor.preview': labelPortion(editor.form, editor.grams), 'editor.error': '' }); return;
      }
      if (!this.data.foodOptions[editor.optionIndex]) throw new Error('未找到食物，可切换到按包装录入');
      const id = this.data.foodOptions[editor.optionIndex].id;
      let grams = editor.grams;
      if (recalculate && editor.original && editor.modeIndex !== 2) grams = String(replacementGrams(editor.original, id, editor.modeIndex === 0 ? 'protein' : 'calories'));
      const preview = foodPortion(id, grams);
      this.setData({ 'editor.grams': grams, 'editor.preview': preview, 'editor.error': '' });
    } catch (error) { this.setData({ 'editor.preview': null, 'editor.error': error.message }); }
  },
  applyEditor() {
    try {
      this.checkRollover();
      const e = this.data.editor;
      if (!e || !e.preview || e.error) throw new Error('请先填写有效食物和克数');
      if (e.custom) { this.persist(setLabelFood(this.data.day, e.mealIndex, e.foodIndex, e.form, e.grams)); return; }
      const id = this.data.foodOptions[e.optionIndex].id;
      this.persist(e.original ? replaceFood(this.data.day, e.mealIndex, e.foodIndex, id, e.grams) : addFood(this.data.day, e.mealIndex, id, e.grams));
    } catch (error) { this.report(error); }
  },
  removeEditorFood() {
    try {
      this.checkRollover();
      const e = this.data.editor;
      if (!e || !e.original) return;
      this.persist(removeFood(this.data.day, e.mealIndex, e.foodIndex));
    } catch (error) { this.report(error); }
  }
});
