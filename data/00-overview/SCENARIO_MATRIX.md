# Presentation scenario matrix

| Drone | Runtime random pool | Demo weather | Seed history demonstrates | Expected outcome |
| --- | --- | --- | --- | --- |
| Drone - 001 | NORMAL 100% | SAFE | Successful baseline | SUCCESS |
| Drone - 002 | Low battery 35%; voltage drop 30%; battery overheat 35% | SAFE | Battery reserve, voltage and thermal faults | Return safely or fail by scenario |
| Drone - 003 | Motor overheat 50%; propeller damage 50%; then choose one of four arms | SAFE | Four flights cover front-left, front-right, rear-left and rear-right | Return or abort; latest rear-right part fault remains active |
| Drone - 004 | GPS loss 35%; signal loss 35%; unexpected offline 30% | SAFE | Frozen last-known marker, buffered link recovery and heartbeat timeout | Return safely or abort |
| Drone - 005 | No random in-flight fault | CAUTION | User weather confirmation followed by normal flight | Launch only after acknowledgement |

Restricted-route and UNSAFE-weather cases are pre-flight blocks: they create no flight and no telemetry. DEMO_UNSAFE remains available as a dedicated blocked-launch fixture. Historical seed rows guarantee that all important UI errors remain visible even when future runtime selection is random.
