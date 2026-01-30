const NO_DATA_COLOR = '#94a3b8';

// 16-stop color scale: red (low rank) → green (high rank) for maximum visual differentiation
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
  if (t <= 0) return COLOR_STOPS[0];
  if (t >= 1) return COLOR_STOPS[COLOR_STOPS.length - 1];

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

/**
 * Get color for a school based on its rank position.
 * Rank 1 (best) = green, highest rank (worst) = red.
 * @param {number} rank - The school's rank (1 = best)
 * @param {object} range - { totalRanked: number } total schools ranked
 */
export function getRankingColor(rank, range) {
  if (rank == null || rank <= 0) return NO_DATA_COLOR;

  const total = range?.totalRanked || 1;
  // rank 1 → t=1.0 (green), rank total → t=0.0 (red)
  const t = Math.max(0, Math.min(1, 1 - (rank - 1) / (total - 1)));

  const { r, g, b } = interpolateColorStops(t);
  return rgbToHex(r, g, b);
}

export function getRankingOpacity(hasData) {
  return hasData ? 0.55 : 0.15;
}

/**
 * Calculate ranking range from rankings lookup.
 * Returns { totalRanked } for use with getRankingColor.
 */
export function calculateRankingRange(rankings) {
  if (!rankings || Object.keys(rankings).length === 0) return { totalRanked: 1 };

  const ranks = Object.values(rankings)
    .map(r => r.rank)
    .filter(r => r != null && r > 0);

  if (ranks.length === 0) return { totalRanked: 1 };

  return {
    totalRanked: Math.max(...ranks),
  };
}

/**
 * Generate legend stops for display.
 * Shows rank positions evenly distributed.
 */
export function generateRankingLegendStops(range, stops = 16) {
  const total = range?.totalRanked || 1;
  const result = [];
  for (let i = 0; i < stops; i++) {
    // From rank 1 (best, green) to rank total (worst, red)
    const rank = Math.round(1 + (total - 1) * (i / (stops - 1)));
    result.push({
      score: rank,
      color: getRankingColor(rank, range),
      label: `#${rank}`,
    });
  }
  return result;
}

export function getRankingTier(rank, range) {
  if (rank == null || rank <= 0) return 'No data';
  const total = range?.totalRanked || 1;
  const normalized = 1 - (rank - 1) / (total - 1); // 1 = best, 0 = worst
  if (normalized >= 0.8) return 'Top Ranked';
  if (normalized >= 0.6) return 'Above Average';
  if (normalized >= 0.4) return 'Average';
  if (normalized >= 0.2) return 'Below Average';
  return 'Low';
}
