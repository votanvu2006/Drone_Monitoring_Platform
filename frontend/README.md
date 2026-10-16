# Drone Monitoring Platform frontend

React + TypeScript + Vite, based on the existing Fleet frontend from issues #28 and #43. All shared UI and feature modules live in `frontend/`.

## Commands

Use Node.js 24 and run these commands in this directory:

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

The existing CI runs type checking, Oxlint, unit checks, a production build and browser checks on pull requests, including dependent PRs. Install Chromium with `npx playwright install chromium` before running the browser suite locally.

## Shared shell and previews

- The root page preserves Fleet Inventory and its existing View details / Back to fleet flow.
- `/?screen=drones` opens the same Fleet view inside the shared shell.
- `/?screen=shell` shows the shared shell sample. Unknown screens fall back to this sample.
- Feature modules register their preview metadata in `src/examples/**/*.preview.tsx`, discovered through `import.meta.glob`.
- Each preview can define its allowed `state` values. Unknown states use its default.

The shared frame uses Fleet's GitHub-inspired light colors, system typography, spacing, borders and corner radii. Six navigation items, a header theme switch and a bottom Log out control are visual only, as required by current issue #27. The header uses a fixed sample avatar and username; it does not imply live authentication. No theme switching, logout, session storage or backend calls are implemented by the shell.

Fleet Inventory and Drone Detail retain their existing feature components. Detail specifications and component health come directly from the canonical data-pack JSON, including the offline Drone 003 seed faults. Other operational previews use explicitly fixed training snapshots and reusable components for later integration.

PR #25 is an older API-connected prototype in `client/`. Reconcile that separate proposal with this shared `frontend/` approach before merging it.
