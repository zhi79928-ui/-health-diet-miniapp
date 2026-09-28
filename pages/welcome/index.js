const account = require('../../utils/account');

Page({
  data: { ready: false, agreed: false, busy: false, message: '' },
  onShow() {
    if (account.current()) return this.enter();
    this.setData({ ready: account.available(), busy: false });
  },
  onConsent(event) { this.setData({ agreed: event.detail.value.includes('account'), message: '' }); },
  async login() {
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    try {
      await account.login(this.data.agreed);
      this.enter();
    } catch (error) {
      this.setData({ busy: false, message: error.message || '登录失败，请检查网络后重试' });
    }
  },
  enter() { wx.switchTab({ url: '/pages/today/index' }); },
  useWithoutLogin() { this.enter(); }
});
