// 紫微斗数排盘服务 v2.4 - 2026-07-28 全星补齐+飞宫链
// v2.0: P0四化minorStar提取 + 子时日期+1 + 大限12宫 + 来因宫 + 五行局
// v2.1: 自化标记(↓离心↑向心)
// v2.2: 天魁钺WMT校正 + 大运四化 + 流年四化 + 叠宫
// v2.3: 流月四化 + 四层叠宫(本命×大限×流年×流月) + 层间飞化
// v2.4: 全小星输出(adjStars·十二长生·博士·将前·岁前) + 流年干支 + 飞宫链(禄转忌/忌转忌)
// v2.5: adjStars名映射(WMT对齐) + 神煞星合并入adjStars
// v2.6: daxianPalaceMap 大限十二宫↔本命宫显式映射(144条·紫灵补强设计)
// v2.7: 流年命宫=流年地支绝对映射修正(原大限偏移全错位) + 流年四化落宫显式化(sihuaPalace)
// v2.8: 流月斗君法(正月=流年支逆数生月顺数生时·六方会诊裁定+iztro源码实证·文墨同源)
// v2.9: 流年十二宫映射(1440条)+流年神煞(流耀)+流年岁前/将前十二神(iztro yearly 模块对照复刻)
// v2.10: 月耀+小限+童限+流日流时(--day 查询·iztro daily/hourly/age 全套复刻)

const { astro } = require("iztro");
const { solar2lunar } = require("lunar-lite");

function hourToIndex(h) { return Math.floor((h + 1) / 2) % 12; }

// 真太阳时校正(对齐文墨天机金标准): 真太阳时 = 钟表平太阳时 - (120-经度)*4分 + 均时差(Spencer1971)
function solarTimeCorrection(yr, mo, dy, hh, mm, longitude) {
  const date = new Date(yr, mo - 1, dy);
  const start = new Date(yr, 0, 1);
  const n = Math.floor((date - start) / 86400000) + 1; // 年内日序
  const g = 2 * Math.PI * (n - 1) / 365.0;
  const eot = 229.18 * (0.000075 + 0.001868*Math.cos(g) - 0.032077*Math.sin(g)
                        - 0.014615*Math.cos(2*g) - 0.040849*Math.sin(2*g));
  let totalMin = hh * 60 + mm - (120.0 - longitude) * 4.0 + eot;
  let dayOffset = 0;
  while (totalMin < 0) { totalMin += 1440; dayOffset -= 1; }
  while (totalMin >= 1440) { totalMin -= 1440; dayOffset += 1; }
  return { hour: totalMin / 60.0, dayOffset };
}
function addDays(dateStr, n) { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

// === 十天干四化表(钦天门·WMT校准) ===
const SIHUA_TABLE = {
  '甲':['廉贞','破军','武曲','太阳'], '乙':['天机','天梁','紫微','太阴'],
  '丙':['天同','天机','文昌','廉贞'], '丁':['太阴','天同','天机','巨门'],
  '戊':['贪狼','太阴','右弼','天机'], '己':['武曲','贪狼','天梁','文曲'],
  '庚':['太阳','武曲','太阴','天同'], '辛':['巨门','太阳','文曲','文昌'],
  '壬':['天梁','紫微','左辅','武曲'], '癸':['破军','巨门','太阴','贪狼']
};

// === v2.5: iztro→WMT小星名映射 ===
// 文墨用名对齐: 截路→截空(文墨仆役宫), 空亡→副截(文墨迁移宫)
const STAR_NAME_WMT = {
  '截路':'截空', '空亡':'副截',
};
// 文墨把少量神煞也列为小星 → 白名单提取
const WMT_ADJ_FROM_SHENSHA = new Set(['劫煞','龙德','天德','大耗']);

// === 岁前十二神·文墨金标准(以太岁=岁建, 顺数12宫) ===
const SUIQIAN_CYCLE = ['岁建','晦气','丧门','贯索','官符','小耗','岁破','龙德','白虎','天德','吊客','病符'];
const DZ_INDEX_0 = { '子':0,'丑':1,'寅':2,'卯':3,'辰':4,'巳':5,'午':6,'未':7,'申':8,'酉':9,'戌':10,'亥':11 };
function computeSuiqian(palaceDz, yearBranch) {
  const off = ((DZ_INDEX_0[palaceDz] || 0) - (DZ_INDEX_0[yearBranch] || 6) + 12) % 12;
  return SUIQIAN_CYCLE[off];
}

// 天干→地支序号(甲1乙2...癸10, 子1丑2...亥12)
const TG_IDX = { '甲':1,'乙':2,'丙':3,'丁':4,'戊':5,'己':6,'庚':7,'辛':8,'壬':9,'癸':10 };
const DZ_IDX = { '子':1,'丑':2,'寅':3,'卯':4,'辰':5,'巳':6,'午':7,'未':8,'申':9,'酉':10,'戌':11,'亥':12 };
const IDX_DZ = { 1:'子',2:'丑',3:'寅',4:'卯',5:'辰',6:'巳',7:'午',8:'未',9:'申',10:'酉',11:'戌',12:'亥' };

// === 天魁/天钺安星: WMT标准口诀 ===
// 甲戊庚牛羊(魁丑钺未), 乙己鼠猴乡(魁子钺申)
// 丙丁猪鸡位(魁亥钺酉), 壬癸兔蛇藏(魁卯钺巳)
// 六辛逢虎马(魁寅钺午) ← WMT版(iztro默认版为魁午钺寅)
const TIAN_KUI_YUE = {
  '甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],
  '乙':['子','申'],'己':['子','申'],
  '丙':['亥','酉'],'丁':['亥','酉'],
  '壬':['卯','巳'],'癸':['卯','巳'],
  '辛':['寅','午']  // WMT校正: 魁寅钺午
};

// 来因宫(WMT校准公式): 来因地支=12-天干序号(癸→亥特殊)
const TIAN_GAN_TO_LAIYIN = {
  '甲':'戌','乙':'酉','丙':'申','丁':'未','戊':'午',
  '己':'巳','庚':'辰','辛':'卯','壬':'寅','癸':'亥'
};

// 对宫
const OPPOSITE = { '命宫':'迁移','兄弟':'仆役','夫妻':'官禄','子女':'田宅','财帛':'福德','疾厄':'父母',
                    '迁移':'命宫','仆役':'兄弟','官禄':'夫妻','田宅':'子女','福德':'财帛','父母':'疾厄' };

// === 天魁钺校正: 修正iztro辛年安星差异 ===
function fixTianKuiYue(palaces, yearStem) {
  const wmtPos = TIAN_KUI_YUE[yearStem];
  if (!wmtPos) return;
  const [kuiDz, yueDz] = wmtPos;
  // 找到当前天魁/天钺所在宫
  const order = Object.keys(palaces);
  let kuiPalace = null, yuePalace = null;
  for (const pn of order) {
    const minor = (palaces[pn].minor||[]).map(s=>s.name);
    if (minor.includes('天魁')) kuiPalace = pn;
    if (minor.includes('天钺')) yuePalace = pn;
  }
  // 如果当前天魁不在WMT预期位置，交换
  const actualKuiDz = kuiPalace ? palaces[kuiPalace].diZhi : null;
  if (actualKuiDz !== kuiDz && kuiPalace && yuePalace) {
    // 从天魁宫移除天魁，从天钺宫移除天钺，互换
    const kuiIdx = palaces[kuiPalace].minor.findIndex(s=>s.name==='天魁');
    const yueIdx = palaces[yuePalace].minor.findIndex(s=>s.name==='天钺');
    if (kuiIdx >= 0 && yueIdx >= 0) {
      palaces[kuiPalace].minor[kuiIdx].name = '天钺';
      palaces[yuePalace].minor[yueIdx].name = '天魁';
    }
  }
}

// === 自化计算(v3·2026-07-25重写·对齐WMT星本位) ===
// Bug修复: ①生年四化星不再跳过(破军有生年权仍可自化↓权)
//          ②向心自化记在星所在宫(对齐WMT), 非触发宫
function computeSelfTransform(palaces, order, sihuaMap) {
  const selfTrans = {};
  for (const pname of order) selfTrans[pname] = [];
  for (const pname of order) {
    if (!palaces[pname]) continue;
    const tg = palaces[pname].tianGan;
    if (!tg || tg === '?') continue;
    const sihua = SIHUA_TABLE[tg];
    if (!sihua) continue;
    const tags = ['禄','权','科','忌'];
    for (let i = 0; i < 4; i++) {
      const starName = sihua[i], tag = tags[i];
      // 🔴 自化与生年四化共存·不再跳过
      const inSelf = (palaces[pname].major||[]).some(s=>s.name===starName) || (palaces[pname].minor||[]).some(s=>s.name===starName);
      if (inSelf) {
        selfTrans[pname].push({ star:starName, tag, type:'离心', symbol:'↓' });
        continue;
      }
      const opp = OPPOSITE[pname];
      if (opp && palaces[opp]) {
        const inOpposite = (palaces[opp].major||[]).some(s=>s.name===starName) || (palaces[opp].minor||[]).some(s=>s.name===starName);
        if (inOpposite) {
          // 🔴 对齐WMT星本位:向心自化记在星所在宫(opp), 非触发宫(pname)
          selfTrans[opp].push({ star:starName, tag, type:'向心', symbol:'↑', fromPalace:pname });
        }
      }
    }
  }
  return selfTrans;
}

// === 流年天干推算 ===
function getYearStem(year) {
  // 以甲子=1984为基准, (year-1984)%10→天干索引
  const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const idx = ((year - 4) % 10 + 10) % 10;
  return stems[idx];
}

// === 流年地支推算（v2.7 新增·流年命宫绝对映射用） ===
function getYearBranch(year) {
  const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  return branches[((year - 4) % 12 + 12) % 12];
}

// === 星曜落宫索引（v2.7 新增·流年四化落宫显式化） ===
function buildStarPalaceMap(palaces) {
  const starPalace = {};
  for (const pn of Object.keys(palaces)) {
    for (const s of [...(palaces[pn].major||[]), ...(palaces[pn].minor||[])]) {
      if (s && s.name) starPalace[s.name] = pn;
    }
  }
  return starPalace;
}

// === 地支→本命宫（v2.7 新增·绝对映射用） ===
function buildDzPalaceMap(palaces) {
  const dzToPalace = {};
  for (const pn of Object.keys(palaces)) {
    if (palaces[pn] && palaces[pn].diZhi) dzToPalace[palaces[pn].diZhi] = pn;
  }
  return dzToPalace;
}

// === 流年四化输出 ===
function computeLiunianSihua(startYear, endYear) {
  const result = [];
  for (let y = startYear; y <= endYear; y++) {
    const stem = getYearStem(y);
    const sihua = SIHUA_TABLE[stem];
    if (sihua) {
      result.push({
        year: y, stem,
        sihua: { 禄:sihua[0], 权:sihua[1], 科:sihua[2], 忌:sihua[3] }
      });
    }
  }
  return result;
}

// === 大限四化: 大限宫干→四化 ===
function computeDaxianSihua(daxian, palaces, order) {
  const result = [];
  for (const dx of daxian) {
    const pn = dx.palace;
    const tg = palaces[pn] ? palaces[pn].tianGan : '?';
    const sihua = SIHUA_TABLE[tg];
    result.push({
      palace: pn, tianGan: tg, range: dx.range, ages: dx.ages,
      sihua: sihua ? { 禄:sihua[0], 权:sihua[1], 科:sihua[2], 忌:sihua[3] } : null
    });
  }
  return result;
}

// === v2.6: 大限十二宫↔本命宫显式映射(daxianPalaceMap·紫灵补强设计 2026-08-30) ===
// 推导规则: 大限十二宫与本命十二宫同序逆排——大限兄弟=大限命宫地支-1的本命宫, 依次。
// 从引擎已有 daxian[].palace 序列展开, 零新算法风险。输出全量 12大限×12宫=144 条。
// 示例(第三大限·命宫福德亥): 命=福德亥 兄弟=父母戌 夫妻=命酉 子女=兄弟申 财帛=夫妻未
//   疾厄=子女午 迁移=财帛巳 仆役=疾厄辰 官禄=迁移卯 田宅=仆役寅 福德=官禄丑 父母=田宅子
function computeDaxianPalaceMap(daxian, palaces) {
  const PALACE_SHORT = ['命','兄弟','夫妻','子女','财帛','疾厄','迁移','仆役','官禄','田宅','福德','父母'];
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  // 地支→本命宫名(简称: 命宫→命, 其余已是简称)
  const dzToPalace = {};
  for (const pn of Object.keys(palaces)) {
    if (palaces[pn] && palaces[pn].diZhi) {
      dzToPalace[palaces[pn].diZhi] = (pn === '命宫') ? '命' : pn;
    }
  }
  const result = [];
  daxian.forEach((dx, idx) => {
    const dz = palaces[dx.palace] ? palaces[dx.palace].diZhi : '';
    const dzIdx = DZ.indexOf(dz);
    const map = [];
    for (let i = 0; i < 12; i++) {
      const b = DZ[((dzIdx - i) % 12 + 12) % 12];
      map.push({ daxian: PALACE_SHORT[i], benming: dzToPalace[b] || '?', zhi: b });
    }
    result.push({ daxianIndex: idx + 1, range: dx.range, mingPalace: dx.palace, map });
  });
  return result;
}

// === v2.9: 流年十二宫↔本命宫显式映射(liunianPalaceMap·与 daxianPalaceMap 同构) ===
// 流年命宫=流年地支绝对映射; 流年十二宫从流年命宫起逆排(同本命同构)。
// 全量 12大限×10年×12宫=1440 条, 与 dieGong 覆盖年份对齐。
function computeLiunianPalaceMap(daxian, year, palaces) {
  const PALACE_SHORT = ['命','兄弟','夫妻','子女','财帛','疾厄','迁移','仆役','官禄','田宅','福德','父母'];
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const dzToPalace = {};
  for (const pn of Object.keys(palaces)) {
    if (palaces[pn] && palaces[pn].diZhi) dzToPalace[palaces[pn].diZhi] = (pn === '命宫') ? '命' : pn;
  }
  const result = [];
  for (const dx of daxian) {
    for (let ly = 0; ly < 10; ly++) {
      const yearNum = year + dx.range[0] - 1 + ly;
      const stem = getYearStem(yearNum);
      const branch = getYearBranch(yearNum);
      const dzIdx = DZ.indexOf(branch);
      const map = [];
      for (let i = 0; i < 12; i++) {
        const b = DZ[((dzIdx - i) % 12 + 12) % 12];
        map.push({ liunian: PALACE_SHORT[i], benming: dzToPalace[b] || '?', zhi: b });
      }
      result.push({ year: yearNum, stem, branch, mingPalace: dzToPalace[branch] || '?', map });
    }
  }
  return result;
}

// === v2.9: 流年神煞(流耀)·iztro 同源安法 ===
// 流魁钺(WMT口径·与iztro辛年默认不同)/流昌曲/流禄羊陀/流马/流鸾喜/年解
// 返回地支序(子0) 12 宫数组, 每宫星名列表
function computeLiunianStars(yearStem, yearBranch) {
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const dzIdx = b => DZ.indexOf(b);
  const fix = i => ((i % 12) + 12) % 12;
  const stars = Array.from({length: 12}, () => []);
  // 流魁钺(WMT校正: 甲戊庚丑未/乙己子申/丙丁亥酉/壬癸卯巳/辛寅午)
  const ky = TIAN_KUI_YUE[yearStem];
  if (ky) { stars[dzIdx(ky[0])].push('流魁'); stars[dzIdx(ky[1])].push('流钺'); }
  // 流昌曲(iztro口径: 甲巳酉/乙午申/丙戊申午/丁己酉巳/庚亥卯/辛子寅/壬寅子/癸卯亥)
  const CHANG_QU = { '甲':['巳','酉'],'乙':['午','申'],'丙':['申','午'],'丁':['酉','巳'],'戊':['申','午'],
                     '己':['酉','巳'],'庚':['亥','卯'],'辛':['子','寅'],'壬':['寅','子'],'癸':['卯','亥'] };
  const cq = CHANG_QU[yearStem];
  if (cq) { stars[dzIdx(cq[0])].push('流昌'); stars[dzIdx(cq[1])].push('流曲'); }
  // 流禄存/流擎羊/流陀罗(甲寅乙卯丙戊巳丁己午庚申辛酉壬亥癸子; 羊=禄+1 陀=禄-1)
  const LU_CUN = { '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子' };
  const lu = LU_CUN[yearStem];
  if (lu) {
    stars[dzIdx(lu)].push('流禄');
    stars[fix(dzIdx(lu) + 1)].push('流羊');
    stars[fix(dzIdx(lu) - 1)].push('流陀');
  }
  // 流马(寅午戌年申/申子辰寅/巳酉丑亥/亥卯未巳)
  const MA = { '寅':'申','午':'申','戌':'申','申':'寅','子':'寅','辰':'寅','巳':'亥','酉':'亥','丑':'亥','亥':'巳','卯':'巳','未':'巳' };
  if (MA[yearBranch]) stars[dzIdx(MA[yearBranch])].push('流马');
  // 流鸾喜(卯起逆数到年支=红鸾, +6=天喜)
  const luan = fix(dzIdx('卯') - dzIdx(yearBranch));
  stars[luan].push('流鸾');
  stars[fix(luan + 6)].push('流喜');
  // 年解(子年戌起逆数: 戌酉申未午巳辰卯寅丑子亥)
  const NIAN_JIE = ['戌','酉','申','未','午','巳','辰','卯','寅','丑','子','亥'];
  stars[dzIdx(NIAN_JIE[dzIdx(yearBranch)])].push('年解');
  return stars;
}

// === v2.9: 流年岁前/将前十二神(iztro getYearly12 同源) ===
// 岁前: 年支(太岁)起岁建顺数; 将前: 寅午戌年将星午/申子辰子/巳酉丑酉/亥卯未卯 起顺排
function computeLiunianDecStar(yearBranch) {
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const dzIdx = b => DZ.indexOf(b);
  const fix = i => ((i % 12) + 12) % 12;
  const suiqian = [];
  for (let i = 0; i < 12; i++) suiqian[fix(dzIdx(yearBranch) + i)] = SUIQIAN_CYCLE[i];
  const JIANG = { '寅':'午','午':'午','戌':'午','申':'子','子':'子','辰':'子','巳':'酉','酉':'酉','丑':'酉','亥':'卯','卯':'卯','未':'卯' };
  const JQ_CYCLE = ['将星','攀鞍','岁驿','息神','华盖','劫煞','灾煞','天煞','指背','咸池','月煞','亡神'];
  const jiangqian = [];
  const jStart = dzIdx(JIANG[yearBranch]);
  for (let i = 0; i < 12; i++) jiangqian[fix(jStart + i)] = JQ_CYCLE[i];
  return { suiqian12: suiqian, jiangqian12: jiangqian };
}

// === v2.10: 通用运限神煞(流耀/月耀/日耀/时耀·iztro getHoroscopeStar 同源) ===
// prefix: 流/月/日/时; withNianjie 仅流年安年解
function computeHoroscopeStars(stem, branch, prefix, withNianjie) {
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const dzIdx = b => DZ.indexOf(b);
  const fix = i => ((i % 12) + 12) % 12;
  const stars = Array.from({length: 12}, () => []);
  const ky = TIAN_KUI_YUE[stem];
  if (ky) { stars[dzIdx(ky[0])].push(prefix + '魁'); stars[dzIdx(ky[1])].push(prefix + '钺'); }
  const CHANG_QU = { '甲':['巳','酉'],'乙':['午','申'],'丙':['申','午'],'丁':['酉','巳'],'戊':['申','午'],
                     '己':['酉','巳'],'庚':['亥','卯'],'辛':['子','寅'],'壬':['寅','子'],'癸':['卯','亥'] };
  const cq = CHANG_QU[stem];
  if (cq) { stars[dzIdx(cq[0])].push(prefix + '昌'); stars[dzIdx(cq[1])].push(prefix + '曲'); }
  const LU_CUN = { '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子' };
  const lu = LU_CUN[stem];
  if (lu) {
    stars[dzIdx(lu)].push(prefix + '禄');
    stars[fix(dzIdx(lu) + 1)].push(prefix + '羊');
    stars[fix(dzIdx(lu) - 1)].push(prefix + '陀');
  }
  const MA = { '寅':'申','午':'申','戌':'申','申':'寅','子':'寅','辰':'寅','巳':'亥','酉':'亥','丑':'亥','亥':'巳','卯':'巳','未':'巳' };
  if (MA[branch]) stars[dzIdx(MA[branch])].push(prefix + '马');
  const luan = fix(dzIdx('卯') - dzIdx(branch));
  stars[luan].push(prefix + '鸾');
  stars[fix(luan + 6)].push(prefix + '喜');
  if (withNianjie) {
    const NIAN_JIE = ['戌','酉','申','未','午','巳','辰','卯','寅','丑','子','亥'];
    stars[dzIdx(NIAN_JIE[dzIdx(branch)])].push('年解');
  }
  return stars;
}

// 流年神煞(保留原函数名·v2.10 泛化后包裹)
function computeLiunianStars(stem, branch) {
  return computeHoroscopeStars(stem, branch, '流', true);
}

// === v2.10: 小限(iztro getAgeIndex 同源) ===
// 寅午戌年起辰/申子辰戌/巳酉丑未/亥卯未丑; 男顺女逆; 每宫十虚岁(1,13,25,...,109+宫序)
function computeXianAgeMap(yearBranch, gender) {
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const dzIdx = b => DZ.indexOf(b);
  const fix = i => ((i % 12) + 12) % 12;
  const AGE_START = { '寅':'辰','午':'辰','戌':'辰','申':'戌','子':'戌','辰':'戌','巳':'未','酉':'未','丑':'未','亥':'丑','卯':'丑','未':'丑' };
  const start = dzIdx(AGE_START[yearBranch]);
  const isMale = (gender === '男' || gender === 'male');
  const result = {};
  for (let i = 0; i < 12; i++) {
    const idx = isMale ? fix(start + i) : fix(start - i);
    for (let j = 0; j < 10; j++) {
      result[12 * j + i + 1] = DZ[idx];   // 虚岁 → 小限地支
    }
  }
  return result;
}

// === v2.10: 童限(起运前·iztro childhood 同源: 一命二财三疾厄 四岁夫妻五福德 六岁官禄) ===
// 口径: 虚岁(iztro ageDivide 默认自然年界 nominalAge=虚岁) a → SEQ[a-1]; key=虚岁。
function computeChildhood(startAge) {
  const SEQ = ['命宫','财帛','疾厄','夫妻','福德','官禄'];
  const result = {};
  for (let a = 1; a < startAge; a++) {
    result[a] = SEQ[Math.min(a - 1, SEQ.length - 1)];
  }
  return result;
}

// === 叠宫: 本命×大限×流年三层叠加 ===
function computeDieGong(palaces, daxian, order, yearStem) {
  // 大限走向: 男性阳年(甲丙戊庚壬)顺行, 阴年逆行; 女性相反
  const isYang = ['甲','丙','戊','庚','壬'].includes(yearStem);
  const gender = process.argv[5] || 'male';
  const isMale = (gender === 'male' || gender === '男' || gender === 'm' || gender === 1);
  // 大限顺行: 男阳+女阴=顺行; 男阴+女阳=逆行
  const daxianForward = (isMale && isYang) || (!isMale && !isYang);

  // 大限从命宫开始, 按顺/逆走12宫
  const daxianOrder = [];
  const mingIdx = order.indexOf('命宫');
  for (let i = 0; i < 12; i++) {
    const idx = daxianForward ? (mingIdx + i) % 12 : (mingIdx - i + 12) % 12;
    daxianOrder.push(order[idx]);
  }

  // 流年命宫 = 流年地支绝对映射（钦天门铁律 §19·v2.7 修正，非大限偏移）
  // 🔴 2026-08-30 修正：原实现"大限内第N年从大限命宫顺数"对任意盘错位——
  //    主人盘2014甲午被算成仆役(寅)，正确=午=本命子女（大限疾厄）。
  const dzToPalace = buildDzPalaceMap(palaces);

  const dieGongData = [];
  for (let dxIdx = 0; dxIdx < daxian.length; dxIdx++) {
    const dx = daxian[dxIdx];
    const dxPalaceName = daxianOrder[dxIdx] || dx.palace;

    // 每个大限10个流年
    const liunianEntries = [];
    for (let ly = 0; ly < 10; ly++) {
      // 绝对映射：流年命宫 = 流年地支所在本命宫（v2.7）
      const yearNum = year + dx.range[0] - 1 + ly;  // 虚岁→公历年
      const stem = getYearStem(yearNum);
      const lnPalace = dzToPalace[getYearBranch(yearNum)] || order[0];
      liunianEntries.push({
        year: yearNum, stem,
        liunianPalace: lnPalace,           // 流年命宫
        liunianGanZhi: palaces[lnPalace] ? `${palaces[lnPalace].tianGan}${palaces[lnPalace].diZhi}` : '??',
        basePalace: dxPalaceName,           // 大限命宫对应的本命宫
        dieGong: `${lnPalace}|${dxPalaceName}`  // 流年宫|大限宫
      });
    }
    dieGongData.push({ daxian: dx.palace, range: dx.range, liunian: liunianEntries });
  }
  return dieGongData;
}

// === v2.3: 五虎遁·流月天干推算 ===
// 甲己之年丙作首, 乙庚之岁戊为头, 丙辛必定寻庚起, 丁壬壬位顺行流, 戊癸何方发, 甲寅之上好追求
const WU_HU_DUN = {
  '甲':'丙','己':'丙',  // 丙寅月为正月
  '乙':'戊','庚':'戊',
  '丙':'庚','辛':'庚',
  '丁':'壬','壬':'壬',
  '戊':'甲','癸':'甲'
};
const DZ_ORDER = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];

// 五虎遁: 年干→正月(寅月)天干
function getMonthStem(yearStem, monthDz) {
  const startStem = WU_HU_DUN[yearStem];
  if (!startStem) return '?';
  const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const startIdx = stems.indexOf(startStem);
  const dzIdx = DZ_ORDER.indexOf(monthDz);
  if (dzIdx < 0) return '?';
  return stems[(startIdx + dzIdx) % 10];
}

// === 五鼠遁: 日干→时干(v2.10 流时用) ===
// 甲己日起甲子, 乙庚丙子, 丙辛戊子, 丁壬庚子, 戊癸壬子
function getHourStem(dayStem, hourDz) {
  const WU_SHU = { '甲':'甲','己':'甲','乙':'丙','庚':'丙','丙':'戊','辛':'戊','丁':'庚','壬':'庚','戊':'壬','癸':'壬' };
  const startStem = WU_SHU[dayStem];
  if (!startStem) return '?';
  const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const startIdx = stems.indexOf(startStem);
  const dzIdx = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(hourDz);
  if (dzIdx < 0) return '?';
  return stems[(startIdx + dzIdx) % 10];
}

// 农历月序→地支: 1=寅, 2=卯, ... 12=丑
function monthNumToDz(n) {
  return DZ_ORDER[(n - 1) % 12];
}

// === v2.3: 流月四化 ===
function computeLiuyueSihua(yearStem, yearNum) {
  // 每年12个月, 正月(寅月)天干由五虎遁决定, 依次排12月
  const result = [];
  for (let m = 1; m <= 12; m++) {
    const dz = monthNumToDz(m);
    const stem = getMonthStem(yearStem, dz);
    const sihua = SIHUA_TABLE[stem];
    result.push({
      month: m, dz, stem,
      sihua: sihua ? { 禄:sihua[0], 权:sihua[1], 科:sihua[2], 忌:sihua[3] } : null
    });
  }
  return result;
}

// === v2.4: 六内六外判定 ===
const LIU_NEI = ['命宫','财帛','疾厄','官禄','田宅','福德'];
const LIU_WAI = ['兄弟','夫妻','子女','迁移','仆役','父母'];

function isLiuNei(pname) { return LIU_NEI.includes(pname); }

// === v2.4: 飞宫链追踪(禄转忌·忌转忌·禄转禄) ===
function computeFlyingChains(palaces, order) {
  const result = {};
  for (const pname of order) {
    if (!palaces[pname]) continue;
    const chains = {};
    const tg = palaces[pname].tianGan;
    if (!tg || tg === '?' || !SIHUA_TABLE[tg]) continue;

    // 本宫飞化
    const sihua = SIHUA_TABLE[tg];
    const tags = ['禄','权','科','忌'];

    // 追忌链: A忌→落B→B干忌→落C→...
    function traceJiChain(startPalace, maxHops) {
      const visited = new Set();
      const steps = [];
      let current = startPalace;
      for (let hop = 0; hop < maxHops; hop++) {
        const ctg = palaces[current].tianGan;
        if (!ctg || ctg === '?' || !SIHUA_TABLE[ctg]) break;
        const jiStar = SIHUA_TABLE[ctg][3]; // 忌星
        // 找忌星所在宫
        let target = null;
        for (const pn of order) {
          if (!palaces[pn]) continue;
          const allNames = [...(palaces[pn].major||[]).map(s=>s.name), ...(palaces[pn].minor||[]).map(s=>s.name)];
          if (allNames.includes(jiStar)) { target = pn; break; }
        }
        if (!target) break;
        steps.push({ from:current, fromGan:ctg, star:jiStar, tag:'忌', to:target, inOut:isLiuNei(target)?'得(六内)':'失(六外)' });
        if (visited.has(target)) { steps.push({ loop:true, backTo:target }); break; }
        visited.add(target);
        current = target;
      }
      return steps;
    }

    // 追禄链
    function traceLuChain(startPalace, maxHops) {
      const visited = new Set();
      const steps = [];
      let current = startPalace;
      for (let hop = 0; hop < maxHops; hop++) {
        const ctg = palaces[current].tianGan;
        if (!ctg || ctg === '?' || !SIHUA_TABLE[ctg]) break;
        const luStar = SIHUA_TABLE[ctg][0]; // 禄星
        let target = null;
        for (const pn of order) {
          if (!palaces[pn]) continue;
          const allNames = [...(palaces[pn].major||[]).map(s=>s.name), ...(palaces[pn].minor||[]).map(s=>s.name)];
          if (allNames.includes(luStar)) { target = pn; break; }
        }
        if (!target) break;
        steps.push({ from:current, fromGan:ctg, star:luStar, tag:'禄', to:target });
        if (visited.has(target)) { steps.push({ loop:true, backTo:target }); break; }
        visited.add(target);
        current = target;
      }
      return steps;
    }

    // 忌转忌
    const jiChain = traceJiChain(pname, 4);
    if (jiChain.length > 0) {
      chains['忌转忌'] = jiChain.map(s => {
        if (s.loop) return `→回路:${s.backTo}`;
        return `${s.from}(${s.fromGan})→${s.star}忌→${s.to}[${s.inOut}]`;
      }).join('; ');
    }

    // 禄转禄
    const luChain = traceLuChain(pname, 3);
    if (luChain.length > 0) {
      chains['禄转禄'] = luChain.map(s => {
        if (s.loop) return `→回路:${s.backTo}`;
        return `${s.from}(${s.fromGan})→${s.star}禄→${s.to}`;
      }).join('; ');
    }

    // 禄转忌: 禄跳1步→然后追忌
    if (luChain.length > 0) {
      const firstLu = luChain[0];
      const jiAfterLu = traceJiChain(firstLu.to, 3);
      if (jiAfterLu.length > 0) {
        chains['禄转忌'] = `(${pname}→禄→${firstLu.to}) ` + jiAfterLu.map(s => {
          if (s.loop) return `→回路:${s.backTo}`;
          return `${s.from}(${s.fromGan})→${s.star}忌→${s.to}[${s.inOut}]`;
        }).join('; ');
      }
    }

    if (Object.keys(chains).length > 0) result[pname] = chains;
  }
  return result;
}

// === v2.3: 四层叠宫(本命×大限×流年×流月) + 飞化 ===
function computeFourLayerDieGong(palaces, daxian, order, yearStem, year, liunianSihua, birthLunarMonth, birthHourYinIdx) {
  const isYang = ['甲','丙','戊','庚','壬'].includes(yearStem);
  const gender = process.argv[5] || 'male';
  const isMale = (gender === 'male' || gender === '男' || gender === 'm' || gender === 1);
  const daxianForward = (isMale && isYang) || (!isMale && !isYang);

  // 大限走宫顺序
  const daxianOrder = [];
  const mingIdx = order.indexOf('命宫');
  for (let i = 0; i < 12; i++) {
    const idx = daxianForward ? (mingIdx + i) % 12 : (mingIdx - i + 12) % 12;
    daxianOrder.push(order[idx]);
  }

  // v2.8 流月斗君法（六方会诊裁定 + iztro 源码实证·2026-08-30）:
  // 正月所在宫 = 流年支逆数到生月宫, 再顺数到生时(蔡明宏简易法数学同源);
  // 之后每月顺排一宫(地支递增)。公式(寅0索引): 正月=fix(流年支寅0-生月+生时寅0+1); m月=正月+(m-1)
  const DZ_ORDER2 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  // v2.7: 流年命宫=流年地支绝对映射（与 computeDieGong 同口径修正）
  const dzToPalace = buildDzPalaceMap(palaces);

  const fourLayer = [];
  for (let dxIdx = 0; dxIdx < daxian.length; dxIdx++) {
    const dx = daxian[dxIdx];
    const dxPalaceName = daxianOrder[dxIdx] || dx.palace;

    const liunianEntries = [];
    for (let ly = 0; ly < 10; ly++) {
      const yearNum = year + dx.range[0] - 1 + ly;
      const lnStem = getYearStem(yearNum);
      const lnBranch = getYearBranch(yearNum);
      const lnPalace = dzToPalace[lnBranch] || order[0];  // 绝对映射
      const lnYinIdx = ((DZ_ORDER2.indexOf(lnBranch) - 2) % 12 + 12) % 12;  // 流年支(寅0)

      // 流月: 斗君法(正月=斗君位), 顺排12月(地支递增)
      const liuyueEntries = [];
      for (let m = 1; m <= 12; m++) {
        const mDz = monthNumToDz(m);
        const mStem = getMonthStem(lnStem, mDz);
        const mSihua = SIHUA_TABLE[mStem];

        // 流月命宫(斗君法): 正月宫(寅0)=fix(流年支寅0-生月+生时寅0+1); m月=正月+(m-1)
        const janYin = (((lnYinIdx - birthLunarMonth + birthHourYinIdx + 1) % 12) + 12) % 12;
        const mDzAbs = DZ_ORDER2[(janYin + m - 1 + 2) % 12];   // m月宫地支(子0)
        const lmPalace = dzToPalace[mDzAbs] || order[0];       // 流月命宫=该地支本命宫

        // 四层叠宫: 流月宫|流年宫|大限宫|本命宫
        const dieGong4 = `${lmPalace}|${lnPalace}|${dxPalaceName}`;

        // 飞化: 各层宫干→四化星落地宫
        const flyLines = [];
        // 流月飞化
        if (mSihua) {
          const tags = ['禄','权','科','忌'];
          for (let t = 0; t < 4; t++) {
            const s = mSihua[t];
            for (const pn of order) {
              if (!palaces[pn]) continue;
              const allNames = [...(palaces[pn].major||[]).map(x=>x.name), ...(palaces[pn].minor||[]).map(x=>x.name)];
              if (allNames.includes(s)) {
                flyLines.push(`流月${m}(${mStem}):${s}${tags[t]}→${pn}`);
                break;
              }
            }
          }
        }

        // v2.10: 月耀(月魁钺昌曲禄羊陀马鸾喜·iztro monthly 同源)
        const _mStars = computeHoroscopeStars(mStem, mDz, '月', false);
        const _mStarMap = {};
        _mStars.forEach((list, i) => {
          const pn = dzToPalace[DZ_ORDER2[i]];
          if (pn && list.length) _mStarMap[pn] = list;
        });
        liuyueEntries.push({
          month: m, dz: mDz, stem: mStem,
          liuyuePalace: lmPalace,
          sihua: mSihua ? { 禄:mSihua[0], 权:mSihua[1], 科:mSihua[2], 忌:mSihua[3] } : null,
          dieGong: dieGong4,
          flyHua: flyLines.length > 0 ? flyLines.join('; ') : '',
          stars: _mStarMap
        });
      }

      liunianEntries.push({
        year: yearNum, stem: lnStem,
        liunianPalace: lnPalace,
        basePalace: dxPalaceName,
        liuyue: liuyueEntries
      });
    }
    fourLayer.push({ daxian: dx.palace, range: dx.range, liunian: liunianEntries });
  }
  return fourLayer;
}

// ====== MAIN ======
const args = process.argv.slice(2);
// v2.10: 剔除 --day YYYY-MM-DD 参数后解析位置参数（防日期串污染经度/分钟）
const posArgs = [];
let dayArg = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--day' && args[i + 1]) { dayArg = args[i + 1]; i++; continue; }
  posArgs.push(args[i]);
}
const [year, month, day, hour, gender, minuteArg, lonArg] = [parseInt(posArgs[0]), parseInt(posArgs[1]), parseInt(posArgs[2]), parseInt(posArgs[3]), posArgs[4], parseInt(posArgs[5]||'0'), parseFloat(posArgs[6]||'120')];
const minute = isNaN(minuteArg) ? 0 : minuteArg;
const longitude = isNaN(lonArg) ? 120.0 : lonArg;
let dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

try {
  const st = solarTimeCorrection(year, month, day, hour, minute, longitude);
  // v2.6 子时口径对齐文墨金标：0时=当天早子时；EoT负值回退不跨日（晚子时23-0:59归当天, iztro dayDivide=current）
  if (hour === 0 && st.dayOffset === -1) { st.dayOffset = 0; }
  if (st.dayOffset !== 0) { dateStr = addDays(dateStr, st.dayOffset); }
  const timeIdx = hourToIndex(st.hour);
  const g = (gender === '男' || gender === 'male' || gender === 'm' || gender === 1) ? '男' : '女';
  const c = astro.bySolar(dateStr, timeIdx, g, false);

  // v2.8 流月斗君法参数: 农历生月(闰月后15天+1, iztro口径) + 生时支(寅0索引)
  const _lunarB = solar2lunar(dateStr);
  const _birthLunarMonth = _lunarB.lunarMonth + (_lunarB.isLeap && _lunarB.lunarDay > 15 ? 1 : 0);
  const _birthHourYinIdx = ((timeIdx - 2) % 12 + 12) % 12;  // 生时支(寅0)

  const order = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','仆役','官禄','田宅','福德','父母'];
  const palaces = {};
  let mingGong = { name: '', tg: '', dz: '' }, shenGong = { name: '', tg: '', dz: '' };
  // 年支(用于文墨标准岁前星重算)
  const yearBranch = c.chineseDate ? c.chineseDate.charAt(1) : '午';

  for (let i = 0; i < c.palaces.length; i++) {
    const p = c.palaces[i];
    const tg = p.heavenlyStem || '?', dz = p.earthlyBranch || '?';
    let pname = p.name;
    for (const o of order) { if (o[0] === pname[0]) { pname = o; break; } }
    // 岁前星·文墨标准循环重算(修复iztro兄弟宫大耗→岁破的bug)
    const sqVal = computeSuiqian(dz, yearBranch);
    const jqVal = p.jiangqian12 || '';
    const csVal = p.changsheng12 || '';
    const bsVal = p.boshi12 || '';
    const bsFixed = bsVal === '官府' ? '官符' : bsVal;  // 官府→官符
    // v2.5: adjStars + 白名单神煞 → WMT小星对齐
    const adjNames = new Set();
    for (const s of (p.adjectiveStars||[])) {
      if (s.name) adjNames.add(STAR_NAME_WMT[s.name] || s.name);
    }
    // 合并白名单神煞
    for (const v of [sqVal, jqVal, csVal, bsFixed]) {
      if (v && WMT_ADJ_FROM_SHENSHA.has(v)) adjNames.add(STAR_NAME_WMT[v] || v);
    }
    palaces[pname] = {
      tianGan: tg, diZhi: dz,
      major: (p.majorStars||[]).filter(s=>s.name).map(s=>({name:s.name, mutagen:s.mutagen||'', brightness:s.brightness||''})),
      minor: (p.minorStars||[]).filter(s=>s.name).map(s=>({name:s.name, mutagen:s.mutagen||'', brightness:s.brightness||''})),
      adjStars: [...adjNames].sort().map(n=>({name:n})),
      changsheng12: csVal,
      boshi12: bsFixed,
      jiangqian12: jqVal,
      suiqian12: sqVal,
      isBodyPalace: p.isBodyPalace||false
    };
    if (pname === '命宫') { mingGong = { name: pname, tg, dz }; }
    if (p.isBodyPalace) { shenGong = { name: pname, tg, dz }; }
  }

  // 年干
  const yearStem = c.chineseDate ? c.chineseDate.charAt(0) : (mingGong.tg || '?');

  // 生年四化：以 SIHUA_TABLE(文墨天机校准)为准生成
  // ⚠️ 关键修复：iztro 原生 mutagen 在丙/壬年存在循环错位(丙:禄权科忌→天同天机文昌廉贞)，
  //    故生年四化改由 SIHUA_TABLE[yearStem] 推星落宫，不再读取 iztro mutagen。
  const sihuaMap = {};
  const sy = SIHUA_TABLE[yearStem];
  if (sy) {
    const tags = ['禄','权','科','忌'];
    for (let i = 0; i < 4; i++) {
      const starName = sy[i], tag = tags[i];
      for (const pname of Object.keys(palaces)) {
        const found = [...palaces[pname].major, ...palaces[pname].minor].find(s => s.name === starName);
        if (found) { sihuaMap[tag] = { star: starName, palace: pname }; break; }
      }
    }
  }

  // ✨ v2.2: 天魁钺校正
  fixTianKuiYue(palaces, yearStem);

  // 大限12宫
  // 🔴 2026-08-25 修复：iztro 对阳男输出逆行、阳女输出顺行，方向与文墨金标准相反。
  //    正确规则：阳男阴女顺行=地支递增(命→父→福→田→官→友...)，阴男阳女逆行=地支递减(命→兄→夫→子...)。
  //    按地支重排，起运岁数仍取 iztro 命宫 range[0]（五行局数·火六局=6）。
  const _dxAll = c.palaces.map(p => ({ p, r: (p.decadal || {}).range })).filter(x => x.r);
  const _mingP = _dxAll.find(x => x.p.name.startsWith('命'));
  const _startAge = _mingP ? _mingP.r[0] : 6;
  const _DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const _isYangY = ['甲','丙','戊','庚','壬'].includes(yearStem);
  const _isMaleG = (g === '男');
  const _dxForward = (_isMaleG && _isYangY) || (!_isMaleG && !_isYangY);
  const _dzMap = {};
  for (const x of _dxAll) { _dzMap[x.p.earthlyBranch] = x.p; }
  const _mingDz = _mingP.p.earthlyBranch;
  // 顺行宫序=地支递增(命酉→父戌→福亥→田子...)，逆行=地支递减(命酉→兄申→夫未...)
  const _step = _dxForward ? 1 : -1;
  const daxian = [];
  for (let i = 0; i < 12; i++) {
    const dz = _DZ[(_DZ.indexOf(_mingDz) + i * _step + 12) % 12];
    const p = _dzMap[dz];
    let pname = p.name;
    for (const o of order) { if (o[0] === pname[0]) { pname = o; break; } }
    daxian.push({ palace: pname, range: [_startAge + i * 10, _startAge + i * 10 + 9], ages: [] });
  }

  // 五行局
  let wuxingJu = c.fiveElementsClass || c.wuxingJu || '';
  if (!wuxingJu) {
    const nayinMap = {
      '甲子乙丑':'金','丙子丁丑':'水','戊子己丑':'火','庚子辛丑':'土','壬子癸丑':'木',
      '甲寅乙卯':'水','丙寅丁卯':'火','戊寅己卯':'土','庚寅辛卯':'木','壬寅癸卯':'金',
      '甲辰乙巳':'火','丙辰丁巳':'土','戊辰己巳':'木','庚辰辛巳':'金','壬辰癸巳':'水',
      '甲午乙未':'金','丙午丁未':'水','戊午己未':'火','庚午辛未':'土','壬午癸未':'木',
      '甲申乙酉':'水','丙申丁酉':'火','戊申己酉':'土','庚申辛酉':'木','壬申癸酉':'金',
      '甲戌乙亥':'火','丙戌丁亥':'土','戊戌己亥':'木','庚戌辛亥':'金','壬戌癸亥':'水'
    };
    const nayinToJu = { '水':'水二局','木':'木三局','金':'金四局','土':'土五局','火':'火六局' };
    const sc = mingGong.tg + mingGong.dz; let nw = null;
    for (const [k,v] of Object.entries(nayinMap)) { if (k.includes(sc)) { nw=v; break; } }
    if (nw && nayinToJu[nw]) wuxingJu = nayinToJu[nw];
  }

  // 来因宫
  const laiyinDz = TIAN_GAN_TO_LAIYIN[yearStem] || null;
  let laiyinPalace = '';
  if (laiyinDz) {
    for (const pname of order) {
      if (palaces[pname] && palaces[pname].diZhi === laiyinDz) { laiyinPalace = pname; break; }
    }
  }

  // ✨ v2.2: 自化(排除生年四化重复)
  const selfTransform = computeSelfTransform(palaces, order, sihuaMap);

  // 按起始年份排序大限(chronological, 匹配WMT)
  daxian.sort((a,b) => a.range[0] - b.range[0]);

  // ✨ v2.2: 大限四化
  const daxianSihua = computeDaxianSihua(daxian, palaces, order);

  // ✨ v2.6: 大限十二宫↔本命宫显式映射(全量144条·紫灵补强设计)
  const daxianPalaceMap = computeDaxianPalaceMap(daxian, palaces);

  // ✨ v2.9: 流年宫位映射(1440条) + 流耀 + 流年岁前/将前十二神
  const liunianPalaceMap = computeLiunianPalaceMap(daxian, year, palaces);
  const _DZ_ABS = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const _dzToPalaceFull = buildDzPalaceMap(palaces);
  const liunianStars = {};
  const liunianDecStar = {};
  for (const dx of daxian) {
    for (let ly = 0; ly < 10; ly++) {
      const _y = year + dx.range[0] - 1 + ly;
      const _st = getYearStem(_y), _br = getYearBranch(_y);
      const _arr = computeLiunianStars(_st, _br);
      const _m = {};
      _arr.forEach((list, i) => { const pn = _dzToPalaceFull[_DZ_ABS[i]]; if (pn && list.length) _m[pn] = list; });
      liunianStars[_y] = _m;
      const _ds = computeLiunianDecStar(_br);
      const _sq = {}, _jq = {};
      _ds.suiqian12.forEach((v, i) => { const pn = _dzToPalaceFull[_DZ_ABS[i]]; if (pn) _sq[pn] = v; });
      _ds.jiangqian12.forEach((v, i) => { const pn = _dzToPalaceFull[_DZ_ABS[i]]; if (pn) _jq[pn] = v; });
      liunianDecStar[_y] = { suiqian12: _sq, jiangqian12: _jq };
    }
  }

  // ✨ v2.10: 小限(虚岁→地支) + 童限(起运前)
  const xianAgeMap = computeXianAgeMap(yearBranch, g);
  const xianAgePalace = {};
  for (const [age, dz] of Object.entries(xianAgeMap)) {
    xianAgePalace[age] = _dzToPalaceFull[dz] || dz;
  }
  const childhood = computeChildhood(daxian.length ? daxian[0].range[0] : 1);

  // ✨ v2.10: 流日/流时盘(可选 --day YYYY-MM-DD·iztro daily/hourly 同源)
  let liuri = null;
  if (dayArg && /^\d{4}-\d{2}-\d{2}$/.test(dayArg)) {
    try {
      const dl = solar2lunar(dayArg);
      if (dl) {
        const dayYear = parseInt(dayArg.slice(0, 4));
        const yBranch = getYearBranch(dayYear);
        const yYinIdx = ((_DZ_ABS.indexOf(yBranch) - 2) % 12 + 12) % 12;
        const janYin = (((yYinIdx - _birthLunarMonth + _birthHourYinIdx + 1) % 12) + 12) % 12;
        const monthAdj = dl.isLeap && dl.lunarDay > 15 ? 1 : 0;
        const mYinIdx = (janYin + dl.lunarMonth - 1 + monthAdj) % 12;
        const dYinIdx = (mYinIdx + dl.lunarDay - 1) % 12;
        const dDz = _DZ_ABS[(dYinIdx + 2) % 12];
        const dPalace = _dzToPalaceFull[dDz] || '?';
        let dStem = '?';
        try {
          const _g = require('lunar-lite').getHeavenlyStemAndEarthlyBranchBySolarDate(dayArg, 0, {});
          if (_g && _g.daily && _g.daily[0]) dStem = _g.daily[0];
        } catch (e) {}
        const dStars = computeHoroscopeStars(dStem, dDz, '日', false);
        const dStarMap = {};
        dStars.forEach((list, i) => { const pn = _dzToPalaceFull[_DZ_ABS[i]]; if (pn && list.length) dStarMap[pn] = list; });
        const hourly = [];
        for (let hh = 0; hh < 12; hh++) {
          const hBranch = _DZ_ABS[hh];
          const hYinIdx = (dYinIdx + hh) % 12;
          const hDz = _DZ_ABS[(hYinIdx + 2) % 12];
          const hPalace = _dzToPalaceFull[hDz] || '?';
          const hStem = getHourStem(dStem, hBranch);
          const hStars = computeHoroscopeStars(hStem, hDz, '时', false);
          const hStarMap = {};
          hStars.forEach((list, i) => { const pn = _dzToPalaceFull[_DZ_ABS[i]]; if (pn && list.length) hStarMap[pn] = list; });
          hourly.push({ branch: hBranch, stem: hStem, palace: hPalace, stars: hStarMap });
        }
        liuri = { date: dayArg, lunarMonth: dl.lunarMonth, lunarDay: dl.lunarDay, isLeap: !!dl.isLeap,
                  dailyPalace: dPalace, dailyStem: dStem, dailyStars: dStarMap, hourly };
      }
    } catch (e) { liuri = { error: e.message }; }
  }

  // ✨ v2.2: 流年四化(前8大限×10年=80年)·虚岁→公历年
  const daxianCount = daxian.length;
  const liunianAll = {};
  for (let i = 0; i < daxianCount; i++) {
    const dx = daxian[i];
    // 虚岁→公历年: solar = birthYear + (虚岁 - 1)
    liunianAll[dx.palace] = computeLiunianSihua(year + dx.range[0] - 1, year + dx.range[1] - 1);
  }

  // ✨ v2.7: 流年四化落宫显式化（星所在本命宫·禁模型心算找星）
  const starPalace = buildStarPalaceMap(palaces);
  for (const key of Object.keys(liunianAll)) {
    for (const y of liunianAll[key]) {
      const si = y.sihua || {};
      y.sihuaPalace = {};
      for (const tag of ['禄','权','科','忌']) {
        y.sihuaPalace[tag] = starPalace[si[tag]] || '?';
      }
    }
  }

  // ✨ v2.2: 叠宫
  const dieGong = computeDieGong(palaces, daxian, order, yearStem);

  // ✨ v2.3: 流月四化(前8大限×10年×12月=960条)
  const liuyueAll = {};
  const dyKeys = Object.keys(liunianAll);
  for (const key of dyKeys) {
    const years = liunianAll[key];
    liuyueAll[key] = years.map(y => ({
      year: y.year, stem: y.stem,
      liuyue: computeLiuyueSihua(y.stem, y.year)
    }));
  }

  // ✨ v2.3: 四层叠宫 + 飞化
  const fourLayerDieGong = computeFourLayerDieGong(palaces, daxian, order, yearStem, year, liunianAll, _birthLunarMonth, _birthHourYinIdx);

  // ✨ v2.4: 飞宫链(禄转忌·忌转忌·禄转禄)
  const flyingChains = computeFlyingChains(palaces, order);

  const result = {
    success: true,
    version: '2.10-horoscope-full',
    solar: c.solarDate || dateStr,
    lunar: c.chineseDate || '',
    gender: g === '男' ? '男' : '女',
    ming: mingGong,
    shen: shenGong,
    wuxingJu: wuxingJu,
    soul: c.soul || '',
    bodyStar: c.body || '',
    yearStem,
    sihua: sihuaMap,
    laiyinPalace: laiyinPalace || '?',
    selfTransform,
    daxianSihua,           // ✨ v2.2: 大限四化
    daxianPalaceMap,       // ✨ v2.6: 大限十二宫↔本命宫显式映射(12大限×12宫=144条)
    liunianPalaceMap,      // ✨ v2.9: 流年十二宫↔本命宫显式映射(120年×12宫=1440条)
    liunianStars,          // ✨ v2.9: 流年神煞(流魁钺昌曲禄羊陀马鸾喜年解·按年按宫)
    liunianDecStar,        // ✨ v2.9: 流年岁前/将前十二神(按年按宫)
    xianAgePalace,         // ✨ v2.10: 小限(虚岁→本命宫)
    childhood,             // ✨ v2.10: 童限(起运前)
    liuri,                 // ✨ v2.10: 流日/流时盘(--day YYYY-MM-DD 时输出)
    liunianSihua: liunianAll,  // ✨ v2.2: 流年四化
    dieGong,                // ✨ v2.2: 叠宫(三层)
    liuyueSihua: liuyueAll,    // ✨ v2.3: 流月四化
    fourLayerDieGong,          // ✨ v2.3: 四层叠宫+飞化
    flyingChains,              // ✨ v2.4: 飞宫链
    palaces,
    daxian
  };
  console.log(JSON.stringify(result, null, 2));
} catch(e) {
  console.log(JSON.stringify({ success: false, error: e.message }));
}
