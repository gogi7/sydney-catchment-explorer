-- NSW Property Sales Database Schema
-- ===================================
-- This schema supports both weekly and annual property sales data from
-- NSW Valuer General: https://valuation.property.nsw.gov.au/embed/propertySalesInformation

-- ============================================
-- REFERENCE TABLES
-- ============================================

-- District/LGA codes and names
CREATE TABLE IF NOT EXISTS districts (
    district_code TEXT PRIMARY KEY,
    district_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Zone codes reference (R1, R2, R3, etc.)
CREATE TABLE IF NOT EXISTS zone_codes (
    zone_code TEXT PRIMARY KEY,
    zone_description TEXT,
    zone_category TEXT  -- Residential, Commercial, Industrial, etc.
);

-- Property type codes
CREATE TABLE IF NOT EXISTS property_types (
    type_code TEXT PRIMARY KEY,
    type_description TEXT
);

-- ============================================
-- MAIN SALES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS property_sales (
    -- Primary key: composite of district, property_id, and sequence
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identifiers
    district_code TEXT NOT NULL,
    property_id TEXT NOT NULL,
    sale_sequence INTEGER NOT NULL,
    
    -- Source file info (for tracking/auditing)
    source_file TEXT,
    file_date TEXT,  -- Date from filename (e.g., "20251215")
    file_type TEXT,  -- "weekly" or "annual"
    record_timestamp DATETIME,  -- From the DAT file
    
    -- Address details
    unit_number TEXT,
    house_number TEXT,
    street_name TEXT,
    suburb TEXT,
    postcode TEXT,
    
    -- Property characteristics
    area REAL,
    area_unit TEXT,  -- M = square meters, H = hectares
    
    -- Sale details
    contract_date DATE,
    settlement_date DATE,
    purchase_price INTEGER,
    
    -- Zoning
    zone_code TEXT,
    zone_category TEXT,  -- R = Residential, C = Commercial, etc.
    
    -- Property classification
    property_type TEXT,
    property_description TEXT,
    
    -- Additional codes from DAT file
    nature_of_property TEXT,
    strata_lot_number TEXT,
    component_code TEXT,
    sale_code TEXT,
    dealing_number TEXT,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(district_code, property_id, sale_sequence, contract_date),
    
    -- Foreign keys (soft - data quality varies)
    FOREIGN KEY (district_code) REFERENCES districts(district_code)
);

-- ============================================
-- LEGAL DESCRIPTIONS (Lot/DP info)
-- ============================================

CREATE TABLE IF NOT EXISTS legal_descriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    
    district_code TEXT NOT NULL,
    property_id TEXT NOT NULL,
    sale_sequence INTEGER NOT NULL,
    
    -- Legal description (e.g., "13/1032686" = Lot 13 in DP 1032686)
    legal_description TEXT,
    lot_number TEXT,
    plan_number TEXT,
    plan_type TEXT,  -- DP, SP, etc.
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES property_sales(id)
);

-- ============================================
-- INTEREST RECORDS (Purchaser/Vendor)
-- ============================================

CREATE TABLE IF NOT EXISTS sale_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    
    district_code TEXT NOT NULL,
    property_id TEXT NOT NULL,
    sale_sequence INTEGER NOT NULL,
    
    -- Interest type: P = Purchaser, V = Vendor
    interest_type TEXT NOT NULL,
    
    -- Additional fields if present in D records
    interest_detail TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES property_sales(id)
);

-- ============================================
-- DATA IMPORT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- File info
    filename TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT,  -- "weekly" or "annual"
    file_date TEXT,  -- Extracted from filename
    district_code TEXT,
    
    -- Import stats
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_error INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
    error_message TEXT,
    
    -- Timestamps
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent re-importing same file
    UNIQUE(filename, district_code)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Main search indexes
CREATE INDEX IF NOT EXISTS idx_sales_suburb ON property_sales(suburb);
CREATE INDEX IF NOT EXISTS idx_sales_postcode ON property_sales(postcode);
CREATE INDEX IF NOT EXISTS idx_sales_contract_date ON property_sales(contract_date);
CREATE INDEX IF NOT EXISTS idx_sales_settlement_date ON property_sales(settlement_date);
CREATE INDEX IF NOT EXISTS idx_sales_price ON property_sales(purchase_price);
CREATE INDEX IF NOT EXISTS idx_sales_zone ON property_sales(zone_code);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sales_suburb_date ON property_sales(suburb, contract_date);
CREATE INDEX IF NOT EXISTS idx_sales_postcode_date ON property_sales(postcode, contract_date);
CREATE INDEX IF NOT EXISTS idx_sales_district_property ON property_sales(district_code, property_id);

-- Import tracking
CREATE INDEX IF NOT EXISTS idx_import_status ON import_log(status);
CREATE INDEX IF NOT EXISTS idx_import_file_date ON import_log(file_date);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Recent sales summary view
CREATE VIEW IF NOT EXISTS v_recent_sales AS
SELECT 
    ps.id,
    ps.suburb,
    ps.postcode,
    ps.street_name,
    ps.house_number,
    ps.unit_number,
    ps.purchase_price,
    ps.contract_date,
    ps.area,
    ps.area_unit,
    ps.zone_code,
    ps.property_type,
    d.district_name,
    -- Calculate price per sqm for residential
    CASE 
        WHEN ps.area > 0 AND ps.area_unit = 'M' 
        THEN ROUND(ps.purchase_price * 1.0 / ps.area, 2)
        ELSE NULL 
    END AS price_per_sqm
FROM property_sales ps
LEFT JOIN districts d ON ps.district_code = d.district_code
ORDER BY ps.contract_date DESC;

-- Suburb statistics view
CREATE VIEW IF NOT EXISTS v_suburb_stats AS
SELECT 
    suburb,
    postcode,
    COUNT(*) as total_sales,
    AVG(purchase_price) as avg_price,
    MIN(purchase_price) as min_price,
    MAX(purchase_price) as max_price,
    AVG(area) as avg_area,
    MIN(contract_date) as earliest_sale,
    MAX(contract_date) as latest_sale
FROM property_sales
WHERE purchase_price > 0
GROUP BY suburb, postcode;
