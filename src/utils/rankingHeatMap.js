const DEFAULT_RANKING_RANGE = { min: 20, max: 80 };
const NO_DATA_COLOR = '#94a3b8';

// Multi-stop color scale: red (low) → green (high)
const COLOR_STOPS = [
  { t: 0.0,  r: 220, g: 38,  b: 38  }, // deep red    #dc2626
  { t: 0.15, r: 234, g: 88,  b: 12  }, // red-orange  #ea580c
  { t: 0.3,  r: 245, g: 158, b: 11  }, // orange      #f59e0b
  { t: 0.45, r: 234, g: 179, b: 8   }, // yellow      #eab308
  { t: 0.6,  r: 132, g: 204, b: 22  }, // yellow-grn  #84cc16
  { t: 0.75, r: 34,  g: 197, b: 94  }, // lime        #22c55e
  { t: 0.9,  r: 22,  g: 163, b: 74  }, // green       #16a34a
  { t: 1.0,  r: 21,  g: 128, b: 61  }, // dark green  #15803d
];

function interpolateColorStops(t) {
  // Clamp
  if (t <= 0) return COLOR_STOPS[0];
  if (t >= 1) return COLOR_STOPS[COLOR_STOPS.length - 1];

  // Find the two surrounding stops
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const local = (t - a.t) / (b.t - a.t);
      return {
        r: Math.round(a.r + (b.r - a.r) * local),
        g: Math.round(a.g + (b.g - a.g) * local),
        b: Math.round(a.b + (b.b - a.b) * local),
      };
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1];
}

function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getRankingColor(score, range = DEFAULT_RANKING_RANGE) {
  if (score == null || score <= 0) return NO_DATA_COLOR;

  const { min, max } = range;
  const linear = Math.max(0, Math.min(1, (score - min) / (max - min)));
  // Apply sqrt curve for better spread at lower end
  const t = Math.pow(linear, 0.5);

  const { r, g, b } = interpolateColorStops(t);
  return rgbToHex(r, g, b);
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

export function generateRankingLegendStops(range = DEFAULT_RANKING_RANGE, stops = 8) {
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
