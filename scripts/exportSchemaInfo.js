#!/usr/bin/env node
/**
 * Export Database Schema and Sample Data for Data Explorer
 * 
 * Generates a complete overview of all tables, columns, and sample data
 * for the data explorer page in the frontend.
 * 
 * Usage:
 *   node scripts/exportSchemaInfo.js
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
 * Get column info for a table
 */
function getTableColumns(db, tableName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.map(col => ({
    name: col.name,
    type: col.type,
    nullable: col.notnull === 0,
    defaultValue: col.dflt_value,
    isPrimaryKey: col.pk === 1
  }));
}

/**
 * Get sample rows from a table
 */
function getSampleRows(db, tableName, limit = 10) {
  try {
    return db.prepare(`SELECT * FROM ${tableName} LIMIT ?`).all(limit);
  } catch (e) {
    console.warn(`Could not get samples from ${tableName}: ${e.message}`);
    return [];
  }
}

/**
 * Get row count for a table
 */
function getRowCount(db, tableName) {
  try {
    return db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
  } catch (e) {
    return 0;
  }
}

/**
 * Get distinct values for a column (useful for enum-like columns)
 */
function getDistinctValues(db, tableName, columnName, limit = 50) {
  try {
    const values = db.prepare(`
      SELECT DISTINCT ${columnName}, COUNT(*) as count 
      FROM ${tableName} 
      WHERE ${columnName} IS NOT NULL 
      GROUP BY ${columnName} 
      ORDER BY count DESC 
      LIMIT ?
    `).all(limit);
    return values;
  } catch (e) {
    return [];
  }
}

/**
 * Main export function
 */
async function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`Error: Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  console.log('Database Schema Export');
  console.log('======================\n');

  ensureOutputDir();
  
  const db = new Database(DB_PATH, { readonly: true });

  try {
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    // Get all views
    const views = db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='view'
      ORDER BY name
    `).all();

    const schemaInfo = {
      generated: new Date().toISOString(),
      databasePath: DB_PATH,
      tables: {},
      views: {},
      statistics: {},
      columnValues: {}
    };

    // Process each table
    for (const table of tables) {
      console.log(`Processing table: ${table.name}`);
      
      const columns = getTableColumns(db, table.name);
      const rowCount = getRowCount(db, table.name);
      const sampleRows = getSampleRows(db, table.name, 15);

      schemaInfo.tables[table.name] = {
        columns,
        rowCount,
        sampleRows
      };

      // Get distinct values for interesting columns
      if (table.name === 'property_sales') {
        const interestingColumns = [
          'zone_code', 'zone_category', 'property_type', 'nature_of_property',
          'sale_code', 'area_unit', 'district_code'
        ];
        
        for (const col of interestingColumns) {
          const values = getDistinctValues(db, table.name, col);
          if (values.length > 0) {
            schemaInfo.columnValues[col] = values;
          }
        }
      }
    }

    // Process views
    for (const view of views) {
      console.log(`Processing view: ${view.name}`);
      
      const sampleRows = getSampleRows(db, view.name, 10);
      const columns = sampleRows.length > 0 
        ? Object.keys(sampleRows[0]).map(name => ({ name, type: 'derived' }))
        : [];

      schemaInfo.views[view.name] = {
        sql: view.sql,
        columns,
        sampleRows
      };
    }

    // Get additional statistics
    console.log('Calculating statistics...');
    
    schemaInfo.statistics = {
      propertySales: {
        totalRecords: schemaInfo.tables.property_sales?.rowCount || 0,
        dateRange: db.prepare(`
          SELECT MIN(contract_date) as earliest, MAX(contract_date) as latest 
          FROM property_sales
        `).get(),
        priceStats: db.prepare(`
          SELECT 
            MIN(purchase_price) as minPrice,
            MAX(purchase_price) as maxPrice,
            ROUND(AVG(purchase_price), 0) as avgPrice,
            ROUND(AVG(CASE WHEN purchase_price > 0 AND area > 0 AND area_unit = 'M' 
              THEN purchase_price / area ELSE NULL END), 0) as avgPricePerSqm
          FROM property_sales
          WHERE purchase_price > 0
        `).get(),
        areaStats: db.prepare(`
          SELECT 
            MIN(area) as minArea,
            MAX(area) as maxArea,
            ROUND(AVG(area), 1) as avgArea
          FROM property_sales
          WHERE area > 0 AND area_unit = 'M'
        `).get(),
        byPropertyType: db.prepare(`
          SELECT property_type, COUNT(*) as count, 
            ROUND(AVG(purchase_price), 0) as avgPrice
          FROM property_sales
          WHERE property_type IS NOT NULL AND purchase_price > 0
          GROUP BY property_type
          ORDER BY count DESC
        `).all(),
        byZoneCode: db.prepare(`
          SELECT zone_code, zone_category, COUNT(*) as count,
            ROUND(AVG(purchase_price), 0) as avgPrice
          FROM property_sales
          WHERE zone_code IS NOT NULL AND purchase_price > 0
          GROUP BY zone_code, zone_category
          ORDER BY count DESC
        `).all(),
        topSuburbs: db.prepare(`
          SELECT suburb, postcode, COUNT(*) as count,
            ROUND(AVG(purchase_price), 0) as avgPrice,
            MIN(purchase_price) as minPrice,
            MAX(purchase_price) as maxPrice
          FROM property_sales
          WHERE purchase_price > 0
          GROUP BY suburb, postcode
          ORDER BY count DESC
          LIMIT 30
        `).all(),
        monthlyTrends: db.prepare(`
          SELECT 
            strftime('%Y-%m', contract_date) as month,
            COUNT(*) as count,
            ROUND(AVG(purchase_price), 0) as avgPrice
          FROM property_sales
          WHERE contract_date >= date('now', '-12 months') AND purchase_price > 0
          GROUP BY strftime('%Y-%m', contract_date)
          ORDER BY month
        `).all()
      }
    };

    // Get full sample with all columns
    schemaInfo.fullSampleData = db.prepare(`
      SELECT 
        ps.*,
        d.district_name,
        GROUP_CONCAT(DISTINCT ld.legal_description) as legal_descriptions,
        GROUP_CONCAT(DISTINCT si.interest_type) as interest_types
      FROM property_sales ps
      LEFT JOIN districts d ON ps.district_code = d.district_code
      LEFT JOIN legal_descriptions ld ON ps.id = ld.sale_id
      LEFT JOIN sale_interests si ON ps.id = si.sale_id
      GROUP BY ps.id
      ORDER BY ps.contract_date DESC
      LIMIT 20
    `).all();

    // Write output
    const outputPath = join(OUTPUT_DIR, 'schema_info.json');
    writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`Output: ${outputPath}`);
    console.log(`Tables: ${Object.keys(schemaInfo.tables).length}`);
    console.log(`Views: ${Object.keys(schemaInfo.views).length}`);
    
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
