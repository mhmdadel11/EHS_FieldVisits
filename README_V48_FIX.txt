EHS Field Visits V48 - FINAL DASHBOARD SQL FIX

Root cause fixed: the V47 direct SQL reader used SequentialAccess while reading columns out of order (Date was read before Id/other earlier columns), which can make /api/visits/raw fail even though /api/visits/health reports 26 rows. V48 removes SequentialAccess and adds a fallback to /api/visits.

SQL data is not deleted or modified. Dashboard now loads the existing SQL Visits rows.
