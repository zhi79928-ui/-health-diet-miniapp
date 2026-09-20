const assert = require('assert');
const { FOODS, foodPortion } = require('../utils/foods');
const { STAPLE_IDS } = require('../utils/staples');
const { createDiary, addFood, replacementGrams, dateKey, saveDay } = require('../utils/tracker');
const { authenticate } = require('../cloudfunctions/accountLogin/handler');
let storage = {}, definition;
global.wx = { getStorageSync: k => storage[k], setStorageSync: (k,v) => { storage[k]=JSON.parse(JSON.stringify(v)); }, showToast() {} };
global.Page = value => { definition=value; };
function page(path) { delete require.cache[require.resolve(path)]; require(path); return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(patch) { for (const key in patch) { const parts=key.split('.'); let target=this.data; parts.slice(0,-1).forEach(k=>target=target[k]); target[parts[parts.length-1]]=patch[key]; } } }; }
const tap = dataset => ({ currentTarget: { dataset } }), ev=value=>({detail:{value}});
STAPLE_IDS.forEach(id => { const portion=foodPortion(id,100); assert.ok(portion.carbs>0 && portion.state && portion.note); });
assert.equal(foodPortion('cornBoiled',200).carbs,42);
assert.equal(foodPortion('potatoBoiled',200).calories,172);
assert.equal(foodPortion('milletDry',100).carbs,72.9);
assert.equal(foodPortion('milletCooked',100).carbs,23.7);
const rice=foodPortion('rice',200), grams=replacementGrams(rice,'potatoBoiled','carbs');
assert.ok(Math.abs(foodPortion('potatoBoiled',grams).carbs-rice.carbs)<=0.1);
assert.throws(()=>replacementGrams(rice,'oil','carbs'));
let day=addFood(createDiary(dateKey()),0,'rice',200); saveDay(day);
const today=page('../pages/today/index');today.onShow();today.openEditor(tap({meal:'0',food:'0'}));today.onFoodCategory(tap({category:'staples'}));
assert.ok(today.data.foodOptions.every(item=>STAPLE_IDS.includes(item.id)));
today.onFoodSearch(ev('土豆'));today.onSwapMode(ev('3'));assert.equal(today.data.editor.preview.carbs,56.4);today.applyEditor();assert.equal(today.data.day.meals[0].foods[0].id,'potatoBoiled');
today.openEditor(tap({meal:'0',add:'yes'})); assert.equal(today.data.foodCategory,'all');today.onFoodCategory(tap({category:'staples'}));today.openStapleLabel(tap({kind:'mantou'}));assert.equal(today.data.editor.form.name,'白面馒头');assert.equal(today.data.editor.preview,null);
assert.deepStrictEqual(authenticate({openId:'a',appId:'app'},''),{ok:false});
assert.deepStrictEqual(authenticate({openId:'a',appId:'wrong'},'app'),{ok:false});
assert.deepStrictEqual(authenticate({appId:'app'},'app'),{ok:false});
const a=authenticate({openId:'a',appId:'app'},'app'), b=authenticate({openId:'b',appId:'app'},'app');assert.ok(a.ok);assert.notEqual(a.accountId,b.accountId);
async function run() {
 const config=require('../config/cloud'), account=require('../utils/account');
 assert.equal(account.available(),false);await assert.rejects(account.login(true),/暂未开放/);assert.equal(account.current(),null);
 config.envId='test-only';let calls=0;wx.cloud={callFunction:async()=>{calls++;return {result:a};}};
 await assert.rejects(account.login(false),/同意/);assert.equal(calls,0);
 const me=page('../pages/account/index');me.onShow();me.onConsent(ev(['account']));await me.login();assert.equal(me.data.profile.accountId,a.accountId);me.logout();assert.equal(account.current(),null);assert.ok(storage.nutritionDaysV1);
 wx.cloud.callFunction=async()=>({result:{ok:false}});await assert.rejects(account.login(true),/验证失败/);assert.equal(account.current(),null);
 wx.cloud.callFunction=async()=>{throw new Error('offline');};await me.login();assert.equal(me.data.profile,null);assert.equal(me.data.busy,false);
 let resolve;wx.cloud.callFunction=()=>new Promise(r=>resolve=r);const pending=account.login(true);account.logout();resolve({result:a});await assert.rejects(pending,/取消/);assert.equal(account.current(),null);
 config.envId='';console.log('Staples and accounts: serving state, carb swaps, filters, label template, consent, identity isolation, failures and logout races passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
