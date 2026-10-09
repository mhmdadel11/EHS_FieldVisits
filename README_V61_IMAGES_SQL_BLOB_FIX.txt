V61 image fix: uploaded visit images are stored as VARBINARY(MAX) in SQL Server and served from SQL first, with legacy filesystem fallback. The VisitImages table is created/altered automatically at startup. Camera script reference was corrected to the existing camera-capture-v57.js. New save response includes imageCount.

TEST: create a NEW visit with 1+ images, save, then open visit details.
