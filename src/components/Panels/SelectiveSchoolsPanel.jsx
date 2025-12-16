import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import './SelectiveSchoolsPanel.css';

export function SelectiveSchoolsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'fully' | 'partially'
  
  const getSelectiveSchools = useAppStore((state) => state.getSelectiveSchools);
  const selectSchool = useAppStore((state) => state.selectSchool);
  const selectedSchool = useAppStore((state) => state.selectedSchool);
  const highlightedSchools = useAppStore((state) => state.highlightedSchools);
  const toggleHighlightSchool = useAppStore((state) => state.toggleHighlightSchool);
  
  const selectiveSchools = getSelectiveSchools();
  
  // Filter schools based on selected type
  const filteredSchools = selectiveSchools.filter((school) => {
    if (filterType === 'all') return true;
    if (filterType === 'fully') return school.Selective_school === 'Fully Selective';
    if (filterType === 'partially') return school.Selective_school === 'Partially Selective';
    return true;
  });
  
  const fullyCount = selectiveSchools.filter(s => s.Selective_school === 'Fully Selective').length;
  const partiallyCount = selectiveSchools.filter(s => s.Selective_school === 'Partially Selective').length;

  const handleSchoolClick = (school, event) => {
    if (event.altKey) {
      // Alt+Click to toggle highlight
      toggleHighlightSchool(school.School_code);
    } else {
      // Regular click to select and fly to school
      selectSchool(school);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        className={`selective-toggle-btn ${isOpen ? 'selective-toggle-btn--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="View Selective Schools (No Catchment Boundaries)"
      >
        <span className="selective-toggle-btn__icon">🎓</span>
        <span className="selective-toggle-btn__count">{selectiveSchools.length}</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="selective-panel">
          <div className="selective-panel__header">
            <h2 className="selective-panel__title">
              <span>🎓</span> Selective Schools
            </h2>
            <button 
              className="selective-panel__close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <p className="selective-panel__subtitle">
            These schools have no catchment boundaries - admission is by selective test only.
          </p>

          {/* Filter Tabs */}
          <div className="selective-panel__filters">
            <button 
              className={`selective-filter ${filterType === 'all' ? 'selective-filter--active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({selectiveSchools.length})
            </button>
            <button 
              className={`selective-filter ${filterType === 'fully' ? 'selective-filter--active' : ''}`}
              onClick={() => setFilterType('fully')}
            >
              Fully ({fullyCount})
            </button>
            <button 
              className={`selective-filter ${filterType === 'partially' ? 'selective-filter--active' : ''}`}
              onClick={() => setFilterType('partially')}
            >
              Partially ({partiallyCount})
            </button>
          </div>

          {/* School List */}
          <ul className="selective-panel__list">
            {filteredSchools.map((school) => {
              const isSelected = selectedSchool?.School_code === school.School_code;
              const isHighlighted = highlightedSchools.includes(school.School_code);
              
              return (
                <li 
                  key={school.School_code}
                  className={`selective-school-item ${isSelected ? 'selective-school-item--selected' : ''} ${isHighlighted ? 'selective-school-item--highlighted' : ''}`}
                  onClick={(e) => handleSchoolClick(school, e)}
                >
                  <div className="selective-school-item__main">
                    <span className="selective-school-item__name">
                      {school.School_name}
                    </span>
                    <span className={`selective-school-item__badge ${school.Selective_school === 'Fully Selective' ? 'selective-school-item__badge--fully' : 'selective-school-item__badge--partially'}`}>
                      {school.Selective_school === 'Fully Selective' ? 'Fully' : 'Partial'}
                    </span>
                  </div>
                  <div className="selective-school-item__meta">
                    <span>{school.Town_suburb}</span>
                    <span>•</span>
                    <span>{school.Level_of_schooling}</span>
                    {school.School_gender !== 'Coed' && (
                      <>
                        <span>•</span>
                        <span>{school.School_gender}</span>
                      </>
                    )}
                  </div>
                  {school.ICSEA_value && (
                    <div className="selective-school-item__icsea">
                      ICSEA: <strong>{school.ICSEA_value}</strong>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          
          <p className="selective-panel__hint">
            💡 Click to select • Alt+Click to highlight multiple
          </p>
        </div>
      )}
    </>
  );
}
