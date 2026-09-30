# Plant journal and dashboard refinements

## Changes
- Reorder each plant page so AI summaries appear immediately before the optional Sensor journal.
- Add a prominent one-click **Log watering** action beside **Log care** in the Maintenance journal.
- Show a compact plant thumbnail beside each nickname on the dashboard, using the latest journal photo when available and a plant icon fallback otherwise.
- Add a small delete action to each recent Maintenance journal entry with a confirmation step.

## Data and safety
- Extend the existing plant list request with only the latest photo per plant, then create short-lived image links for dashboard thumbnails.
- Delete care events through an authenticated, ownership-checked action.
- Keep watering status accurate after deletion through the existing database trigger, and remove the matching automatically-created feed post so deleted journal activity is not left in the social feed.

## Validation
- Confirm the app builds cleanly and inspect the dashboard and plant page at desktop and mobile sizes where access allows.
