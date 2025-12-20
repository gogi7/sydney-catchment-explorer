# Sydney Catchment Explorer 🗺️

An interactive web application for exploring NSW public school catchment areas. View school boundaries, access detailed school information, and find schools by location or name.

![React](https://img.shields.io/badge/React-19.1.0-blue)
![Vite](https://img.shields.io/badge/Vite-6.3.5-purple)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.x-green)

## Features

- 🗺️ **Interactive Map** - Pan, zoom, and explore school catchment boundaries on an OpenStreetMap base
- 🏫 **2,200+ Schools** - Complete NSW public school database with detailed information
- 📍 **Catchment Layers** - Toggle primary, secondary, and future catchment boundaries
- 🔍 **Search & Filter** - Find schools by name, suburb, or school level
- 📊 **School Details** - Enrolment stats, ICSEA scores, demographics, and contact info
- 🏠 **Property Sales** - View recent property sales data for school suburbs (NSW Valuer General data)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
sydney-catchment-explorer/
├── public/
│   └── data/
│       ├── schools.json              # School master data
│       ├── catchments_primary.geojson
│       ├── catchments_secondary.geojson
│       └── catchments_future.geojson
├── src/
│   ├── components/
│   │   ├── Map/                      # Map components
│   │   └── Panels/                   # UI panels
│   ├── hooks/                        # Custom React hooks
│   ├── stores/                       # Zustand state management
│   └── utils/                        # Constants and utilities
└── docs/                             # Technical documentation
    ├── TECHNICAL_PRD.md
    ├── ARCHITECTURE.md
    └── DATA_DICTIONARY.md
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite | Build tool & dev server |
| Leaflet + React-Leaflet | Interactive mapping |
| Zustand | State management |
| CSS Modules | Styling |

## Data Sources

- **School Data**: NSW Department of Education Public Schools Master Dataset
- **Catchment Data**: NSW School Finder GeoJSON boundaries
- **Property Sales**: [NSW Valuer General](https://valuation.property.nsw.gov.au/embed/propertySalesInformation) Property Sales Information (PSI)

## Development

```bash
# Run linting
npm run lint

# Preview production build
npm run preview
```

### Property Sales Data Pipeline

```bash
# Ingest weekly sales data from NSW Valuer General
npm run data:ingest -- --source "C:/path/to/weekly/20251215" --type weekly

# Ingest annual sales data
npm run data:ingest -- --source "C:/path/to/annual/2024" --type annual

# Export data to JSON for frontend
npm run data:export -- --months 12
```

Download sales data from [NSW Valuer General Portal](https://valuation.property.nsw.gov.au/embed/propertySalesInformation).

## Documentation

See the `/docs` folder for:
- [Technical PRD](docs/TECHNICAL_PRD.md) - Product requirements and specifications
- [Architecture Guide](docs/ARCHITECTURE.md) - System design and patterns
- [Data Dictionary](docs/DATA_DICTIONARY.md) - Data schemas and relationships

## License

This project uses public data from the NSW Department of Education.

---

Built with ❤️ for Sydney families
