# Dashboard card and SMS notification refinements

## Dashboard plant cards
- Keep each card’s plant identity, status, next-watering information and actions intact.
- Replace the always-visible three sensor tiles with one compact content area that shows **Weather watch today** by default.
- Show the plant’s weather alerts in that area, or a calm “No weather warnings today” state when there are none.
- Only when that plant has sensors enabled, add a **View sensors** control that switches the same area to Moisture, Temperature and Light readings.
- In sensor view, provide a **Weather watch** control to switch back. This is a temporary per-card view choice, so opening or refreshing the dashboard always starts on weather.
- Plants with sensors disabled will show no sensor control or sensor readings. Sensor availability continues to be controlled only from the individual plant page’s **Enable sensors / Hide sensors** action.
- Use the existing Sentia card styling and responsive patterns so the reduced content remains clear on mobile and desktop.

## SMS notifications
- Present SMS as a disabled, greyed-out notification option with the message **Coming soon**.
- Keep SMS off in the settings form and save it as disabled, including for an older profile that may previously have had it enabled.
- Leave in-app and email notification controls unchanged.

## Technical details
- Update the authenticated dashboard presentation only; reuse the existing `sensor_enabled`, latest reading and weather alert data already returned to the page.
- Add local per-plant display state for weather versus sensors, without changing the database or sensor setting.
- Update the settings toggle presentation to support a disabled state and ensure `notify_sms` remains `false` when preferences are saved.

## Validation
- Check cards for a plant with sensors disabled, a plant with sensors enabled, weather alerts, no weather alerts and missing sensor readings.
- Confirm the weather/sensor switch works independently on each card and resets to weather after a reload.
- Confirm SMS is greyed out, cannot be selected and saves as disabled.
- Verify the dashboard and settings at desktop and mobile widths, then confirm the preview builds cleanly.
