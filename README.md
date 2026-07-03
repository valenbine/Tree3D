# Tree3D

Tree3D is a real-time 3D GitHub portfolio scene built with Next.js and React Three Fiber. It turns the stars of a GitHub repository into a living floating-island village: the tree grows with star count, each stargazer becomes a house, and the atmosphere reacts to live weather data.

The current version focuses on a Chinese-first bilingual experience, interactive stargazer houses, live GitHub data, and a weather-driven scene that can also fall back to a manual demo mode.

## Demo Concept

Tree3D visualizes a repository as an explorable 3D world:

- Total stars determine how large the tree and village become.
- Every stargazer is mapped to a house in the tree village.
- Each house gets a rarity tier based on GitHub profile signals and contributor status.
- Clicking a house opens a GitHub profile panel with richer user details.
- The scene reacts to live weather and time-of-day data.
- Chinese and English UI are both supported, with Chinese as the default experience.

## Core Features

### 1. GitHub Star Village

- Live star and stargazer data from a configured GitHub repository
- Stable house placement so reloads do not reshuffle the village
- Search bar for quickly locating a stargazer house
- Clickable houses that open a profile detail panel
- Contributor-aware rarity scoring

### 2. Weather-Driven Scene

- Weather data powered by Open-Meteo
- Dynamic sky, fog, wind, clouds, rain, snow, and seasonal color changes
- Default weather location set to Shanghai
- Browser geolocation and IP fallback for more relevant local weather display
- Chinese weather place names in Chinese UI mode

### 3. Interactive 3D Experience

- Orbit view and fly mode
- Animated loading overlay and polished UI transitions
- Volumetric clouds, procedural night sky, and weather particles
- Adaptive quality behavior for smoother performance on weaker devices

### 4. Bilingual Interface

- Chinese-first UI out of the box
- `中 / EN` language switch in the page header
- Project-owned UI strings localized centrally
- External GitHub content kept in its original language

## How Rarity Works

Rarity is computed in `lib/rarity.ts`.

The score mainly depends on:

- GitHub followers
- Public repository count
- Account age
- Whether the stargazer is also a contributor to the tracked repository
- Commit count for contributors

Current tiers:

- `common`
- `uncommon`
- `rare`
- `legendary`

If GitHub enrichment data is unavailable, the client falls back to a deterministic weighted tier based on stargazer index so the scene still renders consistently.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | React, Tailwind CSS |
| 3D | Three.js, React Three Fiber, Drei |
| Animation | GSAP, frame-loop animation |
| Data | GitHub REST API, Open-Meteo |
| Deployment | Vercel |

## Project Structure

```text
app/
  page.tsx                    Main client page and UI state
  api/
    stargazers/route.ts       GitHub star and stargazer aggregation
    gh-user/route.ts          GitHub profile detail API
    user-repos/route.ts       Repository list for profile panel
    weather/route.ts          Weather and reverse geocoding API

components/
  Experience.tsx              Main React Three Fiber scene
  Tree.tsx                    Tree growth and canopy system
  Houses.tsx                  Stargazer houses and selection
  HouseInterior.tsx           Profile details modal
  SearchBar.tsx               Stargazer search UI
  SettingsMenu.tsx            Weather, quality, and debug controls
  LoadingOverlay.tsx          Intro loading screen

lib/
  rarity.ts                   Rarity scoring and tier resolution
  weather.ts                  Weather normalization and scene params
  weather-location.js         Weather location mode state helpers
  i18n.ts                     Centralized bilingual UI copy
  stargazers.ts               Stargazer data types and naming helpers
```

## Environment Variables

Copy the example file first:

```bash
cp .env.local.example .env.local
```

Available variables:

| Variable | Required | Description |
| --- | --- | --- |
| `GITHUB_REPO` | No | Repository to visualize. Defaults to `Plattnericus/ThreeJS_Portfolio`. |
| `GITHUB_TOKEN` | Recommended | GitHub token used server-side for higher API rate limits. |
| `DEMO_STARS` | No | Fallback star count when GitHub data is unavailable. |
| `NEXT_PUBLIC_DEV_CONTROLS` | No | Enables local development-only star editing controls. |
| `CRON_SECRET` | No | Reserved for protected background refresh flows if enabled later. |

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with the repository and token you want to use.

### 3. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Production build check

```bash
npm run build
```

## Deployment Guide

Tree3D is designed to deploy cleanly on Vercel.

### Deploy with Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Set the project framework to Next.js if Vercel does not detect it automatically.
4. Add the required environment variables in the Vercel dashboard.
5. Trigger the first deployment.

Recommended Vercel environment variables:

```text
GITHUB_REPO=your-account/your-target-repo
GITHUB_TOKEN=your-github-token
DEMO_STARS=8
```

### Post-Deploy Checks

After deployment, verify:

- The homepage loads the 3D scene successfully.
- `/api/stargazers` returns live repository data.
- `/api/weather` returns weather payloads correctly.
- Language toggle works.
- Search selects and opens the correct house.

## User Flow

1. Open the site and wait for the scene to load.
2. Browse the floating island village.
3. Use the search bar to find a stargazer.
4. Click a house to open that stargazer's profile panel.
5. Use the settings menu to inspect weather, quality, and live/manual scene behavior.

## Data Sources

### GitHub

- Repository stars and stargazers
- User profile data
- Public repository metadata
- Contributor commit counts when available

### Open-Meteo

- Temperature
- Cloud cover
- Wind speed and gusts
- Visibility
- Rain and snowfall
- Day and night timing

## Performance Notes

- Quality adapts based on device capability and runtime conditions.
- Cloud quality is reduced while the camera is moving.
- Scene effects try to stay GPU-friendly for laptop-class devices.
- Fly mode is supported for free exploration without changing the core data model.

## Known Limitations

- The tree asset is still a stylized static model, so true organic growth would require morph targets or a rigged asset.
- GitHub enrichment is intentionally capped to avoid aggressive API usage.
- `npm run lint` still points to the legacy `next lint` flow and needs a separate migration for Next.js 16.
- Location accuracy depends on browser geolocation availability and the external reverse geocoding provider.

## Credits

3D model and asset credits are tracked in `CREDITS.md`.

## License

This repository is a portfolio-style project. Review `CREDITS.md` before reusing bundled assets or models.
