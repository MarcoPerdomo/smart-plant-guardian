# Sensor readings: clearer light, tooltips, and auto watering

## 1. Light shown as a percentage
The light sensor reports a 0-100 scale (0 = complete darkness, 100 = direct sunlight), not true lux. Everywhere a reading is displayed it will read as `72%` instead of `72 lx`:
- Plant detail page metric card
- Dashboard plant card ("Light")
- Sensor history chart label

Data stays in the existing `light_lux` column; only the presentation changes.

## 2. Hover explanations for each sensor
Each sensor metric (Moisture, Temp, Light) on the plant page — and the small stats on the dashboard cards — gets an info hint on hover/tap explaining what the number means:
- Moisture: percentage of soil water content from the capacitive probe; target range comes from the species profile.
- Temp: ambient air temperature in °C next to the plant.
- Light: relative brightness 0-100%, where 100% is direct sunlight and 0% is complete darkness. Not a nominal lux value.

Implemented with the existing shadcn tooltip component so it works with keyboard focus and on touch.

## 3. Remove the Motion (24h) block
The "Motion (24h)" card disappears from the plant page; the remaining three metrics span the row evenly. Nothing changes in the database, the ingest endpoint, or the Pi agent — motion data keeps being collected and stored.

## 4. Automatic watering log from a moisture spike
When a new sensor reading arrives at the ingest endpoint, the server compares its soil moisture with the previous reading for that plant. If moisture jumped by more than 10 percentage points, it means the plant was just watered, so the app will:
- Create a watering event dated at the reading time, noted as "Auto-logged from sensor (moisture +X%)"
- Update the plant's last-watered time (so "next watering" predictions stay accurate)
- Send the owner a notification: "Watering logged automatically — moisture on <plant> jumped from 22% to 61%"

Guard rails so it does not fire repeatedly:
- Only one auto-log per plant per 6 hours
- Only when both readings have a moisture value and the previous reading is less than 24 hours old
- Failures here never break sensor ingestion; the reading is still stored

The existing feed post trigger on watering events keeps working, so an auto-logged watering shows up in the feed like a manual one.

## Technical notes
- `src/routes/api/public/ingest.ts`: after inserting the reading, fetch the previous reading for the plant, apply the delta rule, then insert into `watering_events`, update `user_plants.last_watered_at`, and insert a `notifications` row (kind `watering_auto`) via the admin client, wrapped in try/catch.
- `src/routes/_authenticated/plants/$id.tsx`: drop the Motion metric, switch light to `%`, add tooltips to `Metric`.
- `src/routes/_authenticated/dashboard.tsx`: light `%` and tooltips on `Stat`.
- No database migration required.
