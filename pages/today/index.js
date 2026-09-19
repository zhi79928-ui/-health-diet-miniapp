const { FOODS, foodPortion } = require('../../utils/foods');
const { dateKey, validDate, previousDate, refreshDay, copyPlan, replaceFood, addFood, removeFood, toggleMeal, replacementGrams, readDays, saveDay } = require('../../utils/tracker');
const options = Object.keys(FOODS).map(id => ({ id, label: `${FOODS[id].name} · ${FOODS[id].state}` }));
Page({
  data: { today: dateKey(), selectedDate: dateKey(), day: null, error: '', editor: null, foodOptions: options,
    swapModes: ['尽量保持蛋白质', '尽量保持热量', '手动填写克数'] },
  onShow() {
    const next = dateKey();
    const selected = this.data.selectedDate === this.data.today ? next : this.data.selectedDate;
    this.loadDay(selected);
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
      this.setData({ editor: { mealIndex, foodIndex, original, optionIndex, modeIndex: 2, grams: original ? String(original.grams) : '100', preview: null, error: '' } });
      this.previewEditor(false);
    } catch (error) { this.report(error); }
  },
  closeEditor() { this.setData({ editor: null }); },
  onSwapFood(event) {
    const optionIndex = Number(event.detail.value);
    if (!Number.isInteger(optionIndex) || !options[optionIndex] || !this.data.editor) return;
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
      const id = options[editor.optionIndex].id;
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
      const id = options[e.optionIndex].id;
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
