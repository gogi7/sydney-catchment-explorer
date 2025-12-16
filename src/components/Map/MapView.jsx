import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import { useAppStore } from '../../stores/appStore';
import { CatchmentLayer } from './CatchmentLayer';
import { SchoolMarkers } from './SchoolMarkers';
import { 
  SYDNEY_CENTER, 
  DEFAULT_ZOOM, 
  MIN_ZOOM, 
  MAX_ZOOM,
  TILE_URL,
  TILE_ATTRIBUTION 
} from '../../utils/constants';
import './MapView.css';

export function MapView() {
  const layers = useAppStore((state) => state.layers);
  const catchments = useAppStore((state) => state.catchments);

  return (
    <MapContainer
      center={SYDNEY_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      className="map-container"
    >
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
      />
      
      <ZoomControl position="bottomright" />
      
      {/* Render catchment layers */}
      {layers.primary && catchments.primary && (
        <CatchmentLayer 
          data={catchments.primary} 
          type="primary" 
        />
      )}
      
      {layers.secondary && catchments.secondary && (
        <CatchmentLayer 
          data={catchments.secondary} 
          type="secondary" 
        />
      )}
      
      {layers.future && catchments.future && (
        <CatchmentLayer 
          data={catchments.future} 
          type="future" 
        />
      )}
      
      {/* Render school markers */}
      {layers.schoolMarkers && (
        <SchoolMarkers />
      )}
    </MapContainer>
  );
}

