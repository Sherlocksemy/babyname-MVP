function allowed(citation, preference) {
  return preference === "any" || citation.type === preference;
}

function uniqueChars(text) {
  return [...new Set([...text])];
}

function scoreCitation(given, citation, options = {}) {
  const text = String(citation.text || "");
  const chars = uniqueChars(given);
  if (chars.length < 2 || !text) return null;

  if (text.includes(given)) {
    return { score: 100, match: given, matchLevel: "exact" };
  }

  if (!options.allowLoose) return null;
  if (!chars.every((char) => text.includes(char))) return null;
  return { score: 35, match: given, matchLevel: "both-chars" };
}

function normalizeIndexedCitation(given, citation) {
  return {
    ...citation,
    match: citation.match || given,
    matchLevel: citation.matchLevel || "exact",
    score: citation.score || 100,
  };
}

export function buildCitationIndex(citations) {
  const exact = {};
  const loose = {};
  for (const citation of citations || []) {
    const text = String(citation.text || "");
    const seen = new Set();
    for (let i = 0; i < text.length - 1; i += 1) {
      const key = text.slice(i, i + 2);
      if (!/^[\u4e00-\u9fff]{2}$/.test(key) || seen.has(key)) continue;
      seen.add(key);
      exact[key] ||= [];
      if (exact[key].length < 6) {
        exact[key].push({ ...citation, match: key, matchLevel: "exact", score: 100 });
      }
    }
  }

  return { exact, loose };
}

export function findCitation(given, citationData, preference = "any", options = {}) {
  if (citationData && !Array.isArray(citationData) && citationData.exact) {
    const exactMatches = (citationData.exact[given] || []).filter((citation) => allowed(citation, preference));
    if (exactMatches.length) return normalizeIndexedCitation(given, exactMatches[0]);

    if (options.allowLoose) {
      const looseMatches = (citationData.loose?.[given] || []).filter((citation) => allowed(citation, preference));
      if (looseMatches.length) return normalizeIndexedCitation(given, looseMatches[0]);
    }
    return null;
  }

  let best = null;
  for (const citation of citationData || []) {
    if (!allowed(citation, preference)) continue;
    const scored = scoreCitation(given, citation, options);
    if (!scored) continue;
    const candidate = { ...citation, match: scored.match, matchLevel: scored.matchLevel, score: scored.score };
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}
