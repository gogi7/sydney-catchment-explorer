import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SCHOOL_LEVEL_OPTIONS } from '../../utils/constants';
import { generateLegendStops } from '../../utils/priceHeatMap';
import { generateRankingLegendStops } from '../../utils/rankingHeatMap';
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
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
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
  const priceRange = useAppStore((state) => state.priceRange);
  const propertySales = useAppStore((state) => state.propertySales);
  const activeHeatMap = useAppStore((state) => state.activeHeatMap);
  const setActiveHeatMap = useAppStore((state) => state.setActiveHeatMap);
  const primaryRankingRange = useAppStore((state) => state.primaryRankingRange);
  const secondaryRankingRange = useAppStore((state) => state.secondaryRankingRange);
  const totalPrimaryRankedSchools = useAppStore((state) => state.totalPrimaryRankedSchools);
  const totalSecondaryRankedSchools = useAppStore((state) => state.totalSecondaryRankedSchools);

  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Generate heat map legend stops
  const heatMapLegend = useMemo(() => {
    if (!priceRange) return [];
    return generateLegendStops(priceRange, 5);
  }, [priceRange]);

  const activeRankingRange = activeHeatMap === 'primaryRanking' ? primaryRankingRange : secondaryRankingRange;

  const rankingLegend = useMemo(() => {
    if (!activeRankingRange) return [];
    return generateRankingLegendStops(activeRankingRange);
  }, [activeRankingRange]);

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
    <div className={`control-panel ${isCollapsed ? 'control-panel--collapsed' : ''}`}>
      <div className="control-panel__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="control-panel__header-content">
          <h1 className="control-panel__title">
            <span className="control-panel__icon">🗺️</span>
            Sydney Catchment Explorer
          </h1>
          <p className="control-panel__subtitle">
            {schools.length.toLocaleString()} schools loaded
          </p>
        </div>
        <span className={`control-panel__chevron ${isCollapsed ? '' : 'control-panel__chevron--open'}`}>
          ‹
        </span>
      </div>

      <div className="control-panel__body">

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

      {/* Heat Map Overlays */}
      <div className="control-section">
        <label className="control-section__label">Heat Map Overlay</label>

        <label className="layer-toggle">
          <input
            type="radio"
            name="heatmap"
            checked={activeHeatMap === 'none'}
            onChange={() => setActiveHeatMap('none')}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--none"></span>
          <span className="layer-toggle__label">None</span>
        </label>

        <label className="layer-toggle layer-toggle--heatmap">
          <input
            type="radio"
            name="heatmap"
            checked={activeHeatMap === 'price'}
            onChange={() => setActiveHeatMap('price')}
            disabled={!propertySales.suburbStats?.length}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--heatmap"></span>
          <span className="layer-toggle__label">
            Price Heat Map
            {propertySales.suburbStats?.length > 0 ? (
              <span className="layer-toggle__count">
                {propertySales.suburbStats.length} suburbs
              </span>
            ) : (
              <span className="layer-toggle__count layer-toggle__count--disabled">
                No data
              </span>
            )}
          </span>
        </label>

        <label className="layer-toggle layer-toggle--ranking">
          <input
            type="radio"
            name="heatmap"
            checked={activeHeatMap === 'primaryRanking'}
            onChange={() => setActiveHeatMap('primaryRanking')}
            disabled={!totalPrimaryRankedSchools}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--ranking-primary"></span>
          <span className="layer-toggle__label">
            Primary Ranking
            {totalPrimaryRankedSchools > 0 ? (
              <span className="layer-toggle__count">{totalPrimaryRankedSchools} schools</span>
            ) : (
              <span className="layer-toggle__count layer-toggle__count--disabled">No data</span>
            )}
          </span>
        </label>

        <label className="layer-toggle layer-toggle--ranking">
          <input
            type="radio"
            name="heatmap"
            checked={activeHeatMap === 'secondaryRanking'}
            onChange={() => setActiveHeatMap('secondaryRanking')}
            disabled={!totalSecondaryRankedSchools}
          />
          <span className="layer-toggle__indicator layer-toggle__indicator--ranking-secondary"></span>
          <span className="layer-toggle__label">
            Secondary Ranking
            {totalSecondaryRankedSchools > 0 ? (
              <span className="layer-toggle__count">{totalSecondaryRankedSchools} schools</span>
            ) : (
              <span className="layer-toggle__count layer-toggle__count--disabled">No data</span>
            )}
          </span>
        </label>

        {activeHeatMap === 'price' && heatMapLegend.length > 0 && (
          <div className="heatmap-legend">
            <div className="heatmap-legend__gradient">
              {heatMapLegend.map((stop, index) => (
                <div
                  key={index}
                  className="heatmap-legend__stop"
                  style={{ backgroundColor: stop.color }}
                  title={stop.label}
                />
              ))}
            </div>
            <div className="heatmap-legend__labels">
              <span>{heatMapLegend[0]?.label}</span>
              <span>Median</span>
              <span>{heatMapLegend[heatMapLegend.length - 1]?.label}</span>
            </div>
            <p className="heatmap-legend__note">
              Based on recent sales in school suburb
            </p>
          </div>
        )}

        {(activeHeatMap === 'primaryRanking' || activeHeatMap === 'secondaryRanking') && rankingLegend.length > 0 && (
          <div className="heatmap-legend heatmap-legend--ranking">
            <div className="heatmap-legend__gradient">
              {rankingLegend.map((stop, index) => (
                <div
                  key={index}
                  className="heatmap-legend__stop"
                  style={{ backgroundColor: stop.color }}
                  title={stop.label}
                />
              ))}
            </div>
            <div className="heatmap-legend__labels">
              <span>{rankingLegend[0]?.label}</span>
              <span>Average</span>
              <span>{rankingLegend[rankingLegend.length - 1]?.label}</span>
            </div>
            <p className="heatmap-legend__note">
              Red = low score • Green = high score
            </p>
          </div>
        )}
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

      {/* Data Explorer Link */}
      <div className="control-section">
        <a href="#/data" className="data-explorer-link">
          📊 Data Explorer
          <span className="data-explorer-link__hint">View all database tables & sample data</span>
        </a>
      </div>

      </div>
    </div>
  );
}

