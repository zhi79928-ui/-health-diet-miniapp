const { dateKey, validDate, readWeights, weightEntry, weightTrend, readDays, nutritionTrend } = require('../../utils/tracker');
const { readCheckins, statistics, monthCells } = require('../../utils/habits');
Page({
  data: { today: dateKey(), date: dateKey(), month: dateKey().slice(0, 7), weekdays: ['日', '一', '二', '三', '四', '五', '六'], cells: [], habit: {}, habitError: '', selectedCheckin: '', weight: '', unitIndex: 0, units: ['kg', '斤'], rows: [], trend: {}, nutrition: {}, dayRows: [], message: '', error: '' },
  onShow() {
    const today = dateKey();
    this.setData({ date: this.data.date === this.data.today ? today : this.data.date, today });
    this.loadRecords();
  },
  loadRecords() {
    this.loadCalendar();
    try {
      const rows = readWeights();
      const days = readDays();
      const dayRows = Object.keys(days).sort().reverse().slice(0, 14).map(date => ({ date, completed: days[date].meals.filter(meal => meal.logged).length }));
      this.setData({ rows: rows.slice().reverse(), trend: weightTrend(rows), nutrition: nutritionTrend(days), dayRows, error: '' });
      wx.nextTick(() => this.drawTrend());
    } catch (error) { this.setData({ error: error.message || '读取失败，请保留本地数据并重试' }); }
  },
  loadCalendar() {
    try { const records = readCheckins(); this.setData({ currentMonth: dateKey().slice(0, 7), habit: statistics(records), cells: monthCells(this.data.month, records), habitError: '', selectedCheckin: '' }); }
    catch (error) { this.setData({ habitError: error.message, cells: [] }); }
  },
  changeMonth(event) {
    const step = Number(event.currentTarget.dataset.step);
    if (step !== -1 && step !== 1) return;
    const [y, m] = this.data.month.split('-').map(Number);
    const month = dateKey(new Date(y, m - 1 + step, 1)).slice(0, 7);
    if (month > dateKey().slice(0, 7)) return;
    this.setData({ month }); this.loadCalendar();
  },
  inspectCheckin(event) {
    const date = event.currentTarget.dataset.date;
    if (!validDate(date) || date > dateKey()) return;
    try {
      const row = readCheckins()[date];
      this.setData({ selectedCheckin: row ? `${date} 已打卡 · 当时记录 ${row.meals} 餐${row.weight ? '，已记录体重' : ''}` : `${date} 暂无打卡记录` });
    } catch (error) { this.setData({ habitError: error.message }); }
  },
  goToday() { wx.switchTab({ url: '/pages/today/index' }); },
  onDateChange(event) { if (validDate(event.detail.value)) this.setData({ date: event.detail.value, message: '' }); },
  onWeightInput(event) { this.setData({ weight: event.detail.value, message: '' }); },
  onUnitChange(event) {
    const unitIndex = Number(event.detail.value);
    if (![0, 1].includes(unitIndex) || unitIndex === this.data.unitIndex) return;
    const n = Number(this.data.weight);
    this.setData({ unitIndex, weight: this.data.weight.trim() && Number.isFinite(n) ? String(Math.round(n * (unitIndex === 1 ? 2 : 0.5) * 10) / 10) : this.data.weight });
  },
  saveWeight() {
    try {
      const entry = weightEntry(this.data.date, this.data.weight, this.data.unitIndex === 0 ? 'kg' : 'jin');
      const rows = readWeights().filter(row => row.date !== entry.date).concat(entry);
      wx.setStorageSync('weightHistoryV1', rows);
      this.setData({ message: '已保存；同一天再次保存会更新该日体重。', error: '' });
      this.loadRecords();
    } catch (error) { this.setData({ message: error.message || '保存失败，请检查本机存储后重试' }); }
  },
  editWeight(event) {
    const row = this.data.rows.find(item => item.date === event.currentTarget.dataset.date);
    if (row) this.setData({ date: row.date, weight: String(row.kg), unitIndex: 0, message: '已选中这条记录，修改后点击保存。' });
  },
  deleteWeight(event) {
    try {
      const date = event.currentTarget.dataset.date;
      wx.setStorageSync('weightHistoryV1', readWeights().filter(row => row.date !== date));
      this.setData({ message: '已删除所选体重记录。' }); this.loadRecords();
    } catch (error) { this.setData({ message: error.message || '删除失败，请重试' }); }
  },
  drawTrend() {
    if (typeof wx.createSelectorQuery !== 'function') return;
    const rows = this.data.rows.slice(0, 30).reverse();
    if (!rows.length) return;
    wx.createSelectorQuery().in(this).select('#weightChart').boundingClientRect(rect => {
      if (!rect || !rect.width) return;
      const ctx = wx.createCanvasContext('weightChart', this);
      const w = rect.width, h = rect.height, left = 40, top = 18, right = w - 14, bottom = h - 30;
      const min = Math.min(...rows.map(row => row.kg)) - 0.5;
      const max = Math.max(...rows.map(row => row.kg)) + 0.5;
      const time = date => { const [y,m,d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d); };
      const first = time(rows[0].date), last = time(rows[rows.length - 1].date);
      const points = rows.map(row => ({ x: first === last ? (left + right) / 2 : left + (time(row.date) - first) / (last - first) * (right - left), y: bottom - (row.kg - min) / (max - min) * (bottom - top) }));
      ctx.clearRect(0, 0, w, h); ctx.setFontSize(10); ctx.setFillStyle('#718078'); ctx.setStrokeStyle('#e4ece7'); ctx.setLineWidth(1);
      for (let i = 0; i < 3; i++) { const y = top + i * (bottom - top) / 2; ctx.fillText((max - i * (max - min) / 2).toFixed(1), 0, y + 4); ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke(); }
      ctx.fillText(rows[0].date.slice(5), left, h - 8); if (rows.length > 1) ctx.fillText(rows[rows.length - 1].date.slice(5), right - 32, h - 8);
      ctx.setStrokeStyle('#268b5e'); ctx.setLineWidth(2); ctx.beginPath(); points.forEach((p,i) => { if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); }); ctx.stroke();
      ctx.setFillStyle('#268b5e'); points.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); }); ctx.draw();
    }).exec();
  }
});
