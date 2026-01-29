#!/usr/bin/env node
/**
 * NSW Property Sales Data Ingestion Pipeline
 * 
 * This script ingests property sales data from NSW Valuer General DAT files
 * into a local SQLite database. It handles both weekly and annual data.
 * 
 * Usage:
 *   node scripts/ingestPropertySales.js --source <path> [--type weekly|annual] [--force]
 * 
 * Examples:
 *   node scripts/ingestPropertySales.js --source "C:/data/nsw weekly/20251215"
 *   node scripts/ingestPropertySales.js --source "C:/data/nsw annual/2024" --type annual
 */

import Database from 'better-sqlite3';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseDatFile } from './parsers/datParser.js';
import { districtCodes, zoneCodes } from './db/districtCodes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DB_PATH = join(__dirname, '..', 'data', 'property_sales.db');
const SCHEMA_PATH = join(__dirname, 'db', 'schema.sql');

/**
 * Initialize the database
 */
function initDatabase() {
  // Ensure data directory exists
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }

  const db = new Database(DB_PATH);
  
  // Enable foreign keys and WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Run schema
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  
  // Seed reference data
  seedReferenceData(db);
  
  console.log(`Database initialized at: ${DB_PATH}`);
  return db;
}

/**
 * Seed reference tables with known codes
 */
function seedReferenceData(db) {
  // Insert district codes
  const insertDistrict = db.prepare(`
    INSERT OR IGNORE INTO districts (district_code, district_name) VALUES (?, ?)
  `);
  
  for (const [code, name] of Object.entries(districtCodes)) {
    insertDistrict.run(code, name);
  }
  
  // Insert zone codes
  const insertZone = db.prepare(`
    INSERT OR IGNORE INTO zone_codes (zone_code, zone_description, zone_category) VALUES (?, ?, ?)
  `);
  
  for (const [code, info] of Object.entries(zoneCodes)) {
    insertZone.run(code, info.description, info.category);
  }
  
  console.log('Reference data seeded');
}

/**
 * Check if a file has already been imported
 */
function isFileImported(db, filename, districtCode) {
  const result = db.prepare(`
    SELECT id, status FROM import_log 
    WHERE filename = ? AND district_code = ? AND status = 'completed'
  `).get(filename, districtCode);
  
  return !!result;
}

/**
 * Log import start
 */
function logImportStart(db, filename, filePath, fileType, fileDate, districtCode) {
  const stmt = db.prepare(`
    INSERT INTO import_log (filename, file_path, file_type, file_date, district_code, status, started_at)
    VALUES (?, ?, ?, ?, ?, 'processing', datetime('now'))
    ON CONFLICT(filename, district_code) DO UPDATE SET
      status = 'processing',
      started_at = datetime('now'),
      error_message = NULL
  `);
  
  const result = stmt.run(filename, filePath, fileType, fileDate, districtCode);
  return result.lastInsertRowid || db.prepare(
    'SELECT id FROM import_log WHERE filename = ? AND district_code = ?'
  ).get(filename, districtCode).id;
}

/**
 * Log import completion
 */
function logImportComplete(db, importId, stats) {
  db.prepare(`
    UPDATE import_log SET
      status = 'completed',
      records_processed = ?,
      records_inserted = ?,
      records_skipped = ?,
      records_error = ?,
      completed_at = datetime('now')
    WHERE id = ?
  `).run(stats.processed, stats.inserted, stats.skipped, stats.errors, importId);
}

/**
 * Log import failure
 */
function logImportFailed(db, importId, errorMessage) {
  db.prepare(`
    UPDATE import_log SET
      status = 'failed',
      error_message = ?,
      completed_at = datetime('now')
    WHERE id = ?
  `).run(errorMessage, importId);
}

/**
 * Insert a sale record and its related data
 */
function insertSale(db, sale, fileType) {
  const insertSaleStmt = db.prepare(`
    INSERT INTO property_sales (
      district_code, property_id, sale_sequence,
      source_file, file_date, file_type, record_timestamp,
      unit_number, house_number, street_name, suburb, postcode,
      area, area_unit,
      contract_date, settlement_date, purchase_price,
      zone_code, zone_category,
      property_type, property_description,
      nature_of_property, strata_lot_number, component_code, sale_code, dealing_number
    ) VALUES (
      @districtCode, @propertyId, @saleSequence,
      @sourceFile, @fileDate, @fileType, @recordTimestamp,
      @unitNumber, @houseNumber, @streetName, @suburb, @postcode,
      @area, @areaUnit,
      @contractDate, @settlementDate, @purchasePrice,
      @zoneCode, @zoneCategory,
      @propertyType, @propertyDescription,
      @natureOfProperty, @strataLotNumber, @componentCode, @saleCode, @dealingNumber
    )
  `);

  const insertLegalDescStmt = db.prepare(`
    INSERT INTO legal_descriptions (
      sale_id, district_code, property_id, sale_sequence,
      legal_description, lot_number, plan_number, plan_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInterestStmt = db.prepare(`
    INSERT INTO sale_interests (
      sale_id, district_code, property_id, sale_sequence,
      interest_type, interest_detail
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert main sale record
  const result = insertSaleStmt.run({
    districtCode: sale.districtCode,
    propertyId: sale.propertyId,
    saleSequence: sale.saleSequence,
    sourceFile: sale.sourceFile,
    fileDate: sale.fileDate,
    fileType: fileType,
    recordTimestamp: sale.recordTimestamp,
    unitNumber: sale.unitNumber,
    houseNumber: sale.houseNumber,
    streetName: sale.streetName,
    suburb: sale.suburb,
    postcode: sale.postcode,
    area: sale.area,
    areaUnit: sale.areaUnit,
    contractDate: sale.contractDate,
    settlementDate: sale.settlementDate,
    purchasePrice: sale.purchasePrice,
    zoneCode: sale.zoneCode,
    zoneCategory: sale.zoneCategory,
    propertyType: sale.propertyType,
    propertyDescription: sale.propertyDescription,
    natureOfProperty: sale.natureOfProperty,
    strataLotNumber: sale.strataLotNumber,
    componentCode: sale.componentCode,
    saleCode: sale.saleCode,
    dealingNumber: sale.dealingNumber
  });

  const saleId = result.lastInsertRowid;

  // Insert legal descriptions
  for (const ld of sale.legalDescriptions) {
    insertLegalDescStmt.run(
      saleId,
      ld.districtCode,
      ld.propertyId,
      ld.saleSequence,
      ld.legalDescription,
      ld.lotNumber,
      ld.planNumber,
      ld.planType
    );
  }

  // Insert interests
  for (const interest of sale.interests) {
    insertInterestStmt.run(
      saleId,
      interest.districtCode,
      interest.propertyId,
      interest.saleSequence,
      interest.interestType,
      interest.interestDetail
    );
  }

  return saleId;
}

/**
 * Process a single DAT file
 */
function processFile(db, filePath, fileType, force = false) {
  const filename = basename(filePath);
  
  // Parse the file
  const parsed = parseDatFile(filePath);
  
  const districtCode = parsed.districtCode || parsed.header?.districtCode || 'unknown';
  
  // Check if already imported (unless force flag)
  if (!force && isFileImported(db, filename, districtCode)) {
    console.log(`  Skipping ${filename} (already imported)`);
    return { skipped: true, reason: 'already_imported' };
  }

  // Log import start
  const importId = logImportStart(db, filename, filePath, fileType, parsed.fileDate, districtCode);
  
  const stats = {
    processed: parsed.sales.length,
    inserted: 0,
    skipped: 0,
    errors: 0
  };

  // Use transaction for batch insert
  const insertTransaction = db.transaction((sales) => {
    for (const sale of sales) {
      try {
        insertSale(db, sale, fileType);
        stats.inserted++;
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          stats.skipped++;
        } else {
          console.error(`    Error inserting sale:`, error.message);
          stats.errors++;
        }
      }
    }
  });

  try {
    insertTransaction(parsed.sales);
    logImportComplete(db, importId, stats);
    
    console.log(`  ✓ ${filename}: ${stats.inserted} inserted, ${stats.skipped} duplicates, ${stats.errors} errors`);
    
    return { success: true, stats };
  } catch (error) {
    logImportFailed(db, importId, error.message);
    console.error(`  ✗ ${filename}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process all DAT files in a directory
 */
function processDirectory(db, dirPath, fileType, force = false) {
  console.log(`\nProcessing directory: ${dirPath}`);
  console.log(`File type: ${fileType}`);
  console.log(`Force re-import: ${force}`);
  console.log('-'.repeat(60));

  // Find all DAT files
  const files = readdirSync(dirPath)
    .filter(f => f.toLowerCase().endsWith('.dat'))
    .map(f => join(dirPath, f));

  console.log(`Found ${files.length} DAT files\n`);

  const results = {
    total: files.length,
    processed: 0,
    inserted: 0,
    skipped: 0,
    errors: 0
  };

  for (const filePath of files) {
    const result = processFile(db, filePath, fileType, force);
    
    if (result.skipped) {
      results.skipped++;
    } else if (result.success) {
      results.processed++;
      results.inserted += result.stats.inserted;
    } else {
      results.errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files: ${results.total}`);
  console.log(`Processed: ${results.processed}`);
  console.log(`Skipped (already imported): ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`Total records inserted: ${results.inserted}`);

  return results;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    source: null,
    type: 'weekly',
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
      case '-s':
        options.source = args[++i];
        break;
      case '--type':
      case '-t':
        options.type = args[++i];
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
NSW Property Sales Data Ingestion Pipeline
==========================================

Usage:
  node scripts/ingestPropertySales.js --source <path> [options]

Options:
  --source, -s <path>   Path to directory containing DAT files (required)
  --type, -t <type>     Data type: 'weekly' or 'annual' (default: weekly)
  --force, -f           Force re-import of already processed files
  --help, -h            Show this help message

Examples:
  # Import weekly data
  node scripts/ingestPropertySales.js --source "C:/data/nsw weekly/20251215"

  # Import annual data
  node scripts/ingestPropertySales.js --source "C:/data/nsw annual/2024" --type annual

  # Force re-import
  node scripts/ingestPropertySales.js --source "C:/data/nsw weekly/20251215" --force

Data Source:
  Download data from: https://valuation.property.nsw.gov.au/embed/propertySalesInformation
`);
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  if (!options.source) {
    console.error('Error: --source is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (!existsSync(options.source)) {
    console.error(`Error: Source path does not exist: ${options.source}`);
    process.exit(1);
  }

  console.log('NSW Property Sales Data Ingestion');
  console.log('=================================\n');

  // Initialize database
  const db = initDatabase();

  try {
    // Process the directory
    processDirectory(db, options.source, options.type, options.force);
    
    // Show database stats
    const totalSales = db.prepare('SELECT COUNT(*) as count FROM property_sales').get();
    const totalImports = db.prepare('SELECT COUNT(*) as count FROM import_log WHERE status = ?').get('completed');
    
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE STATUS');
    console.log('='.repeat(60));
    console.log(`Total sales in database: ${totalSales.count.toLocaleString()}`);
    console.log(`Total files imported: ${totalImports.count}`);
    console.log(`Database location: ${DB_PATH}`);
    
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
