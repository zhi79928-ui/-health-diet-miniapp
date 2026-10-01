const tracker = require('../../utils/tracker');
const waist = require('../../utils/waist');
const weekly = require('../../utils/weekly-report');

const NUTRIENTS = [
  { key: 'calories', label: '日均热量', unit: 'kcal' },
  { key: 'protein', label: '日均蛋白', unit: 'g' },
  { key: 'carbs', label: '日均碳水', unit: 'g' },
  { key: 'fat', label: '日均脂肪', unit: 'g' },
  { key: 'fiber', label: '日均纤维', unit: 'g' }
];

function comparison(row, unit) {
  if (row.current === null) return '本期暂无记录';
  if (row.previous === null) return '对照期暂无记录，暂不比较';
  if (row.difference === 0) return '与对照期均值相同';
  return `较对照期均值${row.difference > 0 ? '增加' : '减少'} ${Math.abs(row.difference)} ${unit}`;
}

function bodyCard(label, unit, row) {
  const current = row.current;
  let compare = '本期暂无测量记录';
  if (current.count && !row.previous.count) compare = '对照期暂无记录，暂不比较';
  else if (current.count && row.difference === 0) compare = '与对照期测量均值相同';
  else if (current.count && row.difference !== null) compare = `较对照期测量均值${row.difference > 0 ? '增加' : '减少'} ${Math.abs(row.difference)} ${unit}`;
  return { label, unit, latest: current.latest, latestDate: current.latestDate, average: current.average, count: current.count, compare };
}

Page({
  data: { offset: 0, report: null, nutrientRows: [], bodyRows: [], error: '' },
  onShow() { this.loadReport(); },
  loadReport() {
    try {
      const latestEnd = tracker.previousDate(tracker.dateKey());
      const end = weekly.moveDate(latestEnd, this.data.offset * 7);
      const report = weekly.build(tracker.readDays(), tracker.readWeights(), waist.read(), end);
      const nutrientRows = NUTRIENTS.map(item => ({ ...item, ...report.nutrition[item.key], compare: comparison(report.nutrition[item.key], item.unit) }));
      const bodyRows = [bodyCard('体重', 'kg', report.weight), bodyCard('腰围', 'cm', report.waist)];
      this.setData({ report, nutrientRows, bodyRows, error: '' });
    } catch (error) { this.setData({ report: null, error: error.message || '周报读取失败，请保留本机数据并重试' }); }
  },
  changePeriod(event) {
    const step = Number(event.currentTarget.dataset.step);
    if (![ -1, 1 ].includes(step) || this.data.offset + step > 0) return;
    this.setData({ offset: this.data.offset + step });
    this.loadReport();
  },
  goToday() { wx.switchTab({ url: '/pages/today/index' }); },
  goProgress() { wx.switchTab({ url: '/pages/progress/index' }); }
});
