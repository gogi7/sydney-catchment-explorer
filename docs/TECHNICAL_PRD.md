# Sydney Catchment Explorer - Technical PRD

## 1. Product Overview

### 1.1 Vision
Sydney Catchment Explorer is an interactive web application that allows users to explore NSW public school catchment areas on an interactive map. Users can view school boundaries, access detailed school information, and understand which schools serve specific geographic areas.

### 1.2 Target Users
- Parents researching school options for their children
- Real estate professionals and property buyers
- Educational researchers and policy analysts
- Community members interested in local school resources

### 1.3 Core Value Proposition
- **Visual Discovery**: See school catchment boundaries overlaid on an interactive map
- **Data-Rich Information**: Access comprehensive school data including enrolments, demographics, and facilities
- **Easy Navigation**: Quickly find schools by location, name, or characteristics

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | React | 19.1.0 | Component-based UI |
| Build Tool | Vite | 6.3.5 | Fast development and bundling |
| Mapping Library | Leaflet | 1.9.x | Interactive maps |
| React Map Binding | React-Leaflet | 4.x | React integration for Leaflet |
| State Management | Zustand | 5.x | Lightweight global state |
| Styling | CSS Modules / CSS Variables | - | Scoped, maintainable styles |
| Linting | ESLint | 9.x | Code quality |

### 2.2 Project Structure

```
sydney-catchment-explorer/
├── public/
│   ├── data/
│   │   ├── catchments_primary.geojson    # Primary school catchments
│   │   ├── catchments_secondary.geojson  # Secondary school catchments
│   │   ├── catchments_future.geojson     # Future/planned catchments
│   │   └── schools.json                  # School master dataset
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapContainer.jsx          # Main map wrapper
│   │   │   ├── CatchmentLayer.jsx        # GeoJSON catchment polygons
│   │   │   ├── SchoolMarkers.jsx         # School location markers
│   │   │   └── MapControls.jsx           # Zoom, layer toggles
│   │   ├── Panels/
│   │   │   ├── SearchPanel.jsx           # Search and filter controls
│   │   │   ├── SchoolInfoPanel.jsx       # Selected school details
│   │   │   └── LegendPanel.jsx           # Map legend
│   │   └── UI/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Toggle.jsx
│   │       └── Card.jsx
│   ├── hooks/
│   │   ├── useSchools.js                 # School data fetching/filtering
│   │   ├── useCatchments.js              # Catchment data management
│   │   └── useMapInteraction.js          # Map event handling
│   ├── stores/
│   │   └── appStore.js                   # Zustand global state
│   ├── utils/
│   │   ├── dataTransformers.js           # Data processing utilities
│   │   ├── geoUtils.js                   # Geographic calculations
│   │   └── constants.js                  # App constants
│   ├── styles/
│   │   ├── variables.css                 # CSS custom properties
│   │   └── global.css                    # Global styles
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── docs/
│   ├── TECHNICAL_PRD.md                  # This document
│   ├── ARCHITECTURE.md                   # Architecture details
│   └── DATA_DICTIONARY.md                # Data schema documentation
└── scripts/
    └── convertCsv.js                     # CSV to JSON converter
```

### 2.3 Data Architecture

#### 2.3.1 Catchment GeoJSON Schema
```json
{
  "type": "Feature",
  "properties": {
    "USE_ID": "8479",           // School code (links to master data)
    "CATCH_TYPE": "HIGH_COED",  // Catchment type
    "USE_DESC": "School Name",  // Display name
    "ADD_DATE": "20250123",     // Last updated
    "KINDERGART": 0,            // Kindergarten intake year (0 = N/A)
    "YEAR1": 0,                 // Year 1 intake
    "YEAR7": 2026,              // Year 7 intake (for secondary)
    "PRIORITY": null            // Priority level
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], ...]]
  }
}
```

#### 2.3.2 School Master Data Schema
Key fields from NSW Public Schools Master Dataset:

| Field | Type | Description |
|-------|------|-------------|
| School_code | Integer | Unique identifier |
| School_name | String | Official name |
| Street | String | Address |
| Town_suburb | String | Suburb |
| Postcode | Integer | Postcode |
| Latitude | Decimal | Location lat |
| Longitude | Decimal | Location lng |
| Level_of_schooling | String | Primary/Secondary/etc |
| Selective_school | String | Selective status |
| ICSEA_value | Integer | Socio-educational index |
| latest_year_enrolment_FTE | Double | Student enrolment |

---

## 3. Feature Specifications

### 3.1 Phase 1: Core Map & Catchments (MVP)

#### F1.1 Interactive Map
- **Description**: Full-screen interactive map centered on Sydney
- **Base Map**: OpenStreetMap tiles
- **Controls**: Zoom, pan, locate me
- **Default View**: Greater Sydney metropolitan area

#### F1.2 Catchment Visualization
- **Layers**: Primary, Secondary, Future catchments
- **Styling**: Color-coded by catchment type
- **Interaction**: Hover highlight, click to select
- **Toggle**: Layer visibility controls

#### F1.3 School Markers
- **Display**: Markers at school locations
- **Popup**: Basic school info on click
- **Clustering**: Group markers at low zoom levels

### 3.2 Phase 2: Search & Filters

#### F2.1 Address Search
- Search by address/suburb to pan map
- Show catchments for searched location

#### F2.2 School Search
- Search by school name
- Autocomplete suggestions
- Jump to school on selection

#### F2.3 Filters
- Filter by school level (Primary/Secondary)
- Filter by catchment type
- Filter by selective/non-selective
- Filter by opportunity class availability

### 3.3 Phase 3: Detailed Information

#### F3.1 School Detail Panel
- Full school information display
- Contact details, website links
- Enrolment statistics
- Demographics (ICSEA, Indigenous %, LBOTE %)

#### F3.2 Comparison Mode
- Compare multiple schools side-by-side
- Highlight differences in key metrics

---

## 4. Code Style Guide

### 4.1 JavaScript/JSX Conventions

```javascript
// ✅ Functional components with hooks
export function SchoolMarker({ school, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Marker
      position={[school.Latitude, school.Longitude]}
      onClick={() => onClick(school)}
    />
  );
}

// ✅ Named exports for components
export function MapContainer() { ... }

// ✅ Default export only for main App
export default function App() { ... }

// ✅ Custom hooks prefixed with 'use'
export function useSchools() { ... }

// ✅ Constants in UPPER_SNAKE_CASE
export const DEFAULT_MAP_CENTER = [-33.8688, 151.2093];
export const DEFAULT_ZOOM = 11;
```

### 4.2 File Naming
- Components: `PascalCase.jsx`
- Hooks: `useCamelCase.js`
- Utilities: `camelCase.js`
- Stores: `camelCaseStore.js`

### 4.3 CSS Conventions
```css
/* CSS Variables for theming */
:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-catchment-primary: #22c55e;
  --color-catchment-secondary: #3b82f6;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --border-radius: 8px;
}

/* BEM-like naming for component styles */
.school-panel { }
.school-panel__header { }
.school-panel__content { }
.school-panel--expanded { }
```

### 4.4 State Management Pattern
```javascript
// Zustand store pattern
import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // State
  selectedSchool: null,
  visibleLayers: { primary: true, secondary: true, future: false },
  
  // Actions
  selectSchool: (school) => set({ selectedSchool: school }),
  toggleLayer: (layer) => set((state) => ({
    visibleLayers: {
      ...state.visibleLayers,
      [layer]: !state.visibleLayers[layer]
    }
  })),
  
  // Computed/derived (via get)
  getVisibleSchools: () => { ... }
}));
```

---

## 5. Performance Considerations

### 5.1 Data Loading
- Lazy load catchment GeoJSON files
- Use React Suspense for loading states
- Consider web workers for large dataset processing

### 5.2 Map Optimization
- Implement marker clustering for 2000+ schools
- Use canvas renderer for GeoJSON layers
- Debounce map interaction events

### 5.3 Bundle Optimization
- Code split by route/feature
- Tree-shake unused Leaflet plugins
- Preload critical map tiles

---

## 6. Development Workflow

### 6.1 Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### 6.2 Git Workflow
- Feature branches from `main`
- PR required for merges
- Conventional commits (feat:, fix:, docs:)

---

## 7. Future Considerations

### 7.1 Potential Enhancements
- Private school integration
- Historical catchment boundary changes
- School rating/review aggregation
- Property listing integration
- Mobile app version

### 7.2 Scalability
- CDN for static assets
- Edge caching for GeoJSON
- API backend for dynamic queries

---

*Last Updated: December 2025*
*Version: 1.0.0*

