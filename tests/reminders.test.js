const assert = require('assert');
const { chinaDate, nextSlot, decision, ownerId, messageData } = require('../cloudfunctions/habitReminder/policy');
const before=Date.parse('2026-09-20T20:00:00+08:00');
assert.equal(chinaDate(Date.parse('2026-09-20T16:30:00Z')),'2026-09-21');
assert.equal(nextSlot('20:30',before,false).date,'2026-09-20');
assert.equal(nextSlot('19:00',before,false).date,'2026-09-21');
assert.equal(nextSlot('20:30',before,true).date,'2026-09-21');
assert.equal(nextSlot('00:00',Date.parse('2024-02-28T23:59:00+08:00'),false).date,'2024-02-29');
assert.throws(()=>nextSlot('25:00',before,false));
const job={status:'pending',...nextSlot('20:30',before,false)};
assert.equal(decision(job,before,false),'wait');assert.equal(decision(job,job.dueAt,true),'skipped');assert.equal(decision(job,job.dueAt,false),'send');assert.equal(decision(job,job.dueAt+86400000,false),'expired');assert.equal(decision({...job,status:'sent'},job.dueAt,false),'wait');
assert.deepStrictEqual(messageData('{"thing1":"记下一小步","time2":"{time}"}',before),{thing1:{value:'记下一小步'},time2:{value:'2026-09-20 20:00'}});
assert.throws(()=>messageData('{}',before));
let storage={}, requests=0, calls=[];
global.wx={getStorageSync:key=>storage[key],setStorageSync:(key,value)=>storage[key]=JSON.parse(JSON.stringify(value)),cloud:{callFunction:async({data})=>{calls.push(data);return {result:{ok:true,job}};}},requestSubscribeMessage(options){requests++;options.success({template:'accept'});}};
const client=require('../utils/reminders'),config=require('../config/reminders'),cloudConfig=require('../config/cloud');
async function run(){
 assert.equal(client.ready(),false);client.saveTime('21:00');assert.equal(client.preference().time,'21:00');await assert.rejects(client.subscribe('21:00'),/暂未开通/);assert.equal(requests,0);
 config.enabled=true;config.templateId='template';cloudConfig.envId='test';await client.syncCheckin();assert.equal(calls.length,0);
 wx.requestSubscribeMessage=options=>{requests++;options.success({template:'reject'});};await assert.rejects(client.subscribe('21:00'),/未同意/);assert.equal(calls.length,0);
 wx.requestSubscribeMessage=options=>{requests++;options.success({template:'accept'});};await client.subscribe('21:00');assert.equal(calls[0].action,'schedule');assert.equal(client.preference().subscribed,true);
 client.saveTime('22:00');assert.equal(client.preference().subscribed,true);
 const date=chinaDate(Date.now());storage.habitCheckinsV1={[date]:{meals:1,weight:false}};await client.syncCheckin();assert.equal(calls[calls.length-1].action,'checkin');await client.cancel();assert.equal(client.preference().subscribed,false);
 wx.cloud.callFunction=async()=>{throw new Error('offline');};await assert.rejects(client.subscribe('22:00'),/offline/);assert.equal(client.preference().subscribed,false);
 config.enabled=false;cloudConfig.envId='';
 // Execute real cloud handler with an in-memory SDK; no actual notifications sent.
 const Module=require('module'), originalLoad=Module._load;const tables={habitReminderJobs:new Map(),habitReminderChecks:new Map()};let context={APPID:'app',OPENID:'user'},sends=0,failSend=false,now=before;
 const matches=(row,filter)=>Object.keys(filter).every(key=>typeof filter[key]==='function'?filter[key](row[key]):row[key]===filter[key]);
 function collection(name){const table=tables[name];return {doc(id){return{async set({data}){table.set(id,{...data,_id:id});}};},where(filter){let limit=100;return{limit(n){limit=n;return this;},async get(){return{data:[...table.values()].filter(row=>matches(row,filter)).slice(0,limit).map(row=>({...row}))};},async update({data}){let updated=0;for(const [id,row]of table){if(matches(row,filter)){table.set(id,{...row,...data});updated++;}}return{stats:{updated}};}};}};}
 const cloud={init(){},DYNAMIC_CURRENT_ENV:'test',getWXContext:()=>context,database:()=>({collection,command:{lte:n=>v=>v<=n,in:values=>v=>values.includes(v)}}),openapi:{subscribeMessage:{async send(){sends++;if(failSend)throw new Error('delivery unknown');return{errCode:0};}}}};
 Module._load=function(name,...args){return name==='wx-server-sdk'?cloud:originalLoad.call(this,name,...args);};
 const handler=require('../cloudfunctions/habitReminder/index').main;Module._load=originalLoad;
 const realNow=Date.now;Date.now=()=>now;process.env.EXPECTED_APP_ID='app';process.env.REMINDER_TEMPLATE_ID='template';process.env.REMINDER_DATA_JSON='{"thing1":"打卡提醒"}';
 try {
  await handler({action:'schedule',time:'20:30',templateId:'template',openid:'someone-else'});assert.ok(tables.habitReminderJobs.has(ownerId('user','app')));assert.ok(!tables.habitReminderJobs.has(ownerId('someone-else','app')));
  await assert.rejects(handler({Type:'Timer',TriggerName:'habitReminderTimer'}),/无效定时/);
  now=job.dueAt;context={};await Promise.all([handler({Type:'Timer',TriggerName:'habitReminderTimer'}),handler({Type:'Timer',TriggerName:'habitReminderTimer'})]);assert.equal(sends,1);
  now=before;context={APPID:'app',OPENID:'user'};await handler({action:'schedule',time:'20:30',templateId:'template'});await handler({action:'checkin',date:'2026-09-20'});now=job.dueAt;context={};await handler({Type:'Timer',TriggerName:'habitReminderTimer'});assert.equal(sends,1);assert.equal(tables.habitReminderJobs.get(ownerId('user','app')).status,'skipped');
  now=before;context={APPID:'app',OPENID:'other'};await handler({action:'schedule',time:'20:30',templateId:'template'});await handler({action:'cancel'});now=job.dueAt;context={};await handler({Type:'Timer',TriggerName:'habitReminderTimer'});assert.equal(sends,1);
  now=before;context={APPID:'app',OPENID:'failure'};await handler({action:'schedule',time:'20:30',templateId:'template'});now=job.dueAt;context={};failSend=true;await handler({Type:'Timer',TriggerName:'habitReminderTimer'});await handler({Type:'Timer',TriggerName:'habitReminderTimer'});assert.equal(sends,2);assert.equal(tables.habitReminderJobs.get(ownerId('failure','app')).status,'failed');
 } finally{Date.now=realNow;}
 console.log('Reminders: opt-in, disabled configuration, CST rollover, skip completed days, trusted identity, cancellation, concurrent claims and no duplicate retry passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
