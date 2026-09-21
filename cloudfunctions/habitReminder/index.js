const cloud = require('wx-server-sdk');
const { chinaDate, ownerId, nextSlot, decision, messageData } = require('./policy');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const jobs = db.collection('habitReminderJobs');
const checks = db.collection('habitReminderChecks');
async function find(collection, id) { const result = await collection.where({ _id: id }).limit(1).get(); return result.data[0] || null; }
const checkKey = (owner, date) => owner + '_' + date;
async function dispatch(now) {
  // 配置错误时不领取任务，避免消耗用户的一次提醒机会。
  const data = messageData(process.env.REMINDER_DATA_JSON, now);
  if (!process.env.REMINDER_TEMPLATE_ID) throw new Error('未配置订阅模板');
  const pending = await jobs.where({ status: 'pending', dueAt: db.command.lte(now) }).limit(100).get();
  let sent = 0;
  for (const job of pending.data) {
    const checked = !!await find(checks, checkKey(job._id, job.date));
    const action = decision(job, now, checked);
    if (action === 'wait') continue;
    // 原子条件更新，只允许一个定时任务领取同一版本。取消/新订阅不会被旧任务覆盖。
    const filter = { _id: job._id, version: job.version, status: 'pending' };
    const claim = await jobs.where(filter).update({ data: { status: action === 'send' ? 'sending' : action, updatedAt: now } });
    if (!claim.stats || claim.stats.updated !== 1 || action !== 'send') continue;
    const activeFilter = { _id: job._id, version: job.version, status: 'sending' };
    try {
      const latest = await find(jobs, job._id);
      if (!latest || latest.version !== job.version || latest.status !== 'sending') continue;
      if (await find(checks, checkKey(job._id, job.date))) {
        await jobs.where(activeFilter).update({ data: { status: 'skipped' } }); continue;
      }
      const delivery = await cloud.openapi.subscribeMessage.send({ touser: job.openid, templateId: process.env.REMINDER_TEMPLATE_ID, page: 'pages/today/index', data, miniprogramState: process.env.MINIPROGRAM_STATE || 'formal', lang: 'zh_CN' });
      if (delivery && delivery.errCode && delivery.errCode !== 0) throw new Error('消息发送失败');
      await jobs.where(activeFilter).update({ data: { status: 'sent', updatedAt: Date.now() } }); sent++;
    } catch (_) {
      // 不自动重试：网络异常时发送结果可能未知，重试可能重复打扰。
      await jobs.where(activeFilter).update({ data: { status: 'failed', updatedAt: Date.now() } });
    }
  }
  return { ok: true, sent };
}
exports.main = async (event = {}) => {
  console.log('[提醒触发诊断]', JSON.stringify({
    Type: event.Type,
    type: event.type,
    TriggerName: event.TriggerName,
    triggerName: event.triggerName
  }));
  const context = cloud.getWXContext(), now = Date.now();
  if (event.Type === 'timer') {
    if (context.OPENID || event.TriggerName !== 'habitReminderTimer') throw new Error('无效定时调用');
    return dispatch(now);
  }
  if (!process.env.EXPECTED_APP_ID || context.APPID !== process.env.EXPECTED_APP_ID || !context.OPENID) throw new Error('微信身份验证失败');
  const owner = ownerId(context.OPENID, context.APPID);
  if (event.action === 'checkin') {
    const date = chinaDate(now);
    if (event.date !== date) throw new Error('仅同步北京时间当天的打卡状态');
    await checks.doc(checkKey(owner, date)).set({ data: { date, checked: true, createdAt: now } });
    return { ok: true };
  }
  if (event.action === 'cancel') {
    await jobs.where({ _id: owner, status: db.command.in(['pending', 'sending']) }).update({ data: { status: 'cancelled', updatedAt: now } }); return { ok: true };
  }
  if (event.action === 'schedule') {
    if (!process.env.REMINDER_TEMPLATE_ID || event.templateId !== process.env.REMINDER_TEMPLATE_ID) throw new Error('订阅模板配置不一致');
    messageData(process.env.REMINDER_DATA_JSON, now);
    const checked = !!await find(checks, checkKey(owner, chinaDate(now)));
    const slot = nextSlot(event.time, now, checked);
    await jobs.doc(owner).set({ data: { ...slot, openid: context.OPENID, version: require('crypto').randomBytes(12).toString('hex'), status: 'pending', updatedAt: now } });
    return { ok: true, job: { ...slot, status: 'pending' } };
  }
  if (event.action === 'status') {
    const job = await find(jobs, owner);
    return { ok: true, job: job ? { date: job.date, time: job.time, status: job.status } : null };
  }
  throw new Error('不支持的操作');
};
