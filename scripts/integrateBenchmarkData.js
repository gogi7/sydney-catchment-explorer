#!/usr/bin/env node
/**
 * Integrate NAPLAN and HSC Ranking Data with School Database
 *
 * This script:
 * 1. Loads existing school data from the database
 * 2. Loads NAPLAN/HSC ranking data
 * 3. Matches schools by name (fuzzy matching for better accuracy)
 * 4. Updates school records with academic performance data
 * 5. Updates the ranking weights to include academic performance
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// File paths
const SCHOOLS_DATA_FILE = 'public/data/schools.json';
const NAPLAN_DATA_FILE = 'public/data/rankings/naplan_rankings_2025.json';
const HSC_DATA_FILE = 'public/data/rankings/hsc_rankings_2025.json';
const COMBINED_DATA_FILE = 'public/data/rankings/academic_rankings_2025.json';

/**
 * Simple fuzzy string matching for school names
 */
function fuzzyMatch(str1, str2, threshold = 0.8) {
  if (!str1 || !str2) return false;
  
  // Normalize strings
  const normalize = (s) => s.toLowerCase()
    .replace(/\b(public|high|school|primary|secondary|college)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  if (norm1 === norm2) return true;
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Simple Levenshtein distance
  const levenshtein = (a, b) => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }
    
    return matrix[b.length][a.length];
  };
  
  const distance = levenshtein(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity >= threshold;
}

/**
 * Match academic ranking data to schools
 */
function matchAcademicData(schools, naplanData, hscData) {
  const matches = [];
  const unmatchedAcademic = [];
  
  console.log(`Matching ${schools.length} schools with ${naplanData.length} NAPLAN + ${hscData.length} HSC records...`);
  
  // Combine academic data
  const allAcademicData = [...naplanData, ...hscData];
  
  for (const academic of allAcademicData) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const school of schools) {
      const schoolName = school.School_name || school.name;
      const schoolSuburb = school.Town_suburb || school.suburb;
      
      if (fuzzyMatch(schoolName, academic.schoolName, 0.6)) {
        // Also check suburb match for better accuracy
        const suburbMatch = schoolSuburb && fuzzyMatch(schoolSuburb, academic.suburb, 0.7);
        const score = suburbMatch ? 1.0 : 0.8;
        
        if (score > bestScore) {
          bestMatch = school;
          bestScore = score;
        }
      }
    }
    
    if (bestMatch) {
      matches.push({
        school: bestMatch,
        academic: academic,
        matchScore: bestScore
      });
      console.log(`✓ Matched: ${academic.schoolName} → ${bestMatch.School_name || bestMatch.name} (${academic.suburb}) [${bestScore.toFixed(2)}]`);
    } else {
      unmatchedAcademic.push(academic);
      console.log(`✗ No match: ${academic.schoolName} (${academic.suburb})`);
    }
  }
  
  console.log(`\nMatching Summary:`);
  console.log(`- Matched: ${matches.length}/${allAcademicData.length} academic records`);
  console.log(`- Unmatched academic: ${unmatchedAcademic.length}`);
  
  return { matches, unmatchedAcademic };
}

/**
 * Update school ranking weights to include academic performance
 */
function updateRankingWeights(school, academicData) {
  const weights = { ...school.rankingFactors };
  
  // Add academic performance weights
  if (academicData.naplanRanking) {
    // NAPLAN ranking: Higher weight for better ranking (lower number = better)
    // Convert ranking to score (1-100 scale, where 1st place = 100 points)
    const naplanScore = Math.max(1, 101 - academicData.naplanRanking);
    weights.naplanPerformance = naplanScore;
    weights.teacherStudentRatio = academicData.teacherStudentRatio || 0;
    weights.studentDiversity = (academicData.studentsNonEnglish || 0) + (academicData.studentsIndigenous || 0);
  }
  
  if (academicData.hscRanking) {
    // HSC ranking: Similar scoring system
    const hscScore = Math.max(1, 101 - academicData.hscRanking);
    weights.hscPerformance = hscScore;
    weights.teacherStudentRatio = academicData.teacherStudentRatio || 0;
    weights.studentDiversity = (academicData.studentsNonEnglish || 0) + (academicData.studentsIndigenous || 0);
  }
  
  return weights;
}

/**
 * Calculate new overall ranking score including academic data
 */
function calculateEnhancedRanking(school) {
  const weights = school.rankingFactors;
  
  // Enhanced scoring system with academic performance
  const factors = {
    // Existing factors (reduced weights to make room for academic)
    socioeconomic: (weights.socioeconomicDecile || 5) * 8,          // Max 80 points
    facilities: (weights.facilities || 5) * 6,                      // Max 60 points
    reputation: (weights.reputation || 5) * 4,                      // Max 40 points
    
    // Academic performance (high weights)
    naplan: (weights.naplanPerformance || 0) * 15,                  // Max 1500 points
    hsc: (weights.hscPerformance || 0) * 15,                        // Max 1500 points
    
    // Teacher quality and ratios
    teacherRatio: Math.max(0, 100 - (weights.teacherStudentRatio || 20)) * 3, // Max 300 points
    
    // Diversity bonus (small positive factor)
    diversity: Math.min(20, (weights.studentDiversity || 0)) * 1    // Max 20 points
  };
  
  const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
  
  return {
    overallScore: Math.round(totalScore),
    factorBreakdown: factors
  };
}

/**
 * Main integration function
 */
async function main() {
  try {
    console.log('School Academic Performance Integration');
    console.log('=====================================\n');
    
    // Load data files
    console.log('Loading data files...');
    
    if (!existsSync(SCHOOLS_DATA_FILE)) {
      throw new Error(`Schools data file not found: ${SCHOOLS_DATA_FILE}`);
    }
    
    const schools = JSON.parse(readFileSync(SCHOOLS_DATA_FILE, 'utf8'));
    const naplanData = existsSync(NAPLAN_DATA_FILE) ? JSON.parse(readFileSync(NAPLAN_DATA_FILE, 'utf8')) : [];
    const hscData = existsSync(HSC_DATA_FILE) ? JSON.parse(readFileSync(HSC_DATA_FILE, 'utf8')) : [];
    
    console.log(`✓ Loaded ${schools.length} schools`);
    console.log(`✓ Loaded ${naplanData.length} NAPLAN rankings`);
    console.log(`✓ Loaded ${hscData.length} HSC rankings\n`);
    
    // Match academic data to schools
    const { matches, unmatchedAcademic } = matchAcademicData(schools, naplanData, hscData);
    
    // Update schools with academic data
    let updatedCount = 0;
    for (const match of matches) {
      const school = match.school;
      const academic = match.academic;
      
      // Add academic performance data to school
      school.academicPerformance = {
        ...school.academicPerformance,
        dataSource: academic.dataSource,
        lastUpdated: new Date().toISOString(),
        matchConfidence: match.matchScore
      };
      
      if (academic.naplanRanking) {
        school.academicPerformance.naplan = {
          ranking: academic.naplanRanking,
          score: academic.naplanScore,
          year: 2025
        };
      }
      
      if (academic.hscRanking) {
        school.academicPerformance.hsc = {
          ranking: academic.hscRanking,
          score: academic.hscScore,
          year: 2025
        };
      }
      
      // Update teacher and student data
      if (academic.teacherStudentRatio) {
        school.teacherStudentRatio = academic.teacherStudentRatio;
      }
      
      if (academic.studentsEnglish !== null) {
        school.demographics = {
          ...school.demographics,
          studentsEnglish: academic.studentsEnglish,
          studentsNonEnglish: academic.studentsNonEnglish || 0,
          studentsIndigenous: academic.studentsIndigenous || 0
        };
      }
      
      // Update ranking factors with academic data
      school.rankingFactors = updateRankingWeights(school, academic);
      
      // Calculate new overall ranking
      const newRanking = calculateEnhancedRanking(school);
      school.overallScore = newRanking.overallScore;
      school.factorBreakdown = newRanking.factorBreakdown;
      
      updatedCount++;
    }
    
    // Sort schools by new overall score
    schools.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    
    // Update ranks based on new sorting
    schools.forEach((school, index) => {
      school.rank = index + 1;
    });
    
    // Save updated schools data
    writeFileSync(SCHOOLS_DATA_FILE, JSON.stringify(schools, null, 2));
    console.log(`\n✓ Updated ${updatedCount} schools with academic performance data`);
    console.log(`✓ Saved updated schools data to ${SCHOOLS_DATA_FILE}`);
    
    // Generate summary report
    const topSchools = schools.slice(0, 10);
    console.log(`\nTop 10 Schools (Enhanced Ranking):`);
    console.log('==================================');
    topSchools.forEach((school, i) => {
      const academic = school.academicPerformance;
      const naplan = academic?.naplan ? `NAPLAN:#${academic.naplan.ranking}` : '';
      const hsc = academic?.hsc ? `HSC:#${academic.hsc.ranking}` : '';
      const academicInfo = [naplan, hsc].filter(Boolean).join(', ');
      
      console.log(`${i + 1}. ${school.School_name || school.name} (${school.Town_suburb || school.suburb}) - Score: ${school.overallScore}`);
      if (academicInfo) console.log(`   Academic: ${academicInfo}`);
    });
    
    console.log(`\n✅ Integration completed successfully!`);
    console.log(`   - ${updatedCount}/${schools.length} schools updated with academic data`);
    console.log(`   - ${unmatchedAcademic.length} academic records could not be matched`);
    
  } catch (error) {
    console.error('Error during integration:', error);
    process.exit(1);
  }
}

// Run the script
main();