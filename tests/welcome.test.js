const assert = require('assert');
let storage = {}, definition, destination = '', calls = 0;
global.wx = {
  getStorageSync: key => storage[key],
  setStorageSync(key, value) { storage[key] = JSON.parse(JSON.stringify(value)); },
  removeStorageSync: key => delete storage[key],
  switchTab(value) { destination = value.url; },
  cloud: { async callFunction() { calls++; return { result: { ok: true, accountId: '0123456789abcdef01234567' } }; } }
};
global.Page = value => { definition = value; };
require('../pages/welcome/index');
function page() { return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(value) { Object.assign(this.data, value); } }; }

let screen = page(); screen.onShow();
assert.equal(screen.data.ready, true); assert.equal(destination, '');
screen.useWithoutLogin(); assert.equal(destination, '/pages/today/index'); assert.equal(calls, 0);
destination = ''; screen.onConsent({ detail: { value: ['account'] } });
screen.login().then(() => {
  assert.equal(calls, 1); assert.equal(destination, '/pages/today/index');
  assert.equal(storage.accountProfileV1.accountId, '0123456789abcdef01234567');
  destination = ''; const reopened = page(); reopened.onShow();
  assert.equal(destination, '/pages/today/index');
  console.log('Welcome: optional login, consent, identity persistence and returning-user redirect passed.');
}).catch(error => { console.error(error); process.exitCode = 1; });
