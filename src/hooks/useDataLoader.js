import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function useDataLoader() {
  const setSchools = useAppStore((state) => state.setSchools);
  const setCatchments = useAppStore((state) => state.setCatchments);
  const setError = useAppStore((state) => state.setError);
  const setLoading = useAppStore((state) => state.setLoading);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        // Load all data in parallel
        const [schoolsRes, primaryRes, secondaryRes, futureRes] = await Promise.all([
          fetch('/data/schools.json'),
          fetch('/data/catchments_primary.geojson'),
          fetch('/data/catchments_secondary.geojson'),
          fetch('/data/catchments_future.geojson'),
        ]);

        // Check for errors
        if (!schoolsRes.ok) throw new Error('Failed to load schools data');
        if (!primaryRes.ok) throw new Error('Failed to load primary catchments');
        if (!secondaryRes.ok) throw new Error('Failed to load secondary catchments');
        if (!futureRes.ok) throw new Error('Failed to load future catchments');

        // Parse JSON
        const [schools, primary, secondary, future] = await Promise.all([
          schoolsRes.json(),
          primaryRes.json(),
          secondaryRes.json(),
          futureRes.json(),
        ]);

        // Update store
        setSchools(schools);
        setCatchments('primary', primary);
        setCatchments('secondary', secondary);
        setCatchments('future', future);

        console.log(`Loaded ${schools.length} schools`);
        console.log(`Loaded ${primary.features?.length || 0} primary catchments`);
        console.log(`Loaded ${secondary.features?.length || 0} secondary catchments`);
        console.log(`Loaded ${future.features?.length || 0} future catchments`);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message);
      }
    }

    loadData();
  }, [setSchools, setCatchments, setError, setLoading]);
}

