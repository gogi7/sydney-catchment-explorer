import { GeoJSON } from 'react-leaflet';
import { useCallback, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { CATCHMENT_COLORS, CATCHMENT_HOVER_COLORS } from '../../utils/constants';
import {
  getPriceColor,
  getPriceOpacity,
  formatPriceShort,
  getPriceTier
} from '../../utils/priceHeatMap';
import {
  getRankingColor,
  getRankingOpacity,
  getRankingTier,
} from '../../utils/rankingHeatMap';

export function CatchmentLayer({ data, type }) {
  const selectSchool = useAppStore((state) => state.selectSchool);
  const getSchoolByCode = useAppStore((state) => state.getSchoolByCode);
  const setHoveredCatchment = useAppStore((state) => state.setHoveredCatchment);
  const getCatchmentPriceData = useAppStore((state) => state.getCatchmentPriceData);
  const priceRange = useAppStore((state) => state.priceRange);
  const showHeatMap = useAppStore((state) => state.layers.priceHeatMap);
  const schoolRankings = useAppStore((state) => {
    if (type === 'primary') return state.primarySchoolRankings;
    if (type === 'secondary') return state.secondarySchoolRankings;
    return {};
  });
  const rankingRange = useAppStore((state) => {
    if (type === 'primary') return state.primaryRankingRange;
    if (type === 'secondary') return state.secondaryRankingRange;
    return null;
  });
  const showRankingHeatMap = useAppStore((state) => {
    if (type === 'primary') return state.layers.primaryRankingHeatMap;
    if (type === 'secondary') return state.layers.secondaryRankingHeatMap;
    return false;
  });

  const colors = CATCHMENT_COLORS[type] || CATCHMENT_COLORS.primary;
  const hoverColors = CATCHMENT_HOVER_COLORS[type] || CATCHMENT_HOVER_COLORS.primary;

  // Memoize price data lookup for all catchments
  const priceDataMap = useMemo(() => {
    if (!showHeatMap || !data?.features) return {};
    
    const map = {};
    data.features.forEach(feature => {
      const schoolCode = feature.properties?.USE_ID;
      if (schoolCode) {
        map[schoolCode] = getCatchmentPriceData(schoolCode);
      }
    });
    return map;
  }, [showHeatMap, data, getCatchmentPriceData]);

  const rankingDataMap = useMemo(() => {
    if (!showRankingHeatMap || !data?.features) return {};
    const map = {};
    data.features.forEach(feature => {
      const code = feature.properties?.USE_ID;
      if (code) map[code] = schoolRankings[String(code)] || null;
    });
    return map;
  }, [showRankingHeatMap, data, schoolRankings]);

  const activeHeatMap = showHeatMap ? 'price' : showRankingHeatMap ? 'ranking' : 'none';

  const style = useCallback((feature) => {
    if (activeHeatMap === 'none') {
      return {
        fillColor: colors.fill,
        fillOpacity: colors.fillOpacity,
        color: colors.stroke,
        weight: colors.weight,
        opacity: colors.strokeOpacity,
      };
    }

    const schoolCode = feature.properties?.USE_ID;

    if (activeHeatMap === 'price') {
      const priceData = priceDataMap[schoolCode];
      const avgPrice = priceData?.avgPrice;
      const hasData = avgPrice && avgPrice > 0;
      return {
        fillColor: getPriceColor(avgPrice, priceRange),
        fillOpacity: getPriceOpacity(hasData),
        color: hasData ? '#1e293b' : '#94a3b8',
        weight: hasData ? 1.5 : 1,
        opacity: hasData ? 0.7 : 0.4,
      };
    }

    const ranking = rankingDataMap[schoolCode];
    const rank = ranking?.rank;
    const hasData = rank != null && rank > 0;
    return {
      fillColor: getRankingColor(rank, rankingRange),
      fillOpacity: getRankingOpacity(hasData),
      color: hasData ? '#1e293b' : '#94a3b8',
      weight: hasData ? 1.5 : 1,
      opacity: hasData ? 0.7 : 0.4,
    };
  }, [activeHeatMap, colors, priceDataMap, priceRange, rankingDataMap, rankingRange]);

  const onEachFeature = useCallback((feature, layer) => {
    const props = feature.properties;
    const schoolName = props.USE_DESC || 'Unknown School';
    const schoolCode = props.USE_ID;
    const catchmentType = props.CATCH_TYPE || '';
    
    const priceData = priceDataMap[schoolCode];
    const rankingData = rankingDataMap[schoolCode];

    let extraSection = '';
    if (showHeatMap && priceData) {
      const tier = getPriceTier(priceData.avgPrice, priceRange);
      extraSection = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">
            Property Prices (${priceData.suburb})
          </p>
          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">
            ${formatPriceShort(priceData.avgPrice)} avg
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
            ${tier} • ${priceData.totalSales} sales
          </p>
          ${priceData.avgPricePerSqm ? `
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">
              ${formatPriceShort(priceData.avgPricePerSqm)}/m² avg
            </p>
          ` : ''}
        </div>
      `;
    } else if (showHeatMap) {
      extraSection = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af; font-style: italic;">
            No recent sales data available
          </p>
        </div>
      `;
    } else if (showRankingHeatMap && rankingData) {
      const tier = getRankingTier(rankingData.rank, rankingRange);
      extraSection = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">
            School Ranking
          </p>
          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">
            #${rankingData.rank} • ${rankingData.percentage_score}%
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
            ${tier}
          </p>
        </div>
      `;
    } else if (showRankingHeatMap) {
      extraSection = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af; font-style: italic;">
            No ranking data available
          </p>
        </div>
      `;
    }

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
        ${extraSection}
      </div>
    `;

    layer.bindPopup(popupContent);

    // Event handlers
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        const schoolCode = feature.properties?.USE_ID;

        if (activeHeatMap === 'price') {
          const priceData = priceDataMap[schoolCode];
          const avgPrice = priceData?.avgPrice;
          layer.setStyle({
            fillColor: getPriceColor(avgPrice, priceRange),
            fillOpacity: 0.8,
            weight: 3,
          });
        } else if (activeHeatMap === 'ranking') {
          const ranking = rankingDataMap[schoolCode];
          const rank = ranking?.rank;
          layer.setStyle({
            fillColor: getRankingColor(rank, rankingRange),
            fillOpacity: 0.8,
            weight: 3,
          });
        } else {
          layer.setStyle({
            fillColor: hoverColors.fill,
            fillOpacity: hoverColors.fillOpacity,
            weight: 3,
          });
        }
        layer.bringToFront();
        setHoveredCatchment(props);
      },
      mouseout: (e) => {
        const layer = e.target;
        const schoolCode = feature.properties?.USE_ID;

        if (activeHeatMap === 'price') {
          const priceData = priceDataMap[schoolCode];
          const avgPrice = priceData?.avgPrice;
          const hasData = avgPrice && avgPrice > 0;
          layer.setStyle({
            fillColor: getPriceColor(avgPrice, priceRange),
            fillOpacity: getPriceOpacity(hasData),
            weight: hasData ? 1.5 : 1,
          });
        } else if (activeHeatMap === 'ranking') {
          const ranking = rankingDataMap[schoolCode];
          const rank = ranking?.rank;
          const hasData = rank != null && rank > 0;
          layer.setStyle({
            fillColor: getRankingColor(rank, rankingRange),
            fillOpacity: getRankingOpacity(hasData),
            weight: hasData ? 1.5 : 1,
          });
        } else {
          layer.setStyle({
            fillColor: colors.fill,
            fillOpacity: colors.fillOpacity,
            weight: colors.weight,
          });
        }
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
  }, [colors, hoverColors, selectSchool, getSchoolByCode, setHoveredCatchment, activeHeatMap, showHeatMap, showRankingHeatMap, priceDataMap, rankingDataMap, priceRange, rankingRange]);

  const key = useMemo(() =>
    `${type}-${activeHeatMap}-${Date.now()}`,
    [type, data, activeHeatMap, priceRange, rankingRange]
  );

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

