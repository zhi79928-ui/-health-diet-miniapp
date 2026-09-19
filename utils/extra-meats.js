// USDA SR Legacy，经 MyFoodData 核对。保留核对页份量，避免把整份数值误当每 100 g。
// 参数：名称、称重状态、说明、FDC ID、核对页份量 g、热量 kcal、蛋白 g、脂肪 g、碳水 g。
const r1 = value => Math.round((value + Number.EPSILON) * 10) / 10;
function food(name, state, note, sourceId, grams, calories, protein, fat, carbs = 0) {
  return { name, state, note, sourceId,
    calories: Math.round(calories * 100 / grams), protein: r1(protein * 100 / grams),
    fat: r1(fat * 100 / grams), carbs: r1(carbs * 100 / grams),
    sourceServing: { grams, calories, protein, fat, carbs }
  };
}
const EXTRA_FOODS = {
  thighRaw: food('鸡大腿肉（去皮去骨）', '生重', '鸡大腿纯肉净重，不含皮和骨；不代表整个带骨鸡腿', '173627', 149, 180, 29.3, 6.1),
  thighCooked: food('烤鸡大腿肉（去皮去骨）', '熟重', '烤熟后去皮去骨称肉；油和酱汁另计', '172388', 116, 208, 28.7, 9.5),
  thighSkinCooked: food('烤鸡大腿（带皮去骨）', '熟重', '称熟肉和鸡皮，不含骨；不适用于去皮鸡腿', '173625', 137, 318, 31.9, 20.2),
  drumstickCooked: food('烤鸡小腿（带皮去骨）', '熟重', '鸡琵琶腿烤熟后称肉和皮，不含骨；油和酱汁另计', '173612', 105, 201, 24.5, 10.7),
  wingCooked: food('炖鸡翅肉（去皮去骨）', '熟重', '只称炖熟的鸡翅纯肉，不含骨和皮，不是整个鸡翅重量', '172393', 100, 181, 27.2, 7.2),
  turkeyCooked: food('烤火鸡胸肉（去皮）', '熟重', '火鸡胸纯肉烤熟净重，不适用于火鸡火腿或腌制切片', '171496', 170, 250, 51.2, 3.5),
  tenderloinCooked: food('烤猪里脊（含自身脂肪）', '熟重', '猪里脊 broiled 条目，包含自身可分离脂肪；非纯瘦肉或糖醋里脊', '167904', 170, 342, 50.8, 13.8),
  ribsRaw: food('猪腰肋肉（肥瘦相间）', '生重', 'country-style ribs 条目，称去骨后的肉和脂肪；不代表所有排骨', '167895', 128, 242, 24.8, 15.1),
  ribsCooked: food('烤猪腰肋肉（肥瘦相间）', '熟重', 'country-style ribs 烤熟条目，称去骨可食部；不适用于糖醋排骨', '167897', 138, 495, 30, 40.7),
  lambRaw: food('羊肩臂肉（瘦肉）', '生重', 'USDA Choice 级羊肩臂可分离瘦肉；不代表羊肉卷或肥羊', '174330', 28, 37, 5.7, 1.5),
  lambCooked: food('焖熟羊肩臂肉（瘦肉）', '熟重', '羊肩臂瘦肉 braised 焖熟条目；油和酱汁另计', '174331', 170, 474, 60.4, 23.9),
  salmonRaw: food('养殖大西洋三文鱼', '生重', '生鱼肉可食部，不含骨；不代表所有鲑鱼或烟熏制品', '175167', 100, 208, 20.4, 13.4),
  salmonCooked: food('熟养殖大西洋三文鱼', '熟重', '干热烹调鱼肉净重，额外油另计；非生鱼片或烟熏鱼', '175168', 170, 350, 37.6, 21),
  tunaRaw: food('蓝鳍金枪鱼', '生重', '新鲜蓝鳍金枪鱼可食鱼肉；不适用于油浸或水浸罐头', '173706', 85, 122, 19.8, 4.2),
  tunaCooked: food('熟蓝鳍金枪鱼', '熟重', '干热烹调鱼肉净重，非罐头；油和酱汁另计', '173707', 170, 313, 50.8, 10.7),
  tilapiaRaw: food('罗非鱼', '生重', '去骨可食鱼肉净重，不是整条鱼重量', '175176', 116, 111, 23.3, 2),
  tilapiaCooked: food('熟罗非鱼', '熟重', '干热烹调后去骨鱼肉净重，不适用于油炸鱼', '175177', 170, 218, 44.5, 4.5),
  shrimpRaw: food('虾仁', '生重', '去头去壳可食虾肉净重；非整虾或裹粉虾排', '175179', 85, 72, 17.1, 0.43),
  shrimpCooked: food('熟虾仁', '熟重', '普通熟虾肉净重，不含头壳；条目未细分做法，不适用于油炸、裹粉或调味制品', '175180', 85, 84, 20.4, 0.24, 0.17)
};
const EXTRA_OPTIONS = [
  { id: 'thigh', label: '鸡腿肉（大腿·去皮去骨）', rawId: 'thighRaw', cookedId: 'thighCooked', cookedLabel: '烤熟纯肉' },
  { id: 'thighSkin', label: '鸡腿肉（大腿·带皮去骨）', rawId: null, cookedId: 'thighSkinCooked', cookedLabel: '带皮烤熟' },
  { id: 'drumstick', label: '鸡琵琶腿（带皮去骨）', rawId: null, cookedId: 'drumstickCooked', cookedLabel: '带皮烤熟' },
  { id: 'wing', label: '鸡翅肉（去皮去骨）', rawId: null, cookedId: 'wingCooked', cookedLabel: '炖熟纯肉' },
  { id: 'turkey', label: '火鸡胸肉（去皮）', rawId: null, cookedId: 'turkeyCooked', cookedLabel: '烤熟纯肉' },
  { id: 'tenderloin', label: '猪里脊（含自身脂肪）', rawId: null, cookedId: 'tenderloinCooked', cookedLabel: '烤熟' },
  { id: 'ribs', label: '猪腰肋肉（肥瘦相间·去骨）', rawId: 'ribsRaw', cookedId: 'ribsCooked', cookedLabel: '烤熟' },
  { id: 'lamb', label: '羊肉（肩臂·瘦肉）', rawId: 'lambRaw', cookedId: 'lambCooked', cookedLabel: '焖熟' },
  { id: 'salmon', label: '三文鱼（养殖大西洋鲑）', rawId: 'salmonRaw', cookedId: 'salmonCooked', cookedLabel: '干热烹调' },
  { id: 'tuna', label: '金枪鱼（蓝鳍）', rawId: 'tunaRaw', cookedId: 'tunaCooked', cookedLabel: '干热烹调' },
  { id: 'tilapia', label: '罗非鱼（去骨鱼肉）', rawId: 'tilapiaRaw', cookedId: 'tilapiaCooked', cookedLabel: '干热烹调' },
  { id: 'shrimp', label: '虾仁（去头去壳）', rawId: 'shrimpRaw', cookedId: 'shrimpCooked', cookedLabel: '普通熟虾仁' }
];
module.exports = { EXTRA_FOODS, EXTRA_OPTIONS };
