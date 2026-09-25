// 每 100 g 可食部；香港食物安全中心《水果及蔬菜的营养素含量》(2007)，附件 V。
const sourceUrl = 'https://www.cfs.gov.hk/tc_chi/programme/programme_rafs/files/fruit%20and%20veg%20report_C%287.6.2007%29.pdf';
const PRODUCE = {
  choySum: {"name":"菜心","state":"生重·可食部","category":"vegetables","aliases":"菜薹","calories":18,"protein":2.1,"carbs":1.6,"fat":0.3,"fiber":1.5,"sourceId":"CFS-2007-choySum","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  chineseKale: {"name":"芥兰","state":"生重·可食部","category":"vegetables","aliases":"芥蓝","calories":34,"protein":3,"carbs":4.1,"fat":0.6,"fiber":2.3,"sourceId":"CFS-2007-chineseKale","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  carrot: {"name":"胡萝卜","state":"生重·可食部","category":"vegetables","aliases":"红萝卜 甘笋","calories":41,"protein":0.93,"carbs":9.58,"fat":0.24,"fiber":2.8,"sourceId":"CFS-2007-carrot","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  spinach: {"name":"菠菜","state":"生重·可食部","category":"vegetables","aliases":"","calories":21,"protein":2.3,"carbs":2,"fat":0.4,"fiber":1.7,"sourceId":"CFS-2007-spinach","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  bokChoy: {"name":"小白菜","state":"生重·可食部","category":"vegetables","aliases":"青菜","calories":20,"protein":2.7,"carbs":1.5,"fat":0.4,"fiber":1.5,"sourceId":"CFS-2007-bokChoy","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  shanghaiBokChoy: {"name":"上海青","state":"生重·可食部","category":"vegetables","aliases":"小唐菜","calories":18,"protein":2.3,"carbs":1.6,"fat":0.3,"fiber":1.6,"sourceId":"CFS-2007-shanghaiBokChoy","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  waterSpinach: {"name":"空心菜","state":"生重·可食部","category":"vegetables","aliases":"青通菜 通菜","calories":23,"protein":2,"carbs":2.9,"fat":0.4,"fiber":2.3,"sourceId":"CFS-2007-waterSpinach","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  pumpkin: {"name":"南瓜","state":"生重·可食部","category":"vegetables","aliases":"","calories":26,"protein":1,"carbs":6.5,"fat":0.1,"fiber":0.5,"sourceId":"CFS-2007-pumpkin","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  onion: {"name":"洋葱","state":"生重·可食部","category":"vegetables","aliases":"","calories":40,"protein":1.1,"carbs":9.34,"fat":0.1,"fiber":1.7,"sourceId":"CFS-2007-onion","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  winterMelon: {"name":"冬瓜","state":"生重·可食部","category":"vegetables","aliases":"","calories":13,"protein":0.4,"carbs":2.9,"fat":0,"fiber":1.1,"sourceId":"CFS-2007-winterMelon","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  greenBeans: {"name":"四季豆","state":"生重·可食部","category":"vegetables","aliases":"","calories":34,"protein":1.9,"carbs":6,"fat":0.3,"fiber":2.5,"sourceId":"CFS-2007-greenBeans","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  cauliflower: {"name":"菜花","state":"生重·可食部","category":"vegetables","aliases":"花椰菜","calories":25,"protein":1.98,"carbs":5.3,"fat":0.1,"fiber":2.5,"sourceId":"CFS-2007-cauliflower","note":"烹调前去除不可食部分称重；不是熟菜重量，油和调味另计。"},
  banana: {"name":"香蕉","state":"生重·可食部","category":"fruits","aliases":"","calories":89,"protein":1.09,"carbs":22.84,"fat":0.33,"fiber":2.6,"sourceId":"CFS-2007-banana","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  dragonfruit: {"name":"火龙果","state":"生重·可食部","category":"fruits","aliases":"","calories":61,"protein":1.1,"carbs":11,"fat":1.4,"fiber":1.7,"sourceId":"CFS-2007-dragonfruit","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  pear: {"name":"香梨","state":"生重·可食部","category":"fruits","aliases":"","calories":58,"protein":0.3,"carbs":14,"fat":0.3,"fiber":2.6,"sourceId":"CFS-2007-pear","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  kiwi: {"name":"猕猴桃","state":"生重·可食部","category":"fruits","aliases":"奇异果","calories":61,"protein":1.14,"carbs":14.66,"fat":0.52,"fiber":3,"sourceId":"CFS-2007-kiwi","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  mango: {"name":"芒果","state":"生重·可食部","category":"fruits","aliases":"","calories":65,"protein":0.51,"carbs":17,"fat":0.27,"fiber":1.8,"sourceId":"CFS-2007-mango","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  orange: {"name":"橙子","state":"生重·可食部","category":"fruits","aliases":"橙","calories":47,"protein":0.94,"carbs":11.75,"fat":0.12,"fiber":2.4,"sourceId":"CFS-2007-orange","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  papaya: {"name":"木瓜","state":"生重·可食部","category":"fruits","aliases":"","calories":39,"protein":0.61,"carbs":9.81,"fat":0.14,"fiber":1.8,"sourceId":"CFS-2007-papaya","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  peach: {"name":"桃子","state":"生重·可食部","category":"fruits","aliases":"","calories":39,"protein":0.91,"carbs":9.54,"fat":0.25,"fiber":1.5,"sourceId":"CFS-2007-peach","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  pineapple: {"name":"菠萝","state":"生重·可食部","category":"fruits","aliases":"凤梨","calories":48,"protein":0.54,"carbs":12.63,"fat":0.12,"fiber":1.4,"sourceId":"CFS-2007-pineapple","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  pomelo: {"name":"柚子","state":"生重·可食部","category":"fruits","aliases":"","calories":46,"protein":0.7,"carbs":9.8,"fat":0.4,"fiber":1.3,"sourceId":"CFS-2007-pomelo","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  strawberry: {"name":"草莓","state":"生重·可食部","category":"fruits","aliases":"","calories":32,"protein":0.67,"carbs":7.68,"fat":0.3,"fiber":2,"sourceId":"CFS-2007-strawberry","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  mandarin: {"name":"橘子","state":"生重·可食部","category":"fruits","aliases":"桔子 柑","calories":53,"protein":0.81,"carbs":13.34,"fat":0.31,"fiber":1.8,"sourceId":"CFS-2007-mandarin","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  watermelon: {"name":"西瓜","state":"生重·可食部","category":"fruits","aliases":"","calories":30,"protein":0.61,"carbs":7.55,"fat":0.15,"fiber":0.4,"sourceId":"CFS-2007-watermelon","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  avocado: {"name":"牛油果","state":"生重·可食部","category":"fruits","aliases":"","calories":160,"protein":2,"carbs":8.53,"fat":14.66,"fiber":6.7,"sourceId":"CFS-2007-avocado","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
  guava: {"name":"番石榴","state":"生重·可食部","category":"fruits","aliases":"芭乐","calories":68,"protein":2.55,"carbs":14.32,"fat":0.95,"fiber":5.4,"sourceId":"CFS-2007-guava","note":"只称吃下的可食部分，去除果核及不吃的皮；不是整果带皮带核重量。"},
};
Object.values(PRODUCE).forEach(food => { food.sourceUrl = sourceUrl; });
PRODUCE.broccoliBoiled = { name: '西兰花（水煮）', state: '熟重·沥水', category: 'vegetables', calories: 35, protein: 2.38, carbs: 7.18, fat: 0.41, fiber: 3.3, sourceId: '169967', note: '水煮后沥水称重，不含油；不适用于炒菜。' };
PRODUCE.carrotBoiled = { name: '胡萝卜（水煮）', aliases: '红萝卜 甘笋', state: '熟重·沥水', category: 'vegetables', calories: 35, protein: 0.76, carbs: 8.22, fat: 0.18, fiber: 3, sourceId: '170394', note: '水煮后沥水称重，不含油；不适用于炒菜。' };
const { EXPANDED_PRODUCE } = require('./expanded-produce');
Object.assign(PRODUCE, EXPANDED_PRODUCE);
module.exports = { PRODUCE };
