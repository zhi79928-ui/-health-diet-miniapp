const cloudConfig = require('./config/cloud');
App({
  onLaunch() { if (cloudConfig.envId && wx.cloud) wx.cloud.init({ env: cloudConfig.envId, traceUser: false }); },
  globalData: {
    appName: '轻体计划'
  }
});
