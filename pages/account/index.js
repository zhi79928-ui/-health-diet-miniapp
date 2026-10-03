const account = require('../../utils/account');
const accountBackup = require('../../utils/account-backup');
const reminders = require('../../utils/reminders');
const body = require('../../utils/body-shape');
const bodyRenderer = require('../../utils/body-renderer');
const tracker = require('../../utils/tracker');
const waist = require('../../utils/waist');
function backupTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp + 8 * 60 * 60 * 1000), pad = value => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
Page({
  goBody() { wx.navigateTo({ url: '/pages/body/index' }); },
  toggleAccountInfo() { this.setData({ accountInfoOpen: !this.data.accountInfoOpen }); },
  toggleReminderInfo() { this.setData({ reminderInfoOpen: !this.data.reminderInfoOpen }); },
  data: { ready: false, profile: null, agreed: false, busy: false, message: '', backupBusy: false, backupMeta: null, backupMessage: '', reminderReady: false, reminderTime: '20:30', reminderBusy: false, reminderMessage: '', reminderJob: null, bodyPreviewLabel: '示例体型 · 175 cm / 70 kg', bodyPreviewError: '' },
  onLoad() {
    this.previewClosed = false;
    this.previewHidden = false;
    this.previewYaw = -.35;
    this.refreshBodyPreview();
  },
  onReady() { this.setupBodyPreview(); },
  onShow() {
    this.previewHidden = false;
    this.refreshBodyPreview();
    this.startBodyPreview();
    const profile = account.current();
    this.setData({ backupHint: profile ? accountBackup.status(profile.accountId, this.data.backupMeta) : '' });
    this.setData({ ready: account.available(), profile, reminderReady: reminders.ready() });
    if (profile) this.refreshBackup();
    try { this.setData({ reminderTime: reminders.preference().time }); } catch (error) { this.setData({ reminderMessage: error.message }); }
    this.refreshReminder();
  },
  onHide() { this.previewHidden = true; this.stopBodyPreview(); },
  onUnload() {
    this.previewClosed = true;
    this.stopBodyPreview();
    if (this.previewRenderer && typeof this.previewRenderer.dispose === 'function') this.previewRenderer.dispose();
    this.previewRenderer = null;
    this.previewCanvas = null;
    this.previewFaces = null;
  },
  refreshBodyPreview() {
    let measurement = { height: 175, weight: 70, waist: null }, example = true;
    try {
      const saved = wx.getStorageSync('healthForm'), weights = tracker.readWeights(), waists = waist.read(), form = saved && saved.form || {};
      const height = Number(form.heightCm), storedWeight = form.weight === '' || form.weight == null ? NaN : Number(form.weight) / (saved && saved.weightUnit === 'kg' ? 1 : 2);
      const candidate = { height: height || 175, weight: weights.length ? weights[weights.length - 1].kg : (storedWeight || 70), waist: waists.length ? waists[waists.length - 1].cm : '' };
      measurement = body.measurements(candidate);
      example = !(height && (weights.length || storedWeight));
    } catch (_) { measurement = { height: 175, weight: 70, waist: null }; example = true; }
    this.previewFaces = body.mesh(measurement);
    const waistLabel = measurement.waist === null ? '' : ` · 腰围 ${measurement.waist} cm`;
    this.setData({ bodyPreviewLabel: `${example ? '示例体型 · ' : ''}${measurement.height} cm / ${measurement.weight} kg${waistLabel}` });
    if (this.previewRenderer) {
      try { this.previewRenderer.setMesh(this.previewFaces); this.paintBodyPreview(); }
      catch (error) { this.setData({ bodyPreviewError: error.message || '体型预览暂时无法显示' }); }
    }
  },
  setupBodyPreview() {
    wx.createSelectorQuery().in(this).select('#accountBodyCanvas').fields({ node: true, size: true }).exec(result => {
      if (this.previewClosed) return;
      try {
        if (!result[0] || !result[0].node) throw new Error('当前设备无法显示立体预览');
        const { node, width, height } = result[0], info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(), ratio = Math.min(info.pixelRatio || 1, 2);
        node.width = width * ratio; node.height = height * ratio;
        this.stopBodyPreview();
        if (this.previewRenderer && typeof this.previewRenderer.dispose === 'function') this.previewRenderer.dispose();
        this.previewCanvas = node;
        this.previewSize = { width, height };
        this.previewRenderer = bodyRenderer.create(node);
        this.previewRenderer.setMesh(this.previewFaces || body.mesh({ height: 175, weight: 70, waist: '' }));
        this.setData({ bodyPreviewError: '' });
        this.paintBodyPreview();
        this.startBodyPreview();
      } catch (error) { this.setData({ bodyPreviewError: error.message || '体型预览暂时无法显示' }); }
    });
  },
  paintBodyPreview() {
    if (!this.previewRenderer || !this.previewSize) return;
    try { this.previewRenderer.draw(this.previewYaw, 0, 1, this.previewSize.width, this.previewSize.height); }
    catch (error) { this.stopBodyPreview(); this.setData({ bodyPreviewError: error.message || '体型预览暂时无法显示' }); }
  },
  stopBodyPreview() {
    this.previewLastFrame = null;
    if (this.previewFrame && this.previewCanvas) this.previewCanvas.cancelAnimationFrame(this.previewFrame);
    this.previewFrame = null;
  },
  startBodyPreview() {
    this.stopBodyPreview();
    if (this.previewClosed || this.previewHidden || !this.previewCanvas || !this.previewRenderer) return;
    const rotate = timestamp => {
      this.previewFrame = null;
      if (this.previewClosed || this.previewHidden || !this.previewCanvas || !this.previewRenderer) return;
      const now = Number.isFinite(timestamp) ? timestamp : Date.now();
      if (this.previewLastFrame === null) this.previewLastFrame = now;
      else if (now - this.previewLastFrame >= 45) {
        const elapsed = Math.min(120, Math.max(0, now - this.previewLastFrame));
        this.previewYaw = (this.previewYaw + elapsed * Math.PI * 2 / 24000) % (Math.PI * 2);
        this.previewLastFrame = now;
        this.paintBodyPreview();
      }
      this.previewFrame = this.previewCanvas.requestAnimationFrame(rotate);
    };
    this.previewFrame = this.previewCanvas.requestAnimationFrame(rotate);
  },
  async refreshBackup() {
    try {
      const result = await account.backupStatus();
      this.setData({ backupHint: accountBackup.status(result.accountId, result.backup) });
      this.setData({ backupMeta: result.backup ? { ...result.backup, label: backupTime(result.backup.updatedAt) } : null, backupMessage: result.backup ? '' : '云端还没有备份。' });
    } catch (error) { this.setData({ backupMessage: error.message || '暂时无法读取云端备份状态' }); }
  },
  async backupNow() {
    if (this.data.backupBusy) return;
    this.setData({ backupBusy: true, backupMessage: '' });
    try {
      const payload = accountBackup.collect();
      const result = await account.backup(payload);
      accountBackup.remember(result.accountId, result.backup.updatedAt, payload);
      this.setData({ backupHint: accountBackup.status(result.accountId, result.backup) });
      this.setData({ backupMeta: { ...result.backup, label: backupTime(result.backup.updatedAt) }, backupMessage: '本机记录已备份到云端。' });
    } catch (error) { this.setData({ backupMessage: error.message || '备份失败，请检查网络后重试' }); }
    finally { this.setData({ backupBusy: false }); }
  },
  restoreFromCloud() {
    if (this.data.backupBusy || !this.data.backupMeta) return;
    wx.showModal({
      title: '恢复云端备份？',
      content: '云端记录会替换本机饮食、体重、腰围、打卡、自定义食物、常用餐和健康设置。旧备份没有腰围时，本机腰围也会被清除。',
      confirmText: '确认恢复',
      success: async result => {
        if (!result.confirm) return;
        this.setData({ backupBusy: true, backupMessage: '' });
        try {
          const response = await account.restore();
          if (!response.backup) throw new Error('云端还没有备份');
          accountBackup.restore(response.backup);
          accountBackup.remember(response.accountId, response.updatedAt, accountBackup.collect());
          this.setData({ backupMeta: { updatedAt: response.updatedAt, label: backupTime(response.updatedAt) }, backupHint: accountBackup.status(response.accountId, { updatedAt: response.updatedAt }) });
          this.setData({ backupMessage: '云端记录已恢复到本机。返回“今日”即可查看。' });
        } catch (error) { this.setData({ backupMessage: error.message || '恢复失败，本机原有记录已保留' }); }
        finally { this.setData({ backupBusy: false }); }
      }
    });
  },
  deleteCloudBackup() {
    if (this.data.backupBusy || !this.data.backupMeta) return;
    wx.showModal({
      title: '删除云端备份？',
      content: '只删除当前微信账号的云端副本，不会删除这台设备上的饮食、体重或打卡记录。此操作无法撤销。',
      confirmText: '确认删除',
      confirmColor: '#b5483f',
      success: async result => {
        if (!result.confirm) return;
        this.setData({ backupBusy: true, backupMessage: '' });
        try {
          await account.deleteBackup();
          this.setData({ backupHint: '本机记录尚未备份到当前账号。' });
          this.setData({ backupMeta: null, backupMessage: '云端备份已删除，本机记录仍然保留。' });
        } catch (error) { this.setData({ backupMessage: error.message || '删除失败，请检查网络后重试' }); }
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
