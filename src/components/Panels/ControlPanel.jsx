import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { SCHOOL_LEVEL_OPTIONS } from '../../utils/constants';
import './ControlPanel.css';

// Debounce helper for search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

export function ControlPanel() {
  const layers = useAppStore((state) => state.layers);
  const toggleLayer = useAppStore((state) => state.toggleLayer);
  const filters = useAppStore((state) => state.filters);
  const setFilter = useAppStore((state) => state.setFilter);
  const schools = useAppStore((state) => state.schools);
  const catchments = useAppStore((state) => state.catchments);
  const selectSchool = useAppStore((state) => state.selectSchool);
  const getSchoolSuggestions = useAppStore((state) => state.getSchoolSuggestions);
  const highlightedSchools = useAppStore((state) => state.highlightedSchools);
  const clearHighlightedSchools = useAppStore((state) => state.clearHighlightedSchools);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 150);
  const suggestions = getSchoolSuggestions(debouncedSearchQuery, 10);

  const primaryCount = catchments.primary?.features?.length || 0;
  const secondaryCount = catchments.secondary?.features?.length || 0;
  const futureCount = catchments.future?.features?.length || 0;

  // Handle selecting a school from suggestions
  const handleSelectSuggestion = useCallback((school) => {
    setFilter('searchQuery', school.School_name);
    selectSchool(school);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }, [setFilter, selectSchool]);

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, activeSuggestionIndex, handleSelectSuggestion]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="control-panel">
      <div className="control-panel__header">
        <h1 className="control-panel__title">
          <span className="control-panel__icon">🗺️</span>
          Sydney Catchment Explorer
        </h1>
        <p className="control-panel__subtitle">
          {schools.length.toLocaleString()} schools loaded
        </p>
      </div>

      {/* Search with Autocomplete */}
      <div className="control-section">
        <label className="control-section__label">Search Schools</label>
        <div className="search-autocomplete">
          <input
            ref={searchInputRef}
            type="text"
            className="control-input"
            placeholder="Start typing school name..."
            value={filters.searchQuery}
            onChange={(e) => {
              setFilter('searchQuery', e.target.value);
              setShowSuggestions(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul ref={suggestionsRef} className="search-suggestions">
              {suggestions.map((school, index) => (
                <li
                  key={school.School_code}
                  className={`search-suggestion ${index === activeSuggestionIndex ? 'search-suggestion--active' : ''}`}
                  onClick={() => handleSelectSuggestion(school)}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                >
                  <span className="search-suggestion__name">{school.School_name}</span>
                  <span className="search-suggestion__info">
                    {school.Town_suburb} • {school.Level_of_schooling || 'School'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Highlighted Schools Count */}
      {highlightedSchools.length > 0 && (
        <div className="control-section control-section--highlighted">
          <div className="highlighted-info">
            <span className="highlighted-info__count">
              ⭐ {highlightedSchools.length} school{highlightedSchools.length !== 1 ? 's' : ''} highlighted
            </span>
            <button 
              className="highlighted-info__clear"
              onClick={clearHighlightedSchools}
            >
              Clear
            </button>
          </div>
          <p className="highlighted-info__hint">
            Hold Alt + Click to highlight more schools
          </p>
        </div>
      )}

      {/* School Level Filter */}
      <div className="control-section">
        <label className="control-section__label">School Level</label>
        <select
          className="control-select"
          value={filters.schoolLevel}
          onChange={(e) => setFilter('schoolLevel', e.target.value)}
        >
          {SCHOOL_LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Layer Toggles */}
      <div className="control-section">
        <label className="control-section__label">Catchment Layers</label>
        
        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={layers.primary}
            onChange={() => toggleLayer('primary')}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--primary"></span>
          <span className="layer-toggle__label">
            Primary Catchments
            <span className="layer-toggle__count">{primaryCount}</span>
          </span>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={layers.secondary}
            onChange={() => toggleLayer('secondary')}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--secondary"></span>
          <span className="layer-toggle__label">
            Secondary Catchments
            <span className="layer-toggle__count">{secondaryCount}</span>
          </span>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={layers.future}
            onChange={() => toggleLayer('future')}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--future"></span>
          <span className="layer-toggle__label">
            Future Catchments
            <span className="layer-toggle__count">{futureCount}</span>
          </span>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={layers.schoolMarkers}
            onChange={() => toggleLayer('schoolMarkers')}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--markers"></span>
          <span className="layer-toggle__label">
            School Markers
            <span className="layer-toggle__count">{schools.length}</span>
          </span>
        </label>
      </div>

      {/* Legend */}
      <div className="control-section">
        <label className="control-section__label">Legend</label>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
            <span>Primary Schools</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
            <span>Secondary Schools</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Future Catchments</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#64748b' }}></span>
            <span>Other Schools</span>
          </div>
          <div className="legend-item legend-item--highlight">
            <span className="legend-color legend-color--highlight" style={{ backgroundColor: '#fbbf24', border: '2px solid #fbbf24' }}></span>
            <span>Highlighted (Alt+Click)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

