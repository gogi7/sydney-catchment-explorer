const RANKING_COLORS = {
  min: { r: 239, g: 68, b: 68 },    // Red - low score
  low: { r: 249, g: 115, b: 22 },   // Orange
  mid: { r: 250, g: 204, b: 21 },   // Yellow
  high: { r: 132, g: 204, b: 22 },  // Lime
  max: { r: 34, g: 197, b: 94 },    // Green - high score
  noData: { r: 148, g: 163, b: 184 },
};

const DEFAULT_RANKING_RANGE = { min: 20, max: 80 };

function interpolateColor(c1, c2, f) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * f),
    g: Math.round(c1.g + (c2.g - c1.g) * f),
    b: Math.round(c1.b + (c2.b - c1.b) * f),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getRankingColor(score, range = DEFAULT_RANKING_RANGE) {
  if (score == null || score <= 0) return rgbToHex(RANKING_COLORS.noData);

  const { min, max } = range;
  const normalized = Math.max(0, Math.min(1, (score - min) / (max - min)));

  let color;
  if (normalized < 0.25) {
    color = interpolateColor(RANKING_COLORS.min, RANKING_COLORS.low, normalized / 0.25);
  } else if (normalized < 0.5) {
    color = interpolateColor(RANKING_COLORS.low, RANKING_COLORS.mid, (normalized - 0.25) / 0.25);
  } else if (normalized < 0.75) {
    color = interpolateColor(RANKING_COLORS.mid, RANKING_COLORS.high, (normalized - 0.5) / 0.25);
  } else {
    color = interpolateColor(RANKING_COLORS.high, RANKING_COLORS.max, (normalized - 0.75) / 0.25);
  }
  return rgbToHex(color);
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
