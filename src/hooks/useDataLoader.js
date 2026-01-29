import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function useDataLoader() {
  const setSchools = useAppStore((state) => state.setSchools);
  const setCatchments = useAppStore((state) => state.setCatchments);
  const setPropertySales = useAppStore((state) => state.setPropertySales);
  const setError = useAppStore((state) => state.setError);
  const setLoading = useAppStore((state) => state.setLoading);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        // Load all data in parallel
        const base = import.meta.env.BASE_URL;
        const [schoolsRes, primaryRes, secondaryRes, futureRes] = await Promise.all([
          fetch(`${base}data/schools.json`),
          fetch(`${base}data/catchments_primary.geojson`),
          fetch(`${base}data/catchments_secondary.geojson`),
          fetch(`${base}data/catchments_future.geojson`),
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
        
        // Load property sales data (non-blocking - don't fail if not available)
        loadPropertySalesData(setPropertySales);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message);
      }
    }

    loadData();
  }, [setSchools, setCatchments, setPropertySales, setError, setLoading]);
}

/**
 * Load property sales data in the background
 * This is loaded separately so the main app doesn't fail if sales data is missing
 */
async function loadPropertySalesData(setPropertySales) {
  try {
    const base = import.meta.env.BASE_URL;
    const [recentSalesRes, suburbStatsRes, postcodeStatsRes, metadataRes] = await Promise.all([
      fetch(`${base}data/sales/recent_sales.json`),
      fetch(`${base}data/sales/suburb_stats.json`),
      fetch(`${base}data/sales/postcode_stats.json`),
      fetch(`${base}data/sales/metadata.json`),
    ]);

    const salesData = {};

    if (recentSalesRes.ok) {
      salesData.recentSales = await recentSalesRes.json();
      console.log(`Loaded ${salesData.recentSales.length} recent property sales`);
    }

    if (suburbStatsRes.ok) {
      salesData.suburbStats = await suburbStatsRes.json();
      console.log(`Loaded stats for ${salesData.suburbStats.length} suburbs`);
    }

    if (postcodeStatsRes.ok) {
      salesData.postcodeStats = await postcodeStatsRes.json();
      console.log(`Loaded stats for ${salesData.postcodeStats.length} postcodes`);
    }

    if (metadataRes.ok) {
      salesData.metadata = await metadataRes.json();
    }

    setPropertySales(salesData);
  } catch (error) {
    console.warn('Property sales data not available:', error.message);
  }
}

