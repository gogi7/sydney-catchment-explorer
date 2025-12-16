import { useAppStore } from '../../stores/appStore';
import './SchoolInfoPanel.css';

export function SchoolInfoPanel() {
  const selectedSchool = useAppStore((state) => state.selectedSchool);
  const clearSelection = useAppStore((state) => state.clearSelection);

  if (!selectedSchool) {
    return null;
  }

  const school = selectedSchool;
  const enrolment = school.latest_year_enrolment_FTE 
    ? Math.round(school.latest_year_enrolment_FTE).toLocaleString()
    : 'N/A';

  return (
    <div className="school-info-panel">
      <button 
        className="school-info-panel__close" 
        onClick={clearSelection}
        aria-label="Close panel"
      >
        ×
      </button>

      <div className="school-info-panel__header">
        <h2 className="school-info-panel__name">{school.School_name}</h2>
        <div className="school-info-panel__type">
          {school.Level_of_schooling}
          {school.Selective_school !== 'Not Selective' && (
            <span className="school-info-panel__badge school-info-panel__badge--selective">
              {school.Selective_school}
            </span>
          )}
          {school.Opportunity_class === 'Y' && (
            <span className="school-info-panel__badge school-info-panel__badge--oc">
              OC
            </span>
          )}
        </div>
      </div>

      <div className="school-info-panel__content">
        {/* Location */}
        <div className="info-section">
          <h3 className="info-section__title">📍 Location</h3>
          <p className="info-section__text">
            {school.Street}<br />
            {school.Town_suburb} NSW {school.Postcode}
          </p>
          <p className="info-section__text info-section__text--small">
            LGA: {school.LGA}
          </p>
        </div>

        {/* Statistics */}
        <div className="info-section">
          <h3 className="info-section__title">📊 Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-item__label">Enrolment</span>
              <span className="stat-item__value">{enrolment}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item__label">ICSEA</span>
              <span className="stat-item__value">{school.ICSEA_value || 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item__label">LBOTE %</span>
              <span className="stat-item__value">
                {school.LBOTE_pct === 'np' ? 'np' : (school.LBOTE_pct || 'N/A')}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-item__label">Indigenous %</span>
              <span className="stat-item__value">
                {school.Indigenous_pct === 'np' ? 'np' : (school.Indigenous_pct || 'N/A')}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="info-section">
          <h3 className="info-section__title">🏫 Details</h3>
          <div className="details-list">
            <div className="detail-item">
              <span className="detail-item__label">Gender</span>
              <span className="detail-item__value">{school.School_gender}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Specialty</span>
              <span className="detail-item__value">{school.School_specialty_type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Subtype</span>
              <span className="detail-item__value">{school.School_subtype}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Preschool</span>
              <span className="detail-item__value">{school.Preschool_ind === 'Y' ? 'Yes' : 'No'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Opened</span>
              <span className="detail-item__value">{school.Date_1st_teacher}</span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="info-section">
          <h3 className="info-section__title">📞 Contact</h3>
          <div className="details-list">
            <div className="detail-item">
              <span className="detail-item__label">Phone</span>
              <span className="detail-item__value">{school.Phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Email</span>
              <a 
                href={`mailto:${school.School_Email}`} 
                className="detail-item__link"
              >
                {school.School_Email}
              </a>
            </div>
          </div>
          {school.Website && (
            <a 
              href={school.Website}
              target="_blank"
              rel="noopener noreferrer"
              className="school-info-panel__website"
            >
              Visit School Website →
            </a>
          )}
        </div>

        {/* School Code */}
        <div className="info-section info-section--muted">
          <span className="school-code">
            School Code: {school.School_code}
          </span>
        </div>
      </div>
    </div>
  );
}

