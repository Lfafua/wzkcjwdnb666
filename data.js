'use strict';

const sources = {
  armies: ['英国国家陆军博物馆 · 一战', 'https://www.nam.ac.uk/explore/first-world-war'],
  rifles: ['皇家军械博物馆 · 战壕装备', 'https://royalarmouries.org/schools/learning-resources/trench-warfare'],
  atlas: ['Armory Atlas · 一战装备目录', 'https://armoryatlas.org/en/conflicts/world-war-i'],
  lebel: ['史密森尼 · Lebel 1886/93', 'https://americanhistory.si.edu/collections/object/nmah_414502'],
  springfield: ['史密森尼 · Springfield M1903', 'https://www.si.edu/object/nmah_417512'],
  mg: ['Trenches on the Web · 一战机枪资料', 'https://www.worldwar1.com/arm005.htm'],
  mortar: ['帝国战争博物馆 · 一战展厅导览', 'https://www.iwm.org.uk/sites/default/files/files/2023-10/first_world_war_large_print_guide.pdf'],
  minen: ['澳大利亚战争纪念馆 · 轻型 Minenwerfer', 'https://www.awm.gov.au/collection/C212204'],
  schwarz: ['澳大利亚战争纪念馆 · Schwarzlose M07/12', 'https://www.awm.gov.au/collection/C253768'],
  mark: ['坦克博物馆 · Mark IV', 'https://tankmuseum.org/tank_collection/mark-iv?era=WW1'],
  renault: ['坦克博物馆 · Renault FT', 'https://tankmuseum.org/article/french-first-world-war-tanks'],
  a7v: ['坦克博物馆 · A7V', 'https://tankmuseum.org/tank-nuts/tank-collection/a7v-replica'],
  flags: ['Flags of the World · 奥匈商船旗', 'https://www.crwflags.net/FOTW/Flags/ah~ens.html'],
  us: ['美国陆军军事史中心 · 一战战役', 'https://history.army.mil/Research/Reference-Topics/Army-Campaigns/Brief-Summaries/World-War-I/'],
  warfare: ['一战国际百科 · Warfare 1914–1918', 'https://encyclopedia.1914-1918-online.net/article/warfare-1914-1918/'],
  austin: ['WarWheels · Austin 第二型','https://warwheels.net/AustinAC2ndINDEX.html'],
  mills: ['澳大利亚战争纪念馆 · Mills No. 5','https://www.awm.gov.au/collection/C222009'],
  stick: ['皇家军械博物馆 · 一战军械','https://royalarmouries.org/objects-and-stories/stories/arms-of-the-first-world-war'],
  usaArtillery: ['美国陆军军事史中心 · 火炮史','https://history.army.mil/portals/143/Images/Publications/catalog/70-27.pdf'],
  french75: ['法国军事博物馆 · 75 毫米 1897 型','https://www.musee-armee.fr/en/collections/museum-treasures/75-mm-field-gun-1897-model.html'],
  skoda: ['丹麦一战馆藏 · Škoda M15','https://denstorekrig1914-1918.dk/fra-samlingerne-skoda-75-cm-gebirgskanone-m15/'],
  italian65: ['意大利巴尔迪尼图书馆 · 65/17 图录','https://bibliotecabaldini.cultura.gov.it/wp-content/uploads/2024/11/Archivio_fotografico_Monelli_completo-1.pdf'],
  italy: ['一战国际百科 · 意大利战线与卡波雷托', 'https://encyclopedia.1914-1918-online.net/article/occupation-during-and-after-the-war-italy/']
};

// Historic figures describe the named variant. Battle statistics are balanced separately.
const countries = {
  gb: {name:'英国', full:'大英帝国', faction:0, supply:1.05, resolve:1.04, support:1.08, special:'Mark IV 装甲分队', trait:'装甲突破', note:'1917 年坎布雷集中投入坦克。本作提高支援效率，装甲分队从前沿补给中解锁。', source:'mark', kit:[
    ['SMLE Mk III','栓动步枪','1907 型 · .303 British · 10 发','rifles'],
    ['Lewis Mk I','轻机枪','.303 British · 常用 47 发弹盘','atlas'],
    ['Vickers Mk I','重机枪','.303 British · 水冷 · 弹带供弹','mg'],
    ['Stokes 3 英寸','战壕迫击炮','3 英寸级 · 1915 年开始服役','mortar'],
    ['Mark IV Female','步兵坦克','1917 年 · 乘员 8 人 · 4 挺 .303 Lewis','mark']
  ], kind:'tank'},
  fr: {name:'法国', full:'法兰西第三共和国', faction:0, supply:1.01, resolve:1.07, support:1.13, special:'雷诺 FT 轻坦克', trait:'炮兵支援', note:'法国将野战炮、进攻支援和装甲用于西线作战。本作提高支援伤害，FT 侧重机动。', source:'renault', kit:[
    ['Lebel Mle 1886 M93','栓动步枪','8×50mmR Lebel · 8 发管仓','lebel'],
    ['Chauchat Mle 1915','自动步枪','8×50mmR Lebel · 常用 20 发弹匣','mg'],
    ['Hotchkiss Mle 1914','重机枪','8×50mmR Lebel · 气冷 · 弹板供弹','mg'],
    ['Canon de 75 Mle 1897','野战炮','75 毫米 · 1897 型 · 液气式制退复进机构','french75'],
    ['Renault FT','轻型坦克','1918 年参战 · 乘员 2 人 · 常见 37 毫米炮型或机枪型','renault']
  ], kind:'lightTank'},
  ru: {name:'俄国', full:'俄罗斯帝国', faction:0, supply:.90, resolve:.98, support:1.03, special:'奥斯汀装甲车', trait:'大编制步兵', note:'东线战线广、兵力规模大，补给水平随阶段和部队波动。本作给步兵班加一人，补给恢复较慢。', source:'warfare', kit:[
    ['Mosin M1891','栓动步枪','7.62×54mmR · 5 发内置弹仓','rifles'],
    ['Madsen（俄军型）','轻机枪','7.62×54mmR · 上置弹匣','atlas'],
    ['Maxim M1910','重机枪','7.62×54mmR · 水冷 · 轮式枪架','atlas'],
    ['76.2 mm M1902','野战炮','76.2 毫米 · 1902 型','warfare'],
    ['Austin Series 2','装甲车','1915 年型 · 双炮塔 · 俄军使用 Maxim 机枪','austin']
  ], kind:'car'},
  it: {name:'意大利', full:'意大利王国', faction:0, supply:.97, resolve:1.02, support:.96, special:'Arditi 突击队', trait:'山地机动', note:'伊松佐战线多山。卡波雷托之后意军重建防线，并在 1918 年反攻。本作加快破碎地形中的步兵移动。', source:'italy', kit:[
    ['Carcano Mod. 91','栓动步枪','6.5×52mm · 6 发漏夹','atlas'],
    ['Villar Perosa M1915','双管自动武器','9mm Glisenti · 双管 · 每管独立供弹','atlas'],
    ['Fiat–Revelli Mod. 1914','重机枪','6.5×52mm · 水冷 · 盒式供弹','atlas'],
    ['Cannone da 65/17','山炮','65 毫米 · 17 倍径 · 可拆运','italian65'],
    ['Carcano 91 TS','特种部队卡宾枪','6.5×52mm · 6 发漏夹','atlas']
  ], kind:'raider'},
  us: {name:'美国', full:'美利坚合众国', faction:0, supply:1.13, resolve:.95, support:1.02, special:'BAR 自动步枪班', trait:'补给增援', note:'美军 1917 年参战，1918 年形成大规模投入，默兹—阿尔贡攻势中持续增援。本作提高补给，压制恢复略低。', source:'us', kit:[
    ['Springfield M1903','栓动步枪','.30-06 Springfield · 5 发内置弹仓','springfield'],
    ['Chauchat M1918（美军型）','自动步枪','.30-06 Springfield · 弹匣供弹 · 美军试制改型','atlas'],
    ['Browning M1917','重机枪','.30-06 Springfield · 水冷 · 弹带供弹','mg'],
    ['Canon de 155 GPF','重型野战炮','155 毫米 · 1917 年型 · 美军使用法制火炮','usaArtillery'],
    ['Browning Automatic Rifle M1918','自动步枪','.30-06 Springfield · 20 发弹匣 · 1918 年','mg']
  ], kind:'automatic'},
  de: {name:'德国', full:'德意志帝国', faction:1, supply:.98, resolve:1.09, support:1.06, special:'A7V 装甲分队', trait:'压制与突破', note:'德军后期广泛运用火力协同和突击分队，也少量投入 A7V。本作提高抗压制和支援效率。', source:'a7v', kit:[
    ['Gewehr 98','栓动步枪','7.92×57mm · 5 发内置弹仓','rifles'],
    ['MG 08/15','轻型机枪','7.92×57mm · 水冷 · 带供弹','atlas'],
    ['MG 08','重机枪','7.92×57mm · 水冷 · 弹带供弹','mg'],
    ['7.6 cm le.M.W. 1914','轻型战壕迫击炮','76 毫米级 · 1914 型 · 线膛','minen'],
    ['Sturmpanzerwagen A7V','重型坦克','1918 年参战 · 约 30 吨 · 标准乘员 18 人','a7v']
  ], kind:'heavyTank'},
  ah: {name:'奥匈', full:'奥匈帝国', faction:1, supply:.92, resolve:1.06, support:1.16, special:'斯柯达山炮组', trait:'山地炮兵', note:'奥匈军在伊松佐与意军反复交战。本作强化炮兵支援，降低补给。阵营图标采用 1869 年式商船旗的简化图案。', source:'italy', kit:[
    ['Mannlicher M.95','直拉式步枪','8×50mmR Mannlicher · 5 发漏夹','atlas'],
    ['Schwarzlose M07/12（轻装）','机枪分队','8×50mmR · 水冷 · 弹带；战术编制为游戏抽象','schwarz'],
    ['Schwarzlose M07/12（三脚架）','重机枪','8×50mmR · 水冷 · 三脚架','schwarz'],
    ['9 cm Minenwerfer M.14','战壕迫击炮','90 毫米 · 1914 型','mortar'],
    ['Škoda 7.5 cm Gebirgskanone M.15','山炮','75 毫米 · 1915 型 · 可分解驮运','warfare']
  ], kind:'mountainGun'}
};

const fieldEquipment = {
  gb:[['Mills No. 5','破片手榴弹','1915 年 · 铸铁弹体','mills'],['QF 18-pounder','野战炮','18 磅级弹丸 · 83.8 毫米','mortar']],
  fr:[['Grenade F1（1915）','破片手榴弹','1915 年式 · 铸铁弹体','rifles'],['Canon de 37 TR Mle 1916','步兵炮','37 毫米 · 1916 年型','warfare']],
  ru:[['RG-14','手榴弹','1914 年型 · 金属弹体','warfare'],['122 mm M1910','榴弹炮','122 毫米 · 1910 年型','warfare']],
  it:[['S.I.P.E.','破片手榴弹','一战型号 · 铸铁弹体','warfare'],['Cannone da 75/27 Mod. 1906','野战炮','75 毫米 · 27 倍径 · 1906 年型','warfare']],
  us:[['Mk I（1917）','破片手榴弹','1917 年式 · 铸铁弹体','us'],['37 mm Gun M1916（美军型）','步兵炮','37 毫米 · 法制 Mle 1916，美军采用','us']],
  de:[['Stielhandgranate M1915','柄式手榴弹','1915 年型 · 木柄','stick'],['Mauser Tankgewehr M1918','反坦克步枪','13.2×92mmSR · 单发 · 1918 年','rifles']],
  ah:[['Zeitzünderhandgranate M16','柄式手榴弹','1916 年型 · 木柄','warfare'],['8 cm Feldkanone M.5','野战炮','76.5 毫米实际口径 · M.5 型','warfare']]
};
for(const [id,nation] of Object.entries(countries))nation.kit.push(...fieldEquipment[id]);

const roles = {
  rifle:{label:'步兵班', count:5, cost:38, hp:42, speed:39, range:107, damage:11, interval:1.20, pressure:.16},
  light:{label:'机动火力组', count:3, cost:49, hp:40, speed:35, range:119, damage:8, interval:.56, pressure:.25},
  heavy:{label:'重机枪阵地', count:1, cost:62, hp:85, speed:0, emplacement:true, range:167, damage:10, interval:.45, pressure:.36},
  guns:{label:'后方炮兵', count:0, offboard:true, cost:72, hp:68, speed:24, range:245, damage:29, interval:3.20, pressure:.45, blast:28},
  grenadier:{label:'投弹组', count:3, cost:53, hp:49, speed:45, range:68, damage:21, interval:2.5, pressure:.34, blast:20},
  fieldGun:{label:'后方直射炮', count:0, offboard:true, cost:84, hp:82, speed:20, range:198, damage:32, interval:2.6, pressure:.48, antiArmor:true},
  tankRifle:{label:'反装甲射手', count:2, cost:78, hp:50, speed:31, range:176, damage:18, interval:1.9, pressure:.21, antiArmor:true},
  tank:{label:'装甲分队', count:1, cost:124, hp:330, speed:24, range:158, damage:25, interval:1.48, pressure:.48, armor:true},
  lightTank:{label:'轻装甲分队', count:1, cost:108, hp:245, speed:34, range:149, damage:26, interval:1.53, pressure:.37, armor:true},
  heavyTank:{label:'重装甲分队', count:1, cost:132, hp:375, speed:19, range:171, damage:35, interval:2.05, pressure:.52, armor:true},
  car:{label:'装甲侦察分队', count:1, cost:95, hp:177, speed:42, range:132, damage:15, interval:.57, pressure:.34, armor:true},
  raider:{label:'突击队', count:5, cost:91, hp:58, speed:54, range:82, damage:20, interval:.67, pressure:.27},
  automatic:{label:'自动步枪班', count:4, cost:105, hp:54, speed:42, range:131, damage:13, interval:.48, pressure:.31},
  mountainGun:{label:'后方山炮', count:0, offboard:true, cost:99, hp:94, speed:30, range:264, damage:41, interval:2.75, pressure:.60, blast:35}
};

const battlefields = [
  {name:'白桦壕线', front:'西线 · 灌木、弹坑与废墟', palette:['#524e31','#655a36','#77704a','#817553','#353e2d'], seed:7117, type:'woods', points:[[362,143],[527,316],[680,461]]},
  {name:'被淹没的渡口', front:'东线 · 河道、浅滩与桥梁', palette:['#484d36','#575b43','#6a6847','#777961','#313c32'], seed:1916, type:'river', points:[[324,131],[547,316],[702,463]]},
  {name:'石灰岩高地', front:'山地 · 岩脊、坡地与炮位', palette:['#60503f','#715d44','#8a7757','#a09172','#494638'], seed:7418, type:'ridge', points:[[373,160],[498,302],[669,448]]}
];

const roleKey = (country, index) => ['rifle','light','heavy','guns',country.kind,'grenadier',country===countries.de?'tankRifle':'fieldGun'][index];
