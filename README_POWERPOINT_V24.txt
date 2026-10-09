EHS Field Visits - PowerPoint Reports V24

What changed:
1. Reports page no longer asks the user to upload PDF/Word/Excel for new visit/monthly reports.
2. "إنشاء تقرير الزيارة" creates a PowerPoint containing all SQL Server visits for the selected facility and date range.
3. "إنشاء التقرير الشهري" creates a PowerPoint containing all SQL Server visits in the selected date range across facilities.
4. The PowerPoint contains a cover, summary, visit details, notes/actions, and available visit photos.
5. The generated .pptx is uploaded and stored in the Reports table in SQL Server.
6. After SQL Server confirms the save, the same PowerPoint is automatically downloaded to the user's device.
7. Existing reports remain listed and can be downloaded again from the reports page.

Important:
- PowerPoint generation uses PptxGenJS 3.12.0 from jsDelivr, so the browser needs internet access when creating a report.
- SQL Server remains the source of truth for visits and saved report files.
- No database migration is required for this change because the existing Reports table already contains FileName, FileContentType, and FileData.
