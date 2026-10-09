EHS Field Visits V55 - SECURITY HARDENED

هذه النسخة مبنية على V54.

أهم تغيير: الـ Login والصلاحيات أصبحت Server-side، وليس localStorage.
لا يوجد Admin password داخل JavaScript أو ملف عام.

لـ Production Admin:
AdminBootstrap__Username
AdminBootstrap__Password

ضعهما كـ Application Settings / Environment Variables في Azure فقط، ثم احذفهما بعد إنشاء المدير.

قبل النشر:
1) تأكد أن ConnectionStrings__DefaultConnection مضبوط في Azure.
2) استخدم HTTPS.
3) راجع نقل uploads إلى Azure Blob Storage عند الحاجة.
4) شغّل التطبيق في Production واختبر Login/Register/Create/Edit/Delete/Reports.
