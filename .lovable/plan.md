# Weather-aware plant care

Add a location to each account, pull live weather for it, show a small weather chip that's always visible, and turn "today's weather + this plant's care needs" into concrete alerts.

## What you'll see

**Settings — new "Location" section**
- Type a city ("Amsterdam", "Rotterdam") and pick from a suggestion list. Selecting a city stores its name, country, coordinates and timezone. No street address.
- A "Use my current location" button (browser geolocation) as a shortcut.

**Weather chip in the header (signed in)**
- Icon + current temperature, always in the top bar.
- Click it for a small panel: today's high/low, condition, humidity, UV index, chance of rain, plus the list of plants that need attention today and why.
- On the public landing page, the same chip renders in a lightweight "visitor" mode: it asks the browser for location on click (never automatically) and shows plain weather with a "Sign in to get plant alerts" line. No account data involved.

**Alerts on the dashboard and plant cards**
- A plant card shows a weather badge when today's conditions clash with that plant's care profile, e.g. "Heat + low humidity — check soil today", "Strong sun — move back from the window", "Cold night — keep away from the glass".
- The same alerts are written to your notifications feed, respecting your notification preferences.

## Alert rules (care data + weather)

The species catalog already stores what's needed for all 132 species: `light`, `temperature_min_c` / `temperature_max_c`, `humidity_min` / `humidity_max`, and `water_frequency_days`.

| Condition | Rule | Message |
|---|---|---|
| Heat stress | daily max > species `temperature_max_c` | Check soil today; move away from hot glass |
| Cold stress | daily min < species `temperature_min_c` | Move away from cold windows / draughts |
| Dry air | outdoor humidity well below species `humidity_min` for 2+ days | Mist or group plants; expect faster drying |
| Strong sun | UV index high **and** species light text indicates low/indirect light | Pull back from direct light for the afternoon |
| Fast drying | hot + dry + sunny together | Bring the predicted watering date forward by a day |
| Long dull spell | several consecutive low-light/overcast days for a bright-light species | Consider a brighter spot |

Species `light` is free text ("Bright indirect light", "Low to bright indirect", "Full sun to bright indirect light"), so it's classified into low / medium / bright / direct by keyword matching rather than assuming a fixed set of values.

Alerts are deduplicated: one alert per plant per rule per day, so a hot week doesn't produce twenty notifications.

## Notifications

In-app alerts write to your existing notifications feed and honour the "in-app" toggle in Settings. The email and SMS toggles already exist in Settings, but no email or SMS provider is connected to this project yet — until one is added those alerts stay in-app only. Email alerts get wired up in this same build: a daily digest of that day's weather alerts, sent to users with the email toggle on. That needs a sender domain you own connected to the project (Project Settings → Domains, then the email setup step) — I'll open that dialog during the build; SMS stays out of scope for now.

## Technical notes

**Database**
- `profiles` gains: `city`, `region`, `country_code`, `latitude`, `longitude`, `timezone`. All optional, owner-scoped under existing RLS.
- New `weather_cache` table (lat/lon rounded + fetched_at + payload) so repeated page loads don't re-hit the weather API; server-written only, readable by authenticated users.
- New `plant_weather_alerts` table (plant_id, user_id, rule, severity, message, for_date) with a unique constraint on (plant_id, rule, for_date) for the once-per-day dedupe, plus owner-scoped RLS.

**Weather source**
Open-Meteo — free, no API key, no billing setup, and it includes a geocoding endpoint for the city picker plus UV index and hourly humidity. Nothing to configure on your side.

**Code**
- `src/lib/weather.server.ts` — Open-Meteo fetch + cache read/write.
- `src/lib/weather.functions.ts` — server functions: `searchCities`, `saveLocation`, `getWeatherForMe`, `getPlantWeatherAlerts`; a public `getWeatherAt(lat, lon)` for the landing-page chip.
- `src/lib/weather-rules.ts` — pure, client-safe rule engine (light-text classifier + the table above) so the same logic runs in the UI and on the server.
- `src/components/weather-chip.tsx` — header chip and dropdown panel, plus the visitor variant.
- Edits: `src/routes/_authenticated/route.tsx` (chip in header), `src/routes/index.tsx` (visitor chip), `src/routes/_authenticated/settings.tsx` (location section), `src/routes/_authenticated/dashboard.tsx` and the plant detail page (alert badges).
