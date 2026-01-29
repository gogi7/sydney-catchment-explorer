#!/usr/bin/env node
/**
 * Export Schools Data for Frontend
 * 
 * Processes the schools JSON data and creates optimized files for the web app.
 * This creates lightweight, optimized data files for the frontend.
 * 
 * Usage:
 *   node scripts/exportSchoolsData.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { calculateSchoolRankings } from './schoolRankingUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHOOLS_INPUT = join(__dirname, '..', 'public', 'data', 'schools.json');
const SUBURB_STATS_INPUT = join(__dirname, '..', 'public', 'data', 'sales', 'suburb_stats.json');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data', 'schools');

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Load and parse schools data
 */
function loadSchoolsData() {
  if (!existsSync(SCHOOLS_INPUT)) {
    throw new Error(`Schools data not found at ${SCHOOLS_INPUT}`);
  }
  
  console.log('Loading schools data...');
  const rawData = readFileSync(SCHOOLS_INPUT, 'utf8');
  const schools = JSON.parse(rawData);
  
  console.log(`Loaded ${schools.length} schools`);
  return schools;
}

/**
 * Load and parse suburb property price data
 */
function loadSuburbPriceData() {
  if (!existsSync(SUBURB_STATS_INPUT)) {
    console.warn(`Suburb stats not found at ${SUBURB_STATS_INPUT}. Running without property price data.`);
    return { bySuburb: new Map(), byPostcode: new Map(), allSuburbs: [] };
  }
  
  console.log('Loading suburb property price data...');
  const rawData = readFileSync(SUBURB_STATS_INPUT, 'utf8');
  const suburbStats = JSON.parse(rawData);
  
  // Create maps for different lookup strategies
  const priceBySuburb = new Map();
  const priceByPostcode = new Map();
  const allSuburbs = [];
  
  suburbStats.forEach(stat => {
    if (stat.suburb && stat.avgPrice) {
      const suburbKey = stat.suburb.toLowerCase().trim();
      const priceData = {
        suburb: stat.suburb,
        postcode: stat.postcode,
        avgPrice: stat.avgPrice,
        avgPricePerSqm: stat.avgPricePerSqm,
        totalSales: stat.totalSales,
        minPrice: stat.minPrice,
        maxPrice: stat.maxPrice,
        avgPriceLast3Months: stat.avgPriceLast3Months,
        salesLast3Months: stat.salesLast3Months,
        matchMethod: 'exact'
      };
      
      // Index by suburb name
      priceBySuburb.set(suburbKey, priceData);
      allSuburbs.push({ key: suburbKey, data: priceData });
      
      // Index by postcode (aggregate if multiple suburbs in same postcode)
      const postcode = stat.postcode ? stat.postcode.toString() : null;
      if (postcode && priceByPostcode.has(postcode)) {
        const existing = priceByPostcode.get(postcode);
        // Average the prices (weighted by number of sales)
        const totalSales = existing.totalSales + stat.totalSales;
        const weightedAvgPrice = (existing.avgPrice * existing.totalSales + stat.avgPrice * stat.totalSales) / totalSales;
        existing.avgPrice = Math.round(weightedAvgPrice);
        existing.totalSales = totalSales;
        existing.suburb = existing.suburb + ', ' + stat.suburb;
        existing.matchMethod = 'postcode';
      } else if (postcode) {
        priceByPostcode.set(postcode, { ...priceData, matchMethod: 'postcode' });
      }
    }
  });
  
  console.log(`Loaded property data for ${priceBySuburb.size} suburbs and ${priceByPostcode.size} postcodes`);
  return { bySuburb: priceBySuburb, byPostcode: priceByPostcode, allSuburbs };
}

/**
 * Simple string similarity check for fuzzy matching
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Check if words overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  
  if (commonWords.length > 0) {
    return 0.6 * (commonWords.length / Math.max(words1.length, words2.length));
  }
  
  return 0.0;
}

/**
 * Find the best matching suburb using fuzzy matching
 */
function findBestSuburbMatch(schoolSuburb, allSuburbs, minSimilarity = 0.6) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const { key, data } of allSuburbs) {
    const score = calculateSimilarity(schoolSuburb, key);
    if (score >= minSimilarity && score > bestScore) {
      bestScore = score;
      bestMatch = { ...data, matchMethod: `fuzzy(${score.toFixed(1)})` };
    }
  }
  
  return bestMatch;
}

/**
 * Add property price data to a school object using multiple matching strategies
 */
function addPropertyPriceData(school, priceData) {
  const { bySuburb, byPostcode, allSuburbs } = priceData;
  
  // Strategy 1: Exact suburb name match
  const suburb = school.Town_suburb;
  if (suburb) {
    const key = suburb.toLowerCase().trim();
    const exactMatch = bySuburb.get(key);
    if (exactMatch) {
      return { ...school, propertyPrices: exactMatch };
    }
    
    // Strategy 2: Fuzzy suburb name match
    const fuzzyMatch = findBestSuburbMatch(key, allSuburbs);
    if (fuzzyMatch) {
      return { ...school, propertyPrices: fuzzyMatch };
    }
  }
  
  // Strategy 3: Postcode-based match
  const postcode = school.Postcode;
  if (postcode && postcode !== null) {
    const postcodeMatch = byPostcode.get(postcode.toString());
    if (postcodeMatch) {
      return { ...school, propertyPrices: postcodeMatch };
    }
  }
  
  // Strategy 4: No match found
  return { ...school, propertyPrices: null };
}

/**
 * Log property price matching statistics
 */
function logPropertyMatchingStats(schools) {
  const withPrices = schools.filter(s => s.propertyPrices !== null);
  const withoutPrices = schools.filter(s => s.propertyPrices === null);
  
  // Count by match method
  const matchMethods = {};
  withPrices.forEach(school => {
    const method = school.propertyPrices.matchMethod;
    matchMethods[method] = (matchMethods[method] || 0) + 1;
  });
  
  console.log('\n🏠 PROPERTY PRICE MATCHING STATISTICS:');
  console.log(`Total schools: ${schools.length.toLocaleString()}`);
  console.log(`✅ Schools WITH prices: ${withPrices.length.toLocaleString()} (${(withPrices.length/schools.length*100).toFixed(1)}%)`);
  console.log(`❌ Schools WITHOUT prices: ${withoutPrices.length.toLocaleString()} (${(withoutPrices.length/schools.length*100).toFixed(1)}%)`);
  
  console.log('\nMatching methods used:');
  Object.entries(matchMethods).forEach(([method, count]) => {
    console.log(`  ${method}: ${count.toLocaleString()} schools`);
  });
  
  if (withoutPrices.length > 0) {
    console.log('\nSample schools without price data:');
    withoutPrices.slice(0, 5).forEach(school => {
      console.log(`  - ${school.School_name} (${school.Town_suburb || 'no suburb'}, ${school.Postcode || 'no postcode'})`);
    });
  }
  
  console.log('');
}

/**
 * Export schools metadata and summary
 */
function exportSchoolsMetadata(schools) {
  console.log('\nExporting schools metadata...');
  
  const stats = {
    generated: new Date().toISOString(),
    totalSchools: schools.length,
    schoolTypes: {},
    levels: {},
    suburbs: {},
    postcodes: {},
    icsea: {
      withData: 0,
      min: null,
      max: null,
      avg: null
    },
    geographic: {
      minLat: null,
      maxLat: null,
      minLng: null,
      maxLng: null
    },
    selectiveSchools: {
      fully: 0,
      partially: 0,
      not: 0
    }
  };

  let icsea_values = [];
  let latitudes = [];
  let longitudes = [];

  schools.forEach(school => {
    // School types
    const schoolType = school.School_specialty_type || 'Unknown';
    stats.schoolTypes[schoolType] = (stats.schoolTypes[schoolType] || 0) + 1;
    
    // Levels
    const level = school.Level_of_schooling || 'Unknown';
    stats.levels[level] = (stats.levels[level] || 0) + 1;
    
    // Suburbs
    const suburb = school.Town_suburb || 'Unknown';
    stats.suburbs[suburb] = (stats.suburbs[suburb] || 0) + 1;
    
    // Postcodes
    const postcode = school.Postcode;
    if (postcode) {
      stats.postcodes[postcode] = (stats.postcodes[postcode] || 0) + 1;
    }
    
    // ICSEA values
    if (school.ICSEA_value && school.ICSEA_value !== null) {
      stats.icsea.withData++;
      icsea_values.push(parseInt(school.ICSEA_value));
    }
    
    // Geographic bounds
    if (school.Latitude && school.Longitude) {
      latitudes.push(school.Latitude);
      longitudes.push(school.Longitude);
    }
    
    // Selective schools
    const selective = school.Selective_school || 'Not Selective';
    if (selective.includes('Fully')) {
      stats.selectiveSchools.fully++;
    } else if (selective.includes('Partial')) {
      stats.selectiveSchools.partially++;
    } else {
      stats.selectiveSchools.not++;
    }
  });

  // Calculate ICSEA stats
  if (icsea_values.length > 0) {
    stats.icsea.min = Math.min(...icsea_values);
    stats.icsea.max = Math.max(...icsea_values);
    stats.icsea.avg = Math.round(icsea_values.reduce((a, b) => a + b) / icsea_values.length);
  }

  // Calculate geographic bounds
  if (latitudes.length > 0) {
    stats.geographic.minLat = Math.min(...latitudes);
    stats.geographic.maxLat = Math.max(...latitudes);
    stats.geographic.minLng = Math.min(...longitudes);
    stats.geographic.maxLng = Math.max(...longitudes);
  }

  const outputPath = join(OUTPUT_DIR, 'metadata.json');
  writeFileSync(outputPath, JSON.stringify(stats, null, 2));
  
  console.log(`  ✓ Exported metadata to ${outputPath}`);
  return stats;
}

/**
 * Export primary schools data
 */
function exportPrimarySchools(schools) {
  console.log('\nExporting primary schools...');
  
  const primarySchools = schools.filter(school => {
    const level = school.Level_of_schooling || '';
    return level.includes('Primary') || level.includes('K-6') || level.includes('Infants');
  });
  
  const outputPath = join(OUTPUT_DIR, 'primary_schools.json');
  writeFileSync(outputPath, JSON.stringify(primarySchools, null, 2));
  
  console.log(`  ✓ Exported ${primarySchools.length} primary schools to ${outputPath}`);
  return primarySchools.length;
}

/**
 * Export secondary schools data
 */
function exportSecondarySchools(schools) {
  console.log('\nExporting secondary schools...');
  
  const secondarySchools = schools.filter(school => {
    const level = school.Level_of_schooling || '';
    return level.includes('Secondary') || level.includes('7-12') || level.includes('High');
  });
  
  const outputPath = join(OUTPUT_DIR, 'secondary_schools.json');
  writeFileSync(outputPath, JSON.stringify(secondarySchools, null, 2));
  
  console.log(`  ✓ Exported ${secondarySchools.length} secondary schools to ${outputPath}`);
  return secondarySchools.length;
}

/**
 * Export selective schools data
 */
function exportSelectiveSchools(schools) {
  console.log('\nExporting selective schools...');
  
  const selectiveSchools = schools.filter(school => {
    const selective = school.Selective_school || 'Not Selective';
    return !selective.includes('Not Selective');
  });
  
  const outputPath = join(OUTPUT_DIR, 'selective_schools.json');
  writeFileSync(outputPath, JSON.stringify(selectiveSchools, null, 2));
  
  console.log(`  ✓ Exported ${selectiveSchools.length} selective schools to ${outputPath}`);
  return selectiveSchools.length;
}

/**
 * Export schools by suburb
 */
function exportSchoolsBySuburb(schools) {
  console.log('\nExporting schools aggregated by suburb...');
  
  const suburbStats = {};
  
  schools.forEach(school => {
    const suburb = school.Town_suburb || 'Unknown';
    if (!suburbStats[suburb]) {
      suburbStats[suburb] = {
        suburb: suburb,
        postcode: school.Postcode,
        totalSchools: 0,
        primaryCount: 0,
        secondaryCount: 0,
        selectiveCount: 0,
        avgICSEA: null,
        schoolTypes: {},
        schools: []
      };
    }
    
    const stats = suburbStats[suburb];
    stats.totalSchools++;
    
    // Count by level
    const level = school.Level_of_schooling || '';
    if (level.includes('Primary') || level.includes('K-6') || level.includes('Infants')) {
      stats.primaryCount++;
    }
    if (level.includes('Secondary') || level.includes('7-12') || level.includes('High')) {
      stats.secondaryCount++;
    }
    
    // Count selective
    const selective = school.Selective_school || 'Not Selective';
    if (!selective.includes('Not Selective')) {
      stats.selectiveCount++;
    }
    
    // School types
    const schoolType = school.School_specialty_type || 'Unknown';
    stats.schoolTypes[schoolType] = (stats.schoolTypes[schoolType] || 0) + 1;
    
    // Add to schools list (basic info only)
    stats.schools.push({
      name: school.School_name,
      code: school.School_code,
      level: school.Level_of_schooling,
      icsea: school.ICSEA_value,
      selective: school.Selective_school
    });
  });
  
  // Calculate average ICSEA for each suburb
  Object.values(suburbStats).forEach(stats => {
    const icsea_values = stats.schools
      .map(s => s.icsea)
      .filter(v => v && v !== null)
      .map(v => parseInt(v));
    
    if (icsea_values.length > 0) {
      stats.avgICSEA = Math.round(icsea_values.reduce((a, b) => a + b) / icsea_values.length);
    }
  });
  
  const sortedStats = Object.values(suburbStats).sort((a, b) => a.suburb.localeCompare(b.suburb));
  
  const outputPath = join(OUTPUT_DIR, 'suburb_stats.json');
  writeFileSync(outputPath, JSON.stringify(sortedStats, null, 2));
  
  console.log(`  ✓ Exported stats for ${sortedStats.length} suburbs to ${outputPath}`);
  return sortedStats.length;
}

/**
 * Export schools as GeoJSON for mapping
 */
function exportSchoolsGeoJSON(schools) {
  console.log('\nExporting schools as GeoJSON...');
  
  const schoolsWithCoords = schools.filter(school => 
    school.Latitude && school.Longitude
  );
  
  const geojson = {
    type: "FeatureCollection",
    metadata: {
      generated: new Date().toISOString(),
      totalSchools: schoolsWithCoords.length,
      note: "Schools with geographic coordinates"
    },
    features: schoolsWithCoords.map(school => ({
      type: "Feature",
      properties: {
        id: school.School_code,
        name: school.School_name,
        address: school.Street,
        suburb: school.Town_suburb,
        postcode: school.Postcode,
        level: school.Level_of_schooling,
        type: school.School_specialty_type,
        selective: school.Selective_school,
        icsea: school.ICSEA_value,
        foei: school.FOEI_Value,
        phone: school.Phone,
        website: school.Website,
        opportunityClass: school.Opportunity_class
      },
      geometry: {
        type: "Point",
        coordinates: [school.Longitude, school.Latitude]
      }
    }))
  };
  
  const outputPath = join(OUTPUT_DIR, 'schools_points.geojson');
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  
  console.log(`  ✓ Exported ${schoolsWithCoords.length} schools to ${outputPath}`);
  return schoolsWithCoords.length;
}

/**
 * Export ranked schools data
 */
function exportRankedSchools(schools) {
  console.log('\nCalculating school rankings...');
  
  // Calculate rankings for all schools
  const allRanked = calculateSchoolRankings(schools, { sortBy: 'percentage_score' });
  
  // Calculate separate rankings for primary and secondary
  const primaryRanked = calculateSchoolRankings(schools, { 
    filterByLevel: 'primary', 
    sortBy: 'percentage_score' 
  });
  
  const secondaryRanked = calculateSchoolRankings(schools, { 
    filterByLevel: 'secondary', 
    sortBy: 'percentage_score' 
  });

  // Export overall rankings
  const allRankedPath = join(OUTPUT_DIR, 'schools_ranked.json');
  writeFileSync(allRankedPath, JSON.stringify(allRanked, null, 2));
  console.log(`  ✓ Exported ${allRanked.length} ranked schools to ${allRankedPath}`);

  // Export primary school rankings
  const primaryRankedPath = join(OUTPUT_DIR, 'primary_schools_ranked.json');
  writeFileSync(primaryRankedPath, JSON.stringify(primaryRanked, null, 2));
  console.log(`  ✓ Exported ${primaryRanked.length} ranked primary schools to ${primaryRankedPath}`);

  // Export secondary school rankings
  const secondaryRankedPath = join(OUTPUT_DIR, 'secondary_schools_ranked.json');
  writeFileSync(secondaryRankedPath, JSON.stringify(secondaryRanked, null, 2));
  console.log(`  ✓ Exported ${secondaryRanked.length} ranked secondary schools to ${secondaryRankedPath}`);

  // Export top schools summary
  const topSchools = {
    generated: new Date().toISOString(),
    top_overall: allRanked.slice(0, 20).map(s => ({
      rank: s.ranking.rank,
      school_code: s.School_code,
      name: s.School_name,
      level: s.Level_of_schooling,
      suburb: s.Town_suburb,
      score: s.ranking.percentage_score,
      icsea: s.ICSEA_value,
      selective: s.Selective_school
    })),
    top_primary: primaryRanked.slice(0, 20).map(s => ({
      rank: s.ranking.rank,
      school_code: s.School_code,
      name: s.School_name,
      suburb: s.Town_suburb,
      score: s.ranking.percentage_score,
      icsea: s.ICSEA_value,
      opportunity_class: s.Opportunity_class
    })),
    top_secondary: secondaryRanked.slice(0, 20).map(s => ({
      rank: s.ranking.rank,
      school_code: s.School_code,
      name: s.School_name,
      suburb: s.Town_suburb,
      score: s.ranking.percentage_score,
      icsea: s.ICSEA_value,
      selective: s.Selective_school
    }))
  };

  const topSchoolsPath = join(OUTPUT_DIR, 'top_schools.json');
  writeFileSync(topSchoolsPath, JSON.stringify(topSchools, null, 2));
  console.log(`  ✓ Exported top schools summary to ${topSchoolsPath}`);

  return {
    total: allRanked.length,
    primary: primaryRanked.length,
    secondary: secondaryRanked.length,
    averageScore: allRanked.reduce((sum, s) => sum + s.ranking.percentage_score, 0) / allRanked.length
  };
}

/**
 * Create database schema info for schools
 */
function exportSchoolsSchemaInfo(schools) {
  console.log('\nExporting schools schema info...');
  
  if (schools.length === 0) {
    throw new Error('No schools data to analyze');
  }

  const sampleSchool = schools[0];
  const columns = Object.keys(sampleSchool).map(key => ({
    name: key,
    type: typeof sampleSchool[key] === 'number' ? 'REAL' : 'TEXT',
    nullable: true,
    isPrimaryKey: key === 'School_code',
    defaultValue: null
  }));

  const schemaInfo = {
    generated: new Date().toISOString(),
    dataSource: 'schools.json',
    tables: {
      schools: {
        rowCount: schools.length,
        columns: columns,
        sampleRows: schools.slice(0, 10)
      }
    },
    views: {},
    statistics: {
      schools: {
        totalRecords: schools.length,
        withCoordinates: schools.filter(s => s.Latitude && s.Longitude).length,
        withICSEA: schools.filter(s => s.ICSEA_value).length
      }
    },
    columnValues: {}
  };

  // Add column value samples for key fields
  const keyColumns = ['Level_of_schooling', 'School_specialty_type', 'Selective_school', 'School_gender'];
  keyColumns.forEach(col => {
    const values = {};
    schools.forEach(school => {
      const val = school[col] || '(empty)';
      values[val] = (values[val] || 0) + 1;
    });
    
    schemaInfo.columnValues[col] = Object.entries(values)
      .map(([value, count]) => ({ [col]: value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  });

  const outputPath = join(OUTPUT_DIR, 'schema_info.json');
  writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2));
  
  console.log(`  ✓ Exported schema info to ${outputPath}`);
  return schemaInfo;
}

/**
 * Main entry point
 */
async function main() {
  console.log('Schools Data Export');
  console.log('==================\n');

  ensureOutputDir();
  
  try {
    const schools = loadSchoolsData();
    const priceData = loadSuburbPriceData();
    
    // Add property price data to schools
    const schoolsWithPrices = schools.map(school => addPropertyPriceData(school, priceData));
    
    // Log matching statistics
    logPropertyMatchingStats(schoolsWithPrices);
    
    const metadata = exportSchoolsMetadata(schoolsWithPrices);
    exportPrimarySchools(schoolsWithPrices);
    exportSecondarySchools(schoolsWithPrices);
    exportSelectiveSchools(schoolsWithPrices);
    exportSchoolsBySuburb(schoolsWithPrices);
    exportSchoolsGeoJSON(schoolsWithPrices);
    const rankingStats = exportRankedSchools(schoolsWithPrices);
    exportSchoolsSchemaInfo(schoolsWithPrices);
    
    console.log('\n' + '='.repeat(60));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total schools: ${metadata.totalSchools.toLocaleString()}`);
    console.log(`Schools with ICSEA data: ${metadata.icsea.withData.toLocaleString()}`);
    console.log(`Average ICSEA: ${metadata.icsea.avg || 'N/A'}`);
    console.log(`Selective schools: ${metadata.selectiveSchools.fully + metadata.selectiveSchools.partially}`);
    console.log(`\n🏆 RANKING STATISTICS:`);
    console.log(`Total ranked schools: ${rankingStats.total.toLocaleString()}`);
    console.log(`Primary schools ranked: ${rankingStats.primary.toLocaleString()}`);
    console.log(`Secondary schools ranked: ${rankingStats.secondary.toLocaleString()}`);
    console.log(`Average ranking score: ${rankingStats.averageScore.toFixed(1)}%`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});