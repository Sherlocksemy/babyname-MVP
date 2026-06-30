import { findCitation } from "./citation.js";
import { calculateWuGe, describeFullName } from "./traditional.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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

function seededOffset(seed, size) {
  if (!size) return 0;
  const text = String(seed ?? Date.now());
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % size;
}

function pickPool(dataset, options) {
  return dataset.characters
    .map((char) => ({
      ...char,
      score:
        styleScore(char, options.style) +
        genderScore(char, options.gender) * 1.7 -
        Math.max(0, (char.ppm || 0) - 9000) / 6500,
    }))
    .filter((char) => char.score > 2.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 360);
}

function hasAwkwardPair(given) {
  const awkwardPairs = new Set(["财宝", "宝财", "乐正", "皇超", "王霸", "富贵", "丰富", "刚强", "阳刚", "富济"]);
  return awkwardPairs.has(given) || /(.)\1/.test(given) || /[阿啊的了和与及皇帝妃奴鬼病死财]/.test(given);
}

function makeTags(item, options) {
  return [
    item.known ? "语料出现" : "统计组合",
    item.citation ? `${item.citation.source}连续出处` : "无硬凑引用",
    options.style === "rare" ? "少见倾向" : "自然读感",
  ];
}

function rankCandidate(item) {
  const citationScore = item.citation?.score || 0;
  const sourceBonus = item.citation?.source === "成语语料" ? -8 : 0;
  const corpusBonus = item.known ? 28 : 0;
  const naturalScore = item.valence * 1.2 + item.warmth * 0.45 + item.competence * 0.35;
  return citationScore + sourceBonus + corpusBonus + naturalScore;
}

function acceptWithDiversity(item, usedCharCounts, maxUse) {
  return [...item.given].every((char) => (usedCharCounts[char] || 0) < maxUse);
}

export function generateNames(dataset, options) {
  const pool = pickPool(dataset, options);
  const seenCorpus = new Set((dataset.corpusGivenNames || []).map((item) => item.name));
  const citationData = dataset.citationIndex || dataset.citations || [];
  const candidates = [];
  const used = new Set();
  const cursor = seededOffset(`${options.seed ?? ""}${options.surname}${options.gender}${options.style}`, pool.length);
  const targetSize = Math.max(options.count * 12, 260);
  const offsets = [1, 2, 3, 5, 8, 13, 21, 34];

  for (let i = 0; i < pool.length && candidates.length < targetSize; i += 1) {
    for (const offset of offsets) {
      if (candidates.length >= targetSize) break;
      const a = pool[(cursor + i) % pool.length];
      const b = pool[(cursor + i + offset) % pool.length];
      if (!a || !b || a.char === b.char) continue;

      const given = `${a.char}${b.char}`;
      if (used.has(given) || hasAwkwardPair(given)) continue;
      used.add(given);

      const citation = findCitation(given, citationData, options.source);
      const wuge = calculateWuGe(options.surname, given, dataset.strokes || {});
      const avg = (key) => ((a[key] || 0) + (b[key] || 0)) / 2;
      const full = `${options.surname}${given}`;

      const candidate = {
        full,
        given,
        pinyin: `${a.pinyin || ""} ${b.pinyin || ""}`.replace(/\d/g, "").trim(),
        known: seenCorpus.has(given),
        popularity: avg("ppm"),
        uniqueness: avg("uniqueness"),
        valence: avg("valence"),
        warmth: avg("warmth"),
        competence: avg("competence"),
        citation,
        wuge,
        chars: [a, b],
      };
      candidate.tags = makeTags(candidate, options);
      candidate.explanation = describeFullName({ surname: options.surname, given, citation, chars: [a, b] });
      candidate.rank = rankCandidate(candidate);
      candidates.push(candidate);
    }
  }

  const sorted = candidates.sort((a, b) => b.rank - a.rank);
  const selected = [];
  const usedCharCounts = {};
  const maxUse = 2;

  for (const item of sorted) {
    if (!acceptWithDiversity(item, usedCharCounts, maxUse)) continue;
    selected.push(item);
    for (const char of item.given) usedCharCounts[char] = (usedCharCounts[char] || 0) + 1;
    if (selected.length >= options.count) break;
  }

  if (selected.length < options.count) {
    for (const item of sorted) {
      if (selected.includes(item)) continue;
      if (!acceptWithDiversity(item, usedCharCounts, maxUse)) continue;
      selected.push(item);
      for (const char of item.given) usedCharCounts[char] = (usedCharCounts[char] || 0) + 1;
      if (selected.length >= options.count) break;
    }
  }

  return selected;
}
