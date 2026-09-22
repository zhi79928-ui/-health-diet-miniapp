const { FOODS, foodPortion } = require('../../utils/foods');
const { STAPLE_IDS } = require('../../utils/staples');
const { readFavorites, saveFavorite, deleteFavorite, applyFavorite } = require('../../utils/favorites');
const { cookingGuide } = require('../../utils/cooking');
const reminders = require('../../utils/reminders');
const { labelPortion } = require('../../utils/label-foods');
const { createDiary, setLabelFood } = require('../../utils/tracker');
const { readCheckins, evidence, checkIn, statistics } = require('../../utils/habits');
const { dateKey, validDate, previousDate, refreshDay, copyPlan, replaceFood, addFood, removeFood, toggleMeal, replacementGrams, readDays, saveDay } = require('../../utils/tracker');
const options = Object.keys(FOODS).map(id => ({ id, label: `${FOODS[id].name} · ${FOODS[id].state}` }));
Page({
  data: { today: dateKey(), selectedDate: dateKey(), day: null, error: '', editor: null, foodOptions: options,
    library: null, favoriteDraft: null, recipe: null, mealNames: ['早餐', '午餐', '加餐', '晚餐'], foodCategory: 'all', habit: {}, tasks: {}, habitError: '', swapModes: ['尽量保持蛋白质', '尽量保持热量', '手动填写克数', '尽量保持碳水（换主食）'] },
  onShow() {
    const next = dateKey();
    const selected = this.data.selectedDate === this.data.today ? next : this.data.selectedDate;
    this.loadDay(selected);
    this.loadHabits();
    this.syncReminderCheckin();
  },
  syncReminderCheckin() {
    reminders.syncCheckin().then(() => this.setData({ reminderSyncError: '' })).catch(() => this.setData({ reminderSyncError: '本机记录已保留，但提醒服务未同步成功，仍可能收到提醒。联网后重新打开本页可重试。' }));
  },
  loadHabits() {
    try { this.setData({ habit: statistics(readCheckins()), tasks: evidence(), habitError: '' }); }
    catch (error) { this.setData({ habitError: error.message }); }
  },
  goProgress() { wx.switchTab({ url: '/pages/progress/index' }); },
  completeCheckin() {
    try { checkIn(this.data.today); this.loadHabits(); this.syncReminderCheckin(); wx.showToast({ title: '今天的一小步，已记下', icon: 'none' }); }
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
  openLibrary(event) {
    try {
      this.checkRollover();
      const mealIndex = Number(event.currentTarget.dataset.meal || 0);
      const rows = readFavorites().map(row => ({ ...row, summary: row.foods.map(food => `${food.name} ${food.grams}${food.unit || 'g'}（${food.state}）`).join(' + ') }));
      this.setData({ library: { mealIndex, rows }, editor: null });
    } catch (error) { this.report(error); }
  },
  closeLibrary() { this.setData({ library: null }); },
  onLibraryMeal(event) {
    const mealIndex = Number(event.detail.value);
    if (this.data.library && [0, 1, 2, 3].includes(mealIndex)) this.setData({ 'library.mealIndex': mealIndex });
  },
  useFavorite(event) {
    try {
      this.checkRollover(); if (!this.data.library) return;
      const item = readFavorites().find(row => row.id === event.currentTarget.dataset.id);
      if (!item) throw new Error('收藏已变化，请重新打开');
      const day = this.data.day || createDiary(this.data.selectedDate);
      this.persist(applyFavorite(day, this.data.library.mealIndex, item));
      this.closeLibrary(); wx.showToast({ title: '已加入，吃完再记录', icon: 'none' });
    } catch (error) { this.report(error); }
  },
  removeFavorite(event) {
    try {
      if (!this.data.library) return;
      const meal = this.data.library.mealIndex;
      deleteFavorite(event.currentTarget.dataset.id); this.openLibrary({ currentTarget: { dataset: { meal } } });
    } catch (error) { this.report(error); }
  },
  collectFood(event) {
    try {
      const meal = this.data.day && this.data.day.meals[Number(event.currentTarget.dataset.meal)];
      const food = meal && meal.foods[Number(event.currentTarget.dataset.food)];
      if (!food) throw new Error('请选择有效食物');
      saveFavorite(food.name.slice(0, 40), [food], 'food'); wx.showToast({ title: '已收藏这项食物', icon: 'none' });
    } catch (error) { this.report(error); }
  },
  collectMeal(event) {
    const meal = this.data.day && this.data.day.meals[Number(event.currentTarget.dataset.meal)];
    if (!meal || !meal.foods.length) return this.report(new Error('先添加食物，再保存搭配'));
    this.setData({ favoriteDraft: { name: `我的${meal.name}`, foods: JSON.parse(JSON.stringify(meal.foods)) } });
  },
  onFavoriteName(event) { if (this.data.favoriteDraft) this.setData({ 'favoriteDraft.name': event.detail.value }); },
  closeFavoriteDraft() { this.setData({ favoriteDraft: null }); },
  saveMealFavorite() {
    try {
      if (!this.data.favoriteDraft) return;
      saveFavorite(this.data.favoriteDraft.name, this.data.favoriteDraft.foods, 'meal');
      this.closeFavoriteDraft(); wx.showToast({ title: '已保存整餐搭配', icon: 'none' });
    } catch (error) { this.report(error); }
  },
  showCooking(event) {
    try {
      const meal = this.data.day && this.data.day.meals[Number(event.currentTarget.dataset.meal)];
      const food = meal && meal.foods[Number(event.currentTarget.dataset.food)];
      const guide = cookingGuide(food); this.setData({ recipe: { ...guide, methodIndex: 0, active: guide.methods[0] || null } });
    } catch (error) { this.report(error); }
  },
  onCookingMethod(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (this.data.recipe && this.data.recipe.methods[index]) this.setData({ 'recipe.methodIndex': index, 'recipe.active': this.data.recipe.methods[index] });
  },
  closeCooking() { this.setData({ recipe: null }); },
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
      this.setData({ foodCategory: 'all' });
      this.setData({ foodOptions: options, foodQuery: '', editor: { mealIndex, foodIndex, original, optionIndex: Math.max(0, optionIndex), custom: !!(original && original.basis), form: original && original.basis ? { ...original.basis, calories: original.basis.estimated ? '' : String(original.basis.calories) } : { name: '', state: '即食净重', protein: '', carbs: '', fat: '', calories: '', unit: 'g', energyUnit: 'kcal' }, modeIndex: 2, grams: original ? String(original.grams) : '100', preview: null, error: '' } });
      this.previewEditor(false);
    } catch (error) { this.report(error); }
  },
  closeEditor() { this.setData({ editor: null }); },
  onFoodSearch(event) {
    if (!this.data.editor) return;
    const foodQuery = event.detail.value;
    const foodOptions = options.filter(item => (this.data.foodCategory === 'all' || (this.data.foodCategory === 'staples' ? STAPLE_IDS.includes(item.id) : FOODS[item.id].category === this.data.foodCategory)) && (item.label + ' ' + (FOODS[item.id].aliases || '')).includes(foodQuery.trim()));
    this.setData({ foodQuery, foodOptions, 'editor.optionIndex': 0, 'editor.modeIndex': 2 });
    this.previewEditor(false);
  },
  onFoodCategory(event) {
    const foodCategory = event.currentTarget.dataset.category;
    if (!['all', 'staples', 'vegetables', 'fruits'].includes(foodCategory) || !this.data.editor) return;
    this.setData({ foodCategory }); this.onFoodSearch({ detail: { value: '' } });
  },
  openStapleLabel(event) {
    if (!this.data.editor) return;
    const names = { mantou: '白面馒头', stickyCorn: '糯玉米', mixedGrain: '混合杂粮饭' };
    const name = names[event.currentTarget.dataset.kind];
    if (!name) return;
    this.setData({ 'editor.custom': true, 'editor.modeIndex': 2, 'editor.form': { name, state: '按包装标注状态称重', protein: '', carbs: '', fat: '', calories: '', unit: 'g', energyUnit: 'kcal' } }); this.previewEditor(false);
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
    if (![0, 1, 2, 3].includes(modeIndex) || !this.data.editor) return;
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
      if (!this.data.foodOptions[editor.optionIndex]) throw new Error('暂无匹配食物，请换个名称或分类搜索');
      const id = this.data.foodOptions[editor.optionIndex].id;
      let grams = editor.grams;
      if (recalculate && editor.original && editor.modeIndex !== 2) grams = String(replacementGrams(editor.original, id, editor.modeIndex === 0 ? 'protein' : editor.modeIndex === 3 ? 'carbs' : 'calories'));
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
