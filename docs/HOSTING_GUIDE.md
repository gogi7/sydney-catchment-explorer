# Hosting Guide — GitHub Pages & Beyond

A practical guide for hosting Sydney Catchment Explorer, covering GitHub Pages setup, limitations, and when to consider alternatives as the app grows.

---

## GitHub Pages Overview

GitHub Pages serves static files (HTML, CSS, JS, JSON, images) directly from a repository. No server-side code runs — it's purely a CDN for your built files.

### How It Works for This App

```
Local Machine                         GitHub Pages
┌─────────────────────┐               ┌──────────────────┐
│ NSW Sales Data (CSV) │               │                  │
│        ↓             │   git push    │  index.html      │
│ SQLite DB (ingest)   │ ──────────→   │  assets/*.js     │
│        ↓             │               │  data/*.json     │
│ JSON export          │               │  data/*.geojson  │
│        ↓             │               │                  │
│ vite build → dist/   │               │  Served via CDN  │
└─────────────────────┘               └──────────────────┘
```

The SQLite database **never leaves your machine**. Only the exported static files are deployed.

---

## Pros of GitHub Pages

| Benefit | Details |
|---------|---------|
| **Free** | No hosting costs for public repos |
| **Zero maintenance** | No servers to manage, patch, or monitor |
| **Auto-deploy** | Push to `main` → GitHub Actions builds and deploys |
| **HTTPS included** | Free SSL certificate, automatic renewal |
| **Custom domains** | Point your own domain via CNAME (free) |
| **Global CDN** | Served from GitHub's edge network (Fastly) |
| **Version controlled** | Every deployment is a git commit — easy rollback |
| **Reliable** | GitHub's uptime is excellent (~99.9%) |

---

## Cons & Limitations

| Limitation | Details |
|------------|---------|
| **Static only** | No server-side code (no Node, Python, databases) |
| **Site size cap** | 1 GB maximum for the published site |
| **Bandwidth cap** | 100 GB/month soft limit |
| **Build frequency** | Max 10 builds per hour |
| **No auth** | Can't restrict access — everything is public |
| **No API routes** | Can't create `/api/search` endpoints |
| **No SSR** | No server-side rendering for SEO or dynamic content |
| **Manual data updates** | Must ingest locally, export, and push to update data |
| **Public repo required** | Unless on GitHub Pro/Team ($4+/month) |
| **Single region** | CDN helps, but origin is US-based |

---

## Considerations as the App Grows

### Data Volume

| Scenario | GitHub Pages | Better Alternative |
|----------|-------------|-------------------|
| Schools JSON (~2 MB) | ✅ Fine | — |
| GeoJSON catchments (~20 MB) | ✅ Fine | — |
| Property sales (~50 MB JSON) | ⚠️ Workable but slow initial load | Paginated API |
| Sales history 5+ years (~200 MB) | ❌ Too large | Database + API |
| Real-time sales data | ❌ Not possible | Backend with scheduled ingestion |

**Rule of thumb:** If total data exceeds ~50 MB, users on slow connections will suffer. Consider lazy loading or splitting data by suburb/region.

### Feature Triggers to Move Off Pages

Consider migrating when you need:

- **User accounts / saved searches** → needs a backend + database
- **Real-time data updates** → needs a server to poll/ingest data sources
- **Server-side search** → full-text search across large datasets
- **Private/paid access** → authentication and authorization
- **Email notifications** → "alert me when a property sells in this catchment"
- **Heavy computation** → school ranking algorithms on large datasets
- **File uploads** → user-submitted data or feedback

### Performance Concerns

- **Large GeoJSON files** slow down map rendering — consider vector tiles (Mapbox/PMTiles) if catchments get more detailed
- **JSON files > 10 MB** should be split or lazy-loaded by region
- **No gzip control** — GitHub Pages compresses automatically, but you can't tune it
- **No caching headers control** — GitHub sets its own cache policy (~10 min)

---

## Alternative Hosting Options

### Free Tier (Static + Serverless)

| Platform | Static Hosting | Serverless Functions | Key Advantage |
|----------|---------------|---------------------|---------------|
| **Vercel** | ✅ Free | ✅ Free (100GB-hrs) | Best DX, instant previews, edge functions |
| **Netlify** | ✅ Free | ✅ Free (125k/month) | Form handling, identity, easy redirects |
| **Cloudflare Pages** | ✅ Free | ✅ Workers (100k/day) | Fastest global CDN, D1 database |
| **GitHub Pages** | ✅ Free | ❌ | Simplest, zero config |

### Recommended Migration Path

```
Stage 1 (Now)
  GitHub Pages — static site, manual data updates
  Cost: $0

Stage 2 (Growing)
  Vercel or Cloudflare Pages — add API routes for search,
  use serverless functions for data queries
  Cost: $0 (free tier)

Stage 3 (Production)
  Vercel/Cloudflare + managed database (Supabase, PlanetScale, or D1)
  User accounts, real-time data, notifications
  Cost: $5–25/month

Stage 4 (Scale)
  Full stack on Railway/Fly.io/AWS with PostgreSQL + PostGIS,
  vector tiles, background workers for data ingestion
  Cost: $25–100+/month
```

### Quick Comparison for This App

| Need | GitHub Pages | Vercel | Cloudflare Pages |
|------|-------------|--------|-----------------|
| Static React app | ✅ | ✅ | ✅ |
| Custom domain | ✅ | ✅ | ✅ |
| API routes | ❌ | ✅ | ✅ (Workers) |
| Database | ❌ | ❌ (use Supabase) | ✅ (D1) |
| Auto data refresh | ❌ | ✅ (Cron) | ✅ (Cron Triggers) |
| Auth | ❌ | ✅ | ✅ |
| Preview deploys | ❌ | ✅ | ✅ |
| Build speed | ~30s | ~15s | ~15s |

---

## Setting Up GitHub Pages (This App)

### Prerequisites
- Repository pushed to GitHub
- `vite.config.js` configured with correct `base` path

### Steps

1. **Update `vite.config.js`:**
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/sydney-catchment-explorer/',
   })
   ```

2. **Add GitHub Actions workflow** (`.github/workflows/deploy.yml`) — auto-builds and deploys on push to `main`

3. **Enable Pages** in repo Settings → Pages → Source: GitHub Actions

4. **Access at:** `https://gogi7.github.io/sydney-catchment-explorer/`

### Updating Data

```bash
# 1. Ingest new sales data locally
npm run data:ingest -- --source "C:/path/to/new/data" --type weekly

# 2. Export to JSON
npm run data:export -- --months 12

# 3. Build and verify locally
npm run build
npm run preview

# 4. Push to deploy
git add -A
git commit -m "Update sales data YYYY-MM-DD"
git push
```

GitHub Actions will automatically rebuild and deploy within ~1 minute.

---

## Summary

**GitHub Pages is the right choice right now.** The app is static, the data fits comfortably, and there's no need for a backend. When you start needing user accounts, real-time data, or server-side search, Vercel or Cloudflare Pages are the natural next step — both have generous free tiers and support gradual migration from static to dynamic.

Don't over-engineer. Ship it, use it, and upgrade when the limitations actually bite.
