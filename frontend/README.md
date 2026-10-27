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
- The header shows the theme switch, fixed sample avatar and username, aligned to the right. It has no Operations breadcrumb. The sidebar has five entries: Drones, Missions, Live Flight, Flight History and Alerts, with Drones selected in the shell preview. Overview stays in the module registry for its separate route/preview but is excluded from the sidebar. Navigation and Log out are visual controls.
- The standalone login preview at `/?screen=login` has a centered application title, Username and Password fields, and a visual-only Sign In button.
- The header theme switch changes the shared shell and all module content between light and dark. Light is the first-visit default; `drone-monitoring-theme` in localStorage preserves the preference after refresh, including the standalone Login and Alerts previews. If storage is unavailable, switching still works for the current page.
- Both themes use shared semantic tokens for surfaces, text, focus, status badges, Fleet and Drone Detail.
- The fixed desktop navigation scrolls independently in short windows, while Log out stays visible. Compact layouts use navigation in normal document flow.

Theme colors use semantic tokens, including module status badges and route maps. Live authentication, logout, session handling and backend requests remain outside this frontend demo.

All canonical data-pack JSON is imported through src/data/seeds.ts. Domain mappers derive display models; datetime formatting uses UTC input and stable ICT output. Fleet inventory and component health use those records, including Drone 003's seed faults. Preview-only samples belong to their feature. Lint rejects warnings. Navigation metadata is independent of preview registration. PR #25 is a separate API-connected prototype in `client/`; it is not a dependency of this frontend.

## Alert search and filters

The Alerts list supports case-insensitive search by alert code, title, drone code, mission code or description, combined with severity filtering. The register count reflects matching rows while summary totals always reflect all alerts. Clear search and choose All severities to restore the list.
