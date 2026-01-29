/**
 * School Ranking Utility
 * Implements the two-tier weighting system defined in SCHOOL_RANKING_WEIGHTS.md
 */

/**
 * Calculate ICSEA secondary weight based on value
 * @param {number|null} icsea - ICSEA value
 * @returns {number} Secondary weight (0-10)
 */
function getICSEAWeight(icsea) {
  if (!icsea || icsea === null || icsea === 'null' || icsea === 'np') return 0;
  const value = parseInt(icsea);
  if (isNaN(value)) return 0;
  
  // Formula: Secondary Weight = Math.min(10, Math.max(1, Math.round((ICSEA - 800) / 50)))
  return Math.min(10, Math.max(1, Math.round((value - 800) / 50)));
}

/**
 * Calculate Selective School secondary weight
 * @param {string} selective - Selective school value
 * @returns {number} Secondary weight (0-10)
 */
function getSelectiveWeight(selective) {
  if (!selective) return 0;
  const value = String(selective).toLowerCase();
  
  if (value.includes('fully')) return 10;
  if (value.includes('partial')) return 7;
  if (value.includes('not')) return 3;
  return 0;
}

/**
 * Calculate FOEI secondary weight (INVERTED - lower FOEI = higher advantage)
 * @param {string|number} foei - FOEI value
 * @returns {number} Secondary weight (0-10)
 */
function getFOEIWeight(foei) {
  if (!foei || foei === null || foei === 'null' || foei === 'np') return 0;
  const value = parseInt(foei);
  if (isNaN(value)) return 0;
  
  // Formula: Secondary Weight = Math.max(1, Math.min(10, 10 - Math.floor(FOEI / 20)))
  return Math.max(1, Math.min(10, 10 - Math.floor(value / 20)));
}

/**
 * Calculate Opportunity Class secondary weight
 * @param {string} opportunityClass - Y/N value
 * @returns {number} Secondary weight (0-10)
 */
function getOpportunityClassWeight(opportunityClass) {
  if (!opportunityClass) return 0;
  const value = String(opportunityClass).toUpperCase();
  
  if (value === 'Y') return 10;
  if (value === 'N') return 3;
  return 0;
}

/**
 * Calculate School Specialty Type secondary weight
 * @param {string} specialtyType - School specialty type
 * @returns {number} Secondary weight (3-8)
 */
function getSpecialtyTypeWeight(specialtyType) {
  if (!specialtyType) return 3;
  const value = String(specialtyType).toLowerCase();
  
  if (value.includes('technology')) return 8;
  if (value.includes('language')) return 8;
  if (value.includes('creative') || value.includes('performing') || value.includes('arts')) return 8;
  if (value.includes('sports')) return 7;
  if (value.includes('comprehensive')) return 5;
  return 3;
}

/**
 * Calculate Enrolment secondary weight based on school type and size
 * @param {number} enrolment - FTE enrolment
 * @param {string} schoolLevel - Level of schooling
 * @returns {number} Secondary weight (0-9)
 */
function getEnrolmentWeight(enrolment, schoolLevel) {
  if (!enrolment || enrolment === null) return 0;
  const value = parseInt(enrolment);
  if (isNaN(value)) return 0;
  
  const level = String(schoolLevel || '').toLowerCase();
  const isPrimary = level.includes('primary') || level.includes('infants') || level.includes('k-6');
  const isSecondary = level.includes('secondary') || level.includes('high') || level.includes('7-12');
  
  if (isPrimary) {
    // Primary school thresholds
    if (value >= 800) return 9;
    if (value >= 600) return 8;
    if (value >= 400) return 7;
    if (value >= 250) return 6;
    if (value >= 150) return 5;
    if (value >= 80) return 4;
    return 3;
  } else if (isSecondary) {
    // Secondary school thresholds
    if (value >= 1500) return 9;
    if (value >= 1200) return 8;
    if (value >= 900) return 7;
    if (value >= 600) return 6;
    if (value >= 400) return 5;
    if (value >= 200) return 4;
    return 3;
  } else {
    // Default/mixed school thresholds (use primary as base)
    if (value >= 800) return 9;
    if (value >= 600) return 8;
    if (value >= 400) return 7;
    if (value >= 250) return 6;
    if (value >= 150) return 5;
    if (value >= 80) return 4;
    return 3;
  }
}

/**
 * Calculate ASGS Remoteness secondary weight
 * @param {string} remoteness - ASGS remoteness classification
 * @returns {number} Secondary weight (0-8)
 */
function getRemoteness(remoteness) {
  if (!remoteness) return 0;
  const value = String(remoteness).toLowerCase();
  
  if (value.includes('major cities')) return 8;
  if (value.includes('inner regional')) return 6;
  if (value.includes('outer regional')) return 5;
  if (value.includes('remote') && !value.includes('very')) return 4;
  if (value.includes('very remote')) return 3;
  return 0;
}

/**
 * Calculate LBOTE percentage secondary weight
 * @param {string|number} lbote - LBOTE percentage or "np"
 * @returns {number} Secondary weight (3-7)
 */
function getLBOTEWeight(lbote) {
  if (!lbote || lbote === 'np' || lbote === 'null') return 3;
  const value = parseInt(lbote);
  if (isNaN(value)) return 3;
  
  // Balanced diversity approach
  if (value >= 40 && value <= 60) return 7;
  if ((value >= 20 && value <= 39) || (value >= 61 && value <= 80)) return 6;
  if ((value >= 10 && value <= 19) || (value >= 81 && value <= 100)) return 5;
  if (value >= 0 && value <= 9) return 4;
  return 3;
}

/**
 * Calculate Indigenous percentage secondary weight (neutral)
 * @param {string|number} indigenous - Indigenous percentage or "np"
 * @returns {number} Secondary weight (always 5 for valid data, 0 for unknown)
 */
function getIndigenousWeight(indigenous) {
  if (!indigenous || indigenous === 'null') return 0;
  return 5; // Neutral demographic indicator
}

/**
 * Calculate Yes/No field weight (generic for preschool, IEC, etc.)
 * @param {string} value - Y/N value
 * @param {number} yesWeight - Weight for "Y"
 * @param {number} noWeight - Weight for "N"
 * @returns {number} Secondary weight
 */
function getYesNoWeight(value, yesWeight = 7, noWeight = 4) {
  if (!value) return 0;
  const val = String(value).toUpperCase();
  
  if (val === 'Y') return yesWeight;
  if (val === 'N') return noWeight;
  return 0;
}

/**
 * Calculate Distance Education secondary weight
 * @param {string} distanceEd - Distance education value (S/C/N)
 * @returns {number} Secondary weight (0-7)
 */
function getDistanceEducationWeight(distanceEd) {
  if (!distanceEd) return 0;
  const value = String(distanceEd).toUpperCase();
  
  if (value === 'S') return 7; // Dedicated distance education school
  if (value === 'C') return 6; // Has distance education centre
  if (value === 'N') return 5; // No distance education (standard)
  return 0;
}

/**
 * Calculate NAPLAN Performance secondary weight
 * @param {Object} naplanData - NAPLAN academic performance data
 * @returns {number} Secondary weight (0-10)
 */
function getNAPLANWeight(naplanData) {
  if (!naplanData || !naplanData.ranking) return 0;
  
  const ranking = naplanData.ranking;
  // Convert ranking to score (top 10 get max weight, scale down from there)
  if (ranking <= 10) return 10;
  if (ranking <= 25) return 9;
  if (ranking <= 50) return 8;
  if (ranking <= 75) return 7;
  if (ranking <= 100) return 6;
  if (ranking <= 150) return 5;
  if (ranking <= 200) return 4;
  return 3; // Bottom tier
}

/**
 * Calculate HSC Performance secondary weight
 * @param {Object} hscData - HSC academic performance data
 * @returns {number} Secondary weight (0-10)
 */
function getHSCWeight(hscData) {
  if (!hscData || !hscData.ranking) return 0;
  
  const ranking = hscData.ranking;
  // Convert ranking to score (top 10 get max weight, scale down from there)
  if (ranking <= 5) return 10;
  if (ranking <= 15) return 9;
  if (ranking <= 30) return 8;
  if (ranking <= 50) return 7;
  if (ranking <= 75) return 6;
  if (ranking <= 100) return 5;
  if (ranking <= 150) return 4;
  return 3; // Bottom tier
}

/**
 * Calculate Teacher-Student Ratio secondary weight
 * @param {number} ratio - Teacher to student ratio percentage
 * @returns {number} Secondary weight (0-8)
 */
function getTeacherStudentRatioWeight(ratio) {
  if (!ratio || ratio <= 0) return 0;
  
  // Better ratios (lower numbers) get higher weights
  if (ratio <= 5) return 8;   // Excellent ratio
  if (ratio <= 10) return 7;  // Very good ratio
  if (ratio <= 15) return 6;  // Good ratio
  if (ratio <= 20) return 5;  // Average ratio
  if (ratio <= 30) return 4;  // Below average
  if (ratio <= 50) return 3;  // Poor ratio
  return 2; // Very poor ratio
}

/**
 * Calculate Student Diversity secondary weight (non-English speaking background)
 * @param {Object} demographics - Student demographic data
 * @returns {number} Secondary weight (0-6)
 */
function getStudentDiversityWeight(demographics) {
  if (!demographics) return 0;
  
  const nonEnglish = demographics.studentsNonEnglish || 0;
  const indigenous = demographics.studentsIndigenous || 0;
  const totalDiversity = nonEnglish + indigenous;
  
  // Balanced diversity gets highest score
  if (totalDiversity >= 10 && totalDiversity <= 30) return 6;
  if (totalDiversity >= 5 && totalDiversity < 10) return 5;
  if (totalDiversity >= 30 && totalDiversity <= 50) return 5;
  if (totalDiversity > 50) return 4;
  if (totalDiversity > 0) return 3;
  return 2; // No diversity data or very homogeneous
}

/**
 * Calculate school ranking score based on all weighted criteria
 * @param {Object} school - School data object
 * @returns {Object} Ranking result with score, breakdown, and metadata
 */
function calculateSchoolRankingScore(school) {
  const schoolLevel = school.Level_of_schooling || '';
  const isPrimary = schoolLevel.toLowerCase().includes('primary') || 
                   schoolLevel.toLowerCase().includes('infants') || 
                   schoolLevel.toLowerCase().includes('k-6');
  const isSecondary = schoolLevel.toLowerCase().includes('secondary') || 
                     schoolLevel.toLowerCase().includes('high') || 
                     schoolLevel.toLowerCase().includes('7-12');

  // Extract academic performance data
  const academicPerformance = school.academicPerformance || {};
  const naplanData = academicPerformance.naplan;
  const hscData = academicPerformance.hsc;
  const teacherRatio = school.teacherStudentRatio;
  const demographics = school.demographics;

  // Define weights based on documentation (updated with academic performance)
  const weights = {
    // Academic Performance (High Priority)
    NAPLAN_performance: { 
      primary: isPrimary ? 15 : 0, // Only for primary schools
      secondary: getNAPLANWeight(naplanData) 
    },
    HSC_performance: { 
      primary: isSecondary ? 15 : 0, // Only for secondary schools
      secondary: getHSCWeight(hscData) 
    },
    
    // Existing high-priority weights (adjusted)
    ICSEA_value: { primary: 10, secondary: getICSEAWeight(school.ICSEA_value) },
    Selective_school: { 
      primary: isSecondary ? 9 : 0, // Only relevant for secondary schools
      secondary: getSelectiveWeight(school.Selective_school) 
    },
    FOEI_Value: { primary: 8, secondary: getFOEIWeight(school.FOEI_Value) },
    
    // Teacher quality and school environment
    Teacher_student_ratio: { primary: 7, secondary: getTeacherStudentRatioWeight(teacherRatio) },
    Opportunity_class: { 
      primary: isPrimary ? 7 : 0, // Only relevant for primary schools
      secondary: getOpportunityClassWeight(school.Opportunity_class) 
    },
    
    // School characteristics
    School_specialty_type: { primary: 6, secondary: getSpecialtyTypeWeight(school.School_specialty_type) },
    Student_diversity: { primary: 5, secondary: getStudentDiversityWeight(demographics) },
    latest_year_enrolment_FTE: { primary: 0, secondary: getEnrolmentWeight(school.latest_year_enrolment_FTE, schoolLevel) },
    ASGS_remoteness: { primary: 4, secondary: getRemoteness(school.ASGS_remoteness) },
    
    // Demographic factors (lower priority)
    LBOTE_pct: { primary: 3, secondary: getLBOTEWeight(school.LBOTE_pct) },
    Indigenous_pct: { primary: 2, secondary: getIndigenousWeight(school.Indigenous_pct) },
    Preschool_ind: { 
      primary: isPrimary ? 2 : 0, // Only relevant for primary schools
      secondary: getYesNoWeight(school.Preschool_ind, 7, 4) 
    },
    Intensive_english_centre: { primary: 2, secondary: getYesNoWeight(school.Intensive_english_centre, 7, 5) },
    Distance_education: { primary: 1, secondary: getDistanceEducationWeight(school.Distance_education) }
  };

  // Calculate scores
  let totalScore = 0;
  let maxPossibleScore = 0;
  const breakdown = {};

  Object.entries(weights).forEach(([field, weight]) => {
    const score = weight.primary * weight.secondary;
    const maxScore = weight.primary * 10; // Maximum possible for this field
    
    totalScore += score;
    maxPossibleScore += weight.primary > 0 ? maxScore : 0; // Only count applicable fields
    
    breakdown[field] = {
      rawValue: school[field],
      primaryWeight: weight.primary,
      secondaryWeight: weight.secondary,
      score: score,
      maxPossible: maxScore,
      applicable: weight.primary > 0
    };
  });

  // Calculate percentage score
  const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore * 100) : 0;

  return {
    school_code: school.School_code,
    school_name: school.School_name,
    school_level: schoolLevel,
    total_score: totalScore,
    max_possible_score: maxPossibleScore,
    percentage_score: Math.round(percentageScore * 100) / 100, // Round to 2 decimal places
    breakdown: breakdown,
    metadata: {
      is_primary: isPrimary,
      is_secondary: isSecondary,
      calculated_at: new Date().toISOString(),
      applicable_fields: Object.keys(breakdown).filter(k => breakdown[k].applicable).length,
      total_fields: Object.keys(breakdown).length
    }
  };
}

/**
 * Calculate rankings for an array of schools
 * @param {Array} schools - Array of school objects
 * @param {Object} options - Options for ranking calculation
 * @returns {Array} Ranked schools with scores
 */
function calculateSchoolRankings(schools, options = {}) {
  const { 
    filterByLevel = null, // 'primary', 'secondary', or null for all
    sortBy = 'percentage_score', // 'percentage_score' or 'total_score'
    limit = null 
  } = options;

  // Filter schools if specified
  let filteredSchools = schools;
  if (filterByLevel) {
    filteredSchools = schools.filter(school => {
      const level = (school.Level_of_schooling || '').toLowerCase();
      if (filterByLevel === 'primary') {
        return level.includes('primary') || level.includes('infants');
      } else if (filterByLevel === 'secondary') {
        return level.includes('secondary') || level.includes('high');
      }
      return true;
    });
  }

  // Calculate ranking scores
  const rankedSchools = filteredSchools.map(school => {
    const ranking = calculateSchoolRankingScore(school);
    return {
      ...school,
      ranking: ranking
    };
  });

  // Sort by score
  rankedSchools.sort((a, b) => b.ranking[sortBy] - a.ranking[sortBy]);

  // Add rank position
  rankedSchools.forEach((school, index) => {
    school.ranking.rank = index + 1;
  });

  // Apply limit if specified
  return limit ? rankedSchools.slice(0, limit) : rankedSchools;
}

export {
  calculateSchoolRankingScore,
  calculateSchoolRankings,
  getICSEAWeight,
  getSelectiveWeight,
  getFOEIWeight,
  getOpportunityClassWeight,
  getSpecialtyTypeWeight,
  getEnrolmentWeight,
  getRemoteness,
  getLBOTEWeight,
  getIndigenousWeight,
  getYesNoWeight,
  getDistanceEducationWeight,
  getNAPLANWeight,
  getHSCWeight,
  getTeacherStudentRatioWeight,
  getStudentDiversityWeight
};