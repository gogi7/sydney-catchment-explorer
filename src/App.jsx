import { MapView } from './components/Map';
import { ControlPanel, SchoolInfoPanel, SelectiveSchoolsPanel } from './components/Panels';
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

function App() {
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
    </div>
  );
}

export default App;
