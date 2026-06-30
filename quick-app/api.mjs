import fs from "node:fs";
import path from "node:path";
import express from "express";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { calculateFullBazi } from "./traditional.js";
import { rateYinyun } from "./yinyun-rater.js";
import { findDaYan, isFemaleTaboo } from "./dayan.js";
import { calculateGua } from "./yijing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const dbPath = path.join(root, "db", "names.db");

// ---- State ----
let db;
let characters = [];
let structureMap = {};
let strokes = {};
let corpusNames = new Set();
let chaiziMap = {};
let zodiacMap = {};
let citedChars = new Set();
let historicalNameMap = {};
// Map simplified zodiac animal names to traditional (used in DB)
// ????????
const STEM_WUXING = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
const BRANCH_WUXING = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };

const ZODIAC_TRADITIONAL = {
  '鼠':'鼠','牛':'牛','虎':'虎','兔':'兔',
  '龙':'龍','蛇':'蛇','马':'馬','羊':'羊',
  '猴':'猴','鸡':'雞','狗':'狗','猪':'豬'
};


// Phase 0+ index (populated in initDb)
var charByChar;
// ---- Helpers ----
function num(v, fb) { const n = Number(v); return Number.isFinite(n) ? n : (fb || 0); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function seededOffset(seed, size) {
  if (!size) return 0;
  const text = String(seed ?? Date.now());
  let hash = 0;
  for (const ch of text) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  return hash % size;
}

function genderScore(char, target) {
  if (target === "neutral") return 1 - Math.min(1, Math.abs(char.gender || 0));
  if (target === "female") return clamp(-(char.gender || 0), -1, 1);
  return clamp(char.gender || 0, -1, 1);
}

function styleScore(char, style) {
  if (style === "gentle") return (char.warmth || 0) * 1.25 + (char.valence || 0) - Math.max(0, char.gender || 0) * 0.35;
  if (style === "bright") return (char.competence || 0) * 1.15 + (char.valence || 0) + Math.max(0, char.gender || 0) * 0.2;
  if (style === "rare") return (char.uniqueness || 0) * 1.25 + (char.valence || 0) * 0.7;
  return (char.valence || 0) + (char.warmth || 0) * 0.42 + (char.competence || 0) * 0.42;
}

function hasAwkwardPair(given) {
  const awkward = new Set(["财宝", "宝财", "乐正", "皇超", "王霸", "富贵", "丰富", "刚强", "阳刚", "富济"]);
  return awkward.has(given) || /(.)\1/.test(given) || /[啊阿的了和与及皇帝奴婢鬼病死尸]/.test(given);
}

// ---- Weighted scoring system (Step 4) ----
const SCORING_RULES = {
  bazi: { label: "八字喜用神匹配", desc: "基础60分。每个汉字五行匹配喜用神+20分，落入忌神-20分，均未命中+10分/字。", range: "0-100" },
  culture: { label: "经典文化出处", desc: "基础60分。两个汉字都有典籍出处=100分，一个汉字有出处=80分。", range: "0-100" },
  meaning: { label: "字义内涵", desc: "基础30分。取两字均值：valence×10→最高+50，warmth×5→最高+25，competence×5→最高+25。全正面含义无负面=满分。", range: "0-100" },
  yinyun: { label: "音韵声调", desc: "基础60分。读音流畅+20，声调平仄协调+10，声母不同+5，韵母不同+5。满分需声母韵母声调全不同且流畅。", range: "0-100" },
  gua: { label: "周易卦象", desc: "姓名笔画数起卦，梅花易数法计算上下卦、动爻，对照六十四卦吉凶得分。大吉卦=100分。", range: "0-100" }
};

const DEFAULT_WEIGHTS = {
  bazi: { key: "八字喜用神匹配", weight: 40 },
  culture: { key: "经典文化出处", weight: 20 },
  yinyun: { key: "音韵声调", weight: 20 },
  meaning: { key: "字义内涵", weight: 12 },
  gua: { key: "周易卦象", weight: 8 },
};
// 字形结构评分：两字结构搭配多样性
const STRUCTURE_PAIR_SCORES = {
  左右: { 左右: 65, 上下: 95, 包围: 85, 独体: 75 },
  上下: { 左右: 95, 上下: 65, 包围: 85, 独体: 75 },
  包围: { 左右: 85, 上下: 85, 包围: 60, 独体: 70 },
  独体: { 左右: 75, 上下: 75, 包围: 70, 独体: 55 },
};

function getStructureGroup(ch) {
  const s = structureMap[ch];
  return s ? s.group : "独体";
}

function calculateScores(item, bazi) {
  const scores = {};

  // 1. Bazi score (40%): base 60, match 喜用神 +20, hit 忌神 -20, neutral +10
  let baziScore = 60;
  if (bazi && bazi.xiyong) {
    const xi = bazi.xiyong.xiYongElement;
    const ji = bazi.xiyong.jiShenElement;
    const charElements = (item.chars || []).map(function(c) { return c.wuxing || c.wuxingFate || c.wuxing_fate || ""; }).filter(Boolean);
    let matchCount = 0, avoidCount = 0;
    for (const el of charElements) {
      if (el === xi) matchCount++;
      else if (el === ji) avoidCount++;
    }
    var neutralCount = charElements.length - matchCount - avoidCount;
    baziScore = 60 + matchCount * 20 - avoidCount * 20 + neutralCount * 10;
    baziScore = Math.max(0, Math.min(100, baziScore));
  }
  if (bazi && bazi.daYun && bazi.daYun.length > 0 && item.chars) {
    var dayunScore = 0;
    var count = 0;
    for (var di = 0; di < Math.min(bazi.daYun.length, 4); di++) {
      var dy = bazi.daYun[di];
      if (!dy.ganZhi) continue;
      var gan = dy.ganZhi[0];
      var zhi = dy.ganZhi[1];
      var ganWu = STEM_WUXING[gan] || '';
      var zhiWu = BRANCH_WUXING[zhi] || '';
      if (!ganWu && !zhiWu) continue;
      count++;
      for (var ci = 0; ci < item.chars.length; ci++) {
        var cwu = item.chars[ci].wuxing || item.chars[ci].wuxingFate || item.chars[ci].wuxing_fate || '';
        if (!cwu) continue;
        if (cwu === ganWu || cwu === zhiWu) dayunScore += 3;
      }
    }
    if (count > 0) {
      var avgBonus = Math.round(dayunScore / count);
      baziScore = Math.min(100, baziScore + Math.min(avgBonus, 10));
      scores.bazi = baziScore;
    }
  }
  scores.bazi = baziScore;

  // 2. Yinyun score (20%): base 60, fluency +20, tone +10, initial +5, final +5
  let yinyunScore = 60;
  if (item.yinyunNotes) {
    var notes = item.yinyunNotes;
    var hasToneDiff = notes.includes("声调不同");
    var hasShengmuDiff = notes.includes("声母不同");
    var hasYunmuDiff = notes.includes("韵母不同");
    // 整体读音流畅：声调不同 + 声母不同
    if (hasToneDiff && hasShengmuDiff) yinyunScore += 20;
    // 声调平仄
    if (hasToneDiff) yinyunScore += 10;
    // 声母搭配
    if (hasShengmuDiff) yinyunScore += 5;
    // 韵母搭配
    if (hasYunmuDiff) yinyunScore += 5;
  } else {
    yinyunScore = item.yinyunScore != null ? Math.max(60, item.yinyunScore) : 60;
  }
  yinyunScore = Math.max(0, Math.min(100, yinyunScore));
  scores.yinyun = yinyunScore;
  // 3. Culture score (20%): base 60, exact=100, bothChars=90, hasSource=80, known=70
  let cultureScore = 60;
  if (item.matchLevel === 'exact' && item.citationSource !== '成语语料') {
    cultureScore = 100;
  } else if (item.matchLevel === 'bothChars') {
    cultureScore = 90;
  } else if (item.citationSource) {
    cultureScore = 80;
  } else if (item.known) {
    cultureScore = 70;
  }
  scores.culture = cultureScore;

  // 4. Meaning score (20%): base 30, valence*10, warmth*5, competence*5
  let meaningScore = 30;
  if (item.chars && item.chars.length > 0) {
    var avgValence = item.chars.reduce(function(s, c) { return s + (c.valence || 0); }, 0) / item.chars.length;
    var avgWarmth = item.chars.reduce(function(s, c) { return s + (c.warmth || 0); }, 0) / item.chars.length;
    var avgCompetence = item.chars.reduce(function(s, c) { return s + (c.competence || 0); }, 0) / item.chars.length;
    meaningScore += avgValence * 10;
    meaningScore += avgWarmth * 5;
    meaningScore += avgCompetence * 5;
  }
  meaningScore = Math.max(0, Math.min(100, meaningScore));
  scores.meaning = meaningScore;

  // 5. Gua score (8%): unchanged
  let guaScore = 60;
  if (item._gua) {
    guaScore = item._gua.score;
  }
  scores.gua = guaScore;

  return scores;
}function calculateWeightedTotal(scores, weights) {
  // Support both { bazi: 40 } (frontend simple) and { bazi: { weight: 40 } } (backend canonical) formats
  const raw = weights || DEFAULT_WEIGHTS;
  const w = {};
  for (const [key, val] of Object.entries(raw)) {
    w[key] = (typeof val === 'object' && val !== null && val.weight != null) ? val : { weight: Math.min(Number(val) || 0, 50) };
  }
  let total = 0;
  let totalWeight = 0;
  for (const [key, cfg] of Object.entries(w)) {
    if (scores[key] != null) {
      total += scores[key] * cfg.weight;
      totalWeight += cfg.weight;
    }
  }
  return totalWeight > 0 ? Math.round(total / totalWeight) : 0;
}

function acceptWithDiversity(item, usedCounts, maxUse) {
  return [...item.given].every(ch => (usedCounts[ch] || 0) < maxUse);
}

// Classical sources priority order (highest first)
const CLASSICAL_SOURCES = ['诗经','楚辞','论语','尚书','礼记','周易','庄子','孟子','史记','道德经'];
function citationSourceRank(source) {
  var idx = CLASSICAL_SOURCES.indexOf(source);
  if (idx >= 0) return idx;  // 0=诗经 highest
  if (source === '全唐诗' || source === '宋词' || source === '元曲') return 10;
  if (source === '成语语料') return 20;
  return 15;  // other sources
}

function findCitation(given, preference) {
  if (!db) return null;
  // 1. Try exact 2-char key match - prioritize classical sources
  var rows = db.prepare(
    "SELECT type, source, title, author, text, source_path FROM citations WHERE key = ? ORDER BY CASE type WHEN 'poetry' THEN 0 WHEN 'historical' THEN 1 ELSE 2 END, " +
    "CASE source WHEN '诗经' THEN 0 WHEN '楚辞' THEN 1 WHEN '论语' THEN 2 WHEN '尚书' THEN 3 WHEN '礼记' THEN 4 WHEN '周易' THEN 5 WHEN '庄子' THEN 6 WHEN '孟子' THEN 7 WHEN '史记' THEN 8 WHEN '道德经' THEN 9 WHEN '全唐诗' THEN 10 WHEN '宋词' THEN 11 WHEN '元曲' THEN 12 ELSE 99 END LIMIT 1"
  ).all(given);
  if (rows.length) {
    var r = rows[0];
    if (preference === "any" || r.type === preference) {
      return { type: r.type, source: r.source, title: r.title, author: r.author, text: r.text, sourcePath: r.source_path, matchLevel: "exact", score: 100 };
    }
  }
  // 2. Try exact match in idiom/historical if poetry preference
  if (preference === "any") {
    var fallback = db.prepare(
      "SELECT type, source, title, author, text, source_path FROM citations WHERE key = ? ORDER BY CASE type WHEN 'historical' THEN 0 WHEN 'idiom' THEN 1 ELSE 2 END LIMIT 1"
    ).all(given);
    if (fallback.length) {
      var r = fallback[0];
      return { type: r.type, source: r.source, title: r.title, author: r.author, text: r.text, sourcePath: r.source_path, matchLevel: "exact", score: 85 };
    }
  }
  // 3. Fallback: single char citations
  var ch1 = given[0], ch2 = given[1];
  if (ch1 && ch2) {
    var r1 = db.prepare("SELECT type, source, title, author, text, source_path FROM citations WHERE key = ? AND type = 'poetry' LIMIT 1").all(ch1);
    var r2 = db.prepare("SELECT type, source, title, author, text, source_path FROM citations WHERE key = ? AND type = 'poetry' LIMIT 1").all(ch2);
    if (r1.length || r2.length) {
      var best = (r1.length && r2.length) ? r1[0] : (r1.length ? r1[0] : r2[0]);
      return { type: best.type, source: best.source, title: best.title, author: best.author, text: best.text, sourcePath: best.source_path, matchLevel: "singleChar", score: 40 };
    }
  }
  // 3.5. Both chars found in historical names
  if (ch1 && ch2) {
    var bothKey = ch1 + "_" + ch2;
    if (historicalNameMap[bothKey]) {
      var hp = historicalNameMap[bothKey][0];
      return { type: "historical", source: "CBDB", title: hp.name, author: hp.era, text: hp.name + "(" + hp.era + ")", sourcePath: "", matchLevel: "singleChar", score: 50 };
    }
  }

  // 4. Historical person lookup
  if (ch1 && ch2) {
    var histKey = ch1 + ch2;
    if (historicalNameMap[histKey]) {
      var hp = historicalNameMap[histKey][0];
      return { type: "historical", source: "CBDB", title: hp.name, author: hp.era, text: hp.name + "(" + hp.era + ")", sourcePath: "", matchLevel: "exact", score: 70 };
    }
  }
  return null;
}

function pickPool(options) {
  var g = options.gender;
  var pool = characters
    .filter(function(ch) {
      if ((ch.quality_score || 0) < 60) return false;
      if (g == "male" && (ch.gender || 0) < -0.1) return false;
      if (g == "female" && (ch.gender || 0) > 0.1) return false;
      return true;
    })
    .map(function(ch) { return {
      isCited: citedChars.has(ch.char) || false,
      char: ch.char, pinyin: ch.pinyin, strokes: ch.strokes, gender: ch.gender,
      ppm: ch.ppm, uniqueness: ch.uniqueness, valence: ch.valence,
      warmth: ch.warmth, competence: ch.competence, wuxing: ch.wuxing,
      wuxingFate: ch.wuxingFate, quality_score: ch.quality_score,
      score: styleScore(ch, options.style) + genderScore(ch, options.gender) * 1.7
        - Math.max(0, (ch.ppm || 0) - 9000) / 6500,
    }; })
    .filter(function(ch) { return ch.score > 2.25; });
  if (pool.length > 4000) pool = pool.slice(0, 4000);
  const seed = (options.seed || Date.now().toString());
  var hash = 0;
  for (var si = 0; si < seed.length; si++) hash = ((hash * 31) + seed.charCodeAt(si)) >>> 0;
  var r = function() { hash = (hash * 1103515245 + 12345) >>> 0; return (hash >>> 0) / 0x7fffffff; };
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(r() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool;
}

function getStroke(ch) {
  var s = strokes[ch];
  if (s) return s;
  // Fallback: query char_strokes table
  try {
    var row = db.prepare("SELECT strokes FROM char_strokes WHERE char = ?").get(ch);
    if (row) { strokes[ch] = row.strokes; return row.strokes; }
  } catch(e) {}
  return 0;
}

const GRID_ELEMENT = { 1: "木", 2: "木", 3: "火", 4: "火", 5: "土", 6: "土", 7: "金", 8: "金", 9: "水", 0: "水" };
function gridElement(v) { return GRID_ELEMENT[v % 10]; }

function lookupEightyOne(value) {
  const dy = findDaYan(value);
  if (!dy) return { text: "未详", lucky: "未详", skyNine: "", yinyang: value % 2 === 1 ? "阳" : "阴", femaleTaboo: false, comment: "此数不在传统81数体系中" };
  return {
    text: dy.lucky,
    lucky: dy.lucky,
    skyNine: dy.skyNine,
    yinyang: dy.yinyang,
    femaleTaboo: dy.sex,
    comment: dy.comment,
  };
}



const MEANING_LABELS = { wisdom:"聪慧明达", virtue:"仁厚正直", strength:"刚健有为", beauty:"美好雅致", prosperity:"昌盛安泰", nature:"清旷自然" };
const MEANING_WORDS = {
  wisdom: ["智","慧","明","哲","睿","悟","知","思","谋","识","博","渊","翰","颖","秀","敏","捷"],
  virtue: ["仁","义","德","善","诚","信","忠","孝","廉","谦","和","礼","正","直","真","厚"],
  strength: ["强","刚","毅","健","勇","敢","力","威","武","壮","劲","昂","雄"],
  beauty: ["美","佳","丽","雅","秀","婉","淑","芳","芬","华","荣","茂","蕙","兰","梅","菊","竹"],
  prosperity: ["昌","盛","丰","富","贵","荣","达","通","亨","泰","安","宁","康","福","禄","祥","禧"],
  nature: ["天","云","雨","雪","风","月","星","山","川","海","林","森","松","柏","枫","桐","梧","楠","岚","峰"]
};
const WX_POETRY = {
  木: ["如春木生发，有生长向上之力","木性条达，主仁厚温和","如乔木挺立，根基深厚"],
  火: ["如火之明灿，有热情温暖之质","火性炎上，主光明磊落","如烛照四方，明亮温暖"],
  土: ["如大地厚德，有承载包容之量","土性敦厚，主信实稳重","如坤土广袤，沉稳可靠"],
  金: ["如金石坚贞，有刚毅果决之气","金性肃敛，主义烈决断","如精金百炼，品质高洁"],
  水: ["如清流润物，有智慧通达之德","水性柔善，主智谋深远","如江河奔流，生生不息"],
};

function describeFullName({ surname, given, citation, chars }) {
  const c1 = chars[0], c2 = chars[1];
  const m1 = (c1.meaning || "").replace(/^\([^)]+\)/,"").replace(/[;；].*$/,"").trim().substring(0,12);
  const m2 = (c2.meaning || "").replace(/^\([^)]+\)/,"").replace(/[;；].*$/,"").trim().substring(0,12);
  const parts = [];
  
  if (m1 && m2) parts.push(c1.char + "寓" + m1 + "，" + c2.char + "寓" + m2);
  
  const wx1 = c1.wuxingFate || c1.wuxing || "";
  const wx2 = c2.wuxingFate || c2.wuxing || "";
  if (wx1 && wx2) {
    const t1 = (WX_POETRY[wx1] || [""])[Math.floor(Math.random() * 3)];
    const t2 = (WX_POETRY[wx2] || [""])[Math.floor(Math.random() * 3)];
    if (t1 && t2) parts.push("五行" + wx1 + wx2 + "搭配，" + t1 + "，" + t2);
  }
  
  if (citation && citation.text) {
    const t = citation.text.substring(0,20);
    parts.push("语出" + (citation.source || "典籍") + "·\"" + t + "…\"，有典可循");
  } else {
    parts.push("字形优美、音韵和谐，无强配典故之嫌");
  }
  
  const foundGroups = [];
  const txt = (c1.meaning||"") + (c2.meaning||"") + c1.char + c2.char;
  for (const [g, words] of Object.entries(MEANING_WORDS)) {
    for (const w of words) {
      if (txt.includes(w)) { foundGroups.push(g); break; }
    }
  }
  if (foundGroups.length > 0) {
    const labels = foundGroups.map(function(g) { return MEANING_LABELS[g]; }).filter(Boolean);
    if (labels.length > 0) parts.push("整体偏" + labels.join("、"));
  }
  
  const warmth = (c1.warmth||0) > (c2.warmth||0) ? c1.warmth : c2.warmth;
  const comp = (c1.competence||0) > (c2.competence||0) ? c1.competence : c2.competence;
  if (warmth > comp + 0.1) parts.push("气质温润亲和");
  else if (comp > warmth + 0.1) parts.push("气质明朗清健");
  else parts.push("气质温正中和");
  
  return parts.join("。") + "。";
}



// ---- Enrich names with poetry citations ----
function enrichWithPoetry(name, surname) {
  if (!db) return null;
  try {
    var sourceOrder = "CASE source_type WHEN '诗经' THEN 0 WHEN '楚辞' THEN 1 WHEN '全唐诗' THEN 2 WHEN '宋词' THEN 3 WHEN '宋诗' THEN 4 WHEN '论语' THEN 5 WHEN '大学' THEN 6 WHEN '中庸' THEN 7 WHEN '孟子' THEN 8 ELSE 9 END";
    var row = db.prepare("SELECT source_type, source_title, author, sentence, gap FROM poetry_name_candidates WHERE given=? ORDER BY " + sourceOrder + " LIMIT 1").get(name);
    if (row) return { source: row.source_type, title: row.source_title || "", author: row.author || "", text: row.sentence || "", score: 85, matchLevel: (row.gap === 0 || row.gap === null) ? "exact" : "bothChars", fromPoetry: true };
  } catch(e) {}
  return null;
}


function deriveThemes(bazi) {
  if (!bazi || !bazi.xiyong) return null;
  var xi = bazi.xiyong.xiYongElement;
  var ji = bazi.xiyong.jiShenElement;
  var gender = bazi.gender === "male";
  var sourcePriority = gender
    ? ["楚辞","全唐诗","宋诗","诗经","宋词","论语"]
    : ["诗经","宋词","楚辞","全唐诗","宋诗","论语"];
  return { xi: xi, ji: ji, sourcePriority: sourcePriority, gender: gender };
}

function _queryQualityNames(options) {
if (!db) return [];
var xi = (options._bazi && options._bazi.xiyong) ? options._bazi.xiyong.xiYongElement : null;
var ji = (options._bazi && options._bazi.xiyong) ? options._bazi.xiyong.jiShenElement : null;
var sqlSex = options.gender === 'male' ? "'男',''" : options.gender === 'female' ? "'女',''" : "'男','女',''";
var rows;
try { rows = db.prepare('SELECT given, valence_score, yinyun_score, wx_compat, has_poetry, poetry_source, total_score FROM quality_name_index WHERE sex IN (' + sqlSex + ') ORDER BY RANDOM() LIMIT 2000').all(); } catch(e) { return []; }
if (!rows || rows.length === 0) return [];
var candidates = [];
var seen = new Set();
for (var ri = 0; ri < rows.length; ri++) {
var r = rows[ri];
var given = r.given;
if (seen.has(given) || hasAwkwardPair(given)) continue;
seen.add(given);
var c1, c2;
try { c1 = db.prepare('SELECT * FROM characters WHERE char=?').get(given[0]); c2 = db.prepare('SELECT * FROM characters WHERE char=?').get(given[1]); } catch(e) { continue; }
if (!c1 || !c2) continue;
var wx1 = c1.wuxing_fate || '', wx2 = c2.wuxing_fate || '';
var ws = 50;
if (xi) { if (wx1 === xi && wx2 === xi) ws = 100; else if (wx1 === xi || wx2 === xi) ws = 80; else if (wx1 === ji || wx2 === ji) ws = 30; else ws = 60; }
if (ws < 30) continue;
var rawP1 = String(c1.pinyin || '').replace(/[[\]"]/g, '').trim().split(' ')[0] || '';
var rawP2 = String(c2.pinyin || '').replace(/[[\]"]/g, '').trim().split(' ')[0] || '';
var p1 = rawP1.replace(/\d/g, '');
var p2 = rawP2.replace(/\d/g, '');
if (!p1 || !p2) continue;
var yy;
try { yy = rateYinyun(rawP1, rawP2); } catch(e) { yy = { score: 60, notes: [] }; }
if (!yy || yy.score < 45) continue;
var cit = null;
if (r.has_poetry && r.poetry_source) { var arr = r.poetry_source.split(','); if (arr.length > 0) cit = { source: arr[0], title: '', author: '', text: '', score: 85, matchLevel: 'bothChars', type: 'poetry' }; }
var score = 60 + ws * 0.15 + (r.yinyun_score || 60) * 0.1 + r.valence_score * 5 + (r.has_poetry ? 12 : 0) + (r.yinyun_score >= 85 ? 5 : 0);
candidates.push({ full: options.surname + given, given: given, pinyin: p1 + ' ' + p2, known: true, popularity: ((c1.ppm||0)+(c2.ppm||0))/2, uniqueness: ((c1.uniqueness||0)+(c2.uniqueness||0))/2, valence: ((c1.valence||3)+(c2.valence||3))/2, warmth: ((c1.warmth||3)+(c2.warmth||3))/2, competence: ((c1.competence||3)+(c2.competence||3))/2, citation: cit, chars: [c1, c2], _gua: null, yinyunScore: yy.score, yinyunNotes: yy.notes || [], citationScore: cit ? 85 : 0, citationSource: cit ? cit.source : '', matchLevel: cit ? 'bothChars' : '', tags: ['姓名库', cit ? cit.source + '出处' : '现代姓名', '自然语感'], totalScore: Math.min(100, Math.round(score)), rank: Math.min(100, Math.round(score)) });
}
return candidates.sort(function(a,b){return b.totalScore-a.totalScore;});
}

function _queryPoetryNames(options) {
if (!db) return [];
var theme = deriveThemes(options._bazi || {}, options.gender);
if (!theme) return [];
var xi = theme.xi, ji = theme.ji;
var need = Math.max(options.count * 4, 40);
var rows = [];
try {
  var baseSQL = "SELECT p.given, p.source_type, p.source_title, p.author, p.sentence, p.char1, p.char2, p.gap, p.is_real_name" +
    " FROM poetry_name_candidates p" +
    " WHERE p.source_type IN ('诗经','楚辞','全唐诗','宋诗','宋词','论语')" +
    " AND p.gap <= 10";
  // First: real names (has quality pedigree)
  rows = db.prepare(baseSQL + " AND p.is_real_name=1 ORDER BY RANDOM() LIMIT ?").all(need);
  if (rows.length < need) {
    var more = db.prepare(baseSQL + " AND p.is_real_name=0 ORDER BY RANDOM() LIMIT ?").all(need - rows.length);
    rows = rows.concat(more);
  }
} catch(e) { return []; }
if (!rows || rows.length === 0) return [];
// Pre-load all characters into a map for fast lookup
var charRows = db.prepare("SELECT char, wuxing_fate, pinyin, valence, warmth, competence, gender, ppm, uniqueness, banned, old_fashioned, meaning, strokes FROM characters").all();
var charMap = {};
for (var ci = 0; ci < charRows.length; ci++) { var cr = charRows[ci]; charMap[cr.char] = cr; }
var candidates = [];
var seen = new Set();
var bd = {"之":1,"其":1,"者":1,"所":1,"于":1,"以":1,"而":1,"则":1,"或":1,"与":1,"乎":1,"兮":1,"焉":1,"哉":1,"矣":1,"尔":1,"何":1,"此":1,"彼":1,"乃":1,"既":1,"已":1,"中":1};
var bp = {"那":1,"这":1,"其":1,"此":1,"彼":1,"所":1,"于":1};
for (var ri = 0; ri < rows.length && candidates.length < need; ri++) {
  var r = rows[ri];
  var given = r.given;
  if (seen.has(given) || hasAwkwardPair(given) || bd[given[1]] || bp[given[0]]) continue;
  seen.add(given);
  var c1 = charMap[r.char1], c2 = charMap[r.char2];
  if (!c1 || !c2) continue;
  if (c1.banned || c2.banned || c1.old_fashioned || c2.old_fashioned) continue;
  var wx1 = c1.wuxing_fate || "", wx2 = c2.wuxing_fate || "";
  // 忌神硬性排除
  if (ji && (wx1 === ji || wx2 === ji)) continue;
  var ws = 50;
  if (xi) {
    if (wx1 === xi && wx2 === xi) ws = 100;
    else if (wx1 === xi || wx2 === xi) ws = 85;
    else ws = 65;
  }
  var rawP1 = String(c1.pinyin || "").replace(/[[\]"]/g, "").trim().split(/[\s,]/)[0] || "";
  var rawP2 = String(c2.pinyin || "").replace(/[[\]"]/g, "").trim().split(/[\s,]/)[0] || "";
  var p1 = rawP1.replace(/\d/g, '');
  var p2 = rawP2.replace(/\d/g, '');
  if (!p1 || !p2) continue;
  var yy;
  try { yy = rateYinyun(rawP1, rawP2); } catch(e) { yy = { score: 60, notes: [] }; }
  if (!yy || yy.score < 45) continue;
  var cit = {
    source: r.source_type, title: r.source_title || "", author: r.author || "",
    text: r.sentence || "", score: 85, matchLevel: "bothChars",
    tier: r.is_real_name ? (r.gap <= 3 ? "A" : "B") : (r.gap <= 3 ? "C" : "D")
  };
  var sourceBonus = (r.source_type === "诗经" || r.source_type === "楚辞") ? 15 :
                    (r.source_type === "论语") ? 12 : 8;
  var gapBonus = r.gap <= 1 ? 5 : (r.gap <= 3 ? 3 : 0);
  var realNameBonus = r.is_real_name ? 10 : 0;
  var score = 60 + ws * 0.12 + (yy.score || 60) * 0.1 + sourceBonus + gapBonus + realNameBonus;
  candidates.push({
    full: options.surname + given, given: given,
    pinyin: p1 + " " + p2,
    known: !!r.is_real_name,
    popularity: ((c1.ppm || 0) + (c2.ppm || 0)) / 2,
    uniqueness: ((c1.uniqueness || 2) + (c2.uniqueness || 2)) / 2,
    valence: ((c1.valence || 3) + (c2.valence || 3)) / 2,
    warmth: ((c1.valence || 3) + (c2.valence || 3)) / 2,
    competence: ((c1.valence || 3) + (c2.valence || 3)) / 2,
    citation: cit,
    chars: [c1, c2],
    _gua: null,
    yinyunScore: yy.score,
    yinyunNotes: yy.notes || [],
    citationScore: 85,
    citationSource: cit.source,
    matchLevel: "bothChars",
    tags: ["诗词化用", r.source_type + "出处", r.gap > 0 ? "隔字取义" : "连字成词"],
    totalScore: Math.min(100, Math.round(score)),
    rank: Math.min(100, Math.round(score))
  });
}
return candidates.sort(function(a,b){return b.totalScore - a.totalScore;});
}
function _querySmartCombination(options) {
if (!db) return [];
var bazi = options._bazi;
var xi = (bazi && bazi.xiyong) ? bazi.xiyong.xiYongElement : null;
var ji = (bazi && bazi.xiyong) ? bazi.xiyong.jiShenElement : null;
var pool;
try { pool = db.prepare("SELECT char, pinyin, wuxing_fate, valence, warmth, competence, ppm, uniqueness, meaning, strokes FROM characters WHERE (banned IS NULL OR banned=0) AND wuxing_fate IS NOT NULL AND wuxing_fate != '' AND pinyin IS NOT NULL AND pinyin != '' AND (valence >= 3.5 OR warmth >= 3.5) ORDER BY valence DESC").all(); } catch(e) { return []; }
if (!pool || pool.length === 0) return [];
var candidates = [];
var seen = new Set();
var bd = {'之':1,'其':1,'者':1,'所':1,'于':1,'以':1,'而':1,'则':1,'或':1,'与':1,'乎':1,'兮':1,'焉':1,'哉':1,'矣':1,'尔':1,'何':1,'此':1,'彼':1,'乃':1,'既':1,'已':1,'中':1};
var bp = {'那':1,'这':1,'其':1,'此':1,'彼':1,'所':1,'于':1};
var qPairs;
try { qPairs = db.prepare('SELECT DISTINCT char1||char2 AS pair FROM quality_name_index').all().map(function(r){return r.pair;}); } catch(e) { qPairs = []; }
var pairSet = {};
for (var pi = 0; pi < qPairs.length; pi++) pairSet[qPairs[pi]] = true;
for (var ri = 0; ri < pool.length && candidates.length < 300; ri++) {
var a = pool[ri];
for (var rj = ri + 1; rj < pool.length && candidates.length < 300; rj++) {
var b = pool[rj];
var given = a.char + b.char;
if (seen.has(given)) continue;
seen.add(given);
if (!pairSet[given] || bd[given[1]] || bp[given[0]]) continue;
var wx1 = a.wuxing_fate || '', wx2 = b.wuxing_fate || '';
var ws = 50;
if (xi) { if (wx1 === xi && wx2 === xi) ws = 100; else if (wx1 === xi || wx2 === xi) ws = 80; else if (wx1 === ji || wx2 === ji) ws = 30; else ws = 60; }
if (ws < 30) continue;
var rawP1 = String(a.pinyin || '').replace(/[[\]"]/g, '').trim().split(' ')[0] || '';
var rawP2 = String(b.pinyin || '').replace(/[[\]"]/g, '').trim().split(' ')[0] || '';
var p1 = rawP1.replace(/\d/g, '');
var p2 = rawP2.replace(/\d/g, '');
if (!p1 || !p2) continue;
var yy;
try { yy = rateYinyun(rawP1, rawP2); } catch(e) { yy = { score: 60, notes: [] }; }
if (!yy || yy.score < 80) continue;
var cit = null;
try { var ct = db.prepare("SELECT source_type FROM poetry_name_candidates WHERE given=? AND source_type IN ('诗经','楚辞','全唐诗','宋诗','宋词') LIMIT 1").get(given); if (ct) cit = { source: ct.source_type, title: '', author: '', text: '', score: 85, matchLevel: 'bothChars', type: 'poetry' }; } catch(e) {}
var score = 50 + ws * 0.15 + (yy.score - 70) * 0.5 + ((a.valence||3)+(b.valence||3)) * 3 + (cit ? 10 : 0);
candidates.push({ full: options.surname + given, given: given, pinyin: p1 + ' ' + p2, known: false, popularity: ((a.ppm||0)+(b.ppm||0))/2, uniqueness: ((a.uniqueness||0)+(b.uniqueness||0))/2, valence: ((a.valence||3)+(b.valence||3))/2, warmth: ((a.warmth||3)+(b.warmth||3))/2, competence: ((a.competence||3)+(b.competence||3))/2, citation: cit, chars: [a, b], _gua: null, yinyunScore: yy.score, yinyunNotes: yy.notes || [], citationScore: cit ? 85 : 0, citationSource: cit ? cit.source : '', matchLevel: cit ? 'bothChars' : '', tags: ['统计组合', cit ? cit.source + '出处' : '无硬凑引用', '自然语感'], totalScore: Math.min(100, Math.round(score)), rank: Math.min(100, Math.round(score)) });
}
}
return candidates.sort(function(a,b){return b.totalScore-a.totalScore;});
}
function getCharPinyin(ch) {
  if (!ch || !ch.pinyin) return "";
  var p = String(ch.pinyin);
  if (p.startsWith("[")) { try { var arr = JSON.parse(p); return arr[0] || ""; } catch(e) {} }
  return p.replace(/[\[\]"\s]/g, "").trim();
}

function generateNames(options) {
var bazi = options._bazi;
var candidates = _queryPoetryNames(options) || [];
if (candidates.length < options.count * 1.5) {
try { var quality = _queryQualityNames(options); if (quality && quality.length > 0) candidates = candidates.concat(quality); } catch(e) {}
}
if (candidates.length < options.count) {
try { var combo = _querySmartCombination(options); if (combo && combo.length > 0) candidates = candidates.concat(combo); } catch(e) {}
}
if (candidates.length < options.count) {
try { var legacy = _legacyGenerate(options); if (legacy && legacy.length > 0) candidates = candidates.concat(legacy); } catch(e) {}
}
var seen = new Set();
candidates = candidates.filter(function(c) { if (seen.has(c.given)) return false; seen.add(c.given); return true; });
candidates.sort(function(a, b) { return (b.rank||0) - (a.rank||0); });
var sorted = candidates.sort(function(a,b){return (b.rank||0)-(a.rank||0);});
var selected = [], charCount = {};
var scArr = sorted.map(function(s){return s.totalScore;});
var medianScore = scArr.length > 0 ? scArr[Math.floor(scArr.length/2)] : 0;
var p90 = scArr.length > 9 ? scArr[Math.floor(scArr.length*0.1)] : 0;
var maxUse = 4;
function pick(ms){for(var i=0;i<sorted.length&&selected.length<options.count;i++){var item=sorted[i];if(selected.indexOf(item)>=0||item.totalScore<ms)continue;var c1=item.given[0],c2=item.given[1];if(options.gender==="male"&&item.chars&&item.chars.some(function(ch){return(ch.gender||0)<-0.1;}))continue;if(options.gender==="female"&&item.chars&&item.chars.some(function(ch){return(ch.gender||0)>0.1;}))continue;if((charCount[c1]||0)>=maxUse||(charCount[c2]||0)>=maxUse)continue;charCount[c1]=(charCount[c1]||0)+1;charCount[c2]=(charCount[c2]||0)+1;selected.push(item);}}
pick(Math.max(p90,75));pick(Math.max(medianScore,60));pick(0);
for (var i = 0; i < selected.length; i++) {
var item = selected[i];
if (!item._gua) { try { item._gua = calculateGua(getStroke(options.surname[0]) + (options.surname.length > 1 ? getStroke(options.surname[1]) : 0), getStroke(item.given[0]) + (item.given.length > 1 ? getStroke(item.given[1]) : 0), getStroke(options.surname[0]) + getStroke(item.given[0])); } catch(e) {} }
if (!item.explanation) item.explanation = describeFullName({surname: options.surname, given: item.given, citation: item.citation, chars: item.chars});
var scores = calculateScores(item, options._bazi);
item.scores = scores;
if (options._bazi && options._bazi.zodiac) { var za = ({"鼠":"鼠","牛":"牛","虎":"虎","兔":"兔","龙":"龍","蛇":"蛇","马":"馬","羊":"羊","猴":"猴","鸡":"雞","狗":"狗","猪":"豬"})[options._bazi.zodiac] || options._bazi.zodiac; item.zodiacInfo = (item.chars||[]).map(function(ch) { var cz = zodiacMap[ch.char]; return {char: ch.char, match: cz && cz[za] ? cz[za] : null}; }); } else { item.zodiacInfo = []; }
item.scoringRules = SCORING_RULES; item.defaultWeights = DEFAULT_WEIGHTS;
item.totalScore = Math.min(100, calculateWeightedTotal(scores, options.weights));
item.rank = item.totalScore;
}
// Normalize wuxing field name (DB returns wuxing_fate, frontend expects wuxing)
for (var pi = 0; pi < selected.length; pi++) {
  var item = selected[pi];
  if (item.chars) {
    for (var ci = 0; ci < item.chars.length; ci++) {
      var ch = item.chars[ci];
      if (ch.wuxing_fate && !ch.wuxing) { ch.wuxing = ch.wuxing_fate; ch.wuxingFate = ch.wuxing_fate; }
    }
  }
}

// Fix pinyin: include surname with Unicode tone marks
var surPool = options.surname.split("").map(function(ch) { var c = charByChar.get(ch); return c ? getCharPinyin(c) : ch; }).join(" ");
for (var pi = 0; pi < selected.length; pi++) {
  var item = selected[pi];
  var givenPy = (item.chars || []).map(function(ch) {
    var pc = charByChar.get(ch.char);
    return pc ? getCharPinyin(pc) : getCharPinyin(ch);
  }).join(" ");
  item.pinyin = surPool + " " + givenPy;
}
return selected;

}

function _queryIndexCandidates(options) {
  if (!db) return null;
  var candidates=[], seen=new Set();
  var minS=options.minStroke||3, maxS=options.maxStroke||30, gender=options.gender||'';
  var ncRows;
  try {
    ncRows=db.prepare(
      "SELECT given,stroke1,stroke2,gender_bias,corpus_freq,citation_count,primary_source " +
      "FROM name_candidates WHERE stroke1 BETWEEN ? AND ? AND stroke2 BETWEEN ? AND ? " +
      "ORDER BY RANDOM() LIMIT 2000"
    ).all(minS,maxS,minS,maxS);
  } catch(e){return null;}
  if(!ncRows||ncRows.length===0) return null;
  var blacklistLookup={};
  if(options.enableBlacklist){
    try{var bl=db.prepare("SELECT name FROM name_blacklist").all();
    for(var b of bl) blacklistLookup[b.name]=true;}catch(e){}
  }
  for(var ri=0;ri<ncRows.length&&candidates.length<1500;ri++){
    var row=ncRows[ri]; var given=row.given;
    if(seen.has(given)||hasAwkwardPair(given)) continue;
    if ({"之":1,"其":1,"者":1,"所":1,"于":1,"以":1,"而":1,"则":1,"或":1,"与":1,"乎":1,"兮":1,"焉":1,"哉":1,"矣":1,"尔":1,"何":1,"此":1,"彼":1,"乃":1,"既":1,"已":1,"中":1}[given[1]]) continue;
    if ({"那":1,"这":1,"其":1,"此":1,"彼":1,"所":1,"于":1}[given[0]]) continue;
    seen.add(given);
    var a=charByChar.get(given[0]), b=charByChar.get(given[1]);
    if(!a||!b) continue;
    if(gender==="male"&&row.gender_bias<-0.1) continue;
    if(gender==="female"&&row.gender_bias>0.1) continue;
    if(blacklistLookup[given]) continue;
    var surPy=options.surname.split('').map(function(ch){var c=charByChar.get(ch);return c?(c.pinyin||''):'';}).join(' ');
    var gPy=(a.pinyin||'')+' '+(b.pinyin||'');
    var yinyun=rateYinyun((surPy+' '+gPy).replace(/\d/g,'').trim(),'');
    if(yinyun.score<70) continue;
    var citation=null;
    try{
      var sRows=db.prepare(
        "SELECT source_type,source_title,author,sentence FROM name_sources WHERE given=? " +
        "ORDER BY CASE source_type " +
        "WHEN '诗经' THEN 0 WHEN '楚辞' THEN 1 WHEN '全唐诗' THEN 2 " +
        "WHEN '宋词' THEN 3 WHEN '论语' THEN 4 ELSE 9 END LIMIT 1"
      ).all(given);
      if(sRows&&sRows.length>0){
        citation={source:sRows[0].source_type,title:sRows[0].source_title||'',
          author:sRows[0].author||'',text:sRows[0].sentence||'',score:85,matchLevel:'exact'};
      }
    }catch(e){}
    var item={
      full:options.surname+given,given:given,
      pinyin:gPy.replace(/\d/g,'').trim(),
      known:corpusNames.has(given),
      popularity:((a.ppm||0)+(b.ppm||0))/2,
      uniqueness:((a.uniqueness||0)+(b.uniqueness||0))/2,
      valence:((a.valence||3)+(b.valence||3))/2,
      warmth:((a.warmth||3)+(b.warmth||3))/2,
      competence:((a.competence||3)+(b.competence||3))/2,
      citation:citation,chars:[a,b],
      yinyunScore:yinyun.score,yinyunNotes:yinyun.notes||[],
      citationScore:citation?85:0,citationSource:citation?citation.source:"",
      matchLevel:citation?"exact":"",
      tags:['姓名库候选',citation?citation.source+'出处':'古典出处',
        options.style==='rare'?'少见倾向':'自然语感']
    };
    var _gl1=getStroke(options.surname[0]);
    var _gl2=options.surname.length>1?getStroke(options.surname[1]):0;
    var _gf1=getStroke(given[0]), _gf2=getStroke(given[1]);
    item._gua=calculateGua(_gl1+_gl2,_gf1+_gf2,_gl1+_gl2+_gf1+_gf2);
    item.explanation=describeFullName({surname:options.surname,given:given,citation:citation,chars:[a,b]});
    var scores=calculateScores(item,options._bazi);
    item.scores=scores;
    if(options._bazi&&options._bazi.zodiac&&zodiacMap){
      var za=({鼠:'鼠',牛:'牛',虎:'虎',兔:'兔',龙:'龍',蛇:'蛇',马:'馬',羊:'羊',猴:'猴',鸡:'雞',狗:'狗',猪:'豬'})[options._bazi.zodiac]||options._bazi.zodiac;
      item.zodiacInfo=item.chars.map(function(ch){var cz=zodiacMap[ch.char];return {char:ch.char,match:cz&&cz[za]?cz[za]:null};});
    }else{item.zodiacInfo=[];}
    item.scoringRules=({bazi:{label:"八字喜用神匹配",desc:"名字汉字的五行与八字喜用神匹配度。匹配喜用神加分，落入忌神扣分。",range:"0-100"},yinyun:{label:"音韵声调",desc:"声母、韵母、平仄搭配评分。声调不同且声母不同得分最高。",range:"0-100"},culture:{label:"经典文化出处",desc:"名字在古典诗词、成语语料中的出现情况。连续双字出处加分。",range:"0-100"},meaning:{label:"字义内涵",desc:"汉字的正向情感评分，包括温暖度、能力感、美好寓意。",range:"0-100"},popularity:{label:"现代实用合规",desc:"名字的常见度与实用性。过常见扣分，太生僻也扣分。",range:"0-100"},zodiac:{label:"生肖适配",desc:"名字汉字与宝宝生肖的宜忌字根匹配。宜用字根加分，忌用字根扣分。",range:"0-100"},gua:{label:"周易卦象",desc:"姓名笔画数起卦，梅花易数法计算上下卦、动繬，对照六十四卦吉凶得分。",range:"0-100"},structure:{label:"字形结构",desc:"名字汉字的字形结构搭配多样性。左右+上下优于左右+左右。",range:"0-100"}});
    item.defaultWeights=({bazi:{key:"八字喜用神匹配",weight:40},yinyun:{key:"音韵声调",weight:10},meaning:{key:"字义内涵",weight:10},gua:{key:"周易卦象",weight:8},zodiac:{key:"生肖适配",weight:8},culture:{key:"经典文化出处",weight:12},popularity:{key:"现代实用合规",weight:5},structure:{key:"字形结构",weight:5}});
    var _raw=calculateWeightedTotal(scores,options.weights);
    item.totalScore=_raw;
    item.totalScore=Math.min(100,_raw+15);;
    if(row.primary_source==='成语语料'){item.totalScore=Math.max(10,item.totalScore-20);}
    item.rank=item.totalScore;
    candidates.push(item);
  }
  return candidates;
}


function initDb() {
  console.log("Opening database:", dbPath);
  db = new Database(dbPath);

  // Load characters from quality-scored pool
  const poolJsonPath = path.join(root, "data", "char_pool.json");
  const poolData = JSON.parse(fs.readFileSync(poolJsonPath, "utf8"));

  // Build cited chars set from pool data
  citedChars = new Set();
  for (const ch of poolData) {
    if (ch.has_citation) citedChars.add(ch.char);
  }

  // Load character structure data
  const structPath = path.join(root, "data", "char_structure.json");
  try {
    structureMap = JSON.parse(fs.readFileSync(structPath, "utf8"));
    console.log("Structure map loaded:", Object.keys(structureMap).length, "chars");
  } catch(e) {
    console.warn("char_structure.json not available:", e.message);
  }

  characters = poolData.map(r => ({
    char: r.char, pinyin: r.pinyin, strokes: r.strokes, gender: r.gender, ppm: r.ppm,
    uniqueness: r.uniqueness, valence: r.valence, warmth: r.warmth, competence: r.competence,
    wuxing: r.wuxing,
    kangxiStroke: r.kangxi_stroke,
    wuxingFate: r.wuxing,
    meaning: r.meaning,
    genderHint: r.gender_hint,
    quality_score: r.quality_score,
    has_poetry: r.has_poetry,
    has_citation: r.has_citation,
    real_name_freq: r.real_name_freq,
    cite_count: r.cite_count || 0,
    chaizi: chaiziMap[r.char] || [],
    structure: structureMap[r.char] || null,
  }));
    // Build char lookup map for Phase 0+ index
  charByChar = new Map(characters.map(function(c) { return [c.char, c]; }));
// Load zodiac data (keep separate for dynamic queries)
  zodiacMap = {};
  const zodiacRows = db.prepare("SELECT char, animal, category FROM zodiac_chars").all();
  for (const zr of zodiacRows) {
    if (!zodiacMap[zr.char]) zodiacMap[zr.char] = {};
    zodiacMap[zr.char][zr.animal] = zr.category;
  }
  console.log('Pool chars:', characters.length, 'cited:', citedChars.size);

  // Load historical name pairs from CBDB
  try {
    var hpRows = db.prepare("SELECT given, full_name, gender_label, birth_era FROM historical_pairs ORDER BY birth_era DESC LIMIT 200000").all();
    historicalNameMap = {};
    for (var hi = 0; hi < hpRows.length; hi++) {
      var hr = hpRows[hi];
      if (!historicalNameMap[hr.given]) historicalNameMap[hr.given] = [];
      if (historicalNameMap[hr.given].length < 5) {
        historicalNameMap[hr.given].push({
          name: hr.full_name,
          gender: hr.gender_label,
          era: hr.birth_era
        });
      }
    }
    console.log("Historical name pairs loaded:", Object.keys(historicalNameMap).length);
  } catch(e) { console.warn("Historical pairs not available:", e.message); }

  strokes = Object.fromEntries(characters.map(c => [c.char, c.strokes]));

  const corpRows = db.prepare("SELECT name FROM corpus_names").all();
  for (const r of corpRows) corpusNames.add(r.name);

  const chaiziRows = db.prepare("SELECT char, decomposition, variant_index FROM char_chaizi ORDER BY char, variant_index").all();
  for (const r of chaiziRows) {
    if (!chaiziMap[r.char]) chaiziMap[r.char] = [];
    chaiziMap[r.char].push({ decomposition: r.decomposition, variantIndex: r.variant_index });
  }

  // Re-attach chaizi data to loaded characters
  for (const ch of characters) {
    ch.chaizi = chaiziMap[ch.char] || [];
  }

  const dbSize = fs.statSync(dbPath).size;
  console.log(`Loaded ${characters.length} chars, ${corpusNames.size} corpus names, db ${(dbSize/1e6).toFixed(1)}MB`);
}

// ---- Express app ----
const app = express();
app.use(express.json());
app.use(function(req, res, next) { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); next(); }, express.static(root));

app.post("/api/generate", (req, res) => {
  try {
    const body = req.body || {};
    const options = {
      surname: (body.surname || "陈").trim(),
      gender: body.gender || "neutral",
      style: body.style || "balanced",
      source: body.source || "any",
      count: clamp(Number(body.count) || 100, 10, 500),
      birthDate: body.birthDate || "",
      birthTime: body.birthTime || "09:30",
      birthPlace: body.birthPlace || "",
      seed: String(Math.random()),
      weights: body.weights || null,
      enableBlacklist: body.enableBlacklist !== false,
      enableHousehold: body.enableHousehold !== false,
    };
    const bazi = calculateFullBazi(options);
    options._bazi = bazi;
    const names = generateNames(options);
    res.json({ names, bazi, count: names.length });
  } catch (e) {
    console.error("Generate error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/bazi", (req, res) => {
  try {
    const options = {
      birthDate: req.query.birthDate || "",
      birthTime: req.query.birthTime || "09:30",
      birthPlace: req.query.birthPlace || "",
    };
    const bazi = calculateFullBazi(options);
    if (!bazi) return res.json({ error: "Invalid birth date" });
    res.json(bazi);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/citations", (req, res) => {
  try {
    const key = req.query.q || "";
    if (!key || key.length !== 2) return res.json([]);
    const rows = db.prepare(
      "SELECT type, source, title, author, text, source_path FROM citations WHERE key = ? LIMIT 10"
    ).all(key);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});






app.get("/api/health", (req, res) => {
  const size = fs.statSync(dbPath).size;
  res.json({ status: "ok", chars: characters.length, corpus: corpusNames.size, dbSize: size });
});
// ---- B3: johnwu1114 data endpoints ----
app.get("/api/wuxing", (req, res) => {
  try {
    const ch = (req.query.char || "").trim();
    if (!ch) return res.json(db.prepare("SELECT char, draw, fiveEle FROM char_wuxing").all());
    const rows = db.prepare("SELECT char, draw, fiveEle FROM char_wuxing WHERE char = ?").all(ch);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/zodiac", (req, res) => {
  try {
    const animal = (req.query.animal || "").trim();
    const ch = (req.query.char || "").trim();
    if (animal && ch) {
      const rows = db.prepare("SELECT char, animal, category FROM zodiac_chars WHERE animal = ? AND char = ?").all(animal, ch);
      return res.json(rows);
    }
    if (animal) {
      const better = db.prepare("SELECT char FROM zodiac_chars WHERE animal = ? AND category = 'better'").all(animal).map(r => r.char);
      const worse = db.prepare("SELECT char FROM zodiac_chars WHERE animal = ? AND category = 'worse'").all(animal).map(r => r.char);
      return res.json({ animal, better, worse });
    }
    if (ch) {
      const rows = db.prepare("SELECT char, animal, category FROM zodiac_chars WHERE char = ?").all(ch);
      return res.json(rows);
    }
    const animals = [...new Set(db.prepare("SELECT DISTINCT animal FROM zodiac_chars").all().map(r => r.animal))];
    res.json(animals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/eighty-one", (req, res) => {
  try {
    const draw = Number(req.query.draw) || 0;
    if (draw > 0) return res.json(db.prepare("SELECT * FROM eighty_one WHERE draw = ?").get(draw));
    res.json(db.prepare("SELECT * FROM eighty_one ORDER BY draw").all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.get("/api/chaizi", (req, res) => {
  try {
    const ch = (req.query.char || "").trim();
    if (!ch) return res.json([]);
    const rows = db.prepare("SELECT char, decomposition, variant_index FROM char_chaizi WHERE char = ? ORDER BY variant_index").all(ch);
    res.json(rows.map(r => ({ char: r.char, decomposition: r.decomposition, variantIndex: r.variant_index })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/yinyun", (req, res) => {
  try {
    const p1 = (req.query.p1 || "").trim();
    const p2 = (req.query.p2 || "").trim();
    if (!p1 || !p2) return res.json({ error: "Need p1 and p2 params" });
    const yinyun = rateYinyun(p1, p2);
    res.json(yinyun);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get("/api/scoring", (req, res) => {
  try {
    const weights = req.query.weights === "true" ? DEFAULT_WEIGHTS : null;
    res.json({ rules: SCORING_RULES, defaultWeights: DEFAULT_WEIGHTS });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/dayan", (req, res) => {
  try {
    const num = Number(req.query.number) || 0;
    if (num > 0) return res.json(findDaYan(num));
    const list = [];
    for (let i = 1; i <= 81; i++) list.push(findDaYan(i));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = Number(process.env.PORT || 5177);
initDb();
app.listen(PORT, "127.0.0.1", () => {
  console.log(`API server: http://localhost:${PORT}`);
});



// TEMP DEBUG
import { writeFileSync } from "fs";
const _origPoetry = _queryPoetryNames;
_queryPoetryNames = function(options) {
  const start = Date.now();
  const result = _origPoetry(options);
  const elapsed = Date.now() - start;
  try {
    const count = result ? result.length : 0;
    writeFileSync("_poetry_debug.log", "elapsed=" + elapsed + "ms count=" + count + "\n", {flag:"a"});
  } catch(e) {}
  return result;
};



















