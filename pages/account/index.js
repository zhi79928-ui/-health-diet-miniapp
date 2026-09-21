const account = require('../../utils/account');
const accountBackup = require('../../utils/account-backup');
const reminders = require('../../utils/reminders');
function backupTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp + 8 * 60 * 60 * 1000), pad = value => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
Page({
  data: { ready: false, profile: null, agreed: false, busy: false, message: '', backupBusy: false, backupMeta: null, backupMessage: '', reminderReady: false, reminderTime: '20:30', reminderBusy: false, reminderMessage: '', reminderJob: null },
  onShow() {
    const profile = account.current();
    this.setData({ ready: account.available(), profile, reminderReady: reminders.ready() });
    if (profile) this.refreshBackup();
    try { this.setData({ reminderTime: reminders.preference().time }); } catch (error) { this.setData({ reminderMessage: error.message }); }
    this.refreshReminder();
  },
  async refreshBackup() {
    try {
      const result = await account.backupStatus();
      this.setData({ backupMeta: result.backup ? { ...result.backup, label: backupTime(result.backup.updatedAt) } : null, backupMessage: result.backup ? '' : '云端还没有备份。' });
    } catch (error) { this.setData({ backupMessage: error.message || '暂时无法读取云端备份状态' }); }
  },
  async backupNow() {
    if (this.data.backupBusy) return;
    this.setData({ backupBusy: true, backupMessage: '' });
    try {
      const result = await account.backup(accountBackup.collect());
      this.setData({ backupMeta: { ...result.backup, label: backupTime(result.backup.updatedAt) }, backupMessage: '本机记录已备份到云端。' });
    } catch (error) { this.setData({ backupMessage: error.message || '备份失败，请检查网络后重试' }); }
    finally { this.setData({ backupBusy: false }); }
  },
  restoreFromCloud() {
    if (this.data.backupBusy || !this.data.backupMeta) return;
    wx.showModal({
      title: '恢复云端备份？',
      content: '云端记录会替换这台设备上的饮食、体重、打卡、自定义食物和常用餐记录。',
      confirmText: '确认恢复',
      success: async result => {
        if (!result.confirm) return;
        this.setData({ backupBusy: true, backupMessage: '' });
        try {
          const response = await account.restore();
          if (!response.backup) throw new Error('云端还没有备份');
          accountBackup.restore(response.backup);
          this.setData({ backupMessage: '云端记录已恢复到本机。返回“今日”即可查看。' });
        } catch (error) { this.setData({ backupMessage: error.message || '恢复失败，本机原有记录已保留' }); }
        finally { this.setData({ backupBusy: false }); }
      }
    });
  },
  async refreshReminder() {
    if (!reminders.ready()) return;
    try {
      const result = await reminders.status();
      const labels = { pending: '待提醒', sending: '发送处理中', sent: '已发送', skipped: '已打卡，已跳过', expired: '已过期', cancelled: '已取消', failed: '发送失败或结果未确认' };
      this.setData({ reminderJob: result.job ? { ...result.job, label: labels[result.job.status] || '状态待确认' } : null });
    } catch (_) { this.setData({ reminderMessage: '无法确认云端提醒状态，已有提醒仍可能送达。请联网后重试。' }); }
  },
  onReminderTime(event) {
    try { reminders.saveTime(event.detail.value); this.setData({ reminderTime: event.detail.value, reminderMessage: '时间偏好已保存；已安排的提醒不会自动改时间，需重新订阅。' }); }
    catch (error) { this.setData({ reminderMessage: error.message }); }
  },
  async subscribeReminder() {
    if (this.data.reminderBusy) return;
    this.setData({ reminderBusy: true, reminderMessage: '' });
    try {
      const result = await reminders.subscribe(this.data.reminderTime);
      this.setData({ reminderJob: { ...result.job, label: '待提醒' }, reminderMessage: '已安排一次提醒；到时已同步打卡则跳过。' });
    } catch (error) { this.setData({ reminderMessage: (error.message || '订阅失败') + '。请查看云端状态，确认是否已有提醒。' }); await this.refreshReminder(); }
    finally { this.setData({ reminderBusy: false }); }
  },
  async cancelReminder() {
    if (this.data.reminderBusy) return;
    this.setData({ reminderBusy: true });
    try { await reminders.cancel(); this.setData({ reminderMessage: '已取消待发送提醒；已发出或正在送达的消息无法撤回。' }); await this.refreshReminder(); }
    catch (error) { this.setData({ reminderMessage: '取消未确认，已有提醒仍可能送达。请联网后重试。' }); }
    finally { this.setData({ reminderBusy: false }); }
  },
  onConsent(event) { this.setData({ agreed: event.detail.value.includes('account') }); },
  async login() {
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    try { const profile = await account.login(this.data.agreed); this.setData({ profile, message: '微信身份已验证。' }); await this.refreshBackup(); }
    catch (error) { this.setData({ message: error.message || '登录失败，请检查网络后重试' }); }
    finally { this.setData({ busy: false }); }
  },
  logout() { account.logout(); this.setData({ profile: null, backupMeta: null, backupMessage: '', message: '已退出登录，本机记录保留。' }); },
  goToday() { wx.switchTab({ url: '/pages/today/index' }); }
});
