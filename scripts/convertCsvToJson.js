/**
 * Convert NSW Schools Master Dataset CSV to JSON
 * 
 * Usage: node scripts/convertCsvToJson.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Input and output paths
const inputPath = resolve('C:/Tools PHPC/realestate_schools_data/NSW Public Schools Master Dataset/master_dataset.csv');
const outputPath = resolve(__dirname, '../public/data/schools.json');

// Fields to convert to numbers
const numericFields = [
  'School_code',
  'AgeID',
  'Postcode',
  'latest_year_enrolment_FTE',
  'LBOTE_pct',
  'ICSEA_value'
];

// Fields to convert to floats
const floatFields = [
  'Latitude',
  'Longitude'
];

function parseCSVLine(line, headers) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  // Create object from headers and values
  const obj = {};
  headers.forEach((header, index) => {
    let value = values[index] || '';
    
    // Clean up the value
    value = value.trim();
    
    // Convert numeric fields
    if (numericFields.includes(header)) {
      const num = parseFloat(value);
      obj[header] = isNaN(num) ? null : num;
    } else if (floatFields.includes(header)) {
      const num = parseFloat(value);
      obj[header] = isNaN(num) ? null : num;
    } else if (value === '' || value === 'np') {
      obj[header] = value === 'np' ? 'np' : null;
    } else {
      obj[header] = value;
    }
  });
  
  return obj;
}

function convertCsvToJson() {
  console.log('Reading CSV file:', inputPath);
  
  const csvContent = readFileSync(inputPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('Found', headers.length, 'columns');
  
  // Parse data rows
  const schools = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const school = parseCSVLine(lines[i], headers);
      
      // Only include schools with valid coordinates
      if (school.Latitude && school.Longitude && school.School_code) {
        schools.push(school);
      }
    } catch (error) {
      console.warn(`Skipping line ${i + 1}: ${error.message}`);
    }
  }
  
  console.log('Converted', schools.length, 'schools');
  
  // Write JSON output
  writeFileSync(outputPath, JSON.stringify(schools, null, 2));
  console.log('Written to:', outputPath);
  
  // Print sample
  console.log('\nSample record:');
  console.log(JSON.stringify(schools[0], null, 2));
}

convertCsvToJson();

