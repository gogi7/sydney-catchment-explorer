#!/usr/bin/env node
/**
 * Debug Excel structure to understand the data layout
 */

import XLSX from 'xlsx';
import { existsSync } from 'fs';

const NAPLAN_FILE = 'C:\\Tools PHPC\\realestate_schools_data\\myschoolrankingnaplan2025primary.xlsx';
const HSC_FILE = 'C:\\Tools PHPC\\realestate_schools_data\\myschoolrankinghscsecondary2025.xlsx';

function debugFile(filename, label) {
  console.log(`\n=== ${label} ===`);
  
  if (!existsSync(filename)) {
    console.log(`File not found: ${filename}`);
    return;
  }
  
  const workbook = XLSX.readFile(filename);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Total rows: ${rawData.length}`);
  
  // Show first 10 rows to understand structure
  console.log('\nFirst 10 rows:');
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    console.log(`Row ${i}:`, rawData[i]);
  }
  
  // Find rows with actual school data (non-empty, not headers)
  console.log('\nRows with potential school data:');
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length >= 3 && 
        typeof row[0] === 'string' && 
        row[0].length > 5 &&
        !row[0].toLowerCase().includes('naplan') &&
        !row[0].toLowerCase().includes('hsc') &&
        !row[0].toLowerCase().includes('teachers')) {
      console.log(`Row ${i}:`, row);
    }
  }
}

// Debug both files
debugFile(NAPLAN_FILE, 'NAPLAN Primary');
debugFile(HSC_FILE, 'HSC Secondary');