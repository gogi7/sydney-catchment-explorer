// Map constants
export const SYDNEY_CENTER = [-33.8688, 151.2093];
export const DEFAULT_ZOOM = 11;
export const MIN_ZOOM = 8;
export const MAX_ZOOM = 18;

// Tile layer
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Catchment colors
export const CATCHMENT_COLORS = {
  primary: {
    fill: '#22c55e',
    stroke: '#16a34a',
    fillOpacity: 0.25,
    strokeOpacity: 0.8,
    weight: 2,
  },
  secondary: {
    fill: '#3b82f6',
    stroke: '#2563eb',
    fillOpacity: 0.25,
    strokeOpacity: 0.8,
    weight: 2,
  },
  future: {
    fill: '#f59e0b',
    stroke: '#d97706',
    fillOpacity: 0.15,
    strokeOpacity: 0.6,
    weight: 2,
  },
};

// Catchment hover colors
export const CATCHMENT_HOVER_COLORS = {
  primary: {
    fill: '#22c55e',
    fillOpacity: 0.45,
  },
  secondary: {
    fill: '#3b82f6',
    fillOpacity: 0.45,
  },
  future: {
    fill: '#f59e0b',
    fillOpacity: 0.35,
  },
};

// School marker colors by type
export const SCHOOL_MARKER_COLORS = {
  'Primary School': '#22c55e',
  'Infants School': '#10b981',
  'Secondary School': '#3b82f6',
  'Central/Community School': '#8b5cf6',
  'Schools for Specific Purposes': '#f59e0b',
  default: '#64748b',
};

// School level options for filters
export const SCHOOL_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'primary', label: 'Primary Schools' },
  { value: 'secondary', label: 'Secondary Schools' },
  { value: 'infants', label: 'Infants Schools' },
];

// Selective options for filters
export const SELECTIVE_OPTIONS = [
  { value: 'all', label: 'All Schools' },
  { value: 'yes', label: 'Selective Only' },
  { value: 'no', label: 'Non-Selective Only' },
];

// Catchment type labels
export const CATCHMENT_TYPE_LABELS = {
  PRIMARY_COED: 'Primary (Coed)',
  PRIMARY_BOYS: 'Primary (Boys)',
  PRIMARY_GIRLS: 'Primary (Girls)',
  HIGH_COED: 'Secondary (Coed)',
  HIGH_BOYS: 'Secondary (Boys)',
  HIGH_GIRLS: 'Secondary (Girls)',
  CENTRAL: 'Central School',
  INFANTS: 'Infants School',
};

