import React, { useState, useEffect } from 'react';
import './DataExplorer.css';

/**
 * Data Explorer Page
 * Shows all database tables, schemas, sample data for understanding what's available
 */
export function DataExplorer() {
  const [salesSchemaInfo, setSalesSchemaInfo] = useState(null);
  const [schoolsSchemaInfo, setSchoolsSchemaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeDataSource, setActiveDataSource] = useState('sales');
  const [activeTable, setActiveTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/sales/schema_info.json`).then(res => {
        if (!res.ok) throw new Error('Failed to load sales schema info');
        return res.json();
      }),
      fetch(`${base}data/schools/schema_info.json`).then(res => {
        if (!res.ok) throw new Error('Failed to load schools schema info');
        return res.json();
      })
    ])
      .then(([salesData, schoolsData]) => {
        setSalesSchemaInfo(salesData);
        setSchoolsSchemaInfo(schoolsData);
        setLoading(false);
        // Set first table as active
        const tables = Object.keys(salesData.tables || {});
        if (tables.length > 0) {
          setActiveTable(tables[0]);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="data-explorer">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading database schema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-explorer">
        <div className="error-container">
          <h2>⚠️ Error Loading Schema</h2>
          <p>{error}</p>
          <p className="hint">Run: <code>node scripts/exportSchemaInfo.js</code> and <code>node scripts/exportSchoolsData.js</code> to generate schema info</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return Number(num).toLocaleString();
  };

  const formatCurrency = (num) => {
    if (num === null || num === undefined) return '-';
    return '$' + Number(num).toLocaleString();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-AU');
  };

  // Get current schema based on active data source
  const currentSchemaInfo = activeDataSource === 'sales' ? salesSchemaInfo : schoolsSchemaInfo;

  return (
    <div className="data-explorer">
      <header className="explorer-header">
        <div className="header-content">
          <h1>📊 Data Explorer</h1>
          <p className="subtitle">Database schema, sample data, and statistics</p>
          <a href="/" className="back-link">← Back to Map</a>
        </div>
        <div className="header-meta">
          <span>Sales Generated: {formatDate(salesSchemaInfo?.generated)}</span>
          <span>Schools Generated: {formatDate(schoolsSchemaInfo?.generated)}</span>
        </div>
      </header>

      <nav className="data-source-tabs">
        <button 
          className={activeDataSource === 'sales' ? 'active' : ''} 
          onClick={() => {
            setActiveDataSource('sales');
            setActiveTable(Object.keys(salesSchemaInfo?.tables || {})[0]);
          }}
        >
          🏠 Property Sales Data
        </button>
        <button 
          className={activeDataSource === 'schools' ? 'active' : ''} 
          onClick={() => {
            setActiveDataSource('schools');
            setActiveTable(Object.keys(schoolsSchemaInfo?.tables || {})[0]);
          }}
        >
          🏫 Schools Data
        </button>
      </nav>

      <nav className="explorer-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button 
          className={activeTab === 'tables' ? 'active' : ''} 
          onClick={() => setActiveTab('tables')}
        >
          📋 Tables & Schema
        </button>
        <button 
          className={activeTab === 'samples' ? 'active' : ''} 
          onClick={() => setActiveTab('samples')}
        >
          🔍 Sample Data
        </button>
        <button 
          className={activeTab === 'statistics' ? 'active' : ''} 
          onClick={() => setActiveTab('statistics')}
        >
          📊 Statistics
        </button>
        <button 
          className={activeTab === 'values' ? 'active' : ''} 
          onClick={() => setActiveTab('values')}
        >
          🏷️ Column Values
        </button>
        {activeDataSource === 'schools' && (
          <>
            <button 
              className={activeTab === 'rankings' ? 'active' : ''} 
              onClick={() => setActiveTab('rankings')}
            >
              🏆 Rankings
            </button>
            <button 
              className={activeTab === 'analysis' ? 'active' : ''} 
              onClick={() => setActiveTab('analysis')}
            >
              📋 Column Analysis
            </button>
          </>
        )}
      </nav>

      <main className="explorer-content">
        {activeTab === 'overview' && (
          <OverviewTab 
            schemaInfo={currentSchemaInfo} 
            salesSchemaInfo={salesSchemaInfo}
            schoolsSchemaInfo={schoolsSchemaInfo}
            activeDataSource={activeDataSource}
            formatNumber={formatNumber} 
            formatCurrency={formatCurrency} 
          />
        )}
        {activeTab === 'tables' && (
          <TablesTab 
            schemaInfo={currentSchemaInfo} 
            activeTable={activeTable} 
            setActiveTable={setActiveTable}
          />
        )}
        {activeTab === 'samples' && (
          <SamplesTab 
            schemaInfo={currentSchemaInfo} 
            activeTable={activeTable} 
            setActiveTable={setActiveTable}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
        {activeTab === 'statistics' && (
          <StatisticsTab 
            schemaInfo={currentSchemaInfo} 
            activeDataSource={activeDataSource}
            formatNumber={formatNumber} 
            formatCurrency={formatCurrency} 
          />
        )}
        {activeTab === 'values' && (
          <ColumnValuesTab schemaInfo={currentSchemaInfo} formatNumber={formatNumber} />
        )}
        {activeTab === 'rankings' && activeDataSource === 'schools' && (
          <RankingsTab />
        )}
        {activeTab === 'analysis' && activeDataSource === 'schools' && (
          <SchoolColumnAnalysisTab />
        )}
      </main>
    </div>
  );
}

function OverviewTab({ schemaInfo, salesSchemaInfo, schoolsSchemaInfo, activeDataSource, formatNumber, formatCurrency }) {
  const stats = schemaInfo?.statistics?.propertySales || schemaInfo?.statistics?.schools || {};
  
  return (
    <div className="tab-content overview-tab">
      <section className="overview-section">
        <h2>{activeDataSource === 'sales' ? 'Property Sales' : 'Schools'} Database Summary</h2>
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-value">{Object.keys(schemaInfo?.tables || {}).length}</div>
            <div className="stat-label">Tables</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Object.keys(schemaInfo?.views || {}).length}</div>
            <div className="stat-label">Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.totalRecords)}</div>
            <div className="stat-label">{activeDataSource === 'sales' ? 'Total Sales' : 'Total Schools'}</div>
          </div>
        </div>
      </section>

      <section className="overview-section">
        <h2>All Data Sources Summary</h2>
        <div className="data-sources-grid">
          <div className="data-source-card">
            <h3>🏠 Property Sales</h3>
            <div className="source-stats">
              <div>Total Sales: {formatNumber(salesSchemaInfo?.statistics?.propertySales?.totalRecords)}</div>
              <div>Tables: {Object.keys(salesSchemaInfo?.tables || {}).length}</div>
              <div>Views: {Object.keys(salesSchemaInfo?.views || {}).length}</div>
            </div>
          </div>
          <div className="data-source-card">
            <h3>🏫 Schools</h3>
            <div className="source-stats">
              <div>Total Schools: {formatNumber(schoolsSchemaInfo?.statistics?.schools?.totalRecords)}</div>
              <div>With ICSEA: {formatNumber(schoolsSchemaInfo?.statistics?.schools?.withICSEA)}</div>
              <div>With Coordinates: {formatNumber(schoolsSchemaInfo?.statistics?.schools?.withCoordinates)}</div>
            </div>
          </div>
        </div>
      </section>

      {activeDataSource === 'sales' && (
        <section className="overview-section">
          <h2>Property Sales Statistics</h2>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-name">Date Range</span>
              <span className="stat-value">
                {stats.dateRange?.earliest} to {stats.dateRange?.latest}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-name">Price Range</span>
              <span className="stat-value">
                {formatCurrency(stats.priceStats?.minPrice)} - {formatCurrency(stats.priceStats?.maxPrice)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-name">Average Price</span>
              <span className="stat-value">{formatCurrency(stats.priceStats?.avgPrice)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">Avg Price per m²</span>
              <span className="stat-value">{formatCurrency(stats.priceStats?.avgPricePerSqm)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">Area Range (m²)</span>
              <span className="stat-value">
                {formatNumber(stats.areaStats?.minArea)} - {formatNumber(stats.areaStats?.maxArea)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-name">Average Area</span>
              <span className="stat-value">{formatNumber(stats.areaStats?.avgArea)} m²</span>
            </div>
          </div>
        </section>
      )}

      {activeDataSource === 'schools' && (
        <section className="overview-section">
          <h2>Schools Statistics</h2>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-name">Total Schools</span>
              <span className="stat-value">{formatNumber(stats.totalRecords)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">With Coordinates</span>
              <span className="stat-value">{formatNumber(stats.withCoordinates)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">With ICSEA Data</span>
              <span className="stat-value">{formatNumber(stats.withICSEA)}</span>
            </div>
          </div>
        </section>
      )}

      <section className="overview-section">
        <h2>Tables Overview</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Table Name</th>
              <th>Columns</th>
              <th>Row Count</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(schemaInfo.tables || {}).map(([name, info]) => (
              <tr key={name}>
                <td><code>{name}</code></td>
                <td>{info.columns?.length || 0}</td>
                <td>{formatNumber(info.rowCount)}</td>
                <td>{getTableDescription(name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function getTableDescription(tableName) {
  const descriptions = {
    property_sales: 'Main sales records with address, price, dates, zoning',
    districts: 'LGA district codes and names',
    legal_descriptions: 'Lot/DP legal descriptions for properties',
    sale_interests: 'Purchaser and vendor information',
    import_log: 'Data import tracking and audit trail',
    zone_codes: 'Zoning code reference (R1, R2, etc.)',
    property_types: 'Property type codes reference'
  };
  return descriptions[tableName] || '';
}

function TablesTab({ schemaInfo, activeTable, setActiveTable }) {
  const tables = Object.keys(schemaInfo.tables || {});
  const views = Object.keys(schemaInfo.views || {});
  const currentTable = schemaInfo.tables[activeTable] || schemaInfo.views[activeTable];
  const isView = !schemaInfo.tables[activeTable] && schemaInfo.views[activeTable];

  return (
    <div className="tab-content tables-tab">
      <div className="table-selector">
        <h3>Tables</h3>
        <ul>
          {tables.map(name => (
            <li key={name}>
              <button 
                className={activeTable === name ? 'active' : ''} 
                onClick={() => setActiveTable(name)}
              >
                📋 {name}
                <span className="row-count">{formatNumber(schemaInfo.tables[name].rowCount)}</span>
              </button>
            </li>
          ))}
        </ul>
        <h3>Views</h3>
        <ul>
          {views.map(name => (
            <li key={name}>
              <button 
                className={activeTable === name ? 'active' : ''} 
                onClick={() => setActiveTable(name)}
              >
                👁️ {name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="table-details">
        {currentTable && (
          <>
            <h2>
              {isView ? '👁️' : '📋'} {activeTable}
              {!isView && <span className="table-count">{formatNumber(currentTable.rowCount)} rows</span>}
            </h2>

            {isView && schemaInfo.views[activeTable]?.sql && (
              <div className="view-sql">
                <h4>View Definition</h4>
                <pre><code>{schemaInfo.views[activeTable].sql}</code></pre>
              </div>
            )}

            <h3>Columns</h3>
            <table className="data-table schema-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Column Name</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Primary Key</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {(currentTable.columns || []).map((col, idx) => (
                  <tr key={col.name} className={col.isPrimaryKey ? 'pk-row' : ''}>
                    <td>{idx + 1}</td>
                    <td><code>{col.name}</code></td>
                    <td><span className="type-badge">{col.type || 'any'}</span></td>
                    <td>{col.nullable ? '✓' : '✗'}</td>
                    <td>{col.isPrimaryKey ? '🔑' : ''}</td>
                    <td><code>{col.defaultValue || '-'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return Number(num).toLocaleString();
}

function SamplesTab({ schemaInfo, activeTable, setActiveTable, searchTerm, setSearchTerm }) {
  const tables = Object.keys(schemaInfo?.tables || {});
  const views = Object.keys(schemaInfo?.views || {});
  
  let sampleRows = [];
  let columns = [];
  
  if (schemaInfo?.tables?.[activeTable]) {
    sampleRows = schemaInfo.tables[activeTable].sampleRows || [];
    columns = schemaInfo.tables[activeTable].columns?.map(c => c.name) || [];
  } else if (schemaInfo?.views?.[activeTable]) {
    sampleRows = schemaInfo.views[activeTable].sampleRows || [];
    columns = schemaInfo.views[activeTable].columns?.map(c => c.name) || [];
  }

  // Filter rows by search term
  const filteredRows = searchTerm 
    ? sampleRows.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : sampleRows;

  return (
    <div className="tab-content samples-tab">
      <div className="samples-header">
        <div className="table-select">
          <label>Select Table/View: </label>
          <select value={activeTable || ''} onChange={e => setActiveTable(e.target.value)}>
            <optgroup label="Tables">
              {tables.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </optgroup>
            <optgroup label="Views">
              {views.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search in sample data..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="samples-content">
        <h2>Sample Data: {activeTable}</h2>
        <p className="row-info">Showing {filteredRows.length} of {sampleRows.length} sample rows</p>
        
        {columns.length > 0 && (
          <div className="sample-table-wrapper">
            <table className="data-table sample-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map(col => (
                      <td key={col}>
                        <CellValue value={row[col]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeTable === 'property_sales' && schemaInfo.fullSampleData && (
        <div className="full-sample-section">
          <h2>Full Record Sample (with joins)</h2>
          <p className="hint">This shows property_sales joined with districts, legal_descriptions, and sale_interests</p>
          <div className="sample-table-wrapper">
            <table className="data-table sample-table">
              <thead>
                <tr>
                  {Object.keys(schemaInfo.fullSampleData[0] || {}).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schemaInfo.fullSampleData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(row).map(col => (
                      <td key={col}>
                        <CellValue value={row[col]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CellValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="null-value">NULL</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="bool-value">{value ? 'true' : 'false'}</span>;
  }
  if (typeof value === 'number') {
    return <span className="number-value">{value.toLocaleString()}</span>;
  }
  const str = String(value);
  if (str.length > 50) {
    return <span className="truncated" title={str}>{str.substring(0, 50)}...</span>;
  }
  return <span>{str}</span>;
}

function StatisticsTab({ schemaInfo, activeDataSource, formatNumber, formatCurrency }) {
  const stats = schemaInfo?.statistics?.propertySales || schemaInfo?.statistics?.schools || {};

  if (activeDataSource === 'schools') {
    return (
      <div className="tab-content statistics-tab">
        <section className="stats-section">
          <h2>🏫 Schools by Level</h2>
          <p className="hint">Schools statistics based on level of schooling</p>
          <div className="school-stats-note">
            <p>This section would show detailed school statistics if available in the schema.</p>
            <p>Currently showing basic column value distributions in the "Column Values" tab.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="tab-content statistics-tab">
      <section className="stats-section">
        <h2>📊 Sales by Property Type</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Property Type</th>
              <th>Count</th>
              <th>Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {(stats.byPropertyType || []).map(row => (
              <tr key={row.property_type}>
                <td>{row.property_type}</td>
                <td>{formatNumber(row.count)}</td>
                <td>{formatCurrency(row.avgPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stats-section">
        <h2>🏘️ Sales by Zone Code</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Zone Code</th>
              <th>Category</th>
              <th>Count</th>
              <th>Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {(stats.byZoneCode || []).map(row => (
              <tr key={row.zone_code}>
                <td><code>{row.zone_code}</code></td>
                <td>{row.zone_category}</td>
                <td>{formatNumber(row.count)}</td>
                <td>{formatCurrency(row.avgPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stats-section">
        <h2>📍 Top Suburbs by Sales Volume</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Suburb</th>
              <th>Postcode</th>
              <th>Sales</th>
              <th>Avg Price</th>
              <th>Min Price</th>
              <th>Max Price</th>
            </tr>
          </thead>
          <tbody>
            {(stats.topSuburbs || []).map(row => (
              <tr key={`${row.suburb}-${row.postcode}`}>
                <td>{row.suburb}</td>
                <td>{row.postcode}</td>
                <td>{formatNumber(row.count)}</td>
                <td>{formatCurrency(row.avgPrice)}</td>
                <td>{formatCurrency(row.minPrice)}</td>
                <td>{formatCurrency(row.maxPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stats-section">
        <h2>📈 Monthly Trends (Last 12 Months)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Sales Count</th>
              <th>Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {(stats.monthlyTrends || []).map(row => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{formatNumber(row.count)}</td>
                <td>{formatCurrency(row.avgPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ColumnValuesTab({ schemaInfo, formatNumber }) {
  const columnValues = schemaInfo?.columnValues || {};

  return (
    <div className="tab-content values-tab">
      <h2>Distinct Column Values</h2>
      <p className="hint">These are the distinct values found in key columns, with their counts</p>

      {Object.entries(columnValues).map(([column, values]) => (
        <section key={column} className="values-section">
          <h3><code>{column}</code></h3>
          <div className="values-grid">
            {values.map(item => (
              <div key={item[column]} className="value-chip">
                <span className="value-name">{item[column] || '(empty)'}</span>
                <span className="value-count">{formatNumber(item.count)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SchoolRankingBreakdown({ school, onClose }) {
  if (!school || !school.ranking) return null;

  const { ranking } = school;
  const breakdown = ranking.breakdown || {};

  // Group breakdown by category
  const categories = {
    'Critical Factors': ['ICSEA_value', 'Selective_school', 'FOEI_Value', 'Opportunity_class', 'School_specialty_type', 'latest_year_enrolment_FTE'],
    'Context Factors': ['ASGS_remoteness', 'LBOTE_pct', 'Indigenous_pct', 'Preschool_ind', 'Intensive_english_centre', 'Distance_education']
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'Not Available';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  return (
    <div className="school-breakdown">
      <div className="breakdown-header">
        <div className="school-info">
          <h3>{school.School_name}</h3>
          <p className="school-details">
            {school.Level_of_schooling} • {school.Town_suburb}
            {school.ICSEA_value && ` • ICSEA: ${school.ICSEA_value}`}
          </p>
        </div>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="ranking-summary">
        <div className="score-card">
          <div className="final-score">
            <span className="score-value">{ranking.percentage_score}%</span>
            <span className="score-label">Final Score</span>
          </div>
          <div className="score-details">
            <span>{ranking.total_score} / {ranking.max_possible_score} points</span>
            <span>Rank #{ranking.rank}</span>
          </div>
        </div>
      </div>

      <div className="breakdown-categories">
        {Object.entries(categories).map(([categoryName, fields]) => (
          <div key={categoryName} className="breakdown-category">
            <h4>{categoryName}</h4>
            <div className="breakdown-items">
              {fields.map(field => {
                const item = breakdown[field];
                if (!item || !item.applicable) return null;

                return (
                  <div key={field} className="breakdown-item">
                    <div className="item-header">
                      <span className="field-name">{field.replace(/_/g, ' ')}</span>
                      <span className="item-score">
                        {item.score} / {item.maxPossible}
                      </span>
                    </div>
                    <div className="item-details">
                      <div className="item-row">
                        <span className="label">Raw Value:</span>
                        <span className="value">{formatValue(item.rawValue)}</span>
                      </div>
                      <div className="item-row">
                        <span className="label">Weights:</span>
                        <span className="value">
                          {item.primaryWeight} (primary) × {item.secondaryWeight} (secondary) = {item.score}
                        </span>
                      </div>
                    </div>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ 
                          width: `${(item.score / item.maxPossible) * 100}%`,
                          backgroundColor: item.score > item.maxPossible * 0.8 ? '#10b981' : 
                                          item.score > item.maxPossible * 0.6 ? '#f59e0b' : 
                                          item.score > item.maxPossible * 0.4 ? '#ef4444' : '#6b7280'
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="breakdown-metadata">
        <div className="metadata-row">
          <span className="label">School Type:</span>
          <span className="value">{ranking.metadata.is_primary ? 'Primary' : ranking.metadata.is_secondary ? 'Secondary' : 'Other'}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Applicable Fields:</span>
          <span className="value">{ranking.metadata.applicable_fields} of {ranking.metadata.total_fields}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Calculated:</span>
          <span className="value">{new Date(ranking.metadata.calculated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function SchoolColumnAnalysisTab() {
  const [activeAnalysisCategory, setActiveAnalysisCategory] = useState('ranking-critical');

  // School data column definitions with ranking usage
  const columnCategories = {
    'ranking-critical': {
      name: '🎯 Ranking Critical',
      description: 'Direct quality/performance indicators used heavily in school rankings',
      columns: [
        {
          name: 'ICSEA_value',
          type: 'integer',
          description: 'Index of Community Socio-Educational Advantage',
          detailedDescription: 'A standardized measure representing levels of educational advantage based on parent occupation, education, geographic location, and proportion of Indigenous students. Scale: Mean=1000, SD=100, Range typically 500-1300.',
          source: 'ACARA (Australian Curriculum, Assessment and Reporting Authority)',
          updateFrequency: 'Annually in February',
          rankingWeight: 10,
          rankingUsage: 'Primary ranking factor. Higher ICSEA indicates greater educational advantage.',
          calculation: 'Secondary Weight = Math.min(10, Math.max(1, Math.round((ICSEA - 800) / 50)))',
          examples: ['1200+ = Very High Advantage (10/10)', '1000-1049 = Average (6/10)', '<800 = Extremely Disadvantaged (1/10)'],
          interpretation: 'Most reliable standardized measure of school quality context. Directly correlates with academic outcomes.'
        },
        {
          name: 'Selective_school',
          type: 'varchar',
          description: 'Indicates whether a secondary school selects students based on academic merit',
          detailedDescription: 'Secondary schools that use entrance examinations to select academically high-performing students. Creates academically competitive student bodies.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: '9 (Secondary only, 0 for Primary)',
          rankingUsage: 'Major ranking factor for secondary schools only. Selective schools typically achieve higher academic results.',
          calculation: 'Fully Selective = 10/10, Partially Selective = 7/10, Not Selective = 3/10',
          examples: ['Sydney Boys High = Fully Selective', 'Chatswood High = Partially Selective', 'Most schools = Not Selective'],
          interpretation: 'Strong indicator of academic performance potential, but only relevant for secondary schools.'
        },
        {
          name: 'FOEI_Value',
          type: 'varchar',
          description: 'Family Occupation and Education Index (INVERTED)',
          detailedDescription: 'School-level measure of educational disadvantage based on family background. IMPORTANT: Higher FOEI = MORE disadvantage (opposite of ICSEA).',
          source: 'NSW Department of Education Resource Allocation Model',
          updateFrequency: 'Annually in December (as at May)',
          rankingWeight: 8,
          rankingUsage: 'Inverted weighting - lower FOEI scores get higher ranking points. Complements ICSEA.',
          calculation: 'Secondary Weight = Math.max(1, Math.min(10, 10 - Math.floor(FOEI / 20)))',
          examples: ['0-20 = Very Low Disadvantage (10/10)', '81-100 = Average (6/10)', '180+ = Extreme Disadvantage (1/10)'],
          interpretation: 'Provides context about family socio-economic background. Lower values indicate more advantaged families.'
        },
        {
          name: 'Opportunity_class',
          type: 'varchar',
          description: 'Indicates whether school offers Opportunity Classes (OC)',
          detailedDescription: 'OC programs for academically gifted students in Years 5-6. Entry via state-wide placement test. Only applicable to primary schools.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: '7 (Primary only, 0 for Secondary)',
          rankingUsage: 'Significant ranking factor for primary schools. Indicates capacity for advanced learners.',
          calculation: 'Y = 10/10, N = 3/10',
          examples: ['Beecroft Public School = Y', 'Most primary schools = N'],
          interpretation: 'Schools with OC attract high-achieving students and demonstrate academic excellence capacity.'
        },
        {
          name: 'School_specialty_type',
          type: 'varchar',
          description: 'Indicates specialty focus beyond standard curriculum',
          detailedDescription: 'Schools with specialized programs in specific areas attract students with particular talents and interests.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 6,
          rankingUsage: 'Moderate ranking factor. Specialty schools often provide enhanced educational opportunities.',
          calculation: 'Technology/Language/Arts = 8/10, Sports = 7/10, Comprehensive = 5/10',
          examples: ['Aurora College = Technology High', 'Most schools = Comprehensive'],
          interpretation: 'Specialty programs can indicate innovation and enhanced learning opportunities in specific areas.'
        },
        {
          name: 'latest_year_enrolment_FTE',
          type: 'double',
          description: 'Full-Time Equivalent student enrollment count',
          detailedDescription: 'Student numbers as reported under ABS National Schools Statistics Collection. Reflects school size, popularity, and capacity.',
          source: 'Australian Bureau of Statistics',
          updateFrequency: 'Annually in December (as at August)',
          rankingWeight: 0,
          rankingUsage: 'Display information only - NOT used in ranking calculation. Provides context about school size.',
          calculation: 'Excluded from ranking - displayed for information only',
          examples: ['Primary: 800+ students', 'Secondary: 1500+ students', 'Small schools: <200 students'],
          interpretation: 'School size provides context but is not used as a quality indicator in rankings.'
        }
      ]
    },
    'contextual': {
      name: '📊 Contextual',
      description: 'Useful context indicators with lighter ranking weights',
      columns: [
        {
          name: 'ASGS_remoteness',
          type: 'varchar',
          description: 'Australian Statistical Geography Standard remoteness classification',
          detailedDescription: 'Geographic classification based on road distance to service centres. Affects resource access and educational opportunities.',
          source: 'Australian Bureau of Statistics',
          updateFrequency: 'As required',
          rankingWeight: 4,
          rankingUsage: 'Moderate weight. City schools have resource advantages, but rural context is considered.',
          calculation: 'Major Cities = 8/10, Inner Regional = 6/10, Very Remote = 3/10',
          examples: ['Sydney schools = Major Cities', 'Broken Hill = Remote Australia'],
          interpretation: 'Location affects resources and opportunities. Rankings account for geographic disadvantage.'
        },
        {
          name: 'LBOTE_pct',
          type: 'integer',
          description: 'Percentage of Language Backgrounds Other Than English students',
          detailedDescription: 'Students where a language other than English is spoken at home. Indicates cultural diversity and potential ESL needs.',
          source: 'NSW Department of Education',
          updateFrequency: 'Annually in December (as at March)',
          rankingWeight: 3,
          rankingUsage: 'Neutral diversity indicator. Balanced diversity scored higher than extremes.',
          calculation: '40-60% = 7/10 (optimal balance), extremes score lower',
          examples: ['Some selective schools = 80-90%', 'Rural schools = often 0-10%'],
          interpretation: 'Cultural diversity metric. Not inherently positive/negative - indicates school community composition.'
        },
        {
          name: 'Indigenous_pct',
          type: 'varchar',
          description: 'Percentage of Aboriginal or Torres Strait Islander students',
          detailedDescription: 'Students who identify as Indigenous and are accepted in the community they associate with.',
          source: 'NSW Department of Education',
          updateFrequency: 'Annually in December (as at August)',
          rankingWeight: 2,
          rankingUsage: 'Demographic awareness only. Neutral scoring - not a quality indicator.',
          calculation: 'All valid percentages = 5/10 (neutral)',
          examples: ['Urban schools = often <5%', 'Remote areas = much higher %'],
          interpretation: 'Demographic data for context only. Schools with higher Indigenous populations may receive additional funding.'
        },
        {
          name: 'Preschool_ind',
          type: 'varchar',
          description: 'Indicates whether preschool is attached to school',
          detailedDescription: 'Having an attached preschool provides educational continuity for families from early childhood through primary years.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: '2 (Primary only)',
          rankingUsage: 'Minor benefit for primary schools - educational continuity advantage.',
          calculation: 'Y = 7/10, N = 4/10',
          examples: ['Many community schools = Y', 'Most primary schools = N'],
          interpretation: 'Convenience and continuity factor for families, especially beneficial in smaller communities.'
        },
        {
          name: 'Intensive_english_centre',
          type: 'varchar',
          description: 'Indicates whether Intensive English Centre (IEC) is attached',
          detailedDescription: 'IECs provide specialized English language support for newly arrived students with limited English proficiency.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 2,
          rankingUsage: 'Indicates specialized support capacity and resources for diverse learners.',
          calculation: 'Y = 7/10, N = 5/10',
          examples: ['Large multicultural schools often = Y', 'Most schools = N'],
          interpretation: 'Demonstrates school capacity to support students from non-English speaking backgrounds.'
        },
        {
          name: 'Distance_education',
          type: 'varchar',
          description: 'Indicates distance education capability',
          detailedDescription: 'Schools offering remote learning options for students who cannot attend traditional classes.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 1,
          rankingUsage: 'Minor factor - indicates flexible learning options.',
          calculation: 'S (School) = 7/10, C (Centre) = 6/10, N = 5/10',
          examples: ['Sydney Distance Education = S', 'Most schools = N'],
          interpretation: 'Provides educational access for students in remote areas or special circumstances.'
        }
      ]
    },
    'classification': {
      name: '🏷️ Classification',
      description: 'Used for filtering and categorization, not ranking',
      columns: [
        {
          name: 'Level_of_schooling',
          type: 'varchar',
          description: 'Primary classification of school type/level',
          detailedDescription: 'Fundamental categorization determining which students the school serves and appropriate ranking comparisons.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Filter only - schools compared within same level (primary vs primary, secondary vs secondary)',
          calculation: 'Not used in ranking calculation',
          examples: ['Primary School', 'Secondary School', 'Central/Community School', 'Schools for Specific Purposes'],
          interpretation: 'Essential for appropriate school comparisons. Different levels serve different purposes and age groups.'
        },
        {
          name: 'School_subtype',
          type: 'varchar',
          description: 'Detailed breakdown of year levels offered',
          detailedDescription: 'Specific year ranges and educational phases offered by the school.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Classification only - helps identify K-12 schools, junior/senior secondary, etc.',
          calculation: 'Not used in ranking',
          examples: ['Kindergarten to Year 6', 'Year 7 to Year 12', 'Kindergarten to Year 12'],
          interpretation: 'Helps parents understand exact year levels served and educational pathway options.'
        },
        {
          name: 'School_gender',
          type: 'varchar',
          description: 'Student gender policy of the school',
          detailedDescription: 'Whether the school is co-educational or serves students of a specific gender.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Filter only - family preference, not quality indicator',
          calculation: 'Not used in ranking',
          examples: ['Coed (majority)', 'Boys', 'Girls'],
          interpretation: 'Personal/cultural preference factor. Single-sex schools may be preferred by some families for specific reasons.'
        }
      ]
    },
    'administrative': {
      name: '🏛️ Administrative & Contact',
      description: 'Government structure, contact details, and operational information',
      columns: [
        {
          name: 'School_code',
          type: 'integer',
          description: 'Official NSW Education school identifier',
          detailedDescription: 'Unique identifier used across NSW Department of Education systems for tracking and administration.',
          source: 'NSW Department of Education',
          updateFrequency: 'Permanent',
          rankingWeight: 0,
          rankingUsage: 'Primary key - not used in ranking',
          calculation: 'Not applicable',
          examples: ['8137 = Sydney Boys High School', '1166 = Beecroft Public School'],
          interpretation: 'Administrative identifier for data linkage and official references.'
        },
        {
          name: 'School_name',
          type: 'varchar',
          description: 'Official school name',
          detailedDescription: 'The legally registered name of the educational institution.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Display only',
          calculation: 'Not applicable',
          examples: ['Sydney Boys High School', 'Beecroft Public School'],
          interpretation: 'Official designation for identification and communication purposes.'
        },
        {
          name: 'LGA',
          type: 'varchar',
          description: 'Local Government Area',
          detailedDescription: 'The local council area where the school is located, important for local planning and services.',
          source: 'Australian Bureau of Statistics',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Geographic filter only',
          calculation: 'Not applicable',
          examples: ['Sydney', 'Hornsby Shire', 'Blacktown'],
          interpretation: 'Administrative boundary for local government services and planning. Useful for local area school comparisons.'
        },
        {
          name: 'Operational_directorate',
          type: 'varchar',
          description: 'NSW Department of Education directorate',
          detailedDescription: 'Administrative region within the Department of Education responsible for overseeing the school.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Administrative classification only',
          calculation: 'Not applicable',
          examples: ['Metropolitan South', 'Hunter Central Coast', 'Illawarra South East'],
          interpretation: 'Internal departmental organization structure for administrative and support purposes.'
        }
      ]
    },
    'location': {
      name: '📍 Location & Contact',
      description: 'Geographic and contact information for practical purposes',
      columns: [
        {
          name: 'Street',
          type: 'varchar',
          description: 'Street address of school',
          detailedDescription: 'Physical location address for visits, enrollment, and official correspondence.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Location display only',
          calculation: 'Not applicable',
          examples: ['556 Cleveland Street', '2-8 Carlingford Road'],
          interpretation: 'Practical information for families considering school attendance and transportation planning.'
        },
        {
          name: 'Town_suburb',
          type: 'varchar',
          description: 'Suburb or town name',
          detailedDescription: 'Local area designation for geographic identification and catchment understanding.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Geographic filter and display',
          calculation: 'Not applicable',
          examples: ['Beecroft', 'Moore Park', 'Carlingford'],
          interpretation: 'Important for catchment area understanding and local school selection.'
        },
        {
          name: 'Latitude',
          type: 'decimal',
          description: 'Geographic latitude coordinate (WGS84)',
          detailedDescription: 'Precise geographic coordinates for mapping, distance calculations, and catchment boundary analysis.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Mapping and distance analysis only',
          calculation: 'Not applicable',
          examples: ['-33.942627', '-33.873651'],
          interpretation: 'Technical coordinate for map visualization and geographic analysis tools.'
        },
        {
          name: 'Phone',
          type: 'varchar',
          description: 'School phone number',
          detailedDescription: 'Primary contact number for inquiries, enrollment, and communication with school administration.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Contact information only',
          calculation: 'Not applicable',
          examples: ['9662 9300', '9484 2251'],
          interpretation: 'Essential contact information for families and stakeholders.'
        },
        {
          name: 'Website',
          type: 'varchar',
          description: 'School website URL',
          detailedDescription: 'Official online presence providing detailed school information, policies, and community updates.',
          source: 'NSW Department of Education',
          updateFrequency: 'As required',
          rankingWeight: 0,
          rankingUsage: 'Information resource only',
          calculation: 'Not applicable',
          examples: ['https://sydneyhigh.school', 'https://beecroft-p.schools.nsw.gov.au'],
          interpretation: 'Primary source for detailed school information, policies, and community engagement.'
        }
      ]
    }
  };

  return (
    <div className="tab-content analysis-tab">
      <header className="analysis-header">
        <h2>📋 School Data Column Analysis</h2>
        <p className="subtitle">Comprehensive guide to school data fields, their meanings, and ranking usage</p>
        <p className="hint">Understanding what each data column represents and how it influences school rankings</p>
      </header>

      <nav className="analysis-category-tabs">
        {Object.entries(columnCategories).map(([key, category]) => (
          <button 
            key={key}
            className={activeAnalysisCategory === key ? 'active' : ''} 
            onClick={() => setActiveAnalysisCategory(key)}
            title={category.description}
          >
            {category.name}
          </button>
        ))}
      </nav>

      <div className="analysis-content">
        {Object.entries(columnCategories).map(([key, category]) => (
          <div 
            key={key}
            className={`category-section ${activeAnalysisCategory === key ? 'active' : ''}`}
            style={{ display: activeAnalysisCategory === key ? 'block' : 'none' }}
          >
            <div className="category-header">
              <h3>{category.name}</h3>
              <p className="category-description">{category.description}</p>
            </div>

            <div className="columns-grid">
              {category.columns.map((column) => (
                <div key={column.name} className="column-card">
                  <div className="column-header">
                    <h4>
                      <code>{column.name}</code>
                      <span className="column-type">{column.type}</span>
                    </h4>
                    {column.rankingWeight !== 0 && (
                      <div className="ranking-badge">
                        Weight: {column.rankingWeight}
                      </div>
                    )}
                  </div>

                  <div className="column-body">
                    <div className="section">
                      <h5>📋 Description</h5>
                      <p>{column.description}</p>
                      <p className="detailed">{column.detailedDescription}</p>
                    </div>

                    <div className="section">
                      <h5>🏆 Ranking Usage</h5>
                      <p className="ranking-usage">{column.rankingUsage}</p>
                      {column.calculation && (
                        <div className="calculation">
                          <strong>Calculation:</strong> <code>{column.calculation}</code>
                        </div>
                      )}
                    </div>

                    <div className="section">
                      <h5>📊 Examples & Interpretation</h5>
                      <ul className="examples-list">
                        {column.examples.map((example, i) => (
                          <li key={i}>{example}</li>
                        ))}
                      </ul>
                      <p className="interpretation">{column.interpretation}</p>
                    </div>

                    <div className="section metadata">
                      <div className="metadata-grid">
                        <div className="metadata-item">
                          <strong>Source:</strong> {column.source}
                        </div>
                        <div className="metadata-item">
                          <strong>Updated:</strong> {column.updateFrequency}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="analysis-summary">
        <div className="summary-section">
          <h3>🎯 Ranking Weight Summary</h3>
          <div className="weight-summary-grid">
            <div className="weight-category">
              <h4>High Impact (8-10)</h4>
              <ul>
                <li><strong>ICSEA_value:</strong> 10 - Academic advantage index</li>
                <li><strong>Selective_school:</strong> 9 - Secondary schools only</li>
                <li><strong>FOEI_Value:</strong> 8 - Family background (inverted)</li>
              </ul>
            </div>
            <div className="weight-category">
              <h4>Moderate Impact (5-7)</h4>
              <ul>
                <li><strong>Opportunity_class:</strong> 7 - Primary schools only</li>
                <li><strong>School_specialty_type:</strong> 6 - Program focus</li>
                <li><strong>latest_year_enrolment_FTE:</strong> 5 - School size</li>
              </ul>
            </div>
            <div className="weight-category">
              <h4>Context Factors (1-4)</h4>
              <ul>
                <li><strong>ASGS_remoteness:</strong> 4 - Geographic location</li>
                <li><strong>LBOTE_pct:</strong> 3 - Language diversity</li>
                <li><strong>Indigenous_pct:</strong> 2 - Demographic context</li>
                <li><strong>Preschool_ind:</strong> 2 - Early childhood continuity</li>
                <li><strong>Intensive_english_centre:</strong> 2 - ESL support</li>
                <li><strong>Distance_education:</strong> 1 - Remote learning</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h3>📖 Key Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>🔍 ICSEA vs FOEI</h4>
              <p>ICSEA and FOEI both measure socio-economic advantage but from different perspectives. ICSEA is standardized nationally (higher = better), while FOEI measures disadvantage (lower = better). Both are crucial for fair school comparison.</p>
            </div>
            <div className="insight-card">
              <h4>🎓 School Type Matters</h4>
              <p>Rankings are adjusted by school type. Primary schools are ranked on Opportunity Classes and Preschool availability, while Secondary schools emphasize Selective status. This ensures fair comparison within educational levels.</p>
            </div>
            <div className="insight-card">
              <h4>⚖️ Balanced Approach</h4>
              <p>The ranking system balances academic excellence indicators (ICSEA, Selective) with contextual factors (location, diversity, size) to provide a comprehensive view of school quality beyond just test scores.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingsTab() {
  const [topSchools, setTopSchools] = useState(null);
  const [rankedSchools, setRankedSchools] = useState(null);
  const [filteredSchools, setFilteredSchools] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRankingTab, setActiveRankingTab] = useState('overview');
  const [expandedSchools, setExpandedSchools] = useState(new Set());
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    level: 'all',
    selective: 'all',
    suburb: '',
    minICSEA: '',
    maxICSEA: '',
    opportunityClass: 'all'
  });
  const [sortBy, setSortBy] = useState('ranking');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/schools/top_schools.json`).then(res => {
        if (!res.ok) throw new Error('Failed to load top schools data');
        return res.json();
      }),
      fetch(`${base}data/schools/schools_ranked.json`).then(res => {
        if (!res.ok) throw new Error('Failed to load detailed rankings data');
        return res.json();
      })
    ])
      .then(([topData, rankedData]) => {
        setTopSchools(topData);
        setRankedSchools(rankedData);
        setFilteredSchools(rankedData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleSchoolDetails = (schoolCode) => {
    const newExpanded = new Set(expandedSchools);
    if (newExpanded.has(schoolCode)) {
      newExpanded.delete(schoolCode);
    } else {
      newExpanded.add(schoolCode);
    }
    setExpandedSchools(newExpanded);
  };

  const getSchoolDetails = (schoolCode) => {
    return rankedSchools?.find(school => school.School_code === schoolCode);
  };

  // Apply filters and sorting
  useEffect(() => {
    if (!rankedSchools) return;

    let filtered = rankedSchools.filter(school => {
      // Level filter
      if (filters.level !== 'all') {
        const level = school.Level_of_schooling?.toLowerCase() || '';
        if (filters.level === 'primary' && !level.includes('primary')) return false;
        if (filters.level === 'secondary' && !level.includes('secondary')) return false;
      }

      // Selective filter
      if (filters.selective !== 'all') {
        const selective = school.Selective_school || 'Not Selective';
        if (filters.selective === 'fully' && !selective.includes('Fully')) return false;
        if (filters.selective === 'partially' && !selective.includes('Partially')) return false;
        if (filters.selective === 'not' && !selective.includes('Not Selective')) return false;
      }

      // Suburb filter
      if (filters.suburb && school.Town_suburb) {
        const suburb = school.Town_suburb.toLowerCase();
        const searchSuburb = filters.suburb.toLowerCase();
        if (!suburb.includes(searchSuburb)) return false;
      }

      // ICSEA range filter
      if (filters.minICSEA && school.ICSEA_value && school.ICSEA_value < parseInt(filters.minICSEA)) return false;
      if (filters.maxICSEA && school.ICSEA_value && school.ICSEA_value > parseInt(filters.maxICSEA)) return false;

      // Opportunity Class filter
      if (filters.opportunityClass !== 'all' && school.Opportunity_class) {
        if (filters.opportunityClass === 'yes' && school.Opportunity_class !== 'Y') return false;
        if (filters.opportunityClass === 'no' && school.Opportunity_class !== 'N') return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'ranking':
          aValue = a.ranking.rank;
          bValue = b.ranking.rank;
          break;
        case 'score':
          aValue = a.ranking.percentage_score;
          bValue = b.ranking.percentage_score;
          break;
        case 'icsea':
          aValue = a.ICSEA_value || 0;
          bValue = b.ICSEA_value || 0;
          break;
        case 'enrollment':
          aValue = a.latest_year_enrolment_FTE || 0;
          bValue = b.latest_year_enrolment_FTE || 0;
          break;
        case 'avgPrice':
          aValue = a.propertyPrices?.avgPrice || 0;
          bValue = b.propertyPrices?.avgPrice || 0;
          break;
        case 'name':
          aValue = a.School_name || '';
          bValue = b.School_name || '';
          break;
        case 'suburb':
          aValue = a.Town_suburb || '';
          bValue = b.Town_suburb || '';
          break;
        default:
          aValue = a.ranking.rank;
          bValue = b.ranking.rank;
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    setFilteredSchools(filtered);
  }, [rankedSchools, filters, sortBy, sortOrder]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const formatEnrollment = (enrollment) => {
    if (!enrollment) return '-';
    return Math.round(enrollment).toLocaleString();
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="tab-content rankings-tab">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading school rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content rankings-tab">
        <div className="error-container">
          <h2>⚠️ Error Loading Rankings</h2>
          <p>{error}</p>
          <p className="hint">Make sure school rankings have been generated by running the export script</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content rankings-tab">
      <header className="rankings-header">
        <h2>🏆 School Rankings</h2>
        <p className="subtitle">Based on the weighted scoring system defined in SCHOOL_RANKING_WEIGHTS.md</p>
        <p className="hint">Rankings consider ICSEA, selective status, opportunity classes, enrollment, and other quality indicators</p>
        <div className="interaction-hint">
          <strong>💡 Tip:</strong> Click on any school name to see detailed ranking breakdown showing exactly how it earned its score
        </div>
      </header>

      <nav className="ranking-tabs">
        <button 
          className={activeRankingTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveRankingTab('overview')}
        >
          📈 Overview
        </button>
        <button 
          className={activeRankingTab === 'primary' ? 'active' : ''} 
          onClick={() => setActiveRankingTab('primary')}
        >
          🎓 Top Primary
        </button>
        <button 
          className={activeRankingTab === 'secondary' ? 'active' : ''} 
          onClick={() => setActiveRankingTab('secondary')}
        >
          🎓 Top Secondary
        </button>
        <button 
          className={activeRankingTab === 'explore' ? 'active' : ''} 
          onClick={() => setActiveRankingTab('explore')}
        >
          🔍 Explore All Schools
        </button>
      </nav>

      {activeRankingTab === 'overview' && (
        <div className="ranking-content">
          <section className="ranking-section">
            <h3>🥇 Top Schools Overall</h3>
            <table className="data-table ranking-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>School Name</th>
                  <th>Level</th>
                  <th>Suburb</th>
                  <th>Score</th>
                  <th>ICSEA</th>
                  <th>Academic</th>
                  <th>T/S Ratio</th>
                  <th>English %</th>
                  <th>Enrollment</th>
                  <th>Avg Price</th>
                  <th>Selective</th>
                </tr>
              </thead>
              <tbody>
                {topSchools.top_overall.map(school => {
                  const isExpanded = expandedSchools.has(school.school_code);
                  const schoolDetails = getSchoolDetails(school.school_code);
                  
                  return (
                    <React.Fragment key={school.school_code}>
                      <tr 
                        className={`${school.rank <= 5 ? 'top-five' : ''} ${isExpanded ? 'expanded' : ''} clickable-row`}
                        onClick={() => toggleSchoolDetails(school.school_code)}
                      >
                        <td className="rank-cell">#{school.rank}</td>
                        <td className="school-name">
                          {school.name}
                          <span className="expand-indicator">{isExpanded ? '▼' : '▶'}</span>
                        </td>
                        <td>{school.level.replace(' School', '')}</td>
                        <td>{school.suburb || '-'}</td>
                        <td className="score-cell">{school.score}%</td>
                        <td>{school.icsea || '-'}</td>
                        <td className="academic-cell">
                          {school.naplan_ranking ? `NAPLAN #${school.naplan_ranking}` : ''}
                          {school.hsc_ranking ? `HSC #${school.hsc_ranking}` : ''}
                          {!school.naplan_ranking && !school.hsc_ranking ? '-' : ''}
                        </td>
                        <td className="teacher-ratio-cell">{school.teacherStudentRatio != null ? Math.round(school.teacherStudentRatio) : '-'}</td>
                        <td className="language-cell">{school.studentsEnglish != null ? Math.round(school.studentsEnglish) + '%' : '-'}</td>
                        <td className="enrollment-cell">{formatEnrollment(schoolDetails?.latest_year_enrolment_FTE)}</td>
                        <td className="price-cell">{formatPrice(school.propertyPrices?.avgPrice)}</td>
                        <td className={`selective-${school.selective?.toLowerCase().replace(' ', '-') || 'not'}`}>
                          {school.selective || '-'}
                        </td>
                      </tr>
                      {isExpanded && schoolDetails && (
                        <tr className="breakdown-row">
                          <td colSpan="12">
                            <SchoolRankingBreakdown 
                              school={schoolDetails} 
                              onClose={() => toggleSchoolDetails(school.school_code)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="ranking-summary">
            <div className="summary-card">
              <h4>📊 Ranking Methodology</h4>
              <p>Schools are scored using a comprehensive weighting system that considers:</p>
              <ul>
                <li><strong>ICSEA Value</strong> (Weight: 10) - Academic advantage index</li>
                <li><strong>Selective Status</strong> (Weight: 9) - For secondary schools</li>
                <li><strong>FOEI Value</strong> (Weight: 8) - Family background (inverted)</li>
                <li><strong>Opportunity Classes</strong> (Weight: 7) - For primary schools</li>
                <li><strong>Specialty Programs</strong> (Weight: 6) - STEM, Arts, Language focus</li>
                <li><strong>Plus other factors...</strong> - Location, diversity, facilities</li>
                <li><strong>Enrollment Size</strong> - Displayed for reference, not used in ranking</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeRankingTab === 'primary' && (
        <div className="ranking-content">
          <section className="ranking-section">
            <h3>🎓 Top 20 Primary Schools</h3>
            <table className="data-table ranking-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>School Name</th>
                  <th>Suburb</th>
                  <th>Score</th>
                  <th>ICSEA</th>
                  <th>NAPLAN</th>
                  <th>T/S Ratio</th>
                  <th>English %</th>
                  <th>Enrollment</th>
                  <th>Avg Price</th>
                  <th>Opportunity Class</th>
                </tr>
              </thead>
              <tbody>
                {topSchools.top_primary.map(school => {
                  const isExpanded = expandedSchools.has(school.school_code);
                  const schoolDetails = getSchoolDetails(school.school_code);
                  
                  return (
                    <React.Fragment key={school.school_code}>
                      <tr 
                        className={`${school.rank <= 3 ? 'top-three' : ''} ${isExpanded ? 'expanded' : ''} clickable-row`}
                        onClick={() => toggleSchoolDetails(school.school_code)}
                      >
                        <td className="rank-cell">#{school.rank}</td>
                        <td className="school-name">
                          {school.name}
                          <span className="expand-indicator">{isExpanded ? '▼' : '▶'}</span>
                        </td>
                        <td>{school.suburb || '-'}</td>
                        <td className="score-cell">{school.score}%</td>
                        <td>{school.icsea || '-'}</td>
                        <td className="naplan-cell">
                          {school.naplan_ranking ? `#${school.naplan_ranking}` : '-'}
                        </td>
                        <td className="teacher-ratio-cell">{school.teacherStudentRatio != null ? Math.round(school.teacherStudentRatio) : '-'}</td>
                        <td className="language-cell">{school.studentsEnglish != null ? Math.round(school.studentsEnglish) + '%' : '-'}</td>
                        <td className="enrollment-cell">{formatEnrollment(schoolDetails?.latest_year_enrolment_FTE)}</td>
                        <td className="price-cell">{formatPrice(school.propertyPrices?.avgPrice)}</td>
                        <td className={`oc-${school.opportunity_class?.toLowerCase()}`}>
                          {school.opportunity_class === 'Y' ? 'Yes' : 'No'}
                        </td>
                      </tr>
                      {isExpanded && schoolDetails && (
                        <tr className="breakdown-row">
                          <td colSpan="11">
                            <SchoolRankingBreakdown 
                              school={schoolDetails} 
                              onClose={() => toggleSchoolDetails(school.school_code)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activeRankingTab === 'secondary' && (
        <div className="ranking-content">
          <section className="ranking-section">
            <h3>🎓 Top 20 Secondary Schools</h3>
            <table className="data-table ranking-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>School Name</th>
                  <th>Suburb</th>
                  <th>Score</th>
                  <th>ICSEA</th>
                  <th>HSC</th>
                  <th>T/S Ratio</th>
                  <th>English %</th>
                  <th>Enrollment</th>
                  <th>Avg Price</th>
                  <th>Selective Status</th>
                </tr>
              </thead>
              <tbody>
                {topSchools.top_secondary.map(school => {
                  const isExpanded = expandedSchools.has(school.school_code);
                  const schoolDetails = getSchoolDetails(school.school_code);
                  
                  return (
                    <React.Fragment key={school.school_code}>
                      <tr 
                        className={`${school.rank <= 3 ? 'top-three' : ''} ${isExpanded ? 'expanded' : ''} clickable-row`}
                        onClick={() => toggleSchoolDetails(school.school_code)}
                      >
                        <td className="rank-cell">#{school.rank}</td>
                        <td className="school-name">
                          {school.name}
                          <span className="expand-indicator">{isExpanded ? '▼' : '▶'}</span>
                        </td>
                        <td>{school.suburb || '-'}</td>
                        <td className="score-cell">{school.score}%</td>
                        <td>{school.icsea || '-'}</td>
                        <td className="hsc-cell">
                          {school.hsc_ranking ? `#${school.hsc_ranking}` : '-'}
                        </td>
                        <td className="teacher-ratio-cell">{school.teacherStudentRatio != null ? Math.round(school.teacherStudentRatio) : '-'}</td>
                        <td className="language-cell">{school.studentsEnglish != null ? Math.round(school.studentsEnglish) + '%' : '-'}</td>
                        <td className="enrollment-cell">{formatEnrollment(schoolDetails?.latest_year_enrolment_FTE)}</td>
                        <td className="price-cell">{formatPrice(school.propertyPrices?.avgPrice)}</td>
                        <td className={`selective-${school.selective?.toLowerCase().replace(' ', '-') || 'not'}`}>
                          {school.selective}
                        </td>
                      </tr>
                      {isExpanded && schoolDetails && (
                        <tr className="breakdown-row">
                          <td colSpan="11">
                            <SchoolRankingBreakdown 
                              school={schoolDetails} 
                              onClose={() => toggleSchoolDetails(school.school_code)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activeRankingTab === 'explore' && (
        <div className="ranking-content">
          <section className="filtering-section">
            <h3>🔍 Search and Filter Schools</h3>
            
            <div className="filter-controls">
              <div className="filter-row">
                <div className="filter-group">
                  <label htmlFor="level-filter">School Level:</label>
                  <select 
                    id="level-filter"
                    value={filters.level} 
                    onChange={(e) => handleFilterChange('level', e.target.value)}
                  >
                    <option value="all">All Levels</option>
                    <option value="primary">Primary Schools</option>
                    <option value="secondary">Secondary Schools</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label htmlFor="selective-filter">Selective Status:</label>
                  <select 
                    id="selective-filter"
                    value={filters.selective} 
                    onChange={(e) => handleFilterChange('selective', e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="fully">Fully Selective</option>
                    <option value="partially">Partially Selective</option>
                    <option value="not">Not Selective</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="opportunity-filter">Opportunity Class:</label>
                  <select 
                    id="opportunity-filter"
                    value={filters.opportunityClass} 
                    onChange={(e) => handleFilterChange('opportunityClass', e.target.value)}
                  >
                    <option value="all">All Schools</option>
                    <option value="yes">Has OC</option>
                    <option value="no">No OC</option>
                  </select>
                </div>
              </div>

              <div className="filter-row">
                <div className="filter-group">
                  <label htmlFor="suburb-filter">Suburb Search:</label>
                  <input 
                    id="suburb-filter"
                    type="text" 
                    placeholder="Enter suburb name..."
                    value={filters.suburb}
                    onChange={(e) => handleFilterChange('suburb', e.target.value)}
                  />
                </div>
                
                <div className="filter-group">
                  <label htmlFor="min-icsea">Min ICSEA:</label>
                  <input 
                    id="min-icsea"
                    type="number" 
                    placeholder="e.g. 1000"
                    value={filters.minICSEA}
                    onChange={(e) => handleFilterChange('minICSEA', e.target.value)}
                  />
                </div>
                
                <div className="filter-group">
                  <label htmlFor="max-icsea">Max ICSEA:</label>
                  <input 
                    id="max-icsea"
                    type="number" 
                    placeholder="e.g. 1200"
                    value={filters.maxICSEA}
                    onChange={(e) => handleFilterChange('maxICSEA', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="results-summary">
              <p>Showing <strong>{filteredSchools?.length || 0}</strong> schools (out of {rankedSchools?.length || 0} total)</p>
            </div>
          </section>

          <section className="results-section">
            <div className="table-controls">
              <h3>Search Results</h3>
              <div className="sort-controls">
                <span>Sort by:</span>
                <button 
                  className={sortBy === 'ranking' ? 'active' : ''}
                  onClick={() => handleSortChange('ranking')}
                >
                  Rank {sortBy === 'ranking' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={sortBy === 'score' ? 'active' : ''}
                  onClick={() => handleSortChange('score')}
                >
                  Score {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={sortBy === 'name' ? 'active' : ''}
                  onClick={() => handleSortChange('name')}
                >
                  Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={sortBy === 'icsea' ? 'active' : ''}
                  onClick={() => handleSortChange('icsea')}
                >
                  ICSEA {sortBy === 'icsea' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={sortBy === 'enrollment' ? 'active' : ''}
                  onClick={() => handleSortChange('enrollment')}
                >
                  Enrollment {sortBy === 'enrollment' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={sortBy === 'avgPrice' ? 'active' : ''}
                  onClick={() => handleSortChange('avgPrice')}
                >
                  Avg Price {sortBy === 'avgPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={sortBy === 'suburb' ? 'active' : ''}
                  onClick={() => handleSortChange('suburb')}
                >
                  Suburb {sortBy === 'suburb' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            <table className="data-table ranking-table filterable-table">
              <thead>
                <tr>
                  <th onClick={() => handleSortChange('ranking')} className="sortable">
                    Rank {sortBy === 'ranking' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSortChange('name')} className="sortable">
                    School Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSortChange('suburb')} className="sortable">
                    Suburb {sortBy === 'suburb' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSortChange('score')} className="sortable">
                    Score {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSortChange('icsea')} className="sortable">
                    ICSEA {sortBy === 'icsea' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>T/S Ratio</th>
                  <th>English %</th>
                  <th onClick={() => handleSortChange('enrollment')} className="sortable">
                    Enrollment {sortBy === 'enrollment' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSortChange('avgPrice')} className="sortable">
                    Avg Price {sortBy === 'avgPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Level</th>
                  <th>Selective</th>
                  <th>OC</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools?.map(school => {
                  const isExpanded = expandedSchools.has(school.School_code);
                  
                  return (
                    <React.Fragment key={school.School_code}>
                      <tr 
                        className={`${school.ranking.rank <= 10 ? 'top-ten' : ''} ${isExpanded ? 'expanded' : ''} clickable-row`}
                        onClick={() => toggleSchoolDetails(school.School_code)}
                      >
                        <td className="rank-cell">#{school.ranking.rank}</td>
                        <td className="school-name">
                          {school.School_name}
                          <span className="expand-indicator">{isExpanded ? '▼' : '▶'}</span>
                        </td>
                        <td>{school.Town_suburb || '-'}</td>
                        <td className="score-cell">{school.ranking.percentage_score}%</td>
                        <td>{school.ICSEA_value || '-'}</td>
                        <td className="teacher-ratio-cell">{school.teacherStudentRatio != null ? Math.round(school.teacherStudentRatio) : '-'}</td>
                        <td className="language-cell">{school.demographics?.studentsEnglish != null ? Math.round(school.demographics.studentsEnglish) + '%' : '-'}</td>
                        <td className="enrollment-cell">{formatEnrollment(school.latest_year_enrolment_FTE)}</td>
                        <td className="price-cell">{formatPrice(school.propertyPrices?.avgPrice)}</td>
                        <td>{(school.Level_of_schooling || '').replace(' School', '')}</td>
                        <td className={`selective-${school.Selective_school?.toLowerCase().replace(' ', '-') || 'not'}`}>
                          {school.Selective_school || '-'}
                        </td>
                        <td className={`oc-${school.Opportunity_class?.toLowerCase()}`}>
                          {school.Opportunity_class === 'Y' ? 'Yes' : school.Opportunity_class === 'N' ? 'No' : '-'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="breakdown-row">
                          <td colSpan="12">
                            <SchoolRankingBreakdown 
                              school={school} 
                              onClose={() => toggleSchoolDetails(school.School_code)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {filteredSchools?.length === 0 && (
              <div className="no-results">
                <p>No schools match your current filters.</p>
                <p className="hint">Try adjusting your search criteria.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default DataExplorer;
