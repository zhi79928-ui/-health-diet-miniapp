const tcb = require('@cloudbase/node-sdk');
const { authenticate } = require('./handler');
const { validateBackup } = require('./backup');
const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const backups = app.database().collection('accountBackups');

async function find(accountId) {
  const result = await backups.where({ _id: accountId }).limit(1).get();
  return result.data[0] || null;
}

exports.main = async (event = {}) => {
  const identity = authenticate(app.auth().getUserInfo(), process.env.EXPECTED_APP_ID);
  if (!identity.ok) return identity;
  if (!event.action || event.action === 'login') return identity;
  if (event.action === 'backup') {
    const backup = validateBackup(event.backup);
    const updatedAt = Date.now();
    await backups.doc(identity.accountId).set({ payload: backup, updatedAt });
    return { ...identity, backup: { updatedAt } };
  }
  if (event.action === 'deleteBackup') {
    await backups.doc(identity.accountId).remove();
    return { ...identity, backup: null };
  }
  const record = await find(identity.accountId);
  if (event.action === 'status') return { ...identity, backup: record ? { updatedAt: record.updatedAt } : null };
  if (event.action === 'restore') return { ...identity, backup: record ? record.payload : null, updatedAt: record ? record.updatedAt : null };
  throw new Error('不支持的账号操作');
};
