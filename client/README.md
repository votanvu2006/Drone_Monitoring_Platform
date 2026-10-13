# Drone Monitoring Platform — static UI

React + TypeScript + Vite examples for the assigned UI issues. These examples use
fixed training content. They run without the backend or MySQL.

## Local development

Use Node.js 24.15 or newer.

    cd client
    npm ci
    npm run dev

The initial URL displays the shared application shell.

## Checks

    npm run typecheck
    npm run lint
    npm test
    npm run build
    npx playwright install chromium
    npm run test:browser

Browser checks cover 1440×900, 1280×720, 768×1024 and 390×844. They verify layout,
static controls, console errors and the absence of fetch/XHR data requests.
Screenshots are attached to the local Playwright report.

## Example registration

Each feature adds a default ExampleDefinition export in its own
src/examples/**/*.preview.tsx module. App discovers these modules with
import.meta.glob; features do not edit a central screen registry.

Open /?screen=<example-id>&state=<state-id> directly to view a fixed example.
Unknown screens use the shell; unsupported states use the example's first state.
Query selection is a development preview entry point. Application navigation,
buttons and form controls have no workflow behavior.

Shared fixtures in src/data/fixtures.ts keep Overview and Alerts examples aligned.
Feature-local README files document their URLs and reusable components.
