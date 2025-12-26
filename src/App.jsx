import { useState, useEffect } from 'react';
import { MapView } from './components/Map';
import { ControlPanel, SchoolInfoPanel, SelectiveSchoolsPanel, PropertySalesPanel } from './components/Panels';
import { DataExplorer } from './components/DataExplorer';
import { useDataLoader } from './hooks/useDataLoader';
import { useAppStore } from './stores/appStore';
import './App.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <h2>Loading Sydney Catchment Explorer</h2>
      <p>Fetching school and catchment data...</p>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="error-screen">
      <div className="error-icon">⚠️</div>
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}

/**
 * Simple hash-based router hook
 */
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/');
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}

function MapApp() {
  // Load data on mount
  useDataLoader();
  
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">
      <MapView />
      <ControlPanel />
      <SchoolInfoPanel />
      <SelectiveSchoolsPanel />
      <PropertySalesPanel />
    </div>
  );
}

function App() {
  const route = useHashRoute();

  // Route to Data Explorer page
  if (route === '/data' || route === '/data-explorer') {
    return <DataExplorer />;
  }

  // Default: Map application
  return <MapApp />;
}

export default App;
