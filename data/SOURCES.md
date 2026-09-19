# Sources and modeling notes

- DJI Mavic 3 Enterprise official specifications: https://enterprise.dji.com/mavic-3-enterprise/specs
  - Used only for the fictional drone's high-level reference envelope: 45-minute published no-wind maximum flight time, 15 m/s normal-mode maximum speed, 12 m/s published wind resistance, 5000 mAh / 15.4 V / 17.6 V / 4S battery values.
- Open-Meteo forecast API documentation: https://open-meteo.com/en/docs
  - Defines the runtime weather fields, units, WMO codes, and available 10 m / 80 m wind variables.
- PX4 safety documentation: https://docs.px4.io/main/en/config/safety#battery-failsafes
  - Used only for the general idea that battery failsafe levels and actions are configurable. This pack does not copy PX4 numeric settings.
- Leaflet reference: https://leafletjs.com/reference.html
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/

## Evidence classification

| Classification | Included data |
| --- | --- |
| Source-backed reference | Reference aircraft envelope and battery specifications; Open-Meteo field names, units and WMO meanings; general configurable failsafe concept |
| Project simulation policy | All SAFE/CAUTION/UNSAFE decisions and every battery, voltage, temperature, RPM, vibration, signal, heartbeat and recovery threshold |
| Synthetic fixture | All routes, zones, weather values, telemetry, faults, alerts, mission history and component serial numbers |

The dataset is designed for a reliable project demonstration. It is not official airspace data, real observation history, maintenance guidance, legal flight authorization or safety certification.
