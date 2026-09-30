# Plant workspace and sensor opt-in

## Goal
Make the plant page lead with hands-on care and journaling, while treating sensors as an optional feature that owners can enable later.

## Add a plant
- Remove the visible “Pair an Arduino” step and device ID field from `/plants/new`.
- New plants will still be created normally, with no sensor connection.
- Leave the existing sensor connection data model intact so pairing can return later from the dashboard or plant page.

## Plant page order
Rebuild the selected plant view in this order:

1. **Status**
   - Keep overall health, next watering and relevant weather alerts together near the top.
   - Remove sensor-specific readings and refresh controls from the page header.

2. **Care profile**
   - Move the existing species care guidance directly below Status.

3. **Maintenance journal**
   - Make “Log care” prominent here instead of opening beneath the header.
   - Support watering, fertilizing, pruning, repotting, flowering and deceased entries.
   - Show a compact recent-maintenance preview so users immediately see their manual care activity.

4. **Photo journal**
   - Keep photo upload, latest photo and the existing link to the complete photo journal.

5. **Sensor journal**
   - New plants start with this section inactive and see a simple opt-in panel.
   - Existing plants remain enabled during migration, preserving their current experience.
   - When enabled, provide the latest Moisture, Temperature and Light readings, live update status, refresh action, manual reading entry, device ID when present, latest camera snapshot and the historical chart.
   - Update the historical chart to include Moisture, Temperature and Light, matching the headline readings.
   - Allow the owner to disable the Sensor journal again without deleting readings or device information.

6. **AI summaries**
   - Show only the latest three summaries initially.
   - Add “Show all” / “Show less” controls and a dedicated full-history page.
   - Keep AI Check and regenerate actions available.

7. **Care journal**
   - Show the latest five combined care events initially, including manual and automatic watering.
   - Add “Show all” / “Show less” controls and a dedicated full-history page.

## Data and behavior
- Add a per-plant sensor-enabled setting.
- Backfill every existing plant as enabled; default newly created plants to disabled.
- Keep all historical sensor readings and device IDs untouched when sensors are disabled.
- Continue using `plant_events` as the source of truth for care history and `last_watered_at` only as its maintained cache.
- Add owner-scoped actions for changing sensor visibility and fetching complete summary/event histories.

## New history pages
- Add a complete AI summary history for one plant, newest first.
- Add a complete care journal for one plant, newest first.
- Include clear navigation back to the plant page and route-specific metadata.

## Validation
- Check the new-plant form without the Arduino step.
- Check the reordered plant page on desktop and mobile.
- Verify new plants have sensors hidden, migrated plants stay enabled, and toggling does not remove prior data.
- Verify live readings, charts, photo actions, care logging, inline expansion and both full-history pages.
