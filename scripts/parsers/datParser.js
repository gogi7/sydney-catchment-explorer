/**
 * NSW Property Sales DAT File Parser
 * 
 * Parses the semicolon-delimited DAT files from NSW Valuer General
 * Format documentation: https://valuation.property.nsw.gov.au
 * 
 * Record Types:
 * - A: Header record (file metadata)
 * - B: Sale details (main property and transaction info)
 * - C: Legal description (lot/plan details)
 * - D: Interest records (purchaser/vendor)
 */

import { readFileSync } from 'fs';
import { basename } from 'path';

/**
 * Parse a DAT file and return structured data
 * @param {string} filePath - Path to the DAT file
 * @returns {Object} Parsed data with header and sales records
 */
export function parseDatFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const filename = basename(filePath);
  const result = {
    filename,
    header: null,
    sales: [],
    parseErrors: []
  };

  // Extract date from filename (e.g., "001_SALES_DATA_NNME_15122025.DAT" -> "20251215")
  const dateMatch = filename.match(/(\d{2})(\d{2})(\d{4})\.DAT$/i);
  if (dateMatch) {
    result.fileDate = `${dateMatch[3]}${dateMatch[2]}${dateMatch[1]}`; // Convert to YYYYMMDD
  }
  
  // Extract district code from filename (e.g., "001_SALES_DATA..." -> "001")
  const districtMatch = filename.match(/^(\d{3})_/);
  if (districtMatch) {
    result.districtCode = districtMatch[1];
  }

  // Current sale being built (B record can have multiple C and D records)
  let currentSale = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(';');
    const recordType = fields[0];

    try {
      switch (recordType) {
        case 'A':
          result.header = parseHeaderRecord(fields);
          break;
        case 'B':
          // If we have a previous sale, push it
          if (currentSale) {
            result.sales.push(currentSale);
          }
          currentSale = parseSaleRecord(fields, result.fileDate, filename);
          break;
        case 'C':
          if (currentSale) {
            const legalDesc = parseLegalDescriptionRecord(fields);
            currentSale.legalDescriptions.push(legalDesc);
          }
          break;
        case 'D':
          if (currentSale) {
            const interest = parseInterestRecord(fields);
            currentSale.interests.push(interest);
          }
          break;
        default:
          result.parseErrors.push({
            line: i + 1,
            content: line.substring(0, 100),
            error: `Unknown record type: ${recordType}`
          });
      }
    } catch (error) {
      result.parseErrors.push({
        line: i + 1,
        content: line.substring(0, 100),
        error: error.message
      });
    }
  }

  // Don't forget the last sale
  if (currentSale) {
    result.sales.push(currentSale);
  }

  return result;
}

/**
 * Parse A record (header)
 * Format: A;RTSALEDATA;214;20251215 01:08;VALNET;
 */
function parseHeaderRecord(fields) {
  return {
    recordType: 'A',
    dataType: fields[1],          // RTSALEDATA
    districtCode: fields[2],      // 214
    timestamp: fields[3],         // 20251215 01:08
    source: fields[4]             // VALNET
  };
}

/**
 * Parse B record (sale details)
 * Format: B;district;property_id;sequence;timestamp;unit;[extra];house_num;street;suburb;postcode;area;area_unit;contract_date;settlement_date;price;zone_code;zone_cat;property_type;desc;nature;strata;component;sale_code;dealing;
 * 
 * Example: B;214;2876965;1;20251215 01:08;;;84;MERRIVILLE RD;KELLYVILLE RIDGE;2155;456.1;M;20251025;20251208;1565000;R2;R;RESIDENCE;;RKR;;;AV687428;
 * 
 * Note: There's an extra empty field [6] between unit number and house number in the current format
 */
function parseSaleRecord(fields, fileDate, sourceFile) {
  // Parse dates from YYYYMMDD format
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return null;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  // Parse price (remove commas, convert to integer)
  const parsePrice = (priceStr) => {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[,\s]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  };

  // Parse area (convert to float)
  const parseArea = (areaStr) => {
    if (!areaStr) return null;
    const num = parseFloat(areaStr);
    return isNaN(num) ? null : num;
  };

  // Field positions (note: field[6] is an extra empty field in the format)
  return {
    districtCode: fields[1],
    propertyId: fields[2],
    saleSequence: parseInt(fields[3], 10) || 1,
    recordTimestamp: fields[4],
    
    // Address (note: fields[6] is skipped - extra empty field in format)
    unitNumber: fields[5] || null,
    houseNumber: fields[7] || null,      // Skip [6], house number is at [7]
    streetName: fields[8] || null,        // Street at [8]
    suburb: fields[9] || null,            // Suburb at [9]
    postcode: fields[10] || null,         // Postcode at [10]
    
    // Property characteristics
    area: parseArea(fields[11]),          // Area at [11]
    areaUnit: fields[12] || null,         // M = sqm, H = hectares
    
    // Sale dates
    contractDate: parseDate(fields[13]),   // Contract date at [13]
    settlementDate: parseDate(fields[14]), // Settlement date at [14]
    
    // Price
    purchasePrice: parsePrice(fields[15]), // Price at [15]
    
    // Zoning
    zoneCode: fields[16] || null,          // Zone code at [16]
    zoneCategory: fields[17] || null,      // Zone category at [17]
    
    // Property classification
    propertyType: fields[18] || null,      // Property type at [18]
    propertyDescription: fields[19] || null, // Description at [19]
    
    // Additional fields
    natureOfProperty: fields[20] || null,
    strataLotNumber: fields[21] || null,
    componentCode: fields[22] || null,
    saleCode: fields[23] || null,
    dealingNumber: fields[24] || null,
    
    // Source tracking
    fileDate,
    sourceFile,
    
    // Will be populated by C and D records
    legalDescriptions: [],
    interests: []
  };
}

/**
 * Parse C record (legal description)
 * Format: C;district;property_id;sequence;timestamp;legal_description;
 * Example: C;214;2876965;1;20251215 01:08;13/1032686;
 */
function parseLegalDescriptionRecord(fields) {
  const legalDesc = fields[5] || '';
  
  // Try to parse lot/plan (e.g., "13/1032686" -> Lot 13, DP 1032686)
  let lotNumber = null;
  let planNumber = null;
  let planType = 'DP';  // Default to Deposited Plan
  
  const lotPlanMatch = legalDesc.match(/^(\d+)\/(\d+)$/);
  if (lotPlanMatch) {
    lotNumber = lotPlanMatch[1];
    planNumber = lotPlanMatch[2];
  }
  
  // Check for SP (Strata Plan)
  const strataMatch = legalDesc.match(/^SP(\d+)$/i);
  if (strataMatch) {
    planType = 'SP';
    planNumber = strataMatch[1];
  }

  return {
    districtCode: fields[1],
    propertyId: fields[2],
    saleSequence: parseInt(fields[3], 10) || 1,
    legalDescription: legalDesc,
    lotNumber,
    planNumber,
    planType
  };
}

/**
 * Parse D record (interest - purchaser/vendor)
 * Format: D;district;property_id;sequence;timestamp;interest_type;...
 * Example: D;214;2876965;1;20251215 01:08;P;;;;;;
 */
function parseInterestRecord(fields) {
  return {
    districtCode: fields[1],
    propertyId: fields[2],
    saleSequence: parseInt(fields[3], 10) || 1,
    interestType: fields[5] || null,  // P = Purchaser, V = Vendor
    interestDetail: fields.slice(6).join(';').trim() || null
  };
}

/**
 * Batch parse multiple DAT files
 * @param {string[]} filePaths - Array of file paths
 * @returns {Object} Combined results
 */
export function parseDatFiles(filePaths) {
  const results = {
    totalFiles: filePaths.length,
    processedFiles: 0,
    totalSales: 0,
    sales: [],
    errors: []
  };

  for (const filePath of filePaths) {
    try {
      const parsed = parseDatFile(filePath);
      results.sales.push(...parsed.sales);
      results.totalSales += parsed.sales.length;
      results.processedFiles++;
      
      if (parsed.parseErrors.length > 0) {
        results.errors.push({
          file: filePath,
          errors: parsed.parseErrors
        });
      }
    } catch (error) {
      results.errors.push({
        file: filePath,
        errors: [{ error: error.message }]
      });
    }
  }

  return results;
}

export default { parseDatFile, parseDatFiles };
