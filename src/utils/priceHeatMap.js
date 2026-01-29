/**
 * Price Heat Map Utilities
 * 
 * Color interpolation and price-to-color mapping for catchment heat map visualization.
 * Uses a gradient from green (affordable) through yellow to red (expensive).
 */

// Heat map color stops (affordable → expensive)
export const HEAT_MAP_COLORS = {
  min: { r: 34, g: 197, b: 94 },    // Green - #22c55e
  low: { r: 132, g: 204, b: 22 },   // Lime - #84cc16
  mid: { r: 250, g: 204, b: 21 },   // Yellow - #facc15
  high: { r: 249, g: 115, b: 22 },  // Orange - #f97316
  max: { r: 239, g: 68, b: 68 },    // Red - #ef4444
  noData: { r: 148, g: 163, b: 184 }, // Slate gray - #94a3b8
};

// Default price ranges for Sydney (in AUD)
export const DEFAULT_PRICE_RANGE = {
  min: 500000,      // $500k
  max: 5000000,     // $5M
};

/**
 * Interpolate between two colors based on a factor (0-1)
 */
function interpolateColor(color1, color2, factor) {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * factor),
    g: Math.round(color1.g + (color2.g - color1.g) * factor),
    b: Math.round(color1.b + (color2.b - color1.b) * factor),
  };
}

/**
 * Convert RGB object to hex string
 */
function rgbToHex({ r, g, b }) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Get heat map color for a given price
 * @param {number} price - The average price
 * @param {object} priceRange - { min, max } price range for scaling
 * @returns {string} Hex color string
 */
export function getPriceColor(price, priceRange = DEFAULT_PRICE_RANGE) {
  if (!price || price <= 0) {
    return rgbToHex(HEAT_MAP_COLORS.noData);
  }

  const { min, max } = priceRange;
  
  // Normalize price to 0-1 range (clamped)
  const normalized = Math.max(0, Math.min(1, (price - min) / (max - min)));
  
  // Map to 5-stop gradient
  let color;
  if (normalized < 0.25) {
    // Green to Lime
    color = interpolateColor(HEAT_MAP_COLORS.min, HEAT_MAP_COLORS.low, normalized / 0.25);
  } else if (normalized < 0.5) {
    // Lime to Yellow
    color = interpolateColor(HEAT_MAP_COLORS.low, HEAT_MAP_COLORS.mid, (normalized - 0.25) / 0.25);
  } else if (normalized < 0.75) {
    // Yellow to Orange
    color = interpolateColor(HEAT_MAP_COLORS.mid, HEAT_MAP_COLORS.high, (normalized - 0.5) / 0.25);
  } else {
    // Orange to Red
    color = interpolateColor(HEAT_MAP_COLORS.high, HEAT_MAP_COLORS.max, (normalized - 0.75) / 0.25);
  }

  return rgbToHex(color);
}

/**
 * Get fill opacity based on data availability
 * @param {boolean} hasData - Whether price data exists
 * @returns {number} Opacity value 0-1
 */
export function getPriceOpacity(hasData) {
  return hasData ? 0.55 : 0.15;
}

/**
 * Calculate price range from suburb stats array
 * Uses percentiles to avoid outliers skewing the scale
 * @param {Array} suburbStats - Array of suburb statistics
 * @param {number} percentileLow - Lower percentile (default 10)
 * @param {number} percentileHigh - Upper percentile (default 90)
 * @returns {object} { min, max } price range
 */
export function calculatePriceRange(suburbStats, percentileLow = 10, percentileHigh = 90) {
  if (!suburbStats || suburbStats.length === 0) {
    return DEFAULT_PRICE_RANGE;
  }

  // Extract valid prices and sort
  const prices = suburbStats
    .map(s => s.avgPrice)
    .filter(p => p && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return DEFAULT_PRICE_RANGE;
  }

  // Calculate percentile indices
  const lowIndex = Math.floor((percentileLow / 100) * prices.length);
  const highIndex = Math.ceil((percentileHigh / 100) * prices.length) - 1;

  return {
    min: prices[Math.max(0, lowIndex)],
    max: prices[Math.min(prices.length - 1, highIndex)],
  };
}

/**
 * Format price for display
 * @param {number} price - Price in dollars
 * @returns {string} Formatted price string
 */
export function formatPriceShort(price) {
  if (!price || price <= 0) return 'N/A';
  
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`;
  }
  return `$${price.toLocaleString()}`;
}

/**
 * Generate legend stops for the heat map
 * @param {object} priceRange - { min, max } price range
 * @param {number} stops - Number of legend stops (default 5)
 * @returns {Array} Array of { price, color, label } objects
 */
export function generateLegendStops(priceRange = DEFAULT_PRICE_RANGE, stops = 5) {
  const { min, max } = priceRange;
  const result = [];
  
  for (let i = 0; i < stops; i++) {
    const price = min + (max - min) * (i / (stops - 1));
    result.push({
      price,
      color: getPriceColor(price, priceRange),
      label: formatPriceShort(price),
    });
  }
  
  return result;
}

/**
 * Get a descriptive price tier label
 * @param {number} price - The price
 * @param {object} priceRange - { min, max } price range
 * @returns {string} Tier label
 */
export function getPriceTier(price, priceRange = DEFAULT_PRICE_RANGE) {
  if (!price || price <= 0) return 'No data';
  
  const { min, max } = priceRange;
  const normalized = (price - min) / (max - min);
  
  if (normalized < 0.2) return 'Very Affordable';
  if (normalized < 0.4) return 'Affordable';
  if (normalized < 0.6) return 'Moderate';
  if (normalized < 0.8) return 'Premium';
  return 'Luxury';
}










