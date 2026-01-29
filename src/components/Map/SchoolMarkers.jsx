import { CircleMarker, Popup, useMap, Pane } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { SCHOOL_MARKER_COLORS } from '../../utils/constants';

// Custom pane names for z-index control
const HIGHLIGHTED_PANE = 'highlightedMarkers';
const HIGHLIGHTED_PANE_ZINDEX = 650; // Above overlayPane (400) and shadowPane (500)

function SchoolPopup({ school }) {
  const level = school.Level_of_schooling || 'School';
  const enrolment = school.latest_year_enrolment_FTE 
    ? Math.round(school.latest_year_enrolment_FTE).toLocaleString()
    : 'N/A';
  const icsea = school.ICSEA_value || 'N/A';
  
  return (
    <div className="school-popup">
      <h3 style={{ 
        margin: '0 0 8px 0', 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#1f2937',
        lineHeight: '1.3'
      }}>
        {school.School_name}
      </h3>
      
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
        <p style={{ margin: '0 0 4px 0' }}>
          📍 {school.Town_suburb}, {school.Postcode}
        </p>
        <p style={{ margin: '0' }}>
          🏫 {level}
        </p>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        fontSize: '11px',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '8px',
        marginTop: '8px'
      }}>
        <div>
          <span style={{ color: '#9ca3af' }}>Enrolment</span>
          <div style={{ fontWeight: '600', color: '#374151' }}>{enrolment}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af' }}>ICSEA</span>
          <div style={{ fontWeight: '600', color: '#374151' }}>{icsea}</div>
        </div>
        {school.Selective_school !== 'Not Selective' && (
          <div>
            <span style={{ color: '#9ca3af' }}>Type</span>
            <div style={{ fontWeight: '600', color: '#3b82f6' }}>
              {school.Selective_school}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolMarker({ school }) {
  const selectSchool = useAppStore((state) => state.selectSchool);
  const selectedSchool = useAppStore((state) => state.selectedSchool);
  const highlightedSchools = useAppStore((state) => state.highlightedSchools);
  const toggleHighlightSchool = useAppStore((state) => state.toggleHighlightSchool);
  
  const level = school.Level_of_schooling || 'default';
  const color = SCHOOL_MARKER_COLORS[level] || SCHOOL_MARKER_COLORS.default;
  const isSelected = selectedSchool?.School_code === school.School_code;
  const isHighlighted = highlightedSchools.includes(school.School_code);
  
  if (!school.Latitude || !school.Longitude) {
    return null;
  }

  // Determine marker styling based on selection/highlight state
  const getMarkerStyle = () => {
    if (isSelected && isHighlighted) {
      // Both selected and highlighted - extra emphasis
      return {
        radius: 12,
        fillColor: color,
        fillOpacity: 1,
        color: '#fbbf24', // Gold ring
        weight: 4,
        opacity: 1,
      };
    }
    if (isHighlighted) {
      // Highlighted via Alt+Click
      return {
        radius: 10,
        fillColor: color,
        fillOpacity: 1,
        color: '#fbbf24', // Gold ring for highlighted
        weight: 3,
        opacity: 1,
      };
    }
    if (isSelected) {
      // Single selected school
      return {
        radius: 10,
        fillColor: color,
        fillOpacity: 1,
        color: '#1f2937',
        weight: 3,
        opacity: 1,
      };
    }
    // Default state
    return {
      radius: 6,
      fillColor: color,
      fillOpacity: 0.8,
      color: '#ffffff',
      weight: 1.5,
      opacity: 1,
    };
  };

  const style = getMarkerStyle();

  const handleClick = (e) => {
    // Alt+Click for multi-select highlighting
    if (e.originalEvent.altKey) {
      e.originalEvent.stopPropagation();
      toggleHighlightSchool(school.School_code);
    } else {
      // Regular click - select school
      selectSchool(school);
    }
  };

  // Use highlighted pane for selected/highlighted markers to bring them to front
  const paneName = (isSelected || isHighlighted) ? HIGHLIGHTED_PANE : undefined;

  return (
    <CircleMarker
      center={[school.Latitude, school.Longitude]}
      radius={style.radius}
      pane={paneName}
      pathOptions={{
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
      }}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup>
        <SchoolPopup school={school} />
      </Popup>
    </CircleMarker>
  );
}

// Component to handle flying to selected school
function MapController() {
  const map = useMap();
  const selectedSchool = useAppStore((state) => state.selectedSchool);
  
  useEffect(() => {
    if (selectedSchool && selectedSchool.Latitude && selectedSchool.Longitude) {
      map.flyTo(
        [selectedSchool.Latitude, selectedSchool.Longitude],
        14,
        { duration: 0.8 }
      );
    }
  }, [map, selectedSchool]);
  
  return null;
}

// Component to create custom panes for z-index control
function PaneCreator() {
  const map = useMap();
  
  useEffect(() => {
    // Create custom pane for highlighted markers if it doesn't exist
    if (!map.getPane(HIGHLIGHTED_PANE)) {
      const pane = map.createPane(HIGHLIGHTED_PANE);
      pane.style.zIndex = HIGHLIGHTED_PANE_ZINDEX;
    }
  }, [map]);
  
  return null;
}

export function SchoolMarkers() {
  const schools = useAppStore((state) => state.schools);
  const selectedSchool = useAppStore((state) => state.selectedSchool);
  const highlightedSchools = useAppStore((state) => state.highlightedSchools);
  
  // Memoize the separation of regular vs highlighted schools for performance
  const { regularSchools, highlightedSchoolsList } = useMemo(() => {
    const highlighted = [];
    const regular = [];
    
    schools.forEach((school) => {
      const isSelected = selectedSchool?.School_code === school.School_code;
      const isHighlighted = highlightedSchools.includes(school.School_code);
      
      if (isSelected || isHighlighted) {
        highlighted.push(school);
      } else {
        regular.push(school);
      }
    });
    
    return { regularSchools: regular, highlightedSchoolsList: highlighted };
  }, [schools, selectedSchool, highlightedSchools]);
  
  return (
    <>
      <PaneCreator />
      <MapController />
      
      {/* Render regular markers first */}
      {regularSchools.map((school) => (
        <SchoolMarker 
          key={school.School_code} 
          school={school} 
        />
      ))}
      
      {/* Render highlighted/selected markers last so they're on top */}
      {highlightedSchoolsList.map((school) => (
        <SchoolMarker 
          key={school.School_code} 
          school={school} 
        />
      ))}
    </>
  );
}

