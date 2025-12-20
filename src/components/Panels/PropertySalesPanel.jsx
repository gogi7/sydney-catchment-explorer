import { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import './PropertySalesPanel.css';

/**
 * Format currency in AUD
 */
function formatPrice(price) {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format date in Australian format
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Individual sale card
 */
function SaleCard({ sale }) {
  const address = [sale.unitNumber, sale.houseNumber, sale.streetName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="sale-card">
      <div className="sale-address">
        <span className="sale-street">{address || 'Address not available'}</span>
        <span className="sale-suburb">{sale.suburb}, {sale.postcode}</span>
      </div>
      <div className="sale-details">
        <div className="sale-price">{formatPrice(sale.price)}</div>
        <div className="sale-meta">
          <span className="sale-date">{formatDate(sale.contractDate)}</span>
          {sale.area && sale.areaUnit === 'M' && (
            <span className="sale-area">{sale.area} m²</span>
          )}
          {sale.pricePerSqm && (
            <span className="sale-ppsm">{formatPrice(sale.pricePerSqm)}/m²</span>
          )}
        </div>
        {sale.propertyType && (
          <span className="sale-type">{sale.propertyType}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Suburb statistics summary
 */
function SuburbStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="suburb-stats">
      <h4>Suburb Statistics</h4>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Total Sales</span>
          <span className="stat-value">{stats.totalSales}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Average Price</span>
          <span className="stat-value">{formatPrice(stats.avgPrice)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Min Price</span>
          <span className="stat-value">{formatPrice(stats.minPrice)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max Price</span>
          <span className="stat-value">{formatPrice(stats.maxPrice)}</span>
        </div>
        {stats.avgArea && (
          <div className="stat-item">
            <span className="stat-label">Avg Area</span>
            <span className="stat-value">{Math.round(stats.avgArea)} m²</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Property Sales Panel - Shows property sales data for the selected school's suburb
 */
export function PropertySalesPanel() {
  const selectedSchool = useAppStore((state) => state.selectedSchool);
  const propertySales = useAppStore((state) => state.propertySales);
  const getSalesBySuburb = useAppStore((state) => state.getSalesBySuburb);
  const getSuburbStats = useAppStore((state) => state.getSuburbStats);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'price' | 'area'

  // Get suburb from selected school
  const suburb = selectedSchool?.Town_suburb;

  // Get sales and stats for the suburb
  const sales = useMemo(() => {
    if (!suburb) return [];
    return getSalesBySuburb(suburb);
  }, [suburb, getSalesBySuburb]);

  const stats = useMemo(() => {
    if (!suburb) return null;
    return getSuburbStats(suburb);
  }, [suburb, getSuburbStats]);

  // Sort sales
  const sortedSales = useMemo(() => {
    if (!sales.length) return [];
    
    return [...sales].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'area':
          return (b.area || 0) - (a.area || 0);
        case 'date':
        default:
          return new Date(b.contractDate) - new Date(a.contractDate);
      }
    }).slice(0, 50); // Limit to 50 most relevant
  }, [sales, sortBy]);

  // Don't show panel if no school selected or no sales data
  if (!selectedSchool || !propertySales.recentSales?.length) {
    return null;
  }

  // Show panel even if no sales for this specific suburb (to inform user)
  const hasSales = sales.length > 0;

  return (
    <div className={`property-sales-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-content">
          <span className="header-icon">🏠</span>
          <h3>Property Sales</h3>
          {hasSales && <span className="sales-count">{sales.length} sales</span>}
        </div>
        <button className="toggle-btn">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="panel-content">
          {suburb && (
            <div className="suburb-header">
              <h4>Recent Sales in {suburb}</h4>
              <span className="postcode">{selectedSchool.Postcode}</span>
            </div>
          )}

          {hasSales ? (
            <>
              <SuburbStats stats={stats} />

              <div className="sort-controls">
                <span>Sort by:</span>
                <button 
                  className={sortBy === 'date' ? 'active' : ''}
                  onClick={() => setSortBy('date')}
                >
                  Date
                </button>
                <button 
                  className={sortBy === 'price' ? 'active' : ''}
                  onClick={() => setSortBy('price')}
                >
                  Price
                </button>
                <button 
                  className={sortBy === 'area' ? 'active' : ''}
                  onClick={() => setSortBy('area')}
                >
                  Size
                </button>
              </div>

              <div className="sales-list">
                {sortedSales.map((sale, index) => (
                  <SaleCard key={`${sale.id}-${index}`} sale={sale} />
                ))}
              </div>

              {sales.length > 50 && (
                <div className="more-sales-note">
                  Showing 50 of {sales.length} sales
                </div>
              )}
            </>
          ) : (
            <div className="no-sales">
              <p>No recent property sales data available for {suburb}.</p>
              <p className="hint">
                Sales data is sourced from NSW Valuer General.
              </p>
            </div>
          )}

          <div className="data-source">
            <span>Source: </span>
            <a 
              href="https://valuation.property.nsw.gov.au" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              NSW Valuer General
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertySalesPanel;
