# Flight scenario panel — issue #40

Preview: /?screen=live-flight-scenarios

Import FlightScenarioPanel from ./FlightScenarioPanel into the Live Flight page
owned by issue #30. It displays four fixed scenario names, statuses and event
summaries; it takes no flight-control callbacks and makes no API calls.

LiveFlightScenarioExample is a minimal preview host using the shared flight,
mission and drone fixtures. It does not implement the monitoring page from #30.
The panel adds no Simulation navigation item, selector, playback or controls.
