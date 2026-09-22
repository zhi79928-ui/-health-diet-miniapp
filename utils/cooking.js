const { FOODS } = require('./foods');
const methods = {
  steam: { label: '蒸', steps: ['按条目要求去皮、去骨或去壳，切成大小接近的块。', '水烧开后上蒸屉，留出蒸汽通道，加盖蒸熟。', '按当前条目的生重或熟重记录；调味汁和油另外添加。'] },
  boil: { label: '煮', steps: ['清理可食部分；食物切块大小尽量一致。', '加水煮至适合食用的熟度，必要时沥水。', '熟重条目只称沥水后的可食部分，汤汁或调料另外记录。'] },
  braise: { label: '焖 / 炖', steps: ['食材分切；若先煎香，称量并记录实际用油。', '加入适量水，加盖小火焖炖至充分熟透、质地适合食用。', '去除不可食部分后按条目称重；糖、酱料及吃进的汤汁另计。'] },
  pan: { label: '煎', steps: ['擦干表面水分，切成厚薄接近的小块。', '先称量油，再下锅煎制，翻面使内外受热均匀。', '确认中心熟度后出锅；吃进的油和酱汁需另加到本餐。'] },
  bake: { label: '烤', steps: ['按食材和设备说明预热；将食材大小、厚度整理均匀。', '放入烤盘烤制，必要时翻面，避免只看表面颜色判断熟度。', '确认中心熟度后按条目称可食净重；刷油和酱汁另计。'] },
  rice: { label: '煮饭 / 焖饭', steps: ['淘洗谷物；干重条目在加水前称量。', '按包装水量和电饭锅对应模式煮熟、焖透。', '熟饭条目在煮好后称量；混合杂粮要分别按原料分摊，不能直接套纯米饭数值。'] },
  oats: { label: '冲泡 / 煮', steps: ['先称干燕麦，不能把冲泡后的总重量填进干重条目。', '按包装说明加水冲泡或煮熟；需要煮制的燕麦不要只用温水泡。', '另加的牛奶、豆浆、水果或坚果分别添加到本餐。'] }
};
function cookingGuide(food) {
  if (!food) throw new Error('请选择食物');
  const id = food.id;
  let keys = [], safety = '';
  const poultry = /^(chicken|thigh|drumstick|wing|turkey)/.test(id);
  const fish = /^(cod|salmon|tuna|tilapia)/.test(id);
  const red = /^(beef|pork|lamb|ribs|tenderloin)/.test(id);
  if (poultry || fish || red || /^shrimp/.test(id)) {
    keys = ['steam', 'boil', 'braise', 'pan', 'bake'];
    if (poultry) safety = '禽肉最厚处中心温度至少 74°C，用食物温度计确认。';
    else if (fish) safety = '鱼肉中心至少 63°C，或肉质不再透明且容易用叉子分开。';
    else if (/^shrimp/.test(id)) safety = '虾肉煮至呈珍珠白或白色且不透明。';
    else if (/^pork/.test(id)) safety = '当前条目是猪绞肉，中心至少 71°C；不要套用整块肉的温度。';
    else safety = '整块牛、猪、羊肉中心至少 63°C，并静置 3 分钟；绞肉至少 71°C。';
  } else if (['potatoBoiled', 'sweetPotatoBoiled', 'cornBoiled'].includes(id)) keys = ['boil'];
  else if (id === 'sweetPotatoBaked') keys = ['bake'];
  else if (['rice', 'brownRice', 'milletDry', 'milletCooked', 'quinoaCooked', 'buckwheatCooked'].includes(id)) keys = ['rice'];
  else if (id === 'oats') keys = ['oats'];
  else if (FOODS[id] && FOODS[id].category === 'vegetables') keys = /熟重/.test(food.state) ? ['boil'] : ['steam', 'boil'];
  // 熟肉的营养条目绑定做法；只展示该做法，避免“煮熟”套用“烤熟”数值。
  if (FOODS[id] && /熟/.test(food.state) && (poultry || fish || red)) {
    if (id === 'wingCooked' || id === 'lambCooked') keys = ['braise'];
    else if (id === 'porkCooked') keys = ['steam', 'boil', 'pan', 'braise'];
    else keys = ['bake'];
  }
  return { name: food.name, state: food.state, methods: keys.map(key => ({ key, ...methods[key] })), safety,
    note: keys.length ? '做法是操作参考，不自动更改营养数值。换做法后请重新核对对应条目；额外食材、油、糖、酱汁要分别记录。时间因厚度、份量与设备而异。' : '该条目暂没有统一做法。即食食品按包装食用，自定义食品请参考本品说明；不要用同名食物推断生熟状态。',
    weightNote: food.note || '' };
}
module.exports = { cookingGuide };
