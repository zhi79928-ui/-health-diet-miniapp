# v1.5 视觉与每日打卡

首页增加备餐插画、今日小目标与日历入口；计划、食物、打卡页沿用相同视觉主题。

图片：`assets/meal-hero.jpg`，通过内置 imagegen 生成，原始图 1536 × 1024，发布为压缩 JPEG 960 × 640。本地随包加载，无远程图片依赖。图片是装饰插画，不代表推荐份量。

生成提示词：
> Polished wide landscape illustration for a Chinese healthy meal planning WeChat mini program. Soft premium 3D clay illustration: ceramic bowl with rice, broccoli, salmon and egg, sage green water bottle, tiny calendar with abstract checkmark. Warm ivory tabletop, warm sunlight, gentle shadows, muted forest green, sage, apricot and cream palette. Main objects on right two thirds, quiet pale ivory negative space on left. No people, text, letters, numbers, logos or watermark. Landscape 3:2.

## 打卡规则

- 当天记录至少一餐或保存当天体重，然后手动打卡；不要求每日称重或达到热量目标。
- 不自动打卡，不支持补签；重复点击不会增加次数。使用设备本地日期，跨日旧页面须重新操作。
- 连续天数从今天（已打卡）或昨天（今天未打卡）向前计算；最长连续和累计分别统计。
- 3、7、14、30 天徽章按累计解锁，不因中断消失。
- 日历保留打卡时餐次数和是否记录体重的摘要；之后修改饮食或体重不会改写该摘要。
- `habitCheckinsV1` 独立本地存储；写入成功后更新界面，异常数据不覆盖。清除缓存或更换设备不会同步记录。

## 验证

运行 `npm test`，覆盖连续天数、跨年和闰年、重复打卡、无记录拒绝、存储失败、异常数据、页面重进与月历导航。原生微信开发者工具与真机视觉仍需验收。

## 商业验证方向

这一版提供“计划 → 记录 → 打卡 → 回顾”的日常路径。未增加付费、广告或虚构用户数据，也未把连续打卡与健康效果绑定。上线后可通过自愿访谈验证记录耗时、次日回访和第七日使用情况；当前版本没有联网埋点。
