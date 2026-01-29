# Sydney Catchment Explorer - Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Sydney Catchment Explorer                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   App.jsx    │───▶│  AppStore    │◀───│   Data Layer             │  │
│  │   (Root)     │    │  (Zustand)   │    │   - schools.json         │  │
│  └──────┬───────┘    └──────────────┘    │   - catchments_*.geojson │  │
│         │                    ▲           └──────────────────────────┘  │
│         │                    │                                          │
│         ▼                    │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Component Layer                           │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │   │
│  │  │  Map/          │  │  Panels/       │  │  UI/           │    │   │
│  │  │  - MapContainer│  │  - SearchPanel │  │  - Button      │    │   │
│  │  │  - Catchments  │  │  - SchoolInfo  │  │  - Input       │    │   │
│  │  │  - SchoolMarker│  │  - Legend      │  │  - Toggle      │    │   │
│  │  │  - Controls    │  │                │  │  - Card        │    │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         Hooks Layer                              │   │
│  │  - useSchools()    - useCatchments()    - useMapInteraction()   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
├── Header (optional)
├── MapContainer
│   ├── TileLayer (OpenStreetMap)
│   ├── CatchmentLayer
│   │   ├── Primary Catchments (GeoJSON)
│   │   ├── Secondary Catchments (GeoJSON)
│   │   └── Future Catchments (GeoJSON)
│   ├── SchoolMarkers
│   │   └── MarkerClusterGroup
│   │       └── Marker (per school)
│   └── MapControls
│       ├── ZoomControl
│       └── LayerControl
├── SidePanel
│   ├── SearchPanel
│   │   ├── AddressSearch
│   │   └── SchoolSearch
│   ├── FilterPanel
│   │   ├── LevelFilter
│   │   ├── TypeFilter
│   │   └── CatchmentToggle
│   └── SchoolInfoPanel
│       └── SchoolDetails
└── LegendPanel
```

## Data Flow

### 1. Application State (Zustand Store)

```javascript
// src/stores/appStore.js

const useAppStore = create((set, get) => ({
  // ============ STATE ============
  
  // Map State
  mapCenter: [-33.8688, 151.2093],  // Sydney CBD
  mapZoom: 11,
  
  // Layer Visibility
  layers: {
    primary: true,
    secondary: true,
    future: false,
    schoolMarkers: true
  },
  
  // Selection State
  selectedSchool: null,
  hoveredCatchment: null,
  
  // Filter State
  filters: {
    schoolLevel: 'all',        // 'all' | 'primary' | 'secondary'
    selective: 'all',          // 'all' | 'yes' | 'no'
    opportunityClass: 'all',   // 'all' | 'yes' | 'no'
    searchQuery: ''
  },
  
  // Data State
  schools: [],
  catchments: {
    primary: null,
    secondary: null,
    future: null
  },
  isLoading: true,
  
  // ============ ACTIONS ============
  
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
  
  toggleLayer: (layerName) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: !state.layers[layerName]
    }
  })),
  
  selectSchool: (school) => set({ selectedSchool: school }),
  clearSelection: () => set({ selectedSchool: null }),
  
  setFilter: (filterName, value) => set((state) => ({
    filters: {
      ...state.filters,
      [filterName]: value
    }
  })),
  
  setSchools: (schools) => set({ schools, isLoading: false }),
  setCatchments: (type, data) => set((state) => ({
    catchments: {
      ...state.catchments,
      [type]: data
    }
  })),
  
  // ============ SELECTORS ============
  
  getFilteredSchools: () => {
    const { schools, filters } = get();
    return schools.filter(school => {
      // Apply filters
      if (filters.schoolLevel !== 'all') {
        const level = school.Level_of_schooling?.toLowerCase() || '';
        if (!level.includes(filters.schoolLevel)) return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!school.School_name?.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }
}));
```

### 2. Data Loading Flow

```
App Mount
    │
    ├──▶ useEffect: Load Schools Data
    │       │
    │       └──▶ fetch('/data/schools.json')
    │               │
    │               └──▶ appStore.setSchools(data)
    │
    └──▶ useEffect: Load Catchments
            │
            ├──▶ fetch('/data/catchments_primary.geojson')
            ├──▶ fetch('/data/catchments_secondary.geojson')
            └──▶ fetch('/data/catchments_future.geojson')
                    │
                    └──▶ appStore.setCatchments(type, data)
```

### 3. User Interaction Flow

```
User Clicks School Marker
    │
    ├──▶ Marker onClick handler
    │       │
    │       └──▶ appStore.selectSchool(school)
    │
    └──▶ SchoolInfoPanel (reacts to state)
            │
            └──▶ Displays school details
```

## Component Specifications

### MapContainer.jsx
```jsx
/**
 * Main map component wrapper
 * 
 * Responsibilities:
 * - Initialize Leaflet map
 * - Handle map events (zoom, pan)
 * - Render child layers
 * 
 * Props: none (uses store directly)
 * 
 * Dependencies:
 * - react-leaflet: MapContainer, TileLayer
 * - zustand: useAppStore
 */
```

### CatchmentLayer.jsx
```jsx
/**
 * Renders GeoJSON catchment boundaries
 * 
 * Responsibilities:
 * - Fetch and parse GeoJSON data
 * - Style polygons by catchment type
 * - Handle hover/click interactions
 * 
 * Props:
 * - type: 'primary' | 'secondary' | 'future'
 * - visible: boolean
 * 
 * Styling:
 * - Primary: Green (#22c55e) with 0.3 opacity
 * - Secondary: Blue (#3b82f6) with 0.3 opacity
 * - Future: Orange (#f59e0b) with 0.2 opacity
 */
```

### SchoolMarkers.jsx
```jsx
/**
 * Renders school location markers with clustering
 * 
 * Responsibilities:
 * - Display markers for all visible schools
 * - Cluster markers at low zoom
 * - Show popup on click
 * 
 * Props: none (uses store for schools data)
 * 
 * Marker Icons:
 * - Primary: Green circle
 * - Secondary: Blue circle
 * - Other: Gray circle
 */
```

## Styling Architecture

### CSS Custom Properties (variables.css)
```css
:root {
  /* Colors - Brand */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #64748b;
  
  /* Colors - Catchments */
  --color-catchment-primary: #22c55e;
  --color-catchment-secondary: #3b82f6;
  --color-catchment-future: #f59e0b;
  
  /* Colors - UI */
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
  --color-text: #1e293b;
  --color-text-muted: #64748b;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  
  /* Z-index layers */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-tooltip: 400;
}
```

## Error Handling

### Data Loading Errors
```javascript
// Pattern for data fetching with error handling
async function loadData(url, onSuccess, onError) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    onSuccess(data);
  } catch (error) {
    console.error(`Failed to load ${url}:`, error);
    onError(error);
  }
}
```

### Component Error Boundaries
```jsx
// Wrap map components in error boundaries
<ErrorBoundary fallback={<MapErrorFallback />}>
  <MapContainer>
    <CatchmentLayer type="primary" />
  </MapContainer>
</ErrorBoundary>
```

## Performance Patterns

### 1. Memoization
```javascript
// Memoize expensive computations
const filteredSchools = useMemo(() => {
  return schools.filter(applyFilters);
}, [schools, filters]);

// Memoize callbacks
const handleSchoolClick = useCallback((school) => {
  selectSchool(school);
}, [selectSchool]);
```

### 2. Virtualization
```javascript
// For long school lists, use virtualization
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={schools.length}
  itemSize={60}
>
  {({ index, style }) => (
    <SchoolListItem school={schools[index]} style={style} />
  )}
</FixedSizeList>
```

### 3. Debouncing
```javascript
// Debounce search input
const debouncedSearch = useMemo(
  () => debounce((query) => setFilter('searchQuery', query), 300),
  [setFilter]
);
```

---

*This architecture is designed for scalability and maintainability. Follow these patterns when adding new features.*

