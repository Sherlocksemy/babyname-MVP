// YinyunRater - 音韵评分
// Translated from: 00_raw_repos/05_numerology/fate-main/internal/naming/raters.go
// Measures tone, shengmu (initial), yunmu (final) harmony

const SHENG_MU_LIST = [
  "zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l",
  "g", "k", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w"
];

function getTone(pinyin) {
  if (!pinyin || pinyin.length === 0) return 0;
  const last = pinyin[pinyin.length - 1];
  if (last >= "1" && last <= "4") return parseInt(last);
  // Unicode tone marks - check each char
  for (const ch of pinyin) {
    var c = ch.charCodeAt(0);
    if (c === 0x0101 || c === 0x0113 || c === 0x012B || c === 0x014D || c === 0x016B) return 1;
    if (c === 0x00E1 || c === 0x00E9 || c === 0x00ED || c === 0x00F3 || c === 0x00FA || c === 0x01F9) return 2;
    if (c === 0x01CE || c === 0x01D0 || c === 0x01D2 || c === 0x01DC || c === 0x01D4) return 3;
    if (c === 0x00E0 || c === 0x00E8 || c === 0x00EC || c === 0x00F2 || c === 0x00F9) return 4;
    // Also check combining marks via NFKD
  }
  return 0;
}

function getShengMu(pinyin) {
  if (!pinyin || pinyin.length === 0) return "";
  for (const sm of SHENG_MU_LIST) {
    if (pinyin.startsWith(sm)) return sm;
  }
  return "";
}

function getYunMu(pinyin) {
  const sm = getShengMu(pinyin);
  if (!sm) return pinyin;
  return pinyin.slice(sm.length);
}

function isWuXingSheng(wx1, wx2) {
  const sheng = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  return sheng[wx1] === wx2;
}

function isLuckyStroke(stroke) {
  const lucky = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 18, 21, 23, 24, 25, 29, 31]);
  return lucky.has(stroke);
}

// Rate a 2-char name's yinyun (tone + pronunciation harmony)
// Returns { score: 0-100, notes: string }
function rateYinyun(pinyin1, pinyin2) {
  let score = 70;
  const notes = [];
  const py1 = firstPinyin(pinyin1);
  const py2 = firstPinyin(pinyin2);

  if (py1 && py2) {
    const tone1 = getTone(py1);
    const tone2 = getTone(py2);

    if (tone1 !== tone2 && tone1 !== 0 && tone2 !== 0) {
      score += 15;
      notes.push("声调不同，抑扬顿挫");
    } else {
      score -= 10;
      notes.push("声调相同");
    }

    const sheng1 = getShengMu(py1);
    const sheng2 = getShengMu(py2);

    if (sheng1 !== sheng2 && sheng1 !== "" && sheng2 !== "") {
      score += 10;
      notes.push("声母不同，发音清晰");
    } else {
      score -= 5;
      notes.push("声母相同，易绕口");
    }

    const yun1 = getYunMu(py1);
    const yun2 = getYunMu(py2);

    if (yun1 !== yun2 && yun1 !== "" && yun2 !== "") {
      score += 5;
      notes.push("韵母不同，搭配和谐");
    }
  } else {
    score -= 20;
    notes.push("拼音信息不足");
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    score,
    notes: notes.length > 0 ? notes.join("; ") : "音律中和",
    tone1: py1 ? getTone(py1) : 0,
    tone2: py2 ? getTone(py2) : 0,
    sheng1: py1 ? getShengMu(py1) : "",
    sheng2: py2 ? getShengMu(py2) : "",
  };
}

function firstPinyin(py) {
  if (Array.isArray(py)) return py[0] || "";
  if (typeof py === "string") return py;
  return "";
}

export { rateYinyun, isWuXingSheng, isLuckyStroke, getTone, getShengMu, getYunMu };
