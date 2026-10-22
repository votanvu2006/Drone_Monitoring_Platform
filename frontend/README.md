# Drone Monitoring Platform frontend

React + TypeScript + Vite, built on the existing Fleet Inventory and Drone Detail from issues #28 and #43. Shared UI and feature modules live in `frontend/`.

## Development and verification

Use Node.js 24. Run `npm ci`, then `npm run dev` from this directory.
Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Install Chromium with `npx playwright install chromium`, then run `npm run test:browser`.
Browser checks cover desktop, tablet, mobile and short landscape layouts, console errors and unexpected fetch/XHR requests. Screenshots are saved in the ignored test-results directory.

## Shared shell and previews

- The root page and `/?screen=drones` preserve Fleet Inventory and its View details / Back to fleet flow.
- `/?screen=shell` demonstrates the shared frame. Unknown screen names fall back to this sample.
- Features register metadata in `src/examples/**/*.preview.tsx`. Unknown state names use the feature's default.
- The header shows a fixed sample avatar and username. Navigation and Log out are visual controls.
- The theme switch works with mouse, Enter and Space. It defaults to light on each page load and never saves a preference or follows the operating system theme.
- Both themes use shared semantic tokens for surfaces, text, focus, status badges, Fleet and Drone Detail.
- The fixed desktop navigation scrolls independently in short windows, while Log out stays visible. Compact layouts use navigation in normal document flow.

The switch behavior is an explicitly requested extension to issue #27's original static-control scope. No live authentication, logout, session handling or backend requests are implemented.

All canonical data-pack JSON is imported through src/data/seeds.ts. Domain mappers derive display models; datetime formatting uses UTC input and stable ICT output. Fleet inventory and component health use those records, including Drone 003's seed faults. Preview-only samples belong to their feature. Lint rejects warnings. Navigation metadata is independent of preview registration. PR #25 is a separate API-connected prototype in `client/`; it is not a dependency of this frontend.
