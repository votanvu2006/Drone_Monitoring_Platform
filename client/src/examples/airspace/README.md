# Preflight Airspace panel — issue #41

Preview: /?screen=preflight-airspace

AirspacePanel exports the fixed Boundary Check (PASS) and Restricted Zones (CLEAR)
rows. Import this component into the preflight step of the Mission Wizard owned
by issue #39.

PreflightReviewExample is a minimal static host with a visual four-step indicator
and mission context. Its optional weather ReactNode slot allows issue #42 to
compose the Weather panel alongside Airspace without duplicating the host.
It does not implement the full wizard, route calculations, map interaction or
API integration, and adds no top-level Airspace navigation item.
