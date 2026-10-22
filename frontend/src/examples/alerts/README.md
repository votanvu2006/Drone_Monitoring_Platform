# Alerts UI — issue #31

Previews:

- `/?screen=alerts`: all 24 canonical seed alerts (6 active, 18 resolved).
- `/?screen=alerts&state=detail-active`: ALT-014, active propeller incident.
- `/?screen=alerts&state=detail-resolved`: ALT-016, resolved GPS incident.
- `/?screen=alerts&state=detail&alert=ALT-001`: any alert by its stable code.
- An unknown explicit alert code displays "Alert not found". Detail without a code defaults to ALT-014.

The preview is standalone and has one main landmark, with no shared navigation or global header. Exported AlertsPage, AlertList and AlertDetail are content components for later shell integration.

The adapter reads canonical data-pack JSON and joins mission, flight, drone and installed component records by ID. No seed or backend files are modified. Source is a presentation group (Components, Connectivity, Airspace, Weather or System); original source, rule and alert type remain visible in details.

Order is CRITICAL before WARNING, ACTIVE before RESOLVED within severity, newest detection first, then descending numeric ID. Counts are derived. All record fields, relationship IDs, measurements and lifecycle dates are displayed in the detail. Null values are explicit and zero measurements are preserved. Pack timestamps are UTC and displayed in ICT (UTC+07), independent of the browser timezone.

Both list and details use shared semantic theme tokens. The default standalone preview is light. Search is readonly and filters are disabled. There is no record selection, navigation, acknowledgement, resolution, pagination or API request.

Feature content and read models live in src/features/alerts. Preview state and URL parsing stay in src/examples/alerts. Seed imports and ICT formatting are shared.
