const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const STEM_ELEMENT = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const BRANCH_ELEMENT = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
const MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const HOUR_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const GRID_ELEMENT = { 1: "木", 2: "木", 3: "火", 4: "火", 5: "土", 6: "土", 7: "金", 8: "金", 9: "水", 0: "水" };
const MONTH_NAMES = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
const DAY_NAMES = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
];

export const CITY_LONGITUDES = {
  "北京": 116.4, "上海": 121.47, "天津": 117.2, "重庆": 106.55,
  "石家庄": 114.5, "唐山": 118.2, "秦皇岛": 119.6, "邯郸": 114.5,
  "保定": 115.5, "张家口": 114.9, "承德": 117.9, "沧州": 116.8,
  "太原": 112.6, "大同": 113.3, "阳泉": 113.6, "长治": 113.1,
  "呼和浩特": 111.8, "包头": 109.8, "赤峰": 119.0, "通辽": 122.3,
  "沈阳": 123.4, "大连": 121.6, "鞍山": 123.0, "丹东": 124.4,
  "长春": 125.3, "吉林": 126.5, "四平": 124.4, "通化": 125.9,
  "哈尔滨": 126.6, "齐齐哈尔": 123.9, "大庆": 125.0, "牡丹江": 129.6,
  "南京": 118.8, "无锡": 120.3, "苏州": 120.6, "常州": 119.9,
  "南通": 120.9, "扬州": 119.4, "镇江": 119.5, "徐州": 117.2,
  "杭州": 120.2, "宁波": 121.5, "温州": 120.7, "嘉兴": 120.8,
  "金华": 119.6, "台州": 121.4, "绍兴": 120.6, "胡州": 120.1,
  "合肥": 117.3, "芜湖": 118.4, "蚌埠": 117.4, "安庆": 117.0,
  "福州": 119.3, "厦门": 118.1, "泉州": 118.6, "漳州": 117.7,
  "南昌": 115.9, "九江": 116.0, "赣州": 115.0, "景德镇": 117.2,
  "济南": 117.0, "青岛": 120.4, "烟台": 121.4, "潍坊": 119.1,
  "济宁": 116.6, "临沂": 118.4, "威海": 122.1, "泰安": 117.1,
  "郑州": 113.6, "开封": 114.3, "洛阳": 112.4, "安阳": 114.4,
  "新乡": 113.9, "南阳": 112.5, "商丘": 115.6, "信阳": 114.1,
  "武汉": 114.3, "宜昌": 111.3, "襄阳": 112.1, "荆州": 112.2,
  "十堰": 110.8, "黄石": 115.1, "孝感": 113.9, "黄冈": 114.9,
  "长沙": 113.0, "株洲": 113.2, "衡阳": 112.6, "岳阳": 113.1,
  "常德": 111.7, "邵阳": 111.5, "永州": 111.6, "怀化": 109.9,
  "广州": 113.3, "深圳": 114.1, "珠海": 113.6, "佛山": 113.1,
  "东莞": 113.8, "中山": 113.4, "惠州": 114.4, "汕头": 116.7,
  "湛江": 110.4, "肇庆": 112.5, "清远": 113.0, "揭阳": 116.4,
  "南宁": 108.4, "柳州": 109.4, "桂林": 110.3, "北海": 109.1,
  "海口": 110.3, "三亚": 109.5,
  "成都": 104.1, "绵阳": 104.7, "德阳": 104.4, "宜宾": 104.6,
  "乐山": 103.8, "南充": 106.1, "达州": 107.5, "广元": 105.8,
  "贵阳": 106.7, "遵义": 106.9, "六盘水": 104.8,
  "昆明": 102.7, "大理": 100.2, "丽江": 100.2, "曲靖": 103.8,
  "拉萨": 91.1, "日喀则": 88.9,
  "西安": 108.9, "宝鸡": 107.2, "咸阳": 108.7, "汉中": 107.0,
  "兰州": 103.8, "天水": 105.7, "酒泉": 98.5, "张掖": 100.5,
  "西宁": 101.8, "银川": 106.3,
  "乌鲁木齐": 87.6, "喀什": 76.0, "伊犁": 81.3,
  "香港": 114.2, "澳门": 113.5, "台北": 121.5,
};

function mod(n, size) {
  return ((n % size) + size) % size;
}

function ganzhi(index) {
  return `${STEMS[mod(index, 10)]}${BRANCHES[mod(index, 12)]}`;
}

function lunarYearDays(year) {
  let sum = 348;
  const info = LUNAR_INFO[year - 1900];
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) if (info & bit) sum += 1;
  return sum + leapDays(year);
}

function leapMonth(year) {
  return LUNAR_INFO[year - 1900] & 0xf;
}

function leapDays(year) {
  const leap = leapMonth(year);
  if (!leap) return 0;
  return LUNAR_INFO[year - 1900] & 0x10000 ? 30 : 29;
}

function monthDays(year, month) {
  return LUNAR_INFO[year - 1900] & (0x10000 >> month) ? 30 : 29;
}

export function solarToLunar(yr, mn, dy) {
  const base = Date.UTC(1900, 0, 31);
  let offset = Math.floor((Date.UTC(yr, mn - 1, dy) - base) / 86400000);
  let year = 1900;
  while (year < 2101 && offset >= lunarYearDays(year)) {
    offset -= lunarYearDays(year);
    year += 1;
  }

  const leap = leapMonth(year);
  let isLeap = false;
  let month = 1;
  while (month <= 12) {
    let days = isLeap ? leapDays(year) : monthDays(year, month);
    if (offset < days) break;
    offset -= days;
    if (leap === month && !isLeap) {
      isLeap = true;
    } else {
      if (isLeap) isLeap = false;
      month += 1;
    }
  }

  const day = offset + 1;
  const label = `农历${STEMS[(year - 4) % 10]}${BRANCHES[(year - 4) % 12]}年${isLeap ? "闰" : ""}${MONTH_NAMES[month - 1]}${DAY_NAMES[day - 1]}`;
  return { year, month, day, isLeap, label };
}

function parseBirth({ birthDate, birthTime, birthPlace }) {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour = 0, minute = 0] = (birthTime || "00:00").split(":").map(Number);
  if (!year || !month || !day) return null;
  const longitude = CITY_LONGITUDES[birthPlace] || 120;
  const correctionMinutes = Math.round((longitude - 120) * 4);
  const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute + correctionMinutes, 0));
  return { date, year, month, day, hour, minute, longitude, correctionMinutes };
}

function dayGanzhiIndex(year, month, day) {
  const base = Date.UTC(1900, 0, 31);
  const target = Date.UTC(year, month - 1, day);
  const days = Math.floor((target - base) / 86400000);
  return mod(days + 40, 60);
}

function monthPillar(yearStem, month) {
  const branch = MONTH_BRANCHES[mod(month - 2, 12)];
  const monthOrder = mod(month - 2, 12);
  const firstStemByYearStem = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 };
  return `${STEMS[mod(firstStemByYearStem[yearStem] + monthOrder, 10)]}${branch}`;
}

function hourPillar(dayStem, hour) {
  const branchIndex = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  const firstStemByDayStem = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 };
  return `${STEMS[mod(firstStemByDayStem[dayStem] + branchIndex, 10)]}${HOUR_BRANCHES[branchIndex]}`;
}

function countElements(pillars) {
  const elements = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of Object.values(pillars)) {
    elements[STEM_ELEMENT[pillar[0]]] += 1;
    elements[BRANCH_ELEMENT[pillar[1]]] += 1;
  }
  return elements;
}

function strengthHint(elements) {
  const values = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const strongest = values[0];
  const weakest = values.filter(([, count]) => count === 0).map(([name]) => name);
  if (strongest[1] >= 4) return `${strongest[0]}偏旺，取名宜留意平衡`;
  if (weakest.length) return `${weakest.join("、")}偏弱，可关注相关字义与五行补充`;
  return "五行分布相对均衡";
}


export function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap) {
  // Reference: solar 1900-01-31 = lunar 1900-01-01
  let offset = 0;
  // Add days for full years from 1900 to target year
  for (let y = 1900; y < lunarYear; y++) {
    offset += lunarYearDays(y);
  }
  // Add days for months before target month
  const leap = leapMonth(lunarYear);
  let addedLeap = false;
  for (let m = 1; m < lunarMonth; m++) {
    offset += monthDays(lunarYear, m);
    if (leap === m && !addedLeap) {
      offset += leapDays(lunarYear);
      addedLeap = true;
    }
  }
  // Add leap month days if target is after leap
  if (isLeap) {
    offset += monthDays(lunarYear, lunarMonth);
  }
  // Add days before target day
  offset += lunarDay - 1;
  // Convert to solar date
  const target = new Date(Date.UTC(1900, 0, 31 + offset));
  return {
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    day: target.getUTCDate()
  };
}

function calculateBazi(input) {
  const parsed = parseBirth(input);
  if (!parsed) return null;
  const yearIndex = mod(parsed.year - 4, 60);
  const year = ganzhi(yearIndex);
  const month = monthPillar(year[0], parsed.month);
  const day = ganzhi(dayGanzhiIndex(parsed.year, parsed.month, parsed.day));
  const hour = hourPillar(day[0], parsed.date.getUTCHours() + 8);
  const pillars = { year, month, day, hour };
  const elements = countElements(pillars);
  const lunar = solarToLunar(parsed.year, parsed.month, parsed.day);

  var pillarDetail = Object.entries(pillars).map(([key, value]) => ({
    key,
    pillar: value,
    stemElement: STEM_ELEMENT[value[0]],
    branchElement: BRANCH_ELEMENT[value[1]],
  }));
  return {
    pillars,
    elements,
    pillarDetail,
    lunar,
    zodiac: ZODIACS[mod(lunar.year - 4, 12)],
    strengthHint: strengthHint(elements),
    solarTimeNote:
      parsed.correctionMinutes === 0
        ? "按东八区标准时间计算"
        : `已按${input.birthPlace}经度约${parsed.longitude}度修正真太阳时${parsed.correctionMinutes}分钟`,
    sources: [
      "00_raw_repos/05_numerology/pyLunarCalendar-master/lunar.py",
      "00_raw_repos/06_auxiliary/chronos-master/lunar.go",
      "00_raw_repos/06_auxiliary/chronos-master/zodiac.go",
      "00_raw_repos/05_numerology/fate-main/internal/bazi/bazi.go",
    ],
  };
}

function gridElement(value) {
  return GRID_ELEMENT[value % 10];
}

function shortEightyOne(value) {
  const good = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81]);
  const mixed = new Set([26, 27, 30, 38, 42, 43, 50, 51, 55, 58, 71, 73, 75, 77, 78, 80]);
  if (good.has(value)) return "吉";
  if (mixed.has(value)) return "半吉";
  return "民俗上需谨慎";
}

export function calculateWuGe(surname, given, strokes) {
  const s = [...surname];
  const g = [...given];
  const l1 = strokes[s[0]] || 0;
  const l2 = s.length > 1 ? strokes[s[1]] || 0 : 0;
  const f1 = strokes[g[0]] || 0;
  const f2 = g.length > 1 ? strokes[g[1]] || 0 : 0;
  if (!l1 || !f1) return null;

  const tian = l2 === 0 ? l1 + 1 : l1 + l2;
  const ren = l2 === 0 ? l1 + f1 : l2 + f1;
  const di = f2 === 0 ? f1 + 1 : f1 + f2;
  const wai = l2 === 0 && f2 === 0 ? 2 : l2 === 0 ? 1 + f2 : f2 === 0 ? l1 + 1 : l1 + f2;
  const total = ((l1 + l2 + f1 + f2 - 1) % 81) + 1;
  const wrap = (label, value) => ({ label, value, element: gridElement(value), text: shortEightyOne(value) });
  const result = {
    tian: wrap("天格", tian),
    ren: wrap("人格", ren),
    di: wrap("地格", di),
    wai: wrap("外格", wai),
    total: wrap("总格", total),
    sources: [
      "00_raw_repos/05_numerology/fate-main/internal/wuge/wuge.go",
      "00_raw_repos/07_github_supplement/johnwu1114-chinese-name/EightyOne.json",
    ],
  };
}

export function describeFullName({ surname, given, citation, chars }) {
  const full = `${surname}${given}`;
  const warmth = chars.reduce((sum, char) => sum + (char.warmth || 0), 0) / Math.max(chars.length, 1);
  const competence = chars.reduce((sum, char) => sum + (char.competence || 0), 0) / Math.max(chars.length, 1);
  const temperament = warmth >= competence ? "温润、舒展" : "明朗、清健";
  const source = citation ? `取意可参考${citation.source || "典籍"}“${citation.text}”。` : "未强配出处，主要依据字义、读音和姓名语料。";
  return `${full}读来顺口自然，${given}与${surname}姓相接，气质偏${temperament}。${source}整体寓意可理解为品性端正、心境安稳、成长开阔。`;
}


// ===== 十神计算 (Ten Gods) =====
const TIAN_GAN_SHI_SHEN_MAP = {
  "甲": {"甲":"比肩","乙":"劫财","丙":"食神","丁":"伤官","戊":"偏财","己":"正财","庚":"七杀","辛":"正官","壬":"偏印","癸":"正印"},
  "乙": {"甲":"劫财","乙":"比肩","丙":"伤官","丁":"食神","戊":"正财","己":"偏财","庚":"正官","辛":"七杀","壬":"正印","癸":"偏印"},
  "丙": {"甲":"偏印","乙":"正印","丙":"比肩","丁":"劫财","戊":"食神","己":"伤官","庚":"偏财","辛":"正财","壬":"七杀","癸":"正官"},
  "丁": {"甲":"正印","乙":"偏印","丙":"劫财","丁":"比肩","戊":"伤官","己":"食神","庚":"正财","辛":"偏财","壬":"正官","癸":"七杀"},
  "戊": {"甲":"七杀","乙":"正官","丙":"偏印","丁":"正印","戊":"比肩","己":"劫财","庚":"食神","辛":"伤官","壬":"偏财","癸":"正财"},
  "己": {"甲":"正官","乙":"七杀","丙":"正印","丁":"偏印","戊":"劫财","己":"比肩","庚":"伤官","辛":"食神","壬":"正财","癸":"偏财"},
  "庚": {"甲":"偏财","乙":"正财","丙":"七杀","丁":"正官","戊":"偏印","己":"正印","庚":"比肩","辛":"劫财","壬":"食神","癸":"伤官"},
  "辛": {"甲":"正财","乙":"偏财","丙":"正官","丁":"七杀","戊":"正印","己":"偏印","庚":"劫财","辛":"比肩","壬":"伤官","癸":"食神"},
  "壬": {"甲":"食神","乙":"伤官","丙":"偏财","丁":"正财","戊":"七杀","己":"正官","庚":"偏印","辛":"正印","壬":"比肩","癸":"劫财"},
  "癸": {"甲":"伤官","乙":"食神","丙":"正财","丁":"偏财","戊":"正官","己":"七杀","庚":"正印","辛":"偏印","壬":"劫财","癸":"比肩"},
};

const SHENG_ORDER = ["木","火","土","金","水"];

function shiShen(dayStem, targetStem) {
  const m = TIAN_GAN_SHI_SHEN_MAP[dayStem];
  return m ? (m[targetStem] || "未知") : "未知";
}

// 地支藏干 (hidden stems in branches) with weights
const DI_ZHI_HIDDEN_STEMS = {
  "子": [["癸", 1.0]],
  "丑": [["己", 0.6], ["癸", 0.2], ["辛", 0.2]],
  "寅": [["甲", 0.6], ["丙", 0.3], ["戊", 0.1]],
  "卯": [["乙", 1.0]],
  "辰": [["戊", 0.6], ["乙", 0.2], ["癸", 0.2]],
  "巳": [["丙", 0.6], ["庚", 0.3], ["戊", 0.1]],
  "午": [["丙", 0.7], ["己", 0.3]],
  "未": [["己", 0.6], ["丁", 0.2], ["乙", 0.2]],
  "申": [["庚", 0.6], ["壬", 0.3], ["戊", 0.1]],
  "酉": [["辛", 1.0]],
  "戌": [["戊", 0.6], ["辛", 0.2], ["丁", 0.2]],
  "亥": [["壬", 0.7], ["甲", 0.3]],
};

// ===== 喜用神计算 (XiYong) =====
// 天干五行得分表: tiangan[月支索引][天干索引]
const TIANGAN_SCORE = [
  [1200,1200,1000,1000,1000,1000,1000,1000,1200,1200],
  [1060,1060,1000,1000,1100,1100,1140,1140,1100,1100],
  [1140,1140,1200,1200,1060,1060,1000,1000,1000,1000],
  [1200,1200,1200,1200,1000,1000,1000,1000,1000,1000],
  [1100,1100,1060,1060,1100,1100,1100,1100,1040,1040],
  [1000,1000,1140,1140,1140,1140,1060,1060,1060,1060],
  [1000,1000,1200,1200,1200,1200,1000,1000,1000,1000],
  [1040,1040,1100,1100,1160,1160,1100,1100,1000,1000],
  [1060,1060,1000,1000,1000,1000,1140,1140,1200,1200],
  [1000,1000,1000,1000,1000,1000,1200,1200,1200,1200],
  [1000,1000,1040,1040,1140,1140,1160,1160,1060,1060],
  [1200,1200,1000,1000,1000,1000,1000,1000,1140,1140],
];

// 地支藏干得分表: dizhi[地支索引][藏干名][月支索引]
const DIZHI_SCORE = [
  {"癸":[1200,1100,1000,1000,1040,1060,1000,1000,1200,1200,1060,1140]},
  {"己":[360,330,300,300,312,318,300,300,360,360,318,342],"癸":[200,228,200,200,220,212,200,220,228,240,232,200],"辛":[500,550,530,500,550,570,600,580,500,500,570,500]},
  {"甲":[600,530,570,600,550,500,500,520,530,500,500,600],"丙":[300,300,360,360,318,342,360,330,300,300,312,300],"戊":[200,220,212,200,220,228,240,232,200,200,228,200]},
  {"乙":[1200,1060,1140,1200,1100,1000,1000,1040,1060,1000,1000,1200]},
  {"戊":[360,318,342,360,330,300,300,312,318,300,300,360],"乙":[240,220,200,200,208,212,200,200,240,240,212,228],"癸":[500,550,530,500,550,570,600,580,500,500,570,500]},
  {"丙":[500,500,600,600,530,570,600,550,500,500,520,500],"庚":[300,342,300,300,330,318,300,330,342,360,348,300],"戊":[200,220,212,200,220,228,240,232,200,200,228,200]},
  {"丙":[700,700,840,840,742,798,840,770,700,700,728,700],"己":[300,330,318,300,330,342,360,348,300,300,342,300]},
  {"己":[300,300,360,360,318,342,360,330,300,300,312,300],"丁":[240,212,228,240,220,200,200,208,212,200,200,240],"乙":[500,550,530,500,550,570,600,580,500,500,570,500]},
  {"庚":[500,570,500,500,550,530,500,550,570,600,580,500],"壬":[360,330,300,300,312,318,300,300,360,360,318,342],"戊":[200,220,212,200,220,228,240,232,200,200,228,200]},
  {"辛":[1000,1140,1000,1000,1100,1060,1000,1100,1140,1200,1160,1000]},
  {"戊":[300,342,300,300,330,318,300,330,342,360,348,300],"辛":[200,200,240,240,212,228,240,220,200,200,208,200],"丁":[500,550,530,500,550,570,600,580,500,500,570,500]},
  {"壬":[360,318,342,360,330,300,300,312,318,300,300,360],"甲":[840,770,700,700,728,742,700,700,840,840,742,798]},
];

const STEM_IDX = {"甲":0,"乙":1,"丙":2,"丁":3,"戊":4,"己":5,"庚":6,"辛":7,"壬":8,"癸":9};
const STEM_ELEMENT_MAP = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const BRANCH_IDX = {"子":0,"丑":1,"寅":2,"卯":3,"辰":4,"巳":5,"午":6,"未":7,"申":8,"酉":9,"戌":10,"亥":11};

// 纳音五行表: 60甲子每对干支的纳音
const NAYIN_MAP = {
  "甲子":"海中金","乙丑":"海中金","丙寅":"炉中火","丁卯":"炉中火","戊辰":"大林木","己巳":"大林木",
  "庚午":"路旁土","辛未":"路旁土","壬申":"剑锋金","癸酉":"剑锋金","甲戌":"山头火","乙亥":"山头火",
  "丙子":"涧下水","丁丑":"涧下水","戊寅":"城头土","己卯":"城头土","庚辰":"白蜡金","辛巳":"白蜡金",
  "壬午":"杨柳木","癸未":"杨柳木","甲申":"泉中水","乙酉":"泉中水","丙戌":"屋上土","丁亥":"屋上土",
  "戊子":"霹雳火","己丑":"霹雳火","庚寅":"松柏木","辛卯":"松柏木","壬辰":"长流水","癸巳":"长流水",
  "甲午":"沙中金","乙未":"沙中金","丙申":"山下火","丁酉":"山下火","戊戌":"平地木","己亥":"平地木",
  "庚子":"壁上土","辛丑":"壁上土","壬寅":"金箔金","癸卯":"金箔金","甲辰":"覆灯火","乙巳":"覆灯火",
  "丙午":"天河水","丁未":"天河水","戊申":"大驿土","己酉":"大驿土","庚戌":"钗钏金","辛亥":"钗钏金",
  "壬子":"桑柘木","癸丑":"桑柘木","甲寅":"大溪水","乙卯":"大溪水","丙辰":"沙中土","丁巳":"沙中土",
  "戊午":"天上火","己未":"天上火","庚申":"石榴木","辛酉":"石榴木","壬戌":"大海水","癸亥":"大海水",
};

function mod_js(n, size) {
  return ((n % size) + size) % size;
}

// 计算喜用神
export function calculateXiYong(pillars) {
  const dayGan = pillars.day[0];
  const monthZhi = pillars.month[1];
  const di = BRANCH_IDX[monthZhi];
  if (di === undefined) return null;

  // 1. 计算五行得分
  const wuxingFen = {"木":0,"火":0,"土":0,"金":0,"水":0};
  for (const key of ["year","month","day","hour"]) {
    const p = pillars[key];
    const stem = p[0], branch = p[1];
    // 天干得分
    const si = STEM_IDX[stem];
    if (si !== undefined) {
      const elem = STEM_ELEMENT_MAP[stem];
      wuxingFen[elem] += TIANGAN_SCORE[di][si];
    }
    // 地支藏干得分
    const dz = DIZHI_SCORE[BRANCH_IDX[branch]];
    if (dz) {
      for (const [hiddenStem, scores] of Object.entries(dz)) {
        const elem = STEM_ELEMENT_MAP[hiddenStem];
        if (elem) wuxingFen[elem] += scores[di];
      }
    }
  }

  // 2. 计算同类/异类
  const riZhuWX = STEM_ELEMENT_MAP[dayGan];
  let similar = [], similarPoint = 0;
  let heterogeneous = [], heterogeneousPoint = 0;

  // 同类: 日主五行 + 生日主的五行 (印星)
  const shengIndex = SHENG_ORDER.indexOf(riZhuWX);
  const shengWo = SHENG_ORDER[(shengIndex + 4) % 5]; // 生我者
  similar = [riZhuWX, shengWo];
  similarPoint = wuxingFen[riZhuWX] + wuxingFen[shengWo];

  // 异类: 其余三个五行
  for (const wx of SHENG_ORDER) {
    if (!similar.includes(wx)) {
      heterogeneous.push(wx);
      heterogeneousPoint += wuxingFen[wx];
    }
  }

  // 3. 判断身强/身弱
  const isStrong = similarPoint > heterogeneousPoint;

  // 4. 定喜用神/忌神
  // 身强 → 喜用异类中得分最低者 (补消耗)
  // 身弱 → 喜用同类中得分最低者 (补帮扶)
  const candidatePool = isStrong ? heterogeneous : similar;
  let minFen = Infinity, xiYongWX = "";
  for (const wx of candidatePool) {
    if (wuxingFen[wx] < minFen) {
      minFen = wuxingFen[wx];
      xiYongWX = wx;
    }
  }

  // 忌神 = 喜用神的对立面
  // 简单规则: 身强忌用同类, 身弱忌用异类
  const jiShenPool = isStrong ? similar : heterogeneous;
  let jiWX = jiShenPool.reduce((a, wx) => wuxingFen[wx] > (wuxingFen[a] || 0) ? wx : a, jiShenPool[0]);

  // 5. 判断格局
  const total = similarPoint + heterogeneousPoint;
  const ratio = similarPoint / total;
  let geJu;
  if (ratio > 0.65) geJu = "身强";
  else if (ratio < 0.35) geJu = "身弱";
  else geJu = "中和";

  return {
    wuxingFen,
    similar,
    similarPoint,
    heterogeneous,
    heterogeneousPoint,
    isStrong,
    geJu,
    xiYong: xiYongWX,
    jiShen: jiWX,
    strength: isStrong ? "强" : "弱",
    ratio: Math.round(ratio * 100) / 100,
  };
}

// 计算十神
export function calculateShiShenFromPillars(pillars) {
  const dayGan = pillars.day[0];
  const result = {};
  for (const key of ["year","month","day","hour"]) {
    const p = pillars[key];
    result[key] = {
      stem: p[0],
      stemShiShen: shiShen(dayGan, p[0]),
      branch: p[1],
    };
    // 地支藏干十神
    const hidden = DI_ZHI_HIDDEN_STEMS[p[1]] || [];
    result[key].hiddenStems = hidden.map(([stem, weight]) => ({
      stem,
      weight,
      shiShen: shiShen(dayGan, stem),
    }));
  }
  return result;
}

// 计算纳音
export function calculateNaYin(pillars) {
  const result = {};
  for (const key of ["year","month","day","hour"]) {
    result[key] = NAYIN_MAP[pillars[key]] || "未知";
  }
  return result;
}


// 计算调候用神 (气候调节优先于扶抑用神)
function calculateTiaoHou(monthZhi, dayGan) {
  // 调候用神表: { monthBranch: { dayStem: preferredElement } }
  // 核心原则: 冬生需火暖局, 夏生需水降温, 春秋视具体干支搭配
  const MONTH_SEASON = {
    "寅":"春","卯":"春","辰":"春",
    "巳":"夏","午":"夏","未":"夏",
    "申":"秋","酉":"秋","戌":"秋",
    "亥":"冬","子":"冬","丑":"冬"
  };
  const season = MONTH_SEASON[monthZhi];
  if (!season) return null;
  // 季节基础调候需求
  if (season === "冬") return "火";   // 冬寒需火暖局
  if (season === "夏") return "水";   // 夏热需水降温
  if (season === "春") {
    // 春初尚寒需火, 春末湿需土
    if (["寅","卯"].includes(monthZhi)) return "火";
    return "土";
  }
  // 秋: 燥金需水滋润
  return "水";
}


// 计算大运 (增强版 - 使用真实月柱)
export function calculateDaYun(birthYear, gender, monthPillar) {
  const gan = STEMS[mod_js(birthYear - 4, 10)];
  const isYang = ["甲","丙","戊","庚","壬"].includes(gan);
  // 阳男阴女顺排, 阴男阳女逆排
  const forward = (isYang && gender === "male") || (!isYang && gender === "female");
  // 从月柱干支索引起运
  const monthGan = monthPillar ? monthPillar[0] : "甲";
  const monthZhi = monthPillar ? monthPillar[1] : "子";
  const monthGanIdx = STEMS.indexOf(monthGan);
  const monthZhiIdx = BRANCHES.indexOf(monthZhi);
  const startAge = 3;
  const daYun = [];
  for (let i = 0; i < 8; i++) {
    const age = startAge + i * 10;
    const step = forward ? (i + 1) : -(i + 1);
    const yunGanIdx = mod_js(monthGanIdx + step, 10);
    const yunZhiIdx = mod_js(monthZhiIdx + step, 12);
    const ganZhi = STEMS[yunGanIdx] + BRANCHES[yunZhiIdx];
    daYun.push({
      age: age + "-" + (age + 9),
      ganZhi: ganZhi,
    });
  }
  return daYun;
}

// 增强版 calculateBazi - 返回完整命盘
export function calculateFullBazi(input) {
  const base = calculateBazi(input);
  if (!base) return null;

  const pillars = base.pillars;
  const xiyong = calculateXiYong(pillars);
  const shishen = calculateShiShenFromPillars(pillars);
  const nayin = calculateNaYin(pillars);
  const monthPillar = pillars ? pillars.month : null;
  const dayGan = pillars ? pillars.day[0] : null;
  const monthZhi = monthPillar ? monthPillar[1] : null;
  const tiaoHou = monthZhi ? calculateTiaoHou(monthZhi, dayGan) : null;
  const dayun = calculateDaYun(
    input.birthDate ? new Date(input.birthDate).getFullYear() : 2024,
    input.gender || "male",
    monthPillar
  );

  // ---- 四柱宫位人生阶段映射 ----
  const PILLAR_STAGES = {
    year: { stage: "0-16岁", domain: "祖上·早年·外地", desc: "代表原生家庭根基、祖辈助力、远方求财机遇、早年成长环境" },
    month: { stage: "17-32岁", domain: "父母·同辈·青年事业", desc: "代表求学、职场起步、兄弟姐妹、人生发展的基础平台，月令是全局能量核心" },
    day: { stage: "33-55岁", domain: "自己·配偶·中年", desc: "日干为命主本人，日支为夫妻宫，主导婚姻、家庭、中年核心成败" },
    hour: { stage: "56岁后", domain: "子女·晚年·成果", desc: "代表子女运势、晚年福气、技术才华、最终人生收获" },
  };

  // ---- 十神旺度统计（含藏干加权） ----
  const tenGodCount = {};
  for (const key of ["year","month","day","hour"]) {
    const p = shishen[key];
    if (p && p.stemShiShen) {
      tenGodCount[p.stemShiShen] = (tenGodCount[p.stemShiShen] || 0) + 1;
    }
    if (p && p.hiddenStems) {
      for (const hs of p.hiddenStems) {
        tenGodCount[hs.shiShen] = (tenGodCount[hs.shiShen] || 0) + (hs.weight || 0.5);
      }
    }
  }
  const tenGodRank = Object.entries(tenGodCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count: Math.round(count * 10) / 10 }));

  return {
    ...base,
    tiaoHou: tiaoHou,
    xiyong: xiyong ? {
      wuxingScore: xiyong.wuxingFen,
      similar: xiyong.similar,
      similarPoint: xiyong.similarPoint,
      heterogeneous: xiyong.heterogeneous,
      heterogeneousPoint: xiyong.heterogeneousPoint,
      strength: xiyong.isStrong ? "身强" : "身弱",
      geJu: xiyong.geJu,
      xiYongElement: xiyong.xiYong,
      jiShenElement: xiyong.jiShen,
      ratio: xiyong.ratio,
    } : null,
    shiShen: shishen,
    naYin: nayin,
    daYun: dayun,
    pillarStages: PILLAR_STAGES,
    tenGodRank: tenGodRank,
  };
}
