const tcb = require('@cloudbase/node-sdk');
const { authenticate } = require('./handler');
const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
exports.main = async () => authenticate(app.auth().getUserInfo(), process.env.EXPECTED_APP_ID);
