#!/usr/bin/env node
/**
 * Process NAPLAN and HSC Ranking Data from Excel Files
 * 
 * This script:
 * 1. Reads the Excel files with NAPLAN (primary) and HSC (secondary) ranking data
 * 2. Cleans up the formatting issues (removes image descriptions, adds proper ranks)
 * 3. Converts percentages to proper numeric format
 * 4. Creates clean JSON files for integration with the school database
 */

import XLSX from 'xlsx';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const NAPLAN_FILE = 'C:\\Tools PHPC\\realestate_schools_data\\myschoolrankingnaplan2025primary.xlsx';
const HSC_FILE = 'C:\\Tools PHPC\\realestate_schools_data\\myschoolrankinghscsecondary2025.xlsx';
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data', 'rankings');

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
 * Clean school name by removing common prefixes/suffixes
 */
function cleanSchoolName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .replace(/^Image Description\s*/i, '')
    .replace(/\s*Image Description\s*/i, '')
    .replace(/\s*\.\.\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean suburb name and extract state
 */
function cleanSuburbName(suburb) {
  if (!suburb || typeof suburb !== 'string') return { suburb: '', state: '' };
  
  const parts = suburb.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    return {
      suburb: parts[0],
      state: parts[1]
    };
  }
  
  return { suburb: parts[0] || '', state: '' };
}

/**
 * Convert percentage string to numeric percentage
 */
function parsePercentage(value) {
  if (!value) return null;
  
  // Handle string percentages like "7.14%", "95%"
  if (typeof value === 'string') {
    const match = value.match(/([\d.]+)%?/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  // Handle numeric values
  if (typeof value === 'number') {
    // If it's already in decimal form (0.0714), convert to percentage
    if (value < 1) {
      return value * 100;
    }
    return value;
  }
  
  return null;
}

/**
 * Process NAPLAN primary rankings
 */
function processNAPLANData() {
  console.log('Processing NAPLAN primary rankings...');
  
  if (!existsSync(NAPLAN_FILE)) {
    console.error(`NAPLAN file not found: ${NAPLAN_FILE}`);
    return [];
  }
  
  const workbook = XLSX.readFile(NAPLAN_FILE);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Raw NAPLAN data rows: ${rawData.length}`);
  
  const schools = [];
  let rank = 1;
  
  // Pattern: Image Description -> School Name -> Data Row (suburb + stats)
  for (let i = 1; i < rawData.length - 1; i++) {
    const currentRow = rawData[i];
    const nextRow = rawData[i + 1];
    
    // Look for school name row followed by data row
    if (currentRow && currentRow.length >= 1 && 
        typeof currentRow[0] === 'string' &&
        !currentRow[0].toLowerCase().includes('image description') &&
        currentRow[0].length > 5 &&
        nextRow && nextRow.length >= 4 &&
        typeof nextRow[2] === 'number') {
      
      const schoolName = cleanSchoolName(currentRow[0]);
      const suburbData = cleanSuburbName(nextRow[0]);
      
      if (!schoolName || schoolName.length < 3) continue;
      
      const school = {
        rank: rank++,
        schoolName: schoolName,
        suburb: suburbData.suburb,
        state: suburbData.state || 'NSW',
        naplanRanking: rank, // Position-based ranking (1, 2, 3...)
        naplanScore: parsePercentage(nextRow[2] * 100), // The actual percentage score
        teacherStudentRatio: parsePercentage(nextRow[3] * 100), // Convert decimal to percentage
        studentsEnglish: parsePercentage(nextRow[4] * 100), // Convert decimal to percentage
        studentsNonEnglish: parsePercentage(nextRow[5] * 100), // Convert decimal to percentage
        studentsIndigenous: parsePercentage(nextRow[6] * 100) || 0,
        dataSource: 'NAPLAN 2025',
        schoolLevel: 'Primary'
      };
      
      schools.push(school);
      
      // Log first few for debugging
      if (rank <= 6) {
        console.log(`NAPLAN #${school.naplanRanking}: ${school.schoolName} (${school.suburb}) - Score: ${school.naplanScore}%, T/S: ${school.teacherStudentRatio}%`);
      }
      
      // Skip the next row since we processed it
      i++;
    }
  }
  
  console.log(`Processed ${schools.length} NAPLAN primary schools`);
  return schools;
}

/**
 * Process HSC secondary rankings
 */
function processHSCData() {
  console.log('Processing HSC secondary rankings...');
  
  if (!existsSync(HSC_FILE)) {
    console.error(`HSC file not found: ${HSC_FILE}`);
    return [];
  }
  
  const workbook = XLSX.readFile(HSC_FILE);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Raw HSC data rows: ${rawData.length}`);
  
  const schools = [];
  let rank = 1;
  
  // Pattern: Image Description -> School Name -> Data Row (suburb + stats)
  for (let i = 1; i < rawData.length - 1; i++) {
    const currentRow = rawData[i];
    const nextRow = rawData[i + 1];
    
    // Look for school name row followed by data row
    if (currentRow && currentRow.length >= 1 && 
        typeof currentRow[0] === 'string' &&
        !currentRow[0].toLowerCase().includes('image description') &&
        currentRow[0].length > 5 &&
        nextRow && nextRow.length >= 4 &&
        typeof nextRow[2] === 'number') {
      
      const schoolName = cleanSchoolName(currentRow[0]);
      const suburbData = cleanSuburbName(nextRow[0]);
      
      if (!schoolName || schoolName.length < 3) continue;
      
      const school = {
        rank: rank++,
        schoolName: schoolName,
        suburb: suburbData.suburb,
        state: suburbData.state || 'NSW',
        hscRanking: rank, // Position-based ranking (1, 2, 3...)
        hscScore: parsePercentage(nextRow[2] * 100), // The actual percentage score
        teacherStudentRatio: parsePercentage(nextRow[3] * 100), // Convert decimal to percentage
        studentsEnglish: parsePercentage(nextRow[4] * 100), // Convert decimal to percentage
        studentsNonEnglish: parsePercentage(nextRow[5] * 100), // Convert decimal to percentage
        studentsIndigenous: parsePercentage(nextRow[6] * 100) || 0,
        dataSource: 'HSC 2025',
        schoolLevel: 'Secondary'
      };
      
      schools.push(school);
      
      // Log first few for debugging
      if (rank <= 6) {
        console.log(`HSC #${school.hscRanking}: ${school.schoolName} (${school.suburb}) - Score: ${school.hscScore}%, T/S: ${school.teacherStudentRatio}%`);
      }
      
      // Skip the next row since we processed it
      i++;
    }
  }
  
  console.log(`Processed ${schools.length} HSC secondary schools`);
  return schools;
}

/**
 * Main processing function
 */
async function main() {
  console.log('NAPLAN & HSC Ranking Data Processor');
  console.log('===================================\\n');
  
  ensureOutputDir();
  
  try {
    // Process both datasets
    const naplanSchools = processNAPLANData();
    const hscSchools = processHSCData();
    
    // Export individual files
    const naplanPath = join(OUTPUT_DIR, 'naplan_rankings_2025.json');
    writeFileSync(naplanPath, JSON.stringify(naplanSchools, null, 2));
    console.log(`✓ Exported NAPLAN rankings to ${naplanPath}`);
    
    const hscPath = join(OUTPUT_DIR, 'hsc_rankings_2025.json');
    writeFileSync(hscPath, JSON.stringify(hscSchools, null, 2));
    console.log(`✓ Exported HSC rankings to ${hscPath}`);
    
    // Export combined file
    const combined = {
      generated: new Date().toISOString(),
      naplan: {
        count: naplanSchools.length,
        schools: naplanSchools
      },
      hsc: {
        count: hscSchools.length,
        schools: hscSchools
      }
    };
    
    const combinedPath = join(OUTPUT_DIR, 'academic_rankings_2025.json');
    writeFileSync(combinedPath, JSON.stringify(combined, null, 2));
    console.log(`✓ Exported combined rankings to ${combinedPath}`);
    
    // Summary statistics
    console.log('\\n' + '='.repeat(50));
    console.log('PROCESSING COMPLETE');
    console.log('='.repeat(50));
    console.log(`NAPLAN Primary schools: ${naplanSchools.length}`);
    console.log(`HSC Secondary schools: ${hscSchools.length}`);
    console.log(`Total schools with academic rankings: ${naplanSchools.length + hscSchools.length}`);
    
  } catch (error) {
    console.error('Error processing ranking data:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);