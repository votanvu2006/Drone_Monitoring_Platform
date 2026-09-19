# Mission weather flow

## Mode selection

Read the singleton weather_runtime_config row before validating weather. The current project seeds active_mode = DEMO, demo_mode_status = AVAILABLE, and live_mode_status = COMING_SOON.

The UI exposes DEMO as the usable option. It may display LIVE — Open-Meteo as a disabled option with a Coming Soon badge, but the backend must reject attempts to activate a mode whose status is not AVAILABLE.

The UI must show the configured “DEMO MODE — SIMULATED WEATHER” banner while DEMO is active. Every stored result still records source_kind, so simulated and real snapshots cannot be confused.

## Shared route flow

1. Frontend sends the selected drone, A/B coordinates, and optional intermediate waypoints.
2. Backend validates coordinate ranges, waypoint order, the allowed demo boundary, and intersections with active restricted polygons.
3. Backend samples START, ROUTE_MIDPOINT, and DESTINATION. For a longer future route, add intermediate samples.
4. Normalize the samples under one UUID validation_run_id, apply weather-policy.json, and store snapshots with expires_at = checked_at + 10 minutes.
5. Use the worst sampled result: UNSAFE blocks launch without override; CAUTION requires explicit user confirmation; SAFE allows launch.

## LIVE mode — Coming Soon

The request contract is prepared for future development, but this mode is disabled in the current project. When implemented, call Open-Meteo from Express, never from the browser as the source of truth. Request current temperature_2m, relative_humidity_2m, precipitation, rain, weather_code, wind_speed_10m, wind_direction_10m and wind_gusts_10m; request hourly visibility and wind_speed_80m when required by the project policy. Set wind_speed_unit=ms and timezone=UTC.

Example endpoint:

GET https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=visibility,wind_speed_80m&wind_speed_unit=ms&timezone=UTC&forecast_days=1

Future LIVE snapshots use source_kind = OPEN_METEO. Immediately before take-off, refresh expired snapshots. If the provider is unavailable, report weather unavailable and block take-off; never silently fall back to DEMO.

## DEMO mode — presentation path

Load the selected drone's assignment and its enabled weather_demo_profile. Generate fresh weather_checks for the actual submitted route coordinates with source_kind = SIMULATED_FIXTURE and the profile values:

- Drone - 001 through Drone - 004: DEMO_SAFE.
- Drone - 005: DEMO_CAUTION, so the warning-and-confirmation flow is always visible.
- DEMO_UNSAFE remains available for a dedicated blocked-mission/history test and is not assigned by default.

The nine pre-seeded weather rows remain expired historical UI/test fixtures. Do not reuse them for current authorization. Historical telemetry wind is also simulated and is never a substitute for a pre-flight weather check.
