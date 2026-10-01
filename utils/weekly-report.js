const { dateKey, validDate, previousDate, refreshDay } = require('./tracker');

const KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const r1 = value => Math.round((value + Number.EPSILON) * 10) / 10;

function moveDate(value, amount) {
  if (!validDate(value) || !Number.isInteger(amount)) throw new Error('报告日期无效');
  const [year, month, day] = value.split('-').map(Number);
  return dateKey(new Date(year, month - 1, day + amount));
}

function periodDates(end) {
  if (!validDate(end)) throw new Error('报告日期无效');
  const start = moveDate(end, -6);
  const previousEnd = moveDate(start, -1);
  return { start, end, previousStart: moveDate(previousEnd, -6), previousEnd };
}

function mean(rows, key) {
  return rows.length ? r1(rows.reduce((total, row) => total + row[key], 0) / rows.length) : null;
}

function bodyPeriod(rows, start, end, key) {
  const selected = rows.filter(row => row.date >= start && row.date <= end).slice().sort((a, b) => a.date.localeCompare(b.date));
  return {
    count: selected.length,
    average: selected.length ? mean(selected, key) : null,
    latest: selected.length ? selected[selected.length - 1][key] : null,
    latestDate: selected.length ? selected[selected.length - 1].date : ''
  };
}

function nutritionPeriod(days, start, end) {
  const dates = [];
  for (let date = start; date <= end; date = moveDate(date, 1)) {
    const day = days[date] ? refreshDay(days[date]) : null;
    dates.push({
      date,
      shortDate: date.slice(5),
      meals: day ? day.completed : 0,
      recorded: !!(day && day.completed > 0),
      complete: !!(day && day.completed === 4)
    });
  }
  const recorded = dates.filter(row => row.recorded).map(row => refreshDay(days[row.date]));
  const averages = {};
  KEYS.forEach(key => { averages[key] = mean(recorded.map(day => day.consumed), key); });
  return {
    dates,
    recordedDays: recorded.length,
    completeDays: dates.filter(row => row.complete).length,
    meals: dates.reduce((total, row) => total + row.meals, 0),
    averages,
    fiberPartialDays: recorded.filter(day => day.consumed.fiberMissing > 0).length
  };
}

function difference(current, previous) {
  return current === null || previous === null ? null : r1(current - previous);
}

function build(days, weights, waists, end = previousDate(dateKey())) {
  if (!days || typeof days !== 'object' || Array.isArray(days) || !Array.isArray(weights) || !Array.isArray(waists)) throw new Error('周报数据无效');
  const range = periodDates(end);
  const current = nutritionPeriod(days, range.start, range.end);
  const previous = nutritionPeriod(days, range.previousStart, range.previousEnd);
  const nutrition = KEYS.reduce((result, key) => {
    result[key] = {
      current: current.averages[key],
      previous: previous.averages[key],
      difference: difference(current.averages[key], previous.averages[key])
    };
    return result;
  }, {});
  const currentWeight = bodyPeriod(weights, range.start, range.end, 'kg');
  const previousWeight = bodyPeriod(weights, range.previousStart, range.previousEnd, 'kg');
  const currentWaist = bodyPeriod(waists, range.start, range.end, 'cm');
  const previousWaist = bodyPeriod(waists, range.previousStart, range.previousEnd, 'cm');
  return {
    ...range,
    current,
    previous,
    nutrition,
    weight: { current: currentWeight, previous: previousWeight, difference: difference(currentWeight.average, previousWeight.average) },
    waist: { current: currentWaist, previous: previousWaist, difference: difference(currentWaist.average, previousWaist.average) }
  };
}

module.exports = { KEYS, moveDate, periodDates, nutritionPeriod, bodyPeriod, difference, build };
