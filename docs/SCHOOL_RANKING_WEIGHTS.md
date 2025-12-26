# School Ranking Weights System

> **Purpose**: This document defines the weighting system for ranking NSW public schools based on the Master Dataset fields.
> 
> **Last Updated**: December 2025

---

## Overview

The ranking system uses a **two-tier weighting approach**:

1. **Primary Weight (1-10)**: How important is this column for overall school quality assessment
2. **Secondary Weight**: Value-based scoring within each column (normalized to 0-10 scale)

**Final Column Score** = Primary Weight × Secondary Weight

**Overall School Score** = Sum of all Column Scores / Maximum Possible Score × 100

---

## Column Categories

| Category | Description | Columns |
|----------|-------------|---------|
| 🎯 **Ranking Critical** | Direct quality/performance indicators | 6 columns |
| 📊 **Contextual** | Useful context but not direct quality measures | 6 columns |
| 🏷️ **Classification** | For filtering, not ranking | 8 columns |
| 📍 **Location** | Geographic identifiers | 6 columns |
| 📞 **Contact** | Contact information | 5 columns |
| 🏛️ **Administrative** | Government/organizational structure | 12 columns |
| 📅 **Temporal** | Date fields | 2 columns |
| 🔢 **Identifiers** | Unique codes | 2 columns |

---

## 🎯 RANKING CRITICAL COLUMNS

### 1. ICSEA_value
| Attribute | Value |
|-----------|-------|
| **Type** | integer |
| **Description** | Index of Community Socio-Educational Advantage. A scale representing levels of educational advantage based on parent occupation, education, geographic location, and proportion of Indigenous students. Mean=1000, SD=100. Range typically 500-1300. |
| **Source** | ACARA (Australian Curriculum, Assessment and Reporting Authority) |
| **Update Frequency** | Annually in February |
| **Primary Weight** | **10** |
| **Rationale** | The most reliable and standardized measure of educational advantage. Directly correlates with academic outcomes. |

**Secondary Weight (Value-Based Scoring):**
| ICSEA Range | Secondary Weight | Description |
|-------------|------------------|-------------|
| 1200+ | 10 | Very High Advantage |
| 1150-1199 | 9 | High Advantage |
| 1100-1149 | 8 | Above Average Advantage |
| 1050-1099 | 7 | Moderately Above Average |
| 1000-1049 | 6 | Average (National Mean) |
| 950-999 | 5 | Slightly Below Average |
| 900-949 | 4 | Below Average |
| 850-899 | 3 | Disadvantaged |
| 800-849 | 2 | Highly Disadvantaged |
| <800 | 1 | Extremely Disadvantaged |
| NULL/Missing | 0 | Not Available |

**Formula**: `Secondary Weight = Math.min(10, Math.max(1, Math.round((ICSEA - 800) / 50)))`

---

### 2. Selective_school
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates whether a secondary school selects students based on academic merit through entrance examinations. |
| **Values** | `Fully Selective`, `Partially Selective`, `Not Selective` |
| **Update Frequency** | As required |
| **Primary Weight** | **9** |
| **Rationale** | Selective schools have academically competitive student bodies and typically achieve higher HSC results. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Fully Selective | 10 | All students selected by exam (e.g., Sydney Boys, North Sydney Girls) |
| Partially Selective | 7 | Some selective classes within comprehensive school |
| Not Selective | 3 | Standard enrollment based on catchment |
| NULL/Missing | 0 | Not applicable (e.g., primary schools) |

**Note**: For primary schools, this field is typically "Not Selective" - consider excluding from primary school rankings or setting weight to 0.

---

### 3. FOEI_Value
| Attribute | Value |
|-----------|-------|
| **Type** | varchar (stored as string, may contain numbers or "np") |
| **Description** | Family Occupation and Education Index. A school-level measure of educational disadvantage. **IMPORTANT: Higher FOEI = MORE disadvantage (inverse of ICSEA)**. Used for NSW Department's Resource Allocation Model. |
| **Update Frequency** | Annually in December (as at May) |
| **Primary Weight** | **8** |
| **Rationale** | Complements ICSEA by focusing on family background. Important for understanding socio-economic context. |

**Secondary Weight (Value-Based Scoring) - INVERTED:**
| FOEI Range | Secondary Weight | Description |
|------------|------------------|-------------|
| 0-20 | 10 | Very Low Disadvantage (Affluent) |
| 21-40 | 9 | Low Disadvantage |
| 41-60 | 8 | Below Average Disadvantage |
| 61-80 | 7 | Slightly Below Average |
| 81-100 | 6 | Average Disadvantage |
| 101-120 | 5 | Slightly Above Average Disadvantage |
| 121-140 | 4 | Above Average Disadvantage |
| 141-160 | 3 | High Disadvantage |
| 161-180 | 2 | Very High Disadvantage |
| 180+ | 1 | Extreme Disadvantage |
| "np"/NULL | 0 | Not Published/Available |

**Formula**: `Secondary Weight = Math.max(1, Math.min(10, 10 - Math.floor(FOEI / 20)))`

---

### 4. Opportunity_class
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates whether the school offers Opportunity Classes (OC) for academically gifted students in Years 5-6. Entry is via a state-wide placement test. |
| **Values** | `Y` (Yes), `N` (No) |
| **Update Frequency** | As required |
| **Primary Weight** | **7** |
| **Rationale** | Schools with OC programs attract and nurture high-achieving students. Indicates school has capacity for advanced learners. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Y | 10 | Offers Opportunity Classes |
| N | 3 | Does not offer OC (standard for most schools) |
| NULL | 0 | Unknown |

**Note**: Only applicable to primary schools. For secondary schools, set weight contribution to 0 or exclude.

---

### 5. School_specialty_type
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates if the school offers a specialty focus area beyond standard curriculum. |
| **Values** | `Comprehensive`, `Technology`, `Sports`, `Language`, `Creative and Performing Arts` |
| **Update Frequency** | As required |
| **Primary Weight** | **6** |
| **Rationale** | Specialty schools offer enhanced programs in specific areas, attracting students with particular talents/interests. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Technology | 8 | STEM-focused programs |
| Language | 8 | Bilingual/language immersion programs |
| Creative and Performing Arts | 8 | Arts-focused programs (CAPA) |
| Sports | 7 | Sports high school programs |
| Comprehensive | 5 | Standard curriculum (majority of schools) |
| NULL/Missing | 3 | Unknown |

---

### 6. latest_year_enrolment_FTE
| Attribute | Value |
|-----------|-------|
| **Type** | double |
| **Description** | Full-Time Equivalent student enrollment count as reported under ABS National Schools Statistics Collection. Reflects school size and demand. |
| **Update Frequency** | Annually in December (as at August) |
| **Primary Weight** | **5** |
| **Rationale** | Larger schools may indicate popularity/demand but also mean larger class sizes. Context-dependent metric. |

**Secondary Weight (Value-Based Scoring) - By School Type:**

**For Primary Schools (K-6):**
| Enrolment Range | Secondary Weight | Description |
|-----------------|------------------|-------------|
| 800+ | 9 | Very Large (high demand) |
| 600-799 | 8 | Large |
| 400-599 | 7 | Medium-Large |
| 250-399 | 6 | Medium |
| 150-249 | 5 | Small-Medium |
| 80-149 | 4 | Small |
| <80 | 3 | Very Small (may indicate rural/remote) |
| NULL | 0 | Unknown |

**For Secondary Schools (7-12):**
| Enrolment Range | Secondary Weight | Description |
|-----------------|------------------|-------------|
| 1500+ | 9 | Very Large |
| 1200-1499 | 8 | Large |
| 900-1199 | 7 | Medium-Large |
| 600-899 | 6 | Medium |
| 400-599 | 5 | Small-Medium |
| 200-399 | 4 | Small |
| <200 | 3 | Very Small |
| NULL | 0 | Unknown |

**Note**: Consider normalizing within school type for fair comparison.

---

## 📊 CONTEXTUAL COLUMNS

### 7. ASGS_remoteness
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Australian Statistical Geography Standard remoteness classification based on road distance to service centres. |
| **Values** | `Major Cities of Australia`, `Inner Regional Australia`, `Outer Regional Australia`, `Remote Australia`, `Very Remote Australia` |
| **Update Frequency** | As required |
| **Primary Weight** | **4** |
| **Rationale** | Schools in major cities typically have more resources, but remote schools may excel in their context. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Major Cities of Australia | 8 | Best access to resources, services |
| Inner Regional Australia | 6 | Good access to services |
| Outer Regional Australia | 5 | Moderate access |
| Remote Australia | 4 | Limited access |
| Very Remote Australia | 3 | Very limited access (but may receive extra funding) |
| NULL | 0 | Unknown |

---

### 8. LBOTE_pct
| Attribute | Value |
|-----------|-------|
| **Type** | integer (or "np" if suppressed) |
| **Description** | Percentage of students from Language Backgrounds Other Than English. A student is LBOTE if a language other than English is spoken at home. |
| **Update Frequency** | Annually in December (as at March) |
| **Primary Weight** | **3** |
| **Rationale** | Indicates cultural diversity. Not inherently positive or negative for quality - contextual indicator. High LBOTE may indicate need for ESL support but also cultural richness. |

**Secondary Weight (Value-Based Scoring):**
| LBOTE % | Secondary Weight | Description |
|---------|------------------|-------------|
| 40-60% | 7 | Balanced diversity |
| 20-39% | 6 | Moderate diversity |
| 61-80% | 6 | High diversity |
| 10-19% | 5 | Some diversity |
| 81-100% | 5 | Very high LBOTE (may need strong ESL programs) |
| 0-9% | 4 | Low diversity |
| "np"/NULL | 3 | Suppressed (≤5 students) or unknown |

**Note**: This is a **neutral** indicator - weighting reflects diversity balance rather than high/low preference.

---

### 9. Indigenous_pct
| Attribute | Value |
|-----------|-------|
| **Type** | varchar (percentage or "np") |
| **Description** | Percentage of students who identify as Aboriginal or Torres Strait Islander and are accepted in the community with which they associate. |
| **Update Frequency** | Annually in December (as at August) |
| **Primary Weight** | **2** |
| **Rationale** | Demographic indicator for awareness. Schools with higher Indigenous populations may receive additional support funding. Not a quality indicator. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Any valid % | 5 | Neutral - demographic data only |
| "np" | 5 | Suppressed for privacy (≤5 students) |
| NULL | 0 | Unknown |

**Note**: This field should be used for **awareness and filtering** only, not as a positive/negative quality indicator.

---

### 10. Preschool_ind
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates whether a preschool is attached to the school. |
| **Values** | `Y`, `N` |
| **Update Frequency** | As required |
| **Primary Weight** | **2** |
| **Rationale** | Having an attached preschool provides educational continuity for families. Minor benefit for primary schools. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Y | 7 | Has preschool - continuity benefit |
| N | 4 | No preschool |
| NULL | 0 | Unknown |

**Note**: Only relevant for primary schools.

---

### 11. Intensive_english_centre
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates whether an Intensive English Centre (IEC) is attached to the school for newly arrived students with limited English. |
| **Values** | `Y`, `N` |
| **Update Frequency** | As required |
| **Primary Weight** | **2** |
| **Rationale** | IECs provide specialized support. Indicates school has resources for diverse learners. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| Y | 7 | Has IEC - specialized support available |
| N | 5 | No IEC (standard) |
| NULL | 0 | Unknown |

---

### 12. Distance_education
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates school's distance education capability. |
| **Values** | `S` (Distance Ed School), `C` (Distance Ed Centre), `N` (No Distance Ed) |
| **Update Frequency** | As required |
| **Primary Weight** | **1** |
| **Rationale** | Indicates flexible learning options. Relevant for families needing remote learning. |

**Secondary Weight (Value-Based Scoring):**
| Value | Secondary Weight | Description |
|-------|------------------|-------------|
| S | 7 | Dedicated distance education school |
| C | 6 | Has distance education centre |
| N | 5 | No distance education (standard) |
| NULL | 0 | Unknown |

---

## 🏷️ CLASSIFICATION COLUMNS (For Filtering, Not Ranking)

These columns are used to **filter and categorize** schools, not to rank them.

### 13. Level_of_schooling
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Primary classification of school type/level. |
| **Values** | `Primary School`, `Secondary School`, `Infants School`, `Central/Community School`, `Other School`, `Schools for Specific Purposes` |
| **Primary Weight** | **0** (Filter only) |

**Use**: Filter schools before ranking. Compare primary with primary, secondary with secondary.

---

### 14. School_subtype
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Further breakdown of school level/type. Indicates year levels offered. |
| **Values** | Various (e.g., `Kindergarten to Year 6`, `Year 7 to Year 12`, `Kindergarten to Year 12`, etc.) |
| **Primary Weight** | **0** (Filter only) |

**Use**: Useful for identifying junior/senior secondary, K-12 schools, etc.

---

### 15. School_gender
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Student gender policy of the school. |
| **Values** | `Coed`, `Boys`, `Girls` |
| **Primary Weight** | **0** (Filter only) |

**Use**: Filter based on gender preference. Single-sex schools may be preferred by some families.

---

### 16. Late_opening_school
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Indicates if school has later opening hours. |
| **Values** | `Y`, `N` |
| **Primary Weight** | **0** (Filter only) |

---

### 17. Support_classes
| Attribute | Value |
|-----------|-------|
| **Type** | varchar |
| **Description** | Information about support classes for students with additional needs. |
| **Status** | **Currently Not Available** |
| **Primary Weight** | **0** (Not available) |

---

### 18-25. Electoral/Administrative Regions
| Field | Description | Primary Weight |
|-------|-------------|----------------|
| `LGA` | Local Government Area | 0 (Filter) |
| `electorate_from_2023` | NSW State electorate (2022 boundaries) | 0 (Filter) |
| `electorate_2015_2022` | NSW State electorate (old boundaries) | 0 (Not used) |
| `fed_electorate_from_2025` | Federal electorate (2025) | 0 (Filter) |
| `fed_electorate_2016_2024` | Federal electorate (old) | 0 (Not used) |
| `Operational_directorate` | NSW DoE directorate | 0 (Admin) |
| `Principal_network` | DoE principal network | 0 (Admin) |
| `SA4` | ABS Statistical Area Level 4 | 0 (Filter) |

---

## 📍 LOCATION COLUMNS (For Display/Filtering)

| Field | Type | Description | Primary Weight |
|-------|------|-------------|----------------|
| `Street` | varchar | Street address | 0 |
| `Town_suburb` | varchar | Suburb/town name | 0 |
| `Postcode` | integer | Australian postcode | 0 |
| `Latitude` | decimal | Geographic latitude (WGS84) | 0 |
| `Longitude` | decimal | Geographic longitude (WGS84) | 0 |
| `Assets unit` | varchar | Department's asset management district | 0 |

---

## 📞 CONTACT COLUMNS (For Display Only)

| Field | Type | Description | Primary Weight |
|-------|------|-------------|----------------|
| `Phone` | varchar | School phone number | 0 |
| `School_Email` | varchar | School email address | 0 |
| `Website` | varchar | School website URL | 0 |
| `Fax` | varchar | School fax number | 0 |
| `Operational_directorate_office_phone` | varchar | DoE office phone | 0 |
| `Operational_directorate_office_address` | varchar | DoE office address | 0 |

---

## 🏛️ ADMINISTRATIVE COLUMNS (Not for Ranking)

| Field | Type | Description | Primary Weight |
|-------|------|-------------|----------------|
| `Operational_directorate_office` | varchar | DoE directorate office | 0 |
| `FACS_district` | varchar | Family and Community Services district | 0 |
| `Local_health_district` | varchar | NSW local health district | 0 |
| `AECG_region` | varchar | Aboriginal Education Consultative Group region | 0 |

---

## 🔢 IDENTIFIER COLUMNS

| Field | Type | Description | Primary Weight |
|-------|------|-------------|----------------|
| `School_code` | integer | Official NSW Education school identifier | 0 (Primary Key) |
| `AgeID` | integer | Commonwealth issued location ID | 0 |
| `School_name` | varchar | Official school name | 0 (Display) |

---

## 📅 DATE COLUMNS

| Field | Type | Description | Primary Weight |
|-------|------|-------------|----------------|
| `Date_1st_teacher` | datetime | School opening date (first teacher on duty) | 0 |
| `Date_extracted` | datetime | Data extraction date | 0 |

---

## Summary: Ranking Weights Table

| Column | Primary Weight | Secondary Weight Range | Max Contribution |
|--------|----------------|------------------------|------------------|
| ICSEA_value | 10 | 0-10 | 100 |
| Selective_school | 9 | 0-10 | 90 |
| FOEI_Value | 8 | 0-10 | 80 |
| Opportunity_class | 7 | 0-10 | 70 |
| School_specialty_type | 6 | 3-8 | 48 |
| latest_year_enrolment_FTE | 5 | 0-9 | 45 |
| ASGS_remoteness | 4 | 0-8 | 32 |
| LBOTE_pct | 3 | 3-7 | 21 |
| Indigenous_pct | 2 | 0-5 | 10 |
| Preschool_ind | 2 | 0-7 | 14 |
| Intensive_english_centre | 2 | 0-7 | 14 |
| Distance_education | 1 | 0-7 | 7 |
| **TOTAL** | **59** | - | **531** |

---

## Calculation Example

**Example School**: Sydney Boys High School

| Column | Raw Value | Primary Weight | Secondary Weight | Score |
|--------|-----------|----------------|------------------|-------|
| ICSEA_value | 1176 | 10 | 9 | 90 |
| Selective_school | Fully Selective | 9 | 10 | 90 |
| FOEI_Value | 25 | 8 | 9 | 72 |
| Opportunity_class | N | 7 | 3 | 21 |
| School_specialty_type | Comprehensive | 6 | 5 | 30 |
| latest_year_enrolment_FTE | 1200 | 5 | 8 | 40 |
| ASGS_remoteness | Major Cities | 4 | 8 | 32 |
| LBOTE_pct | 76 | 3 | 6 | 18 |
| Indigenous_pct | np | 2 | 5 | 10 |
| Preschool_ind | N | 2 | 4 | 8 |
| Intensive_english_centre | N | 2 | 5 | 10 |
| Distance_education | N | 1 | 5 | 5 |
| **TOTAL** | - | - | - | **426** |

**Final Score**: 426 / 531 × 100 = **80.2%**

---

## School Type-Specific Adjustments

### For Primary Schools Only:
- Include: Opportunity_class, Preschool_ind
- Exclude/Reduce: Selective_school (set to weight 0)

### For Secondary Schools Only:
- Include: Selective_school
- Exclude/Reduce: Opportunity_class, Preschool_ind (set to weight 0)

### For Central/Community Schools (K-12):
- Include all columns
- May need to average primary + secondary metrics

---

## Data Quality Notes

1. **Suppressed Values**: Fields showing `"np"` have values suppressed for privacy (≤5 students)
2. **NULL Values**: Missing data should be scored as 0 and excluded from max possible score
3. **School Type**: Always filter by `Level_of_schooling` before comparing rankings
4. **Annual Updates**: ICSEA and FOEI are updated annually - rankings should be refreshed accordingly

---

## Future Enhancements

Consider adding external data sources for more comprehensive ranking:
- HSC results (from NESA/ACARA)
- NAPLAN results
- Teacher retention rates
- Facilities/infrastructure ratings
- Parent satisfaction surveys
- Extracurricular program breadth

---

*Document Version: 1.0*
*Created: December 2025*

