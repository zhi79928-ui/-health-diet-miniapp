const assert = require('assert');
const t = require('../utils/tracker');
const { suggest } = require('../utils/next-meal');
const { sumNutrition } = require('../utils/foods');
const today = t.dateKey();
let day = t.createDiary(today);
const original = JSON.stringify(day);
for (let index = 0; index < 4; index++) {
  const first = suggest(day,index), second = suggest(day,index,1);
  const groups = Array.from({length: 4}, (_, batch) => suggest(day,index,batch));
  assert.deepStrictEqual(groups.map(group => group.groupNumber), [1,2,3,4]);
  assert.ok(groups.every(group => group.totalChoices === 12 && group.groupCount === 4));
  assert.equal(new Set(groups.flatMap(group => group.choices.map(choice => choice.id))).size,12);
  assert.deepStrictEqual(suggest(day,index,4).choices,first.choices);
  assert.equal(first.choices.length,3);
  assert.equal(new Set([...first.choices,...second.choices].map(x=>x.id)).size,6);
  for (const choice of groups.flatMap(group => group.choices)) {
    assert.equal(choice.calories,sumNutrition(choice.foods).calories);
    assert.ok(choice.foods.every(food=>food.state && food.grams>0 && food.grams<1000));
  }
  assert.match(first.explanation,/一般搭配/);
}
assert.equal(JSON.stringify(day),original);
assert.throws(()=>suggest(day,9));
assert.throws(()=>suggest({...day,date:t.previousDate(today)},1),/今天/);
day=t.toggleMeal(t.addFood(day,0,'oats',60),0);
assert.throws(()=>suggest(day,0),/尚未记录/);
const targeted={...day,diaryOnly:false,target:{calories:2000,protein:120,carbs:250,fat:60}};
assert.match(suggest(targeted,1).explanation,/已参考/);
assert.match(suggest({...targeted,target:{calories:100,protein:10,carbs:10,fat:5}},1).explanation,/不建议因此跳餐/);
const changed=t.toggleMeal(t.addFood(targeted,3,'rice',600),3);
assert.notDeepStrictEqual(suggest(targeted,1).choices,suggest(changed,1).choices);
let storage={},definition,modal,fail=false;
global.wx={getStorageSync:k=>storage[k],setStorageSync(k,v){if(fail)throw new Error('full');storage[k]=JSON.parse(JSON.stringify(v));},showToast(){},showModal(v){modal=v;}};
global.Page=v=>{definition=v;};require('../pages/today/index');
const page={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(p){for(const k in p){const parts=k.split('.');let obj=this.data;parts.slice(0,-1).forEach(x=>obj=obj[x]);obj[parts[parts.length-1]]=p[k];}}};
page.openRecommendation();assert.equal(page.data.recommendation.choices.length,3);
const pick=()=>({currentTarget:{dataset:{id:page.data.recommendation.choices[0].id}}});
fail=true;page.chooseRecommendation(pick());assert.equal(page.data.day,null);assert.ok(page.data.recommendation);
fail=false;page.chooseRecommendation(pick());assert.equal(page.data.day.completed,0);assert.ok(page.data.day.meals[0].foods.length);assert.equal(page.data.recommendation,null);
page.openRecommendation();const before=JSON.stringify(page.data.day);page.chooseRecommendation(pick());modal.success({confirm:false});assert.equal(JSON.stringify(page.data.day),before);
page.chooseRecommendation(pick());modal.success({confirm:true});assert.equal(page.data.day.completed,0);
page.openRecommendation();page.chooseRecommendation(pick());page.data.day.meals[0].logged=true;modal.success({confirm:true});assert.equal(page.data.day.meals[0].logged,true);
page.closeRecommendation();page.data.selectedDate=t.previousDate(today);page.openRecommendation();assert.equal(page.data.recommendation,null);
console.log('Next meal: template totals, bounded ranking, rotation, date guards, explicit replacement and failed save passed.');
