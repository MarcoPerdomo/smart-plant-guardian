# Homepage showcase and unified plant activity plan

## Goal
Add a short, silent live slideshow to the homepage using faithful Sentia interface scenes, then add a complete maintenance journal so the showcased actions are real product capabilities.

## Homepage showcase
- Replace the homepage’s static product preview with a lightweight, responsive live slideshow that preserves the current colors and page design.
- Use a small set of polished Sentia screen scenes, grouped for a concise story:
  1. Add a plant and start its profile.
  2. Build a photo journal and record care activities.
  3. Use the AI care advisor.
  4. Post updates, ask for help, and engage with the community.
- Autoplay with calm slide/crossfade motion, pause while hovered or focused, provide previous/next and slide indicators, and support keyboard navigation.
- Respect reduced-motion settings by showing a stable first scene with manual navigation.
- Build the scenes from existing Sentia styling and representative interface content rather than screenshots, keeping them sharp and adaptable on mobile.

## Unified plant activity journal
- Add a scalable `plant_events` table as the source of truth for watering, fertilizing, pruning, repotting, flowering, and deceased events.
- Store the shared fields once: plant, owner, event type, event time, notes, optional quantity, structured event-specific details, source (`manual`, `sensor`, or `system`), and timestamps.
- Keep event type extensible so future care activities do not require a new table.
- Add owner-only row-level access and explicit authenticated/service grants, plus indexes for plant timeline and event-type/date lookups.
- Migrate the 11 existing watering-history rows into `plant_events` without changing their timestamps or notes.
- Keep `user_plants.last_watered_at` as a derived compatibility/cache field because current status and watering prediction use it; update it automatically from watering events rather than treating it as the history itself.
- Preserve the existing `watering_events` interface temporarily as a compatibility view or equivalent adapter so older call sites and integrations cannot silently fail during the transition.

## Logging and timeline experience
- Replace the watering-only history on each plant page with one chronological activity timeline using clear icons and labels for all supported event types.
- Add an activity logger with type-specific fields:
  - Watering: optional amount and notes.
  - Fertilizing: optional product/amount and notes.
  - Pruning: notes.
  - Repotting: optional pot/soil details and notes.
  - Flowering: notes.
  - Deceased: notes, followed by a separate confirmation asking whether to archive the plant.
- Update manual watering and Raspberry Pi automatic-watering detection to write into the unified event table.
- Continue updating watering predictions and health status from the latest watering event.
- Do not automatically archive a deceased plant; only archive after the user confirms that second action.

## Social integration
- Keep the private plant journal separate from the social feed.
- Allow care events to generate the existing derived feed activity where appropriate, with friendly labels for new event types.
- Retain existing visibility, reactions, comments, and feed permissions; avoid posting duplicate watering activities during migration.

## Technical details
- Apply the schema change through one reviewed Supabase migration, including table grants, RLS, indexes, migration SQL, compatibility support, and trigger/function updates.
- Update the plant server functions, device-ingest path, plant detail page, status calculations, and social event mapping together so manual and automatic activity follow one path.
- Do not change unrelated backend tables or the established Sentia design system.
- Record the unified event model as an architecture rule and keep the task roadmap current.

## Verification
- Confirm existing watering history appears once in the unified timeline and latest-watered dates remain correct.
- Test each new activity type end to end as an authenticated owner, including notes and event-specific fields.
- Test both branches of the deceased confirmation: keep active and archive.
- Verify automatic watering still records correctly and refreshes watering predictions.
- Verify any resulting feed activity respects existing visibility rules and is not duplicated.
- Check slideshow autoplay, controls, reduced motion, keyboard use, and layout on desktop and mobile.
- Confirm route metadata remains valid and the preview builds without errors.
