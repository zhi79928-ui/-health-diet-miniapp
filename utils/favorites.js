const { createDiary, refreshDay } = require('./tracker');
const KEY = 'favoriteMealsV1';
const clone = value => JSON.parse(JSON.stringify(value));
function checkFoods(foods) {
  if (!Array.isArray(foods) || !foods.length || foods.length > 40) throw new Error('请选择 1～40 项食物');
  const day = createDiary('2026-01-01'); day.meals[0].foods = clone(foods); refreshDay(day);
}
function readFavorites() {
  const rows = wx.getStorageSync(KEY);
  if (rows === '' || rows === undefined || rows === null) return [];
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('收藏数据异常，请保留数据后重试');
  const ids = new Set();
  rows.forEach(row => {
    if (!row || typeof row.id !== 'string' || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 40 || !['food', 'meal'].includes(row.kind)) throw new Error('收藏数据异常，请保留数据后重试');
    ids.add(row.id); checkFoods(row.foods);
    if (row.kind === 'food' && row.foods.length !== 1) throw new Error('单项收藏数据异常');
  });
  return clone(rows);
}
function saveFavorite(name, foods, kind) {
  name = String(name || '').trim();
  if (!name || name.length > 40) throw new Error('请填写 1～40 字的收藏名称');
  if (!['food', 'meal'].includes(kind) || (kind === 'food' && foods.length !== 1)) throw new Error('收藏类型无效');
  checkFoods(foods);
  const rows = readFavorites();
  if (rows.length >= 100) throw new Error('最多保存 100 项收藏，请先删除不再使用的项目');
  // 重复点击不重复创建；同名不同份量可以共存。
  const clean = clone(foods).map(food => { delete food.rowKey; delete food.cookingLabel; return food; });
  const same = rows.find(row => row.name === name && row.kind === kind && JSON.stringify(row.foods) === JSON.stringify(clean));
  if (same) return rows;
  let id = String(Date.now()); while (rows.some(row => row.id === id)) id += 'a';
  const next = [{ id, name, kind, foods: clean }, ...rows]; wx.setStorageSync(KEY, next); return next;
}
function deleteFavorite(id) {
  const rows = readFavorites();
  if (!rows.some(row => row.id === id)) throw new Error('收藏不存在，请重新打开');
  const next = rows.filter(row => row.id !== id); wx.setStorageSync(KEY, next); return next;
}
function applyFavorite(day, mealIndex, favorite) {
  const next = refreshDay(day);
  if (!Number.isInteger(mealIndex) || !next.meals[mealIndex]) throw new Error('请选择餐次');
  if (next.meals[mealIndex].logged) throw new Error('这餐已记录，请先取消记录再添加');
  checkFoods(favorite.foods);
  if (next.meals[mealIndex].foods.length + favorite.foods.length > 40) throw new Error('添加后超过每餐 40 项上限');
  next.meals[mealIndex].foods.push(...clone(favorite.foods));
  return refreshDay(next); // 追加，不覆盖已有食物，也不自动标记吃过。
}
module.exports = { readFavorites, saveFavorite, deleteFavorite, applyFavorite };
