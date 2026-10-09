# EHS Field Visits — V55 Security Hardening

تم تطبيق فحص أمني وتحسينات أساسية قبل النشر على الإنترنت.

## تم إصلاحه

- Authentication حقيقي على ASP.NET Core Cookie Authentication.
- Passwords لا يتم تخزينها أو التحقق منها في JavaScript/localStorage.
- إزالة حساب Admin الافتراضي وكلمة المرور من ملفات الموقع.
- Register/Login يتمان عبر `/api/auth/*` ويحفظان المستخدم في SQL Server.
- حماية صفحات HTML من الوصول بدون تسجيل الدخول.
- حماية APIs الخاصة بالزيارات والتقارير بـ `[Authorize]`.
- ملكية الزيارة تُحدد من هوية السيرفر، ولا يتم الوثوق في `OwnerId` القادم من المتصفح.
- المستخدم لا يستطيع تعديل/حذف زيارة مستخدم آخر؛ Admin يستطيع ذلك.
- التقارير أصبحت مرتبطة بصاحبها، والحذف مقيد بالمالك أو Admin.
- حماية ملفات الرفع من الوصول غير الموثق.
- فحص امتدادات وحجم صور الزيارات والأدلة.
- تقليل حدود رفع الطلبات إلى 25 MB.
- إخفاء تفاصيل Exceptions/SQL عن المستخدم النهائي.
- Swagger متاح في Development فقط.
- إضافة Rate Limiting لمحاولات Login/Register.
- إضافة Security Headers أساسية.
- SameSite=Strict + HttpOnly Cookie.
- حماية الطلبات state-changing من Cross-Site Origin requests.
- HSTS في Production.

## Admin Production

لا يوجد Admin Password افتراضي داخل المشروع.

لإنشاء Admin في Production، ضع في إعدادات بيئة التطبيق فقط:

- `AdminBootstrap__Username`
- `AdminBootstrap__Password`

كلمة المرور المطلوبة للـ bootstrap لا تقل عن 12 حرفًا. بعد إنشاء Admin، يمكن حذف متغيرات الـ bootstrap من إعدادات التطبيق.

## ملاحظات

هذا Hardening عملي للنشر، لكنه ليس بديلًا عن مراجعة أمنية مؤسسية/Penetration Test قبل تشغيل النظام ببيانات حساسة.

الملفات الموجودة تحت `wwwroot/uploads/visits` ما زالت جزءًا من التخزين المحلي للتطبيق. عند النشر السحابي يفضل نقلها إلى Azure Blob Storage أو خدمة تخزين خاصة، مع صلاحيات وصول مناسبة.
