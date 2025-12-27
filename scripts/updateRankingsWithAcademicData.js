#!/usr/bin/env node
/**
 * Update School Rankings with Academic Performance Data
 * 
 * This script recalculates school rankings using the updated weighting system
 * that includes NAPLAN and HSC performance data
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { calculateSchoolRankings } from './schoolRankingUtils.js';

// File paths
const SCHOOLS_DATA_FILE = 'public/data/schools.json';
const SUBURB_STATS_INPUT = 'public/data/sales/suburb_stats.json';
const OUTPUT_ALL_SCHOOLS = 'public/data/schools/schools_ranked.json';
const OUTPUT_PRIMARY = 'public/data/schools/primary_schools_ranked.json';
const OUTPUT_SECONDARY = 'public/data/schools/secondary_schools_ranked.json';
const OUTPUT_TOP_SCHOOLS = 'public/data/schools/top_schools.json';

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
  
  console.log(`✓ Loaded property data for ${priceBySuburb.size} suburbs and ${priceByPostcode.size} postcodes`);
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
 * Main ranking update function
 */
async function updateSchoolRankings() {
  try {
    console.log('School Rankings Update with Academic Performance');
    console.log('===============================================\n');
    
    // Load schools data
    console.log('Loading schools data...');
    const schools = JSON.parse(readFileSync(SCHOOLS_DATA_FILE, 'utf8'));
    console.log(`✓ Loaded ${schools.length} schools`);
    
    // Load property price data
    const priceData = loadSuburbPriceData();
    
    // Add property price data to schools
    console.log('Adding property price data to schools...');
    const schoolsWithPrices = schools.map(school => addPropertyPriceData(school, priceData));
    console.log(`✓ Added property data to schools\n`);
    
    // Calculate rankings for all schools
    console.log('Calculating rankings for all schools...');
    const allRanked = calculateSchoolRankings(schoolsWithPrices, {
      sortBy: 'percentage_score'
    });
    console.log(`✓ Ranked ${allRanked.length} schools`);
    
    // Calculate primary school rankings
    console.log('Calculating primary school rankings...');
    const primaryRanked = calculateSchoolRankings(schoolsWithPrices, {
      filterByLevel: 'primary',
      sortBy: 'percentage_score'
    });
    console.log(`✓ Ranked ${primaryRanked.length} primary schools`);
    
    // Calculate secondary school rankings
    console.log('Calculating secondary school rankings...');
    const secondaryRanked = calculateSchoolRankings(schoolsWithPrices, {
      filterByLevel: 'secondary',
      sortBy: 'percentage_score'
    });
    console.log(`✓ Ranked ${secondaryRanked.length} secondary schools`);
    
    // Get top schools with proper structure for DataExplorer
    const topSchools = {
      top_overall: allRanked.slice(0, 20).map((school, index) => ({
        school_code: school.School_code,
        rank: index + 1,
        name: school.School_name,
        level: school.Level_of_schooling,
        suburb: school.Town_suburb,
        score: Math.round(school.ranking.percentage_score * 100) / 100,
        icsea: school.ICSEA_value,
        selective: school.Selective_school,
        opportunity_class: school.Opportunity_class,
        naplan_ranking: school.academicPerformance?.naplan?.ranking || null,
        hsc_ranking: school.academicPerformance?.hsc?.ranking || null,
        academic_score: school.academicPerformance?.naplan?.score || school.academicPerformance?.hsc?.score || null,
        teacherStudentRatio: school.teacherStudentRatio || null,
        studentsEnglish: school.demographics?.studentsEnglish || null,
        studentsNonEnglish: school.demographics?.studentsNonEnglish || null,
        propertyPrices: school.propertyPrices || null
      })),
      top_primary: primaryRanked.slice(0, 20).map((school, index) => ({
        school_code: school.School_code,
        rank: index + 1,
        name: school.School_name,
        suburb: school.Town_suburb,
        score: Math.round(school.ranking.percentage_score * 100) / 100,
        icsea: school.ICSEA_value,
        opportunity_class: school.Opportunity_class,
        naplan_ranking: school.academicPerformance?.naplan?.ranking || null,
        naplan_score: school.academicPerformance?.naplan?.score || null,
        teacherStudentRatio: school.teacherStudentRatio || null,
        studentsEnglish: school.demographics?.studentsEnglish || null,
        studentsNonEnglish: school.demographics?.studentsNonEnglish || null,
        propertyPrices: school.propertyPrices || null
      })),
      top_secondary: secondaryRanked.slice(0, 20).map((school, index) => ({
        school_code: school.School_code,
        rank: index + 1,
        name: school.School_name,
        suburb: school.Town_suburb,
        score: Math.round(school.ranking.percentage_score * 100) / 100,
        icsea: school.ICSEA_value,
        selective: school.Selective_school,
        hsc_ranking: school.academicPerformance?.hsc?.ranking || null,
        hsc_score: school.academicPerformance?.hsc?.score || null,
        teacherStudentRatio: school.teacherStudentRatio || null,
        studentsEnglish: school.demographics?.studentsEnglish || null,
        studentsNonEnglish: school.demographics?.studentsNonEnglish || null,
        propertyPrices: school.propertyPrices || null
      }))
    };
    
    // Count schools with academic data
    const schoolsWithAcademic = schoolsWithPrices.filter(school => 
      school.academicPerformance && 
      (school.academicPerformance.naplan || school.academicPerformance.hsc)
    ).length;
    
    // Save rankings
    console.log('\nSaving ranking results...');
    writeFileSync(OUTPUT_ALL_SCHOOLS, JSON.stringify(allRanked, null, 2));
    writeFileSync(OUTPUT_PRIMARY, JSON.stringify(primaryRanked, null, 2));
    writeFileSync(OUTPUT_SECONDARY, JSON.stringify(secondaryRanked, null, 2));
    writeFileSync(OUTPUT_TOP_SCHOOLS, JSON.stringify(topSchools, null, 2));
    
    console.log(`✓ All schools ranking saved to ${OUTPUT_ALL_SCHOOLS}`);
    console.log(`✓ Primary schools ranking saved to ${OUTPUT_PRIMARY}`);
    console.log(`✓ Secondary schools ranking saved to ${OUTPUT_SECONDARY}`);
    console.log(`✓ Top schools saved to ${OUTPUT_TOP_SCHOOLS}`);
    
    // Display summary
    console.log('\n=== RANKING SUMMARY ===');
    console.log(`Total schools ranked: ${allRanked.length}`);
    console.log(`Schools with academic data: ${schoolsWithAcademic}`);
    console.log(`Primary schools: ${primaryRanked.length}`);
    console.log(`Secondary schools: ${secondaryRanked.length}`);
    
    // Show top 10 schools with their academic performance
    console.log('\n=== TOP 10 SCHOOLS (Enhanced with Academic Performance) ===');
    topSchools.top_overall.slice(0, 10).forEach((school, index) => {
      const naplan = school.naplan_ranking ? `NAPLAN:#${school.naplan_ranking}` : '';
      const hsc = school.hsc_ranking ? `HSC:#${school.hsc_ranking}` : '';
      const academicInfo = [naplan, hsc].filter(Boolean).join(', ');
      const priceInfo = school.propertyPrices ? `Avg:$${Math.round(school.propertyPrices.avgPrice/1000)}k` : '';
      
      console.log(`${index + 1}. ${school.name}`);
      console.log(`   Location: ${school.suburb}`);
      console.log(`   Overall Score: ${school.score}%`);
      if (academicInfo) console.log(`   Academic: ${academicInfo}`);
      if (priceInfo) console.log(`   Property: ${priceInfo}`);
      console.log('');
    });
    
    // Show breakdown by academic performance availability
    const primaryWithNAPLAN = primaryRanked.filter(s => s.academicPerformance?.naplan).length;
    const secondaryWithHSC = secondaryRanked.filter(s => s.academicPerformance?.hsc).length;
    
    console.log('=== ACADEMIC DATA COVERAGE ===');
    console.log(`Primary schools with NAPLAN data: ${primaryWithNAPLAN}/${primaryRanked.length}`);
    console.log(`Secondary schools with HSC data: ${secondaryWithHSC}/${secondaryRanked.length}`);
    
    console.log('\n✅ School rankings updated successfully with academic performance data!');
    
  } catch (error) {
    console.error('Error updating school rankings:', error);
    process.exit(1);
  }
}

// Run the ranking update
updateSchoolRankings();