EHS Field Visits - SQL FIX V23

المشاكل التي تم إصلاحها:
1) الزيارة الجديدة لم تعد تستخدم Date.now() كـ Id. SQL Server هو الذي يولد Id تلقائياً.
2) الحفظ يتم مباشرة عبر POST /api/visits ثم يتم إعادة قراءة البيانات من SQL Server.
3) لم يعد db-api يحاول تحويل localStorage بالكامل إلى SQL Server بشكل عشوائي.
4) Dashboard ودليل الموظفين ودليل المسؤولين ينتظرون تحميل SQL Server ثم يعيدون الرسم.
5) GET /api/visits تم إصلاحه لعدم تنسيق Date داخل استعلام EF Core.
6) أضيفت ترقية تلقائية لأعمدة Visits القديمة عند تشغيل التطبيق.
7) الحذف من صفحة التفاصيل أصبح من SQL Server.
8) Dashboard: كل منشأة تظهر مرة واحدة، وعدد الزيارات أسفلها، والنسبة متوسط كل زيارات المنشأة.

اختبار الاتصال:
افتح بعد تشغيل المشروع:
/api/visits/health

المفروض يرجع JSON فيه:
{ "ok": true, "database": "EHS_FieldVisits", "visits": ... }

Connection String الحالية:
Server=MOHAMED_ADEL;Database=EHS_FieldVisits;Trusted_Connection=True;TrustServerCertificate=True;

شغل المشروع من Visual Studio أو dotnet run، ولا تفتح index.html مباشرة.
