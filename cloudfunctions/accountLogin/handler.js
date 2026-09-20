const crypto = require('crypto');
// 身份仅来自 SDK 的可信调用上下文，绝不接受客户端提交的 openId。
function authenticate(context, expectedAppId) {
  if (!expectedAppId || !context || context.appId !== expectedAppId || !context.openId || typeof context.openId !== 'string') return { ok: false };
  const accountId = crypto.createHash('sha256').update(context.appId + ':' + context.openId).digest('hex').slice(0, 24);
  // 该编号仅用于显示，不是访问令牌；未来数据接口必须逐次服务端鉴权。
  return { ok: true, accountId };
}
module.exports = { authenticate };
