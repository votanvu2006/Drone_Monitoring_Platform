# Alerts UI — issue #31

- /?screen=alerts (list)
- /?screen=alerts&state=detail-active (ALT-001)
- /?screen=alerts&state=detail-resolved (ALT-003)

The list and detail use the same shared fixtures as Overview. WARNING and CRITICAL,
ACTIVE and RESOLVED examples are included. The detail displays an empty or recorded
resolution-note area. AlertDetail is exported for future page composition.
Search is readonly; filters are disabled. Records cannot be selected and no
acknowledge, resolve, delete, paging or backend behavior is implemented.
