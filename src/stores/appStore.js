import { create } from 'zustand';

// Sydney CBD coordinates
const SYDNEY_CENTER = [-33.8688, 151.2093];
const DEFAULT_ZOOM = 11;

export const useAppStore = create((set, get) => ({
  // ============ MAP STATE ============
  mapCenter: SYDNEY_CENTER,
  mapZoom: DEFAULT_ZOOM,
  
  // ============ LAYER VISIBILITY ============
  layers: {
    primary: true,
    secondary: true,
    future: false,
    schoolMarkers: true,
  },
  
  // ============ SELECTION STATE ============
  selectedSchool: null,
  highlightedSchools: [], // Array of school codes for multi-select highlighting
  hoveredCatchment: null,
  
  // ============ FILTER STATE ============
  filters: {
    schoolLevel: 'all', // 'all' | 'primary' | 'secondary' | 'infants'
    selective: 'all',   // 'all' | 'yes' | 'no'
    searchQuery: '',
  },
  
  // ============ DATA STATE ============
  schools: [],
  catchments: {
    primary: null,
    secondary: null,
    future: null,
  },
  isLoading: true,
  error: null,
  
  // ============ MAP ACTIONS ============
  setMapView: (center, zoom) => set({ 
    mapCenter: center, 
    mapZoom: zoom 
  }),
  
  resetMapView: () => set({
    mapCenter: SYDNEY_CENTER,
    mapZoom: DEFAULT_ZOOM,
  }),
  
  // ============ LAYER ACTIONS ============
  toggleLayer: (layerName) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: !state.layers[layerName],
    },
  })),
  
  setLayerVisibility: (layerName, visible) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: visible,
    },
  })),
  
  // ============ SELECTION ACTIONS ============
  selectSchool: (school) => set({ selectedSchool: school }),
  
  // Toggle highlight for a school (Alt+Click multi-select)
  toggleHighlightSchool: (schoolCode) => set((state) => {
    const isHighlighted = state.highlightedSchools.includes(schoolCode);
    return {
      highlightedSchools: isHighlighted
        ? state.highlightedSchools.filter((code) => code !== schoolCode)
        : [...state.highlightedSchools, schoolCode],
    };
  }),
  
  // Clear all highlighted schools
  clearHighlightedSchools: () => set({ highlightedSchools: [] }),
  
  clearSelection: () => set({ 
    selectedSchool: null,
    highlightedSchools: [],
    hoveredCatchment: null,
  }),
  
  setHoveredCatchment: (catchment) => set({ hoveredCatchment: catchment }),
  
  // ============ FILTER ACTIONS ============
  setFilter: (filterName, value) => set((state) => ({
    filters: {
      ...state.filters,
      [filterName]: value,
    },
  })),
  
  clearFilters: () => set({
    filters: {
      schoolLevel: 'all',
      selective: 'all',
      searchQuery: '',
    },
  }),
  
  // ============ DATA ACTIONS ============
  setSchools: (schools) => set({ 
    schools, 
    isLoading: false 
  }),
  
  setCatchments: (type, data) => set((state) => ({
    catchments: {
      ...state.catchments,
      [type]: data,
    },
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  // ============ SELECTORS ============
  getFilteredSchools: () => {
    const { schools, filters } = get();
    
    return schools.filter((school) => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const name = (school.School_name || '').toLowerCase();
        const suburb = (school.Town_suburb || '').toLowerCase();
        if (!name.includes(query) && !suburb.includes(query)) {
          return false;
        }
      }
      
      // School level filter
      if (filters.schoolLevel !== 'all') {
        const level = (school.Level_of_schooling || '').toLowerCase();
        if (filters.schoolLevel === 'primary' && !level.includes('primary')) {
          return false;
        }
        if (filters.schoolLevel === 'secondary' && !level.includes('secondary')) {
          return false;
        }
        if (filters.schoolLevel === 'infants' && !level.includes('infants')) {
          return false;
        }
      }
      
      // Selective filter
      if (filters.selective !== 'all') {
        const selective = (school.Selective_school || '').toLowerCase();
        if (filters.selective === 'yes' && !selective.includes('selective')) {
          return false;
        }
        if (filters.selective === 'no' && selective.includes('selective') && !selective.includes('not')) {
          return false;
        }
      }
      
      return true;
    });
  },
  
  getSchoolByCode: (code) => {
    const { schools } = get();
    return schools.find((s) => s.School_code === code);
  },
  
  // Get selective schools (Fully Selective and Partially Selective)
  getSelectiveSchools: () => {
    const { schools } = get();
    return schools.filter((school) => {
      const selective = school.Selective_school || '';
      return selective === 'Fully Selective' || selective === 'Partially Selective';
    }).sort((a, b) => {
      // Sort by selective type first (Fully before Partially), then by name
      if (a.Selective_school !== b.Selective_school) {
        return a.Selective_school === 'Fully Selective' ? -1 : 1;
      }
      return (a.School_name || '').localeCompare(b.School_name || '');
    });
  },
  
  // Get autocomplete suggestions for school search
  getSchoolSuggestions: (query, maxResults = 10) => {
    if (!query || query.length < 1) return [];
    
    const { schools } = get();
    const lowerQuery = query.toLowerCase();
    
    // Sort by relevance: starts with query first, then contains query
    const suggestions = schools
      .filter((school) => {
        const name = (school.School_name || '').toLowerCase();
        const suburb = (school.Town_suburb || '').toLowerCase();
        return name.includes(lowerQuery) || suburb.includes(lowerQuery);
      })
      .sort((a, b) => {
        const aName = (a.School_name || '').toLowerCase();
        const bName = (b.School_name || '').toLowerCase();
        const aStartsWith = aName.startsWith(lowerQuery);
        const bStartsWith = bName.startsWith(lowerQuery);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      })
      .slice(0, maxResults);
    
    return suggestions;
  },
}));

