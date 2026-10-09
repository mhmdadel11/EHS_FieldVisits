EHS Field Visits V47 - SQL Dashboard Recovery

This version keeps the existing project and design, but fixes the dashboard data bridge:
- SQL Server remains the source of truth when Visits contains data.
- Server JSON is normalized regardless of JSON property casing.
- Dashboard has an emergency rendering fallback if another UI component throws an error.
- Added /api/visits/diagnostics to verify the exact SQL server/database and visit count.
- Existing browser cache is never erased when SQL returns an empty list.

Important: SQL Server data is not deleted or modified by this version.
