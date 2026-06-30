// dayan.js - 大衍数 (DaYan) system
// Translated from: 00_raw_repos/05_numerology/fate-main/internal/wuge/dayan.go
// Provides full 81-number lookup with 吉凶, 星名, 女性不宜, 阴阳

const DAYAN_LIST = [
  { number: 1,  lucky: "吉",   skyNine: "太极之数",     sex: false, comment: "太极之数，万物开泰，生发无穷，利禄亨通。" },
  { number: 2,  lucky: "凶",   skyNine: "两仪之数",     sex: false, comment: "两仪之数，混沌未开，进退保守，志望难达。" },
  { number: 3,  lucky: "吉",   skyNine: "三才之数",     sex: false, comment: "三才之数，天地人和，大事大业，繁荣昌隆。" },
  { number: 4,  lucky: "凶",   skyNine: "四象之数",     sex: false, comment: "四象之数，待于生发，万事慎重，不具营谋。" },
  { number: 5,  lucky: "吉",   skyNine: "五行之数",     sex: false, comment: "五行俱权，循环相生，圆通畅达，福祉无穷。" },
  { number: 6,  lucky: "吉",   skyNine: "六爻之数",     sex: false, comment: "六爻之数，发展变化，天赋美德，吉祥安泰。" },
  { number: 7,  lucky: "吉",   skyNine: "七政之数",     sex: false, comment: "七政之数，精悍严谨，天赋之力，吉星照耀。" },
  { number: 8,  lucky: "半吉", skyNine: "八卦之数",     sex: false, comment: "八卦之数，乾坎艮震，巽离坤兑，无穷无尽。" },
  { number: 9,  lucky: "凶",   skyNine: "大成之数",     sex: false, comment: "大成之数，蕴涵凶险，或成或败，难以把握。" },
  { number: 10, lucky: "凶",   skyNine: "终结之数",     sex: false, comment: "终结之数，雪暗飘零，偶或有成，回顾茫然。" },
  { number: 11, lucky: "吉",   skyNine: "旱苗逢雨",     sex: false, comment: "万物更新，调顺发达，恢弘泽世，繁荣富贵。" },
  { number: 12, lucky: "凶",   skyNine: "掘井无泉",     sex: false, comment: "无理之数，发展薄弱，虽生不足，难酬志向。" },
  { number: 13, lucky: "吉",   skyNine: "春日牡丹",     sex: false, comment: "才艺多能，智谋奇略，忍柔当事，鸣奏大功。" },
  { number: 14, lucky: "凶",   skyNine: "破兆",         sex: false, comment: "家庭缘薄，孤独遭难，谋事不达，悲惨不测。" },
  { number: 15, lucky: "吉",   skyNine: "福寿",         sex: false, comment: "福寿圆满，富贵荣誉，涵养雅量，德高望重。" },
  { number: 16, lucky: "吉",   skyNine: "厚重",         sex: false, comment: "厚重载德，安富尊荣，财官双美，功成名就。" },
  { number: 17, lucky: "半吉", skyNine: "刚强",         sex: false, comment: "权威刚强，突破万难，如能容忍，必获成功。" },
  { number: 18, lucky: "半吉", skyNine: "铁镜重磨",     sex: false, comment: "权威显达，博得名利，且养柔德，功成名就。" },
  { number: 19, lucky: "凶",   skyNine: "多难",         sex: false, comment: "风云蔽日，辛苦重来，虽有智谋，万事挫折。" },
  { number: 20, lucky: "凶",   skyNine: "屋下藏金",     sex: false, comment: "非业破运，灾难重重，进退维谷，万事难成。" },
  { number: 21, lucky: "吉",   skyNine: "明月中天",     sex: true,  comment: "光风霁月，万物确立，官运亨通，大搏名利。女性不宜此数。" },
  { number: 22, lucky: "凶",   skyNine: "秋草逢霜",     sex: false, comment: "秋草逢霜，困难疾弱，虽出豪杰，人生波折。" },
  { number: 23, lucky: "吉",   skyNine: "壮丽",         sex: true,  comment: "旭日东升，壮丽壮观，权威旺盛，功名荣达。女性不宜此数。" },
  { number: 24, lucky: "吉",   skyNine: "掘藏得金",     sex: false, comment: "家门余庆，金钱丰盈，白手成家，财源广进。" },
  { number: 25, lucky: "半吉", skyNine: "荣俊",         sex: false, comment: "资性英敏，才能奇特，克服傲慢，尚可成功。" },
  { number: 26, lucky: "凶",   skyNine: "变怪",         sex: false, comment: "变怪之谜，英雄豪杰，波澜重叠，而奏大功。" },
  { number: 27, lucky: "凶",   skyNine: "增长",         sex: false, comment: "欲望无止，自我强烈，多受毁谤，尚可成功。" },
  { number: 28, lucky: "凶",   skyNine: "阔水浮萍",     sex: true,  comment: "遭难之数，豪杰气概，四海漂泊，终世浮躁。女性不宜此数。" },
  { number: 29, lucky: "吉",   skyNine: "智谋",         sex: false, comment: "智谋优秀，财力归集，名闻海内，成就大业。" },
  { number: 30, lucky: "半吉", skyNine: "非运",         sex: false, comment: "沉浮不定，凶吉难变，若明若暗，大成大败。" },
  { number: 31, lucky: "吉",   skyNine: "春日花开",     sex: false, comment: "智勇得志，博得名利，统领众人，繁荣富贵。" },
  { number: 32, lucky: "吉",   skyNine: "宝马金鞍",     sex: false, comment: "侥幸多望，贵人得助，财帛如裕，繁荣至上。" },
  { number: 33, lucky: "吉",   skyNine: "旭日升天",     sex: true,  comment: "旭日升天，鸾凤相会，名闻天下，隆昌至极。女性不宜此数。" },
  { number: 34, lucky: "凶",   skyNine: "破家",         sex: false, comment: "破家之身，见识短小，辛苦遭逢，灾祸至极。" },
  { number: 35, lucky: "吉",   skyNine: "高楼望月",     sex: false, comment: "温和平静，智达通畅，文昌技艺，奏功洋洋。" },
  { number: 36, lucky: "凶",   skyNine: "波澜重叠",     sex: false, comment: "波澜重叠，沉浮万状，侠肝义胆，舍己成仁。" },
  { number: 37, lucky: "吉",   skyNine: "猛虎出林",     sex: false, comment: "权威显达，热诚忠信，宜着雅量，终身荣富。" },
  { number: 38, lucky: "半吉", skyNine: "磨铁成针",     sex: false, comment: "意志薄弱，刻意经营，才识不凡，技艺有成。" },
  { number: 39, lucky: "吉",   skyNine: "富贵荣华",     sex: false, comment: "富贵荣华，财帛丰盈，暗藏险象，德泽四方。" },
  { number: 40, lucky: "凶",   skyNine: "退安",         sex: false, comment: "智谋胆力，冒险投机，沉浮不定，退保平安。" },
  { number: 41, lucky: "吉",   skyNine: "德望",         sex: false, comment: "纯阳独秀，德高望重，和顺畅达，博得名利。" },
  { number: 42, lucky: "半吉", skyNine: "寒蝉在柳",     sex: false, comment: "博识多能，精通世情，如能专心，尚可成功。" },
  { number: 43, lucky: "凶",   skyNine: "散财",         sex: false, comment: "散财破产，诸事不遂，虽有智谋，财来财去。" },
  { number: 44, lucky: "凶",   skyNine: "烦闷",         sex: false, comment: "破家亡身，暗藏惨淡，事不如意，乱世怪杰。" },
  { number: 45, lucky: "吉",   skyNine: "顺风",         sex: false, comment: "新生泰和，顺风扬帆，智谋经纬，富贵繁荣。" },
  { number: 46, lucky: "凶",   skyNine: "浪里淘金",     sex: false, comment: "载宝沉舟，浪里淘金，大难尝尽，大功有成。" },
  { number: 47, lucky: "吉",   skyNine: "点石成金",     sex: false, comment: "花开之象，万事如意，祯祥吉庆，天赋幸福。" },
  { number: 48, lucky: "吉",   skyNine: "古松立鹤",     sex: false, comment: "智谋兼备，德量荣达，威望成师，洋洋大观。" },
  { number: 49, lucky: "半吉", skyNine: "转变",         sex: false, comment: "吉临则吉，凶来则凶，转凶为吉，配好三才。" },
  { number: 50, lucky: "半吉", skyNine: "小舟入海",     sex: false, comment: "一成一败，吉凶参半，先得庇荫，后遭凄惨。" },
  { number: 51, lucky: "半吉", skyNine: "沉浮",         sex: false, comment: "盛衰交加，波澜重叠，如能慎始，必获成功。" },
  { number: 52, lucky: "吉",   skyNine: "达眼",         sex: false, comment: "卓识达眼，先见之明，智谋超群，名利双收。" },
  { number: 53, lucky: "凶",   skyNine: "曲卷难星",     sex: false, comment: "外祥内患，外祸内安，先富后贫，先贫后富。" },
  { number: 54, lucky: "凶",   skyNine: "石上栽花",     sex: false, comment: "石上栽花，难得有活，忧闷烦来，辛惨不绝。" },
  { number: 55, lucky: "半吉", skyNine: "善恶",         sex: false, comment: "善善得恶，恶恶得善，吉到极限，反生凶险。" },
  { number: 56, lucky: "凶",   skyNine: "浪里行舟",     sex: false, comment: "历尽艰辛，四周障碍，万事龃龉，做事难成。" },
  { number: 57, lucky: "吉",   skyNine: "日照春松",     sex: false, comment: "寒雪青松，夜莺吟春，必遭一过，繁荣白事。" },
  { number: 58, lucky: "半吉", skyNine: "晚行遇月",     sex: false, comment: "沉浮多端，先苦后甜，宽宏扬名，富贵繁荣。" },
  { number: 59, lucky: "凶",   skyNine: "寒蝉悲风",     sex: false, comment: "寒蝉悲风，意志衰退，缺乏忍耐，苦难不休。" },
  { number: 60, lucky: "凶",   skyNine: "无谋",         sex: false, comment: "无谋之人，漂泊不定，晦暝暗黑，动摇不安。" },
  { number: 61, lucky: "吉",   skyNine: "牡丹芙蓉",     sex: false, comment: "牡丹芙蓉，花开富贵，名利双收，定享天赋。" },
  { number: 62, lucky: "凶",   skyNine: "衰败",         sex: false, comment: "衰败之象，内外不和，志望难达，灾祸频来。" },
  { number: 63, lucky: "吉",   skyNine: "舟归平海",     sex: false, comment: "富贵荣华，身心安泰，雨露惠泽，万事亨通。" },
  { number: 64, lucky: "凶",   skyNine: "非命",         sex: false, comment: "骨肉分离，孤独悲愁，难得心安，做事不成。" },
  { number: 65, lucky: "吉",   skyNine: "巨流归海",     sex: false, comment: "天长地久，家运隆昌，福寿绵长，事事成就。" },
  { number: 66, lucky: "凶",   skyNine: "岩头步马",     sex: false, comment: "进退维谷，艰难不堪，等待时机，一跃而起。" },
  { number: 67, lucky: "吉",   skyNine: "顺风通达",     sex: false, comment: "天赋幸运，四通八达，家道繁昌，富贵东来。" },
  { number: 68, lucky: "吉",   skyNine: "顺风吹帆",     sex: false, comment: "智虑周密，集众信达，发明能智，拓展昂进。" },
  { number: 69, lucky: "凶",   skyNine: "非业",         sex: false, comment: "非业非力，精神迫滞，灾害交至，遍偿痛苦。" },
  { number: 70, lucky: "凶",   skyNine: "残菊逢霜",     sex: false, comment: "残菊逢霜，寂寞无碍，惨淡忧愁，晚景凄凉。" },
  { number: 71, lucky: "半吉", skyNine: "石上金花",     sex: false, comment: "石上金花，内心劳苦，贯彻始终，定可昌隆。" },
  { number: 72, lucky: "半吉", skyNine: "劳苦",         sex: false, comment: "荣苦相伴，阴云覆月，外表吉祥，内实凶祸。" },
  { number: 73, lucky: "半吉", skyNine: "无勇",         sex: false, comment: "盛衰交加，徒有高志，天王福祉，终世平安。" },
  { number: 74, lucky: "凶",   skyNine: "残菊经霜",     sex: false, comment: "残菊经霜，秋叶寂寞，无能无智，辛苦繁多。" },
  { number: 75, lucky: "凶",   skyNine: "退守",         sex: false, comment: "退守保吉，发迹甚迟，虽有吉象，无谋难成。" },
  { number: 76, lucky: "凶",   skyNine: "离散",         sex: false, comment: "倾覆离散，骨肉分离，内外不和，虽劳无功。" },
  { number: 77, lucky: "半吉", skyNine: "半吉",         sex: false, comment: "家庭有悦，半吉半凶，能获援护，陷落不幸。" },
  { number: 78, lucky: "凶",   skyNine: "晚苦",         sex: false, comment: "祸福参半，先天智能，中年发达，晚景困苦。" },
  { number: 79, lucky: "凶",   skyNine: "云头望月",     sex: false, comment: "云头望月，身疲力尽，穷迫不伸，精神不定。" },
  { number: 80, lucky: "凶",   skyNine: "遁吉",         sex: false, comment: "辛苦不绝，早入隐遁，安心立命，化凶转吉。" },
  { number: 81, lucky: "吉",   skyNine: "万物回春",     sex: false, comment: "最吉之数，还本归元，吉祥重叠，富贵尊荣。" },
];

// Look up DaYan by number (supports >81 by modular wrap)
function findDaYan(number) {
  if (number <= 0) return null;
  const idx = (number - 1) % 81;
  return { ...DAYAN_LIST[idx], yinyang: number % 2 === 1 ? "阳" : "阴" };
}

// 女性不宜 numbers
const FEMALE_TABOO_NUMBERS = new Set(
  DAYAN_LIST.filter(d => d.sex).map(d => ((d.number - 1) % 81) + 1)
);

function isFemaleTaboo(number) {
  if (number <= 0) return false;
  const idx = (number - 1) % 81 + 1;
  return FEMALE_TABOO_NUMBERS.has(idx);
}

export { DAYAN_LIST, findDaYan, isFemaleTaboo, FEMALE_TABOO_NUMBERS };