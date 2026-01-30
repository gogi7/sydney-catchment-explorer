const NO_DATA_COLOR = '#94a3b8';

// 32-stop color scale: red (low rank) → green (high rank) for maximum visual differentiation
const COLOR_STOPS = [
  { t: 0.000, r: 140, g: 10,  b: 10  }, // deepest red
  { t: 0.032, r: 165, g: 15,  b: 15  },
  { t: 0.065, r: 190, g: 25,  b: 25  },
  { t: 0.097, r: 220, g: 38,  b: 38  }, // deep red
  { t: 0.129, r: 230, g: 52,  b: 28  },
  { t: 0.161, r: 239, g: 68,  b: 20  },
  { t: 0.194, r: 236, g: 82,  b: 12  },
  { t: 0.226, r: 240, g: 100, b: 0   }, // red-orange
  { t: 0.258, r: 245, g: 118, b: 0   },
  { t: 0.290, r: 245, g: 138, b: 0   },
  { t: 0.323, r: 245, g: 158, b: 11  }, // orange
  { t: 0.355, r: 245, g: 170, b: 0   },
  { t: 0.387, r: 245, g: 182, b: 0   },
  { t: 0.419, r: 240, g: 192, b: 0   }, // amber
  { t: 0.452, r: 234, g: 200, b: 8   },
  { t: 0.484, r: 220, g: 208, b: 0   }, // gold
  { t: 0.516, r: 202, g: 212, b: 0   },
  { t: 0.548, r: 182, g: 214, b: 0   }, // yellow-green
  { t: 0.581, r: 160, g: 212, b: 15  },
  { t: 0.613, r: 142, g: 208, b: 20  },
  { t: 0.645, r: 120, g: 204, b: 25  }, // chartreuse
  { t: 0.677, r: 100, g: 200, b: 35  },
  { t: 0.710, r: 80,  g: 200, b: 48  },
  { t: 0.742, r: 60,  g: 200, b: 65  }, // light green
  { t: 0.774, r: 42,  g: 197, b: 82  },
  { t: 0.806, r: 34,  g: 190, b: 90  }, // lime
  { t: 0.839, r: 28,  g: 180, b: 82  },
  { t: 0.871, r: 22,  g: 170, b: 76  }, // green
  { t: 0.903, r: 20,  g: 158, b: 70  },
  { t: 0.935, r: 18,  g: 145, b: 62  }, // med green
  { t: 0.968, r: 16,  g: 132, b: 56  },
  { t: 1.000, r: 10,  g: 110, b: 46  }, // darkest green
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
export function generateRankingLegendStops(range, stops = 32) {
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
