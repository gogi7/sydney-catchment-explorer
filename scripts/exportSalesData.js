#!/usr/bin/env node
/**
 * Export Property Sales Data for Frontend
 * 
 * Generates JSON files from the SQLite database for use in the web app.
 * This creates lightweight, optimized data files for the frontend.
 * 
 * Usage:
 *   node scripts/exportSalesData.js [--months <n>] [--suburb <name>] [--postcode <code>]
 */

import Database from 'better-sqlite3';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'property_sales.db');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data', 'sales');

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
 * Export recent sales (last N months)
 */
function exportRecentSales(db, months = 6) {
  console.log(`\nExporting sales from last ${months} months...`);
  
  const query = `
    SELECT 
      id,
      suburb,
      postcode,
      street_name as streetName,
      house_number as houseNumber,
      unit_number as unitNumber,
      purchase_price as price,
      contract_date as contractDate,
      settlement_date as settlementDate,
      area,
      area_unit as areaUnit,
      zone_code as zoneCode,
      property_type as propertyType,
      property_description as propertyDescription,
      -- Calculate price per sqm
      CASE 
        WHEN area > 0 AND area_unit = 'M' 
        THEN ROUND(purchase_price * 1.0 / area, 0)
        ELSE NULL 
      END AS pricePerSqm
    FROM property_sales
    WHERE contract_date >= date('now', '-' || ? || ' months')
      AND purchase_price > 0
    ORDER BY contract_date DESC
  `;
  
  const sales = db.prepare(query).all(months);
  
  const outputPath = join(OUTPUT_DIR, 'recent_sales.json');
  writeFileSync(outputPath, JSON.stringify(sales, null, 2));
  
  console.log(`  ✓ Exported ${sales.length} recent sales to ${outputPath}`);
  return sales.length;
}

/**
 * Export suburb statistics
 */
function exportSuburbStats(db) {
  console.log('\nExporting suburb statistics...');
  
  const query = `
    SELECT 
      suburb,
      postcode,
      COUNT(*) as totalSales,
      ROUND(AVG(purchase_price), 0) as avgPrice,
      MIN(purchase_price) as minPrice,
      MAX(purchase_price) as maxPrice,
      ROUND(AVG(area), 1) as avgArea,
      MIN(contract_date) as earliestSale,
      MAX(contract_date) as latestSale
    FROM property_sales
    WHERE purchase_price > 0
    GROUP BY suburb, postcode
    HAVING COUNT(*) >= 1
    ORDER BY suburb
  `;
  
  const stats = db.prepare(query).all();
  
  const outputPath = join(OUTPUT_DIR, 'suburb_stats.json');
  writeFileSync(outputPath, JSON.stringify(stats, null, 2));
  
  console.log(`  ✓ Exported stats for ${stats.length} suburbs to ${outputPath}`);
  return stats.length;
}

/**
 * Export sales by postcode (for map overlay)
 */
function exportSalesByPostcode(db) {
  console.log('\nExporting sales aggregated by postcode...');
  
  const query = `
    SELECT 
      postcode,
      COUNT(*) as totalSales,
      ROUND(AVG(purchase_price), 0) as avgPrice,
      MIN(purchase_price) as minPrice,
      MAX(purchase_price) as maxPrice,
      GROUP_CONCAT(DISTINCT suburb) as suburbs,
      MAX(contract_date) as latestSale
    FROM property_sales
    WHERE purchase_price > 0 AND postcode IS NOT NULL
    GROUP BY postcode
    ORDER BY postcode
  `;
  
  const data = db.prepare(query).all();
  
  // Convert suburbs string to array
  const processed = data.map(row => ({
    ...row,
    suburbs: row.suburbs ? row.suburbs.split(',') : []
  }));
  
  const outputPath = join(OUTPUT_DIR, 'postcode_stats.json');
  writeFileSync(outputPath, JSON.stringify(processed, null, 2));
  
  console.log(`  ✓ Exported stats for ${processed.length} postcodes to ${outputPath}`);
  return processed.length;
}

/**
 * Export sales for GeoJSON overlay (with coordinates from postcode lookup)
 */
function exportSalesGeoJSON(db, months = 3) {
  console.log(`\nExporting sales as GeoJSON (last ${months} months)...`);
  
  // Note: We don't have exact coordinates in sales data
  // This creates a point-based GeoJSON that could be geocoded later
  // For now, we'll export without coordinates for potential geocoding
  
  const query = `
    SELECT 
      id,
      suburb,
      postcode,
      street_name,
      house_number,
      unit_number,
      purchase_price,
      contract_date,
      area,
      zone_code,
      property_type
    FROM property_sales
    WHERE contract_date >= date('now', '-' || ? || ' months')
      AND purchase_price > 0
    ORDER BY contract_date DESC
    LIMIT 5000
  `;
  
  const sales = db.prepare(query).all(months);
  
  // Create a summary GeoJSON structure (without actual coordinates)
  // This can be enhanced with geocoding later
  const geojson = {
    type: "FeatureCollection",
    metadata: {
      generated: new Date().toISOString(),
      totalSales: sales.length,
      period: `${months} months`,
      note: "Coordinates not included - requires geocoding"
    },
    features: sales.map(sale => ({
      type: "Feature",
      properties: {
        id: sale.id,
        address: [sale.unit_number, sale.house_number, sale.street_name]
          .filter(Boolean).join(' '),
        suburb: sale.suburb,
        postcode: sale.postcode,
        price: sale.purchase_price,
        date: sale.contract_date,
        area: sale.area,
        zoneCode: sale.zone_code,
        propertyType: sale.property_type
      },
      geometry: null  // Would be populated by geocoding
    }))
  };
  
  const outputPath = join(OUTPUT_DIR, 'sales_points.geojson');
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  
  console.log(`  ✓ Exported ${sales.length} sales to ${outputPath}`);
  return sales.length;
}

/**
 * Export database summary/metadata
 */
function exportMetadata(db) {
  console.log('\nExporting database metadata...');
  
  const stats = {
    generated: new Date().toISOString(),
    database: {
      totalSales: db.prepare('SELECT COUNT(*) as count FROM property_sales').get().count,
      totalLegalDescriptions: db.prepare('SELECT COUNT(*) as count FROM legal_descriptions').get().count,
      totalInterests: db.prepare('SELECT COUNT(*) as count FROM sale_interests').get().count,
      totalImports: db.prepare('SELECT COUNT(*) as count FROM import_log WHERE status = ?').get('completed').count
    },
    dateRange: db.prepare(`
      SELECT 
        MIN(contract_date) as earliest,
        MAX(contract_date) as latest
      FROM property_sales
    `).get(),
    priceRange: db.prepare(`
      SELECT 
        MIN(purchase_price) as min,
        MAX(purchase_price) as max,
        ROUND(AVG(purchase_price), 0) as avg
      FROM property_sales
      WHERE purchase_price > 0
    `).get(),
    topSuburbs: db.prepare(`
      SELECT suburb, COUNT(*) as count
      FROM property_sales
      GROUP BY suburb
      ORDER BY count DESC
      LIMIT 20
    `).all(),
    recentImports: db.prepare(`
      SELECT filename, file_type, file_date, records_inserted, completed_at
      FROM import_log
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 10
    `).all()
  };
  
  const outputPath = join(OUTPUT_DIR, 'metadata.json');
  writeFileSync(outputPath, JSON.stringify(stats, null, 2));
  
  console.log(`  ✓ Exported metadata to ${outputPath}`);
  return stats;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    months: 6,
    suburb: null,
    postcode: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--months':
      case '-m':
        options.months = parseInt(args[++i], 10);
        break;
      case '--suburb':
      case '-s':
        options.suburb = args[++i];
        break;
      case '--postcode':
      case '-p':
        options.postcode = args[++i];
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
Export Property Sales Data for Frontend
=======================================

Usage:
  node scripts/exportSalesData.js [options]

Options:
  --months, -m <n>      Number of months for recent sales (default: 6)
  --suburb, -s <name>   Filter by suburb name
  --postcode, -p <code> Filter by postcode
  --help, -h            Show this help message

Output Files:
  public/data/sales/recent_sales.json   - Recent individual sales
  public/data/sales/suburb_stats.json   - Statistics by suburb
  public/data/sales/postcode_stats.json - Statistics by postcode
  public/data/sales/sales_points.geojson - GeoJSON for mapping
  public/data/sales/metadata.json       - Database summary
`);
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  if (!existsSync(DB_PATH)) {
    console.error(`Error: Database not found at ${DB_PATH}`);
    console.error('Run the ingestion script first: node scripts/ingestPropertySales.js --source <path>');
    process.exit(1);
  }

  console.log('Property Sales Data Export');
  console.log('==========================\n');

  ensureOutputDir();
  
  const db = new Database(DB_PATH, { readonly: true });

  try {
    exportRecentSales(db, options.months);
    exportSuburbStats(db);
    exportSalesByPostcode(db);
    exportSalesGeoJSON(db, Math.min(options.months, 3));
    const metadata = exportMetadata(db);
    
    console.log('\n' + '='.repeat(60));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total sales in database: ${metadata.database.totalSales.toLocaleString()}`);
    console.log(`Date range: ${metadata.dateRange.earliest} to ${metadata.dateRange.latest}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
