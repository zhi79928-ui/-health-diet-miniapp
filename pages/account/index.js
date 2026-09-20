const account = require('../../utils/account');
Page({
  data: { ready: false, profile: null, agreed: false, busy: false, message: '' },
  onShow() { this.setData({ ready: account.available(), profile: account.current() }); },
  onConsent(event) { this.setData({ agreed: event.detail.value.includes('account') }); },
  async login() {
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    try { const profile = await account.login(this.data.agreed); this.setData({ profile, message: '微信身份已验证。当前饮食与打卡记录仍保存在本机。' }); }
    catch (error) { this.setData({ message: error.message || '登录失败，请检查网络后重试' }); }
    finally { this.setData({ busy: false }); }
  },
  logout() { account.logout(); this.setData({ profile: null, message: '已退出本次登录，本机记录保留。' }); },
  goToday() { wx.switchTab({ url: '/pages/today/index' }); }
});
