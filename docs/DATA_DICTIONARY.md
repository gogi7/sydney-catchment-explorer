# Sydney Catchment Explorer - Data Dictionary

## Overview

This document describes all data sources and schemas used in the Sydney Catchment Explorer application.

---

## 1. School Master Dataset

**Source**: NSW Department of Education - Public Schools Master Dataset  
**Format**: JSON (converted from CSV)  
**Location**: `/public/data/schools.json`  
**Update Frequency**: Nightly extracts available from source

### Schema

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `School_code` | Integer | Unique NSW Education school identifier | `5423` |
| `AgeID` | Integer | Commonwealth issued location ID | `64742` |
| `School_name` | String | Official school name | `Sydney Boys High School` |
| `Street` | String | Street address | `Cleveland St` |
| `Town_suburb` | String | Suburb/town name | `Surry Hills` |
| `Postcode` | Integer | Australian postcode | `2010` |
| `Phone` | String | Contact phone number | `9361 6910` |
| `School_Email` | String | Contact email | `school@det.nsw.edu.au` |
| `Website` | String | School website URL | `https://school.nsw.edu.au` |
| `Latitude` | Decimal | Geographic latitude (WGS84) | `-33.8812` |
| `Longitude` | Decimal | Geographic longitude (WGS84) | `151.2187` |

### Enrolment & Demographics

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `latest_year_enrolment_FTE` | Double | Full-time equivalent students | ABS NSSC standard |
| `Indigenous_pct` | String | % Aboriginal/Torres Strait Islander | `"np"` if ≤5 students |
| `LBOTE_pct` | Integer | % Language Background Other Than English | `"np"` if ≤5 students |
| `ICSEA_value` | Integer | Index of Community Socio-Educational Advantage | Mean=1000, SD=100 |
| `FOEI_Value` | String | Family Occupation & Education Index | Higher = more disadvantage |

### School Classification

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `Level_of_schooling` | String | `Primary School`, `Secondary School`, `Infants School`, `Central/Community School`, `Other School`, `Schools for Specific Purposes` | Main school type |
| `School_subtype` | String | Various | Detailed classification (e.g., `Year 7 to Year 12`, `Kindergarten to Year 6`) |
| `Selective_school` | String | `Fully Selective`, `Partially Selective`, `Not Selective` | Selective status |
| `Opportunity_class` | String | `Y`, `N` | Offers OC for Year 5-6 |
| `School_specialty_type` | String | `Comprehensive`, `Technology`, `Sports`, `Language`, `Creative and Performing Arts` | Specialty focus |
| `School_gender` | String | `Coed`, `Boys`, `Girls` | Student gender policy |
| `Preschool_ind` | String | `Y`, `N` | Has attached preschool |
| `Distance_education` | String | `S`, `C`, `N` | Distance ed capability |
| `Intensive_english_centre` | String | `Y`, `N` | Has IEC attached |

### Administrative

| Field | Type | Description |
|-------|------|-------------|
| `LGA` | String | Local Government Area |
| `electorate_from_2023` | String | NSW State electorate (2022 boundaries) |
| `fed_electorate_from_2025` | String | Federal electorate (2025 boundaries) |
| `Operational_directorate` | String | NSW DoE directorate |
| `Principal_network` | String | DoE principal network |
| `ASGS_remoteness` | String | ABS remoteness classification |
| `Date_1st_teacher` | DateTime | School opening date |
| `Date_extracted` | DateTime | Data extraction date |

---

## 2. Catchment GeoJSON Files

**Source**: NSW Department of Education School Finder  
**Format**: GeoJSON (FeatureCollection)  
**CRS**: WGS84 (EPSG:4326)

### Files

| File | Description |
|------|-------------|
| `catchments_primary.geojson` | Current primary school catchment boundaries |
| `catchments_secondary.geojson` | Current secondary school catchment boundaries |
| `catchments_future.geojson` | Planned/future catchment boundaries |

### Feature Properties Schema

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `USE_ID` | String | School code (links to master data) | `"8479"` |
| `CATCH_TYPE` | String | Catchment classification | `"HIGH_COED"`, `"PRIMARY_COED"` |
| `USE_DESC` | String | Display name (school name) | `"Sydney Boys High"` |
| `ADD_DATE` | String | Last boundary update (YYYYMMDD) | `"20250123"` |
| `PRIORITY` | Integer/null | Priority level for overlapping areas | `1`, `null` |

### Year Level Intake Properties

| Field | Type | Description |
|-------|------|-------------|
| `KINDERGART` | Integer | Kindergarten intake year (0 = N/A) |
| `YEAR1` | Integer | Year 1 intake year |
| `YEAR2` | Integer | Year 2 intake year |
| `YEAR3` | Integer | Year 3 intake year |
| `YEAR4` | Integer | Year 4 intake year |
| `YEAR5` | Integer | Year 5 intake year |
| `YEAR6` | Integer | Year 6 intake year |
| `YEAR7` | Integer | Year 7 intake year |
| `YEAR8` | Integer | Year 8 intake year |
| `YEAR9` | Integer | Year 9 intake year |
| `YEAR10` | Integer | Year 10 intake year |
| `YEAR11` | Integer | Year 11 intake year |
| `YEAR12` | Integer | Year 12 intake year |

**Note**: A value of `0` means the school doesn't have that year level. A year like `2026` means the intake year for that level.

### CATCH_TYPE Values

| Value | Description |
|-------|-------------|
| `PRIMARY_COED` | Co-educational primary school |
| `PRIMARY_BOYS` | Boys primary school |
| `PRIMARY_GIRLS` | Girls primary school |
| `HIGH_COED` | Co-educational high school |
| `HIGH_BOYS` | Boys high school |
| `HIGH_GIRLS` | Girls high school |
| `CENTRAL` | Central/community school |
| `INFANTS` | Infants school (K-2) |

### Geometry

- **Type**: `Polygon` or `MultiPolygon`
- **Coordinates**: Array of [longitude, latitude] pairs
- **Projection**: WGS84 (longitude first, latitude second)

---

## 3. NSW Property Sales Data

**Source**: NSW Valuer General - Property Sales Information (PSI)  
**Portal**: https://valuation.property.nsw.gov.au/embed/propertySalesInformation  
**Format**: DAT (semicolon-delimited text files)  
**Database**: SQLite (`/data/property_sales.db`)  
**Exports**: JSON (`/public/data/sales/`)  
**Update Frequency**: Weekly data releases, Annual data available

### Data Files

The PSI data comes in ZIP files containing multiple `.DAT` files, one per Local Government Area (LGA):

```
20251215.zip
├── 001_SALES_DATA_NNME_15122025.DAT  (Albury City)
├── 008_SALES_DATA_NNME_15122025.DAT  (Bayside)
├── 214_SALES_DATA_NNME_15122025.DAT  (The Hills/Ku-ring-gai)
└── ...
```

### DAT File Record Types

| Record | Description | Example |
|--------|-------------|---------|
| `A` | Header | `A;RTSALEDATA;214;20251215 01:08;VALNET;` |
| `B` | Sale details | `B;214;2876965;1;...;84;MERRIVILLE RD;KELLYVILLE RIDGE;2155;456.1;M;20251025;20251208;1565000;R2;R;RESIDENCE;...` |
| `C` | Legal description | `C;214;2876965;1;...;13/1032686;` |
| `D` | Interest (Purchaser/Vendor) | `D;214;2876965;1;...;P;;;;;;` |

### Database Schema (SQLite)

```
┌─────────────────────────┐     ┌─────────────────────────┐
│    property_sales       │     │   legal_descriptions    │
├─────────────────────────┤     ├─────────────────────────┤
│ id (PK)                 │◀────│ sale_id (FK)            │
│ district_code           │     │ legal_description       │
│ property_id             │     │ lot_number              │
│ suburb                  │     │ plan_number             │
│ postcode                │     └─────────────────────────┘
│ street_name             │
│ house_number            │     ┌─────────────────────────┐
│ purchase_price          │     │    sale_interests       │
│ contract_date           │     ├─────────────────────────┤
│ settlement_date         │◀────│ sale_id (FK)            │
│ area                    │     │ interest_type (P/V)     │
│ zone_code               │     │ interest_detail         │
│ property_type           │     └─────────────────────────┘
└─────────────────────────┘
```

### Property Sales Schema

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `district_code` | TEXT | LGA code | `"214"` |
| `property_id` | TEXT | Property identifier | `"2876965"` |
| `suburb` | TEXT | Suburb name | `"KELLYVILLE RIDGE"` |
| `postcode` | TEXT | Postcode | `"2155"` |
| `street_name` | TEXT | Street name | `"MERRIVILLE RD"` |
| `house_number` | TEXT | House/unit number | `"84"` |
| `purchase_price` | INTEGER | Sale price in AUD | `1565000` |
| `contract_date` | DATE | Contract exchange date | `"2025-10-25"` |
| `settlement_date` | DATE | Settlement date | `"2025-12-08"` |
| `area` | REAL | Land/floor area | `456.1` |
| `area_unit` | TEXT | `M` (sqm) or `H` (hectares) | `"M"` |
| `zone_code` | TEXT | Zoning code | `"R2"` |
| `property_type` | TEXT | Property classification | `"RESIDENCE"` |

### Zone Codes

| Code | Description | Category |
|------|-------------|----------|
| `R1` | General Residential | Residential |
| `R2` | Low Density Residential | Residential |
| `R3` | Medium Density Residential | Residential |
| `R4` | High Density Residential | Residential |
| `B1` | Neighbourhood Centre | Commercial |
| `B2` | Local Centre | Commercial |
| `IN1` | General Industrial | Industrial |
| `RU1` | Primary Production | Rural |

### Exported JSON Files

| File | Description | Records |
|------|-------------|---------|
| `recent_sales.json` | Individual sales (last 12 months) | ~5,500 |
| `suburb_stats.json` | Aggregated suburb statistics | ~1,400 |
| `postcode_stats.json` | Aggregated postcode statistics | ~500 |
| `metadata.json` | Database summary and import log | - |

### Recent Sales JSON Schema

```json
{
  "id": 1234,
  "suburb": "KELLYVILLE RIDGE",
  "postcode": "2155",
  "streetName": "MERRIVILLE RD",
  "houseNumber": "84",
  "price": 1565000,
  "contractDate": "2025-10-25",
  "settlementDate": "2025-12-08",
  "area": 456.1,
  "areaUnit": "M",
  "zoneCode": "R2",
  "propertyType": "RESIDENCE",
  "pricePerSqm": 3431
}
```

### Data Ingestion Pipeline

```
Download ZIP from NSW VG Portal
        │
        ▼
Extract DAT files
        │
        ▼
Parse DAT records (A, B, C, D)
        │
        ▼
Insert into SQLite database
        │
        ▼
Export to JSON for frontend
```

**Scripts:**
- `scripts/ingestPropertySales.js` - Import DAT files to SQLite
- `scripts/exportSalesData.js` - Export JSON for frontend
- `scripts/parsers/datParser.js` - Parse DAT file format
- `scripts/db/schema.sql` - Database schema

**Commands:**
```bash
# Ingest weekly data
npm run data:ingest -- --source "C:/path/to/weekly/20251215"

# Ingest annual data
npm run data:ingest -- --source "C:/path/to/annual/2024" --type annual

# Export to JSON
npm run data:export -- --months 12
```

---

## 4. Data Relationships

```
┌─────────────────────────┐
│    schools.json         │
│    (Master Data)        │
├─────────────────────────┤
│ School_code (PK)        │◀────────────┐
│ School_name             │             │
│ Town_suburb ────────────┼─────────┐   │ USE_ID matches
│ Postcode                │         │   │ School_code
│ Latitude                │         │   │
│ Longitude               │         │   │
│ Level_of_schooling      │         │   │
│ ...                     │         │   │
└─────────────────────────┘         │   │
                                    │   │
┌─────────────────────────┐         │   │
│  catchments_*.geojson   │         │   │
├─────────────────────────┤         │   │
│ USE_ID ─────────────────┼─────────┼───┘
│ USE_DESC                │         │
│ CATCH_TYPE              │         │
│ geometry                │         │
└─────────────────────────┘         │
                                    │
┌─────────────────────────┐         │
│   property_sales        │         │
│   (suburb_stats.json)   │         │
├─────────────────────────┤         │
│ suburb ──────────────────┼─────────┘
│ postcode                │   Suburb/Postcode
│ avgPrice                │   matches school
│ totalSales              │   location
│ ...                     │
└─────────────────────────┘
```

### Joining Data

```javascript
// Example: Get school details for a catchment
const getSchoolForCatchment = (catchmentFeature, schools) => {
  const schoolCode = parseInt(catchmentFeature.properties.USE_ID);
  return schools.find(s => s.School_code === schoolCode);
};
```

---

## 4. Data Transformations

### CSV to JSON Conversion

The school master dataset is converted from CSV to JSON for efficient client-side loading:

```javascript
// scripts/convertCsv.js
const csv = require('csv-parser');
const fs = require('fs');

const results = [];
fs.createReadStream('master_dataset.csv')
  .pipe(csv())
  .on('data', (row) => {
    // Convert numeric fields
    row.School_code = parseInt(row.School_code);
    row.Postcode = parseInt(row.Postcode);
    row.Latitude = parseFloat(row.Latitude);
    row.Longitude = parseFloat(row.Longitude);
    row.ICSEA_value = row.ICSEA_value ? parseInt(row.ICSEA_value) : null;
    row.latest_year_enrolment_FTE = row.latest_year_enrolment_FTE 
      ? parseFloat(row.latest_year_enrolment_FTE) 
      : null;
    results.push(row);
  })
  .on('end', () => {
    fs.writeFileSync('schools.json', JSON.stringify(results, null, 2));
  });
```

---

## 5. Data Quality Notes

### Known Issues

1. **Suppressed Values**: Demographic fields show `"np"` when student numbers ≤5 for privacy
2. **Missing Coordinates**: Some special-purpose schools may lack lat/lng
3. **Historical Data**: Electorate fields may have both historical and current values

### Validation Rules

```javascript
// Validate school record
const isValidSchool = (school) => {
  return (
    school.School_code > 0 &&
    school.School_name &&
    school.Latitude && school.Longitude &&
    school.Latitude >= -44 && school.Latitude <= -10 && // Australia bounds
    school.Longitude >= 112 && school.Longitude <= 154
  );
};
```

---

## 6. Update Process

### School Data
1. Download latest CSV from NSW Education data portal
2. Run conversion script: `node scripts/convertCsv.js`
3. Replace `/public/data/schools.json`
4. Verify record count and spot-check data

### Catchment Data
1. Download from School Finder API or data portal
2. Validate GeoJSON structure
3. Replace `/public/data/catchments_*.geojson`
4. Test boundary rendering on map

### Property Sales Data

**Weekly Updates:**
1. Download latest weekly ZIP from [NSW Valuer General Portal](https://valuation.property.nsw.gov.au/embed/propertySalesInformation)
2. Extract to a folder (e.g., `C:\data\nsw weekly\20251215\`)
3. Run ingestion: `npm run data:ingest -- --source "C:\data\nsw weekly\20251215" --type weekly`
4. Export for frontend: `npm run data:export -- --months 12`

**Annual Updates:**
1. Download annual ZIP from NSW Valuer General Portal
2. Extract to a folder (e.g., `C:\data\nsw annual\2024\`)
3. Run ingestion: `npm run data:ingest -- --source "C:\data\nsw annual\2024" --type annual`
4. Export for frontend: `npm run data:export`

**Re-importing Data:**
- Use `--force` flag to re-import already processed files
- The system tracks imported files to prevent duplicates

**Database Location:**
- SQLite database: `/data/property_sales.db`
- Can be queried directly for custom analysis

---

*Last Updated: December 2025*

