# Real weather integration

Production weather data is intentionally not seeded. The backend must request current conditions when a mission is validated and again immediately before take-off.

## Flow

1. Calculate the route centroid from mission waypoints.
2. Reuse the newest weather check only while its `expires_at` is still in the future.
3. Otherwise call the configured weather provider from the Express backend.
4. Normalize provider fields into the `weather_checks` columns.
5. Apply `weather-policy.json` to calculate SAFE, CAUTION, or UNSAFE.
6. Store the normalized snapshot and optional raw provider response.
7. Block launch when the result is UNSAFE; allow CAUTION with a visible warning.

Wind direction is expressed in meteorological degrees: 0° means wind from north, 90° from east, 180° from south, and 270° from west.

The recommendation is decision support, not a guarantee of flight safety. Flight-zone data in this package is demonstration data and is not official aviation information.

