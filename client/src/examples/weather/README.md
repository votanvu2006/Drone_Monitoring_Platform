# Preflight Weather panel — issue #42

Preview: /?screen=preflight-weather

WeatherPanel exports fixed Departure (SAFE), Midpoint (CAUTION) and Destination
(SAFE) examples with wind and visibility supporting text. These are training
samples, not fetched forecasts or computed flight-safety decisions.

The preview composes WeatherPanel in the weather slot of PreflightReviewExample
from issue #41, so both Airspace and Weather appear inside the Mission Wizard
preflight step. Import WeatherPanel into the full wizard owned by issue #39.
No Weather navigation item, launch controls or backend integration is added.
