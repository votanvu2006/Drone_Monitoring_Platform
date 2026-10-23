# Alerts UI - issue #31

The fixed frontend examples follow the updated issue and maintainer comment of 23 October 2026:

- DEMO-ALT-001: low battery, DRONE-002 / mission-002, WARNING, Components.
- DEMO-ALT-002: high motor temperature, DRONE-002 / mission-002, WARNING, Components.
- DEMO-ALT-003: weather failure, DRONE-005 / mission-005, CRITICAL, Weather.

Mission identifiers match the fixed Missions demo. DEMO-ALT-* codes distinguish these presentation examples from canonical ALT-* records. The data pack and backend are unchanged.

Previews:

- `/?screen=alerts`: the three examples, CRITICAL first, then WARNING, newest detection first within severity, then ascending alert code.
- `/?screen=alerts&state=detail-active`: DEMO-ALT-001, with an empty resolution-note area.
- `/?screen=alerts&state=detail-resolved`: DEMO-ALT-003, with a recorded resolution note.
- `/?screen=alerts&state=detail&alert=DEMO-ALT-002`: an explicit example by code.
- An unknown code displays "Alert not found". Detail without a code defaults to DEMO-ALT-001. The legacy detail-active/detail-resolved state names remain review-preview aliases; they do not add a Status column.

The seven list columns are Alert ID/title, Drone, Mission, Problem Description, Severity, Source and Detected Time. Counts show Total, Critical and Warning. Descriptions are short and separate from the alert title. All times are fixed UTC values formatted in ICT (UTC+07) through the shared formatter, independently of the browser timezone.

The standalone preview has one main landmark and no global header or navigation. AlertsPage, AlertList and AlertDetail are content exports for shared-shell composition; AlertsPage retains its view and alertCode props. Search is readonly, the Severity filter is disabled and rows do not select or navigate. Both appearances use shared tokens; mobile rows keep a visible label for every field. There are no API requests, acknowledgement or resolution actions.

Feature data and content live in src/features/alerts. Preview state and URL parsing stay in src/examples/alerts. The page has no path-like Operations/Alerts eyebrow.
