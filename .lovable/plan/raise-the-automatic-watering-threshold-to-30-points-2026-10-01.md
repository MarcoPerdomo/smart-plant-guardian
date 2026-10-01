# Raise the automatic watering threshold to 30 points

## Current behaviour
When a new sensor reading arrives, the server compares soil moisture with the previous reading. A jump of more than **10 percentage points** is treated as a watering and auto-logs a watering event, updates the plant's last-watered time, and notifies the owner. Guards: one auto-log per plant per 6 hours, and the previous reading must be less than 24 hours old.

A real-world sensor bump (37% to 48%, +11 points) falsely triggered this.

## Change
- Raise `MOISTURE_SPIKE_PCT` in `src/routes/api/public/ingest.ts` from `10` to `30`, so only a moisture rise of more than 30 points counts as an automatic watering.
- Everything else stays as-is: 6-hour cooldown, 24-hour maximum age of the previous reading, notifications, and the message format ("moisture jumped from X% to Y%").

## Notes
- No database, frontend, or Pi agent changes.
- Past auto-logged events are not modified; only new readings use the new threshold.
