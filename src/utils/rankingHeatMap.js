const DEFAULT_RANKING_RANGE = { min: 20, max: 80 };
const NO_DATA_COLOR = '#94a3b8';

// 16-stop color scale: red (low) → green (high) for maximum visual differentiation
const COLOR_STOPS = [
  { t: 0.000, r: 180, g: 20,  b: 20  }, // darkest red    #b41414
  { t: 0.067, r: 220, g: 38,  b: 38  }, // deep red       #dc2626
  { t: 0.133, r: 239, g: 68,  b: 24  }, // red            #ef4418
  { t: 0.200, r: 234, g: 88,  b: 12  }, // red-orange     #ea580c
  { t: 0.267, r: 245, g: 124, b: 0   }, // dark orange    #f57c00
  { t: 0.333, r: 245, g: 158, b: 11  }, // orange         #f59e0b
  { t: 0.400, r: 245, g: 180, b: 0   }, // amber          #f5b400
  { t: 0.467, r: 234, g: 197, b: 8   }, // gold           #eac508
  { t: 0.533, r: 202, g: 210, b: 0   }, // yellow-green   #cad200
  { t: 0.600, r: 160, g: 210, b: 20  }, // chartreuse     #a0d214
  { t: 0.667, r: 132, g: 204, b: 22  }, // yellow-green   #84cc16
  { t: 0.733, r: 74,  g: 204, b: 50  }, // light green    #4acc32
  { t: 0.800, r: 34,  g: 197, b: 94  }, // lime           #22c55e
  { t: 0.867, r: 22,  g: 175, b: 80  }, // green          #16af50
  { t: 0.933, r: 22,  g: 163, b: 74  }, // med green      #16a34a
  { t: 1.000, r: 14,  g: 120, b: 54  }, // dark green     #0e7836
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

export function generateRankingLegendStops(range = DEFAULT_RANKING_RANGE, stops = 16) {
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
