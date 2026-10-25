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
- The header shows the theme switch, fixed sample avatar and username, aligned to the right. It has no Operations breadcrumb; the sidebar keeps all six navigation entries without a Workspace group label. Navigation and Log out are visual controls.
- The standalone login preview at `/?screen=login` has a centered application title, Username and Password fields, and a visual-only Sign In button.
- The theme switch is a disabled visual placeholder, as requested in the latest review of #44. Light is the default; the control does not change appearance or save a preference.
- Both themes use shared semantic tokens for surfaces, text, focus, status badges, Fleet and Drone Detail.
- The fixed desktop navigation scrolls independently in short windows, while Log out stays visible. Compact layouts use navigation in normal document flow.

Dark semantic tokens remain available for visual verification by the test harness. No theme-switching behavior, live authentication, logout, session handling or backend requests are implemented.

All canonical data-pack JSON is imported through src/data/seeds.ts. Domain mappers derive display models; datetime formatting uses UTC input and stable ICT output. Fleet inventory and component health use those records, including Drone 003's seed faults. Preview-only samples belong to their feature. Lint rejects warnings. Navigation metadata is independent of preview registration. PR #25 is a separate API-connected prototype in `client/`; it is not a dependency of this frontend.

## Module shell integration (#58)

The application composes module content inside one shell-owned main landmark. Use /?module=drones (default), overview, missions, live-flight, flight-history or alerts to inspect composition while sidebar controls remain static. Modules not present in this checkout show a placeholder. Existing ?screen= previews stay isolated in PreviewHost. Overview/Alerts/Login exports are discovered only from files in the checkout, so merging their feature PRs makes them available without importing unmerged branches. Missions/Live Flight/History require their module adapters after their owners merge the pages. Draft depends on #44.

The selected sidebar entry follows the module preview without adding a header breadcrumb or Workspace label. Login from merged PR #45 is present through the synchronized shell; Overview and Alerts remain optional until their feature PRs arrive.
