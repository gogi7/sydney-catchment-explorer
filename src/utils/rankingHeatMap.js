const DEFAULT_RANKING_RANGE = { min: 20, max: 80 };
const NO_DATA_COLOR = '#94a3b8';

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${((1 << 24) + (f(0) << 16) + (f(8) << 8) + f(4)).toString(16).slice(1)}`;
}

export function getRankingColor(score, range = DEFAULT_RANKING_RANGE) {
  if (score == null || score <= 0) return NO_DATA_COLOR;

  const { min, max } = range;
  const linear = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const t = Math.pow(linear, 0.5);

  const hue = t * 145;
  const saturation = 72 + t * 13;
  const lightness = 38 + Math.sin(t * Math.PI) * 12;

  return hslToHex(hue, saturation, lightness);
}

export function getRankingOpacity(hasData) {
  return hasData ? 0.55 : 0.15;
}

export function calculateRankingRange(rankings) {
  if (!rankings || Object.keys(rankings).length === 0) return DEFAULT_RANKING_RANGE;

  const scores = Object.values(rankings)
    .map(r => r.percentage_score)
    .filter(s => s != null && s > 0)
    .sort((a, b) => a - b);

  if (scores.length === 0) return DEFAULT_RANKING_RANGE;

  const lowIdx = Math.floor(0.05 * scores.length);
  const highIdx = Math.ceil(0.95 * scores.length) - 1;

  return {
    min: scores[Math.max(0, lowIdx)],
    max: scores[Math.min(scores.length - 1, highIdx)],
  };
}

export function generateRankingLegendStops(range = DEFAULT_RANKING_RANGE, stops = 5) {
  const { min, max } = range;
  const result = [];
  for (let i = 0; i < stops; i++) {
    const score = min + (max - min) * (i / (stops - 1));
    result.push({
      score,
      color: getRankingColor(score, range),
      label: `${Math.round(score)}%`,
    });
  }
  return result;
}

export function getRankingTier(score, range = DEFAULT_RANKING_RANGE) {
  if (score == null || score <= 0) return 'No data';
  const { min, max } = range;
  const normalized = (score - min) / (max - min);
  if (normalized < 0.2) return 'Low';
  if (normalized < 0.4) return 'Below Average';
  if (normalized < 0.6) return 'Average';
  if (normalized < 0.8) return 'Above Average';
  return 'Top Ranked';
}
