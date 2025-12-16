import { GeoJSON } from 'react-leaflet';
import { useCallback, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { CATCHMENT_COLORS, CATCHMENT_HOVER_COLORS } from '../../utils/constants';

export function CatchmentLayer({ data, type }) {
  const selectSchool = useAppStore((state) => state.selectSchool);
  const getSchoolByCode = useAppStore((state) => state.getSchoolByCode);
  const setHoveredCatchment = useAppStore((state) => state.setHoveredCatchment);

  const colors = CATCHMENT_COLORS[type] || CATCHMENT_COLORS.primary;
  const hoverColors = CATCHMENT_HOVER_COLORS[type] || CATCHMENT_HOVER_COLORS.primary;

  const style = useCallback(() => ({
    fillColor: colors.fill,
    fillOpacity: colors.fillOpacity,
    color: colors.stroke,
    weight: colors.weight,
    opacity: colors.strokeOpacity,
  }), [colors]);

  const onEachFeature = useCallback((feature, layer) => {
    const props = feature.properties;
    const schoolName = props.USE_DESC || 'Unknown School';
    const schoolCode = props.USE_ID;
    const catchmentType = props.CATCH_TYPE || '';

    // Create popup content
    const popupContent = `
      <div class="catchment-popup">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
          ${schoolName}
        </h3>
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          ${catchmentType.replace(/_/g, ' ')}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
          School Code: ${schoolCode}
        </p>
      </div>
    `;

    layer.bindPopup(popupContent);

    // Event handlers
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          fillColor: hoverColors.fill,
          fillOpacity: hoverColors.fillOpacity,
          weight: 3,
        });
        layer.bringToFront();
        setHoveredCatchment(props);
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle({
          fillColor: colors.fill,
          fillOpacity: colors.fillOpacity,
          weight: colors.weight,
        });
        setHoveredCatchment(null);
      },
      click: () => {
        // Find and select the corresponding school
        const school = getSchoolByCode(parseInt(schoolCode));
        if (school) {
          selectSchool(school);
        }
      },
    });
  }, [colors, hoverColors, selectSchool, getSchoolByCode, setHoveredCatchment]);

  // Memoize the key to force re-render when data changes
  const key = useMemo(() => `${type}-${Date.now()}`, [type, data]);

  if (!data || !data.features) {
    return null;
  }

  return (
    <GeoJSON
      key={key}
      data={data}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

