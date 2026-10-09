// ===============================
// DEFAULT VISITS
// ===============================
const DEFAULT_VISITS = [
    {
        id: "1",
        facility: "مستشفى القاسمي",
        emirate: "الشارقة",
        date: "2026-09-02",
        team: "فريق الاتصال والتسويق",
        responsible: "أحمد محمد",
        jobTitle: "مسؤول الاتصال",
        category: "الهوية المؤسسية",
        priority: "متوسطة",
        status: "ملتزم",
        compliance: 92,
        notes: "جميع المعايير مطبقة بشكل جيد مع ملاحظات بسيطة على الهوية المؤسسية.",
        action: "متابعة الملاحظات البسيطة.",
        images: []
    },
    {
        id: "2",
        facility: "مستشفى الكويت - الشارقة",
        emirate: "الشارقة",
        date: "2026-09-01",
        team: "فريق الاتصال والتسويق",
        responsible: "أحمد محمد",
        jobTitle: "مسؤول الاتصال",
        category: "جودة الخدمة",
        priority: "متوسطة",
        status: "ملتزم",
        compliance: 84,
        notes: "",
        action: "",
        images: []
    },
    {
        id: "3",
        facility: "مركز العوير للصحة - دبي",
        emirate: "دبي",
        date: "2026-08-31",
        team: "فريق الاتصال والتسويق",
        responsible: "أحمد محمد",
        jobTitle: "مسؤول الاتصال",
        category: "التواصل",
        priority: "عالية",
        status: "ملتزم",
        compliance: 92,
        notes: "",
        action: "",
        images: []
    },
    {
        id: "4",
        facility: "مركز دبا الصحي - الفجيرة",
        emirate: "الفجيرة",
        date: "2026-08-30",
        team: "فريق الاتصال والتسويق",
        responsible: "أحمد محمد",
        jobTitle: "مسؤول الاتصال",
        category: "السلامة",
        priority: "منخفضة",
        status: "ملتزم",
        compliance: 89,
        notes: "",
        action: "",
        images: []
    },
    {
        id: "5",
        facility: "مركز صحي النهضة - الشارقة",
        emirate: "الشارقة",
        date: "2026-08-29",
        team: "فريق الاتصال والتسويق",
        responsible: "أحمد محمد",
        jobTitle: "مسؤول الاتصال",
        category: "الهوية المؤسسية",
        priority: "عالية",
        status: "بحاجة متابعة",
        compliance: 76,
        notes: "تحتاج بعض المواد الدعائية للتحديث.",
        action: "متابعة الملاحظات.",
        images: []
    }
];


// ===============================
// INDEXED DB
// ===============================
const DB_NAME = "EHSVisitsDB";
const DB_VERSION = 1;
const IMAGE_STORE = "visitImages";

function openImagesDB() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME);

        request.onupgradeneeded = function (event) {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                const store = db.createObjectStore(IMAGE_STORE, {
                    keyPath: "id"
                });

                store.createIndex("visitId", "visitId", {
                    unique: false
                });
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


// ===============================
// GET IMAGES FOR VISIT
// ===============================
async function getVisitImages(visitId) {

    try {

        const db = await openImagesDB();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                IMAGE_STORE,
                "readonly"
            );

            const store = transaction.objectStore(IMAGE_STORE);

            let request;

            if (store.indexNames.contains("visitId")) {

                const index = store.index("visitId");

                request = index.getAll(
                    IDBKeyRange.only(String(visitId))
                );

            } else {

                request = store.getAll();
            }

            request.onsuccess = function () {

                let results = request.result || [];

                // لو مفيش index نفلتر يدوي
                if (!store.indexNames.contains("visitId")) {
                    results = results.filter(
                        x => String(x.visitId) === String(visitId)
                    );
                }

                resolve(results);
            };

            request.onerror = function () {
                reject(request.error);
            };
        });

    } catch (error) {

        console.error("Error loading images:", error);

        return [];
    }
}


// ===============================
// CREATE IMAGE URL
// ===============================
function createImageUrl(imageObject) {

    if (!imageObject || !imageObject.image) {
        return null;
    }

    try {

        return URL.createObjectURL(imageObject.image);

    } catch (error) {

        console.error("Cannot create image URL:", error);

        return null;
    }
}


// ===============================
// NORMALIZE VISITS
// ===============================
function normalizeVisits(v) {
    return (Array.isArray(v) ? v : []).map(x => ({
        ...x,
        id: x.id ?? x.Id ?? "",
        facility: x.facility ?? x.Facility ?? "",
        emirate: x.emirate ?? x.Emirate ?? "",
        date: String(x.date ?? x.Date ?? "").slice(0, 10),
        team: x.team ?? x.Team ?? "",
        responsible: x.responsible ?? x.Responsible ?? "",
        status: x.status ?? x.Status ?? "",
        compliance: Number(x.compliance ?? x.Compliance ?? 0) || 0,
        notes: x.notes ?? x.Notes ?? "",
        images: Array.isArray(x.images ?? x.Images)
            ? (x.images ?? x.Images)
            : (x.image ? [x.image] : []),
        actionEvidence: x.actionEvidence ?? x.ActionEvidence ?? ""
    }));
}


// ===============================
// GET VISITS
// ===============================
function getVisits() {

    // SQL Server is the source of truth. Use the latest server snapshot
    // whenever db-api has already loaded it; localStorage is only fallback.
    if (Array.isArray(window.EHS_SERVER_VISITS)) {
        const parsed = normalizeVisits(window.EHS_SERVER_VISITS);
        return parsed;
    }

    const raw = localStorage.getItem("ehsVisits");

    if (!raw) {

        saveVisits(DEFAULT_VISITS);

        return [...DEFAULT_VISITS];
    }

    try {

        const parsed = normalizeVisits(JSON.parse(raw));
        return window.EHSAuth ? EHSAuth.filterVisits(parsed) : parsed;

    } catch (error) {

        console.error("Invalid visits data:", error);

        return [...DEFAULT_VISITS];
    }
}


// ===============================
// SAVE VISITS
// ===============================
function saveVisits(v) {

    if (window.EHSAuth) EHSAuth.saveScopedVisits(v);
    else localStorage.setItem("ehsVisits", JSON.stringify(v));
}


// ===============================
// DATE
// ===============================
function fmt(d) {

    if (!d) return "";

    return new Date(
        d + "T00:00:00"
    ).toLocaleDateString(
        "ar-AE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


// ===============================
// STATUS
// ===============================
function statusClass(s) {

    return s === "ملتزم"
        ? ""
        : " " + (
            s === "بحاجة متابعة"
                ? "warn"
                : "bad"
        );
}


// ===============================
// ESCAPE HTML
// ===============================
function escapeHtml(s) {

    return String(s ?? "").replace(
        /[&<>'"]/g,
        m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[m])
    );
}


// ===============================
// FILTER
// ===============================
function getFilteredVisits(visits) {

    const from =
        document.getElementById("fromDate")?.value || "";

    const to =
        document.getElementById("toDate")?.value || "";

    return visits.filter(v =>
        (!from || v.date >= from) &&
        (!to || v.date <= to)
    );
}


// ===============================
// DATE LABEL
// ===============================
function updateDateLabel() {

    const from =
        document.getElementById("fromDate")?.value;

    const to =
        document.getElementById("toDate")?.value;

    const label =
        document.getElementById("dateRange");

    if (label) {

        label.textContent =
            `${from ? fmt(from) : "—"} - ${to ? fmt(to) : "—"}`;
    }
}


// ===============================
// CLEAR FILTER
// ===============================
function clearFilter() {

    const f =
        document.getElementById("fromDate");

    const t =
        document.getElementById("toDate");

    if (f) f.value = "";

    if (t) t.value = "";

    localStorage.removeItem("ehsDashboardFromDate");
    localStorage.removeItem("ehsDashboardToDate");
    updateDateLabel();

    render();
}


// ===============================
// RENDER IMAGES
// ===============================
async function renderVisitImages(visit) {

    if (!visit || !visit.images || !visit.images.length) {

        return "";
    }

    const images = [];

    for (const imageId of visit.images) {

        // لو الصورة القديمة DataURL
        if (
            typeof imageId === "string" &&
            imageId.startsWith("data:image")
        ) {

            images.push(`
                <img
                    src="${imageId}"
                    class="visit-image"
                    alt="صورة الزيارة"
                    onclick="openImageViewer(this.src)"
                >
            `);

            continue;
        }

        const imageData =
            await getImageById(imageId);

        if (!imageData) continue;

        const url =
            createImageUrl(imageData);

        if (!url) continue;

        images.push(`
            <img
                src="${url}"
                class="visit-image"
                alt="${escapeHtml(imageData.name || "صورة الزيارة")}"
                onclick="openImageViewer(this.src)"
            >
        `);
    }

    if (!images.length) return "";

    return `
        <div class="visit-gallery">
            ${images.join("")}
        </div>
    `;
}


// ===============================
// GET SINGLE IMAGE
// ===============================
async function getImageById(imageId) {

    try {

        const db =
            await openImagesDB();

        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    IMAGE_STORE,
                    "readonly"
                );

            const store =
                transaction.objectStore(
                    IMAGE_STORE
                );

            const request =
                store.get(imageId);

            request.onsuccess = function () {

                resolve(
                    request.result || null
                );
            };

            request.onerror = function () {

                reject(request.error);
            };
        });

    } catch (error) {

        console.error(
            "Error getting image:",
            error
        );

        return null;
    }
}


// ===============================
// IMAGE VIEWER
// ===============================
window.openImageViewer = function (src) {

    let viewer =
        document.getElementById("imageViewer");

    if (!viewer) {

        viewer =
            document.createElement("div");

        viewer.id =
            "imageViewer";

        viewer.innerHTML = `
            <div class="image-viewer-overlay">
                <button
                    class="image-viewer-close"
                    onclick="closeImageViewer()">
                    ×
                </button>

                <img
                    id="viewerImage"
                    src=""
                    alt="صورة الزيارة">
            </div>
        `;

        document.body.appendChild(viewer);
    }

    document.getElementById(
        "viewerImage"
    ).src = src;

    viewer.style.display = "flex";
};


window.closeImageViewer = function () {

    const viewer =
        document.getElementById("imageViewer");

    if (viewer) {

        viewer.style.display = "none";
    }
};


// توحيد أسماء المنشآت على مستوى لوحة التحكم كلها.
// مثال: "مستشفى الكويت دبي" = "مستشفى الكويت دبي - دبي".
const normalizeFacilityName = (name) => String(name || "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const facilityKey = (name, emirate = "") => {
    let n = normalizeFacilityName(name);
    const e = normalizeFacilityName(emirate);
    if (e) n = n.replace(new RegExp('\\s*[-،,/]?\\s*' + e + '\\s*$'), '').trim();
    return n;
};

// ===============================
// MAIN RENDER
// ===============================
async function render() {

    const all =
        getVisits();

    const visits =
        getFilteredVisits(all);

    const total =
        visits.length;


    // ===========================
    // KPIs
    // ===========================

    document.getElementById(
        "totalVisits"
    ).textContent = total;

    document.getElementById(
        "facilitiesVisited"
    ).textContent =
        new Set(
            visits.map(v => facilityKey(v.facility, v.emirate)).filter(Boolean)
        ).size;

    document.getElementById(
        "completedVisits"
    ).textContent =
        visits.filter(
            v => v.status === "ملتزم"
        ).length;


    const avg =
        total
            ? Math.round(
                visits.reduce(
                    (a, v) =>
                        a + Number(v.compliance || 0),
                    0
                ) / total
            )
            : 0;

    document.getElementById(
        "avgCompliance"
    ).textContent =
        avg + "%";

    document.getElementById(
        "donutTotal"
    ).textContent =
        total;


    // ===========================
    // FACILITY CHART
    // ===========================
    // مهم: المنشأة تظهر مرة واحدة فقط مهما كان عدد الزيارات.
    // نسبة الالتزام المعروضة = متوسط نسب كل زيارات نفس المنشأة.
    // نطبع الاسم الأصلي لأول زيارة ونستخدم مفتاحاً موحداً لمنع
    // التكرار بسبب المسافات أو اختلافات بسيطة في الكتابة العربية.


    const byFacility = new Map();

    visits.forEach(v => {
        const displayName = String(v.facility || "غير محدد").trim() || "غير محدد";
        const key = facilityKey(displayName, v.emirate);
        if (!byFacility.has(key)) {
            byFacility.set(key, {
                name: displayName,
                values: []
            });
        }
        byFacility.get(key).values.push(Number(v.compliance || 0));
    });

    const facilities = Array.from(byFacility.values())
        .map(item => ({
            name: item.name,
            visits: item.values.length,
            value: item.values.length
                ? Math.round(item.values.reduce((sum, n) => sum + n, 0) / item.values.length)
                : 0
        }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ar'));

    document.getElementById("facilityChart").innerHTML = facilities.map(item => `
        <div class="bar-item" title="${escapeHtml(item.name)} — ${item.visits} زيارة — متوسط الالتزام ${item.value}%">
            <div
                class="bar ${item.value < 80 ? "low-compliance" : ""}"
                style="height:${Math.max(12, item.value * 1.95)}px">
                <span class="bar-value">${item.value}%</span>
            </div>
            <span class="bar-label">${escapeHtml(item.name)}</span>
            <small class="facility-visit-count">${item.visits} ${item.visits === 1 ? "زيارة" : "زيارات"}</small>
        </div>
    `).join("") || '<div class="empty">لا توجد بيانات ضمن الفترة المحددة</div>';

    // ===========================
    // RECENT VISITS
    // ===========================

    const recent =
        [...visits].sort(
            (a, b) =>
                b.date.localeCompare(a.date)
        );


    document.getElementById(
        "recentVisits"
    ).innerHTML =

        recent.map(
            (v, i) => `

                <div
                    class="recent ${i === 0 ? "selected" : ""}"
                    data-id="${v.id}">

                    <div class="r-icon">
                        ▥
                    </div>

                    <div class="r-main">

                        <strong>
                            ${escapeHtml(v.facility)}
                        </strong>

                        <small>
                            ${fmt(v.date)}
                        </small>

                    </div>

                    <div class="r-side">

                        <span
                            class="status-dot${statusClass(v.status)}${Number(v.compliance || 0) < 80 ? " low-compliance" : ""}">
                        </span>

                        ${v.compliance}%

                    </div>

                </div>

            `
        ).join("")

        ||

        '<div class="empty">لا توجد زيارات ضمن الفترة المحددة</div>';


    document.querySelectorAll(
        ".recent"
    ).forEach(x => {

        x.onclick = () =>
            location.href =
                `visit-details.html?id=${encodeURIComponent(x.dataset.id)}`;
    });


    // ===========================
    // DONUT
    // ===========================

    const good =
        visits.filter(
            v => v.status === "ملتزم"
        ).length;

    const warn =
        visits.filter(
            v => v.status === "بحاجة متابعة"
        ).length;

    const bad =
        visits.filter(
            v => v.status === "غير ملتزم"
        ).length;


    const p1 =
        total
            ? Math.round(good / total * 100)
            : 0;

    const p2 =
        total
            ? Math.round(warn / total * 100)
            : 0;


    document.getElementById(
        "donut"
    ).style.background =

        `conic-gradient(
            #49b566 0 ${p1}%,
            #ff9f2d ${p1}% ${p1 + p2}%,
            #dd403b ${p1 + p2}% 100%
        )`;


    document.getElementById(
        "legend"
    ).innerHTML = `

        <div class="legend-item">

            <i
                class="legend-dot"
                style="background:#49b566">
            </i>

            ملتزم
            <br>
            &nbsp;&nbsp;
            ${good} (${p1}%)

        </div>

        <div class="legend-item">

            <i
                class="legend-dot"
                style="background:#ff9f2d">
            </i>

            بحاجة متابعة
            <br>
            &nbsp;&nbsp;
            ${warn} (${p2}%)

        </div>

        <div class="legend-item">

            <i
                class="legend-dot"
                style="background:#dd403b">
            </i>

            غير ملتزم
            <br>
            &nbsp;&nbsp;
            ${bad} (${total ? 100 - p1 - p2 : 0}%)

        </div>
    `;


    // ===========================
    // EMIRATE CHART
    // ===========================

    const em = {};

    // متوسط نسبة الالتزام لكل إمارة داخل الفترة المحددة
    visits.forEach(v => {
        const emirate = v.emirate || "غير محدد";
        if (!em[emirate]) em[emirate] = [];
        em[emirate].push(Number(v.compliance || 0));
    });

    const emirateCompliance = Object.entries(em)
        .map(([name, values]) => [
            name,
            Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        ])
        .sort((a, b) => b[1] - a[1]);


    document.getElementById(
        "emirateChart"
    ).innerHTML =

        emirateCompliance
            .map(
                ([n, c]) => `

                    <div class="h-row">

                        <span>
                            ${escapeHtml(n)}
                        </span>

                        <div class="track">

                            <div
                                class="fill ${c < 80 ? "low-compliance" : ""}"
                                style="width:${c}%">
                            </div>

                        </div>

                        <b>
                            ${c}%
                        </b>

                    </div>

                `
            ).join("")

        ||

        '<div class="empty">لا توجد بيانات</div>';


    // ===========================
    // DETAILS
    // ===========================

    const latest =
        recent[0];


    if (latest) {

        const gallery =
            await renderVisitImages(latest);


        document.getElementById(
            "detailsContent"
        ).innerHTML = `

            <div class="detail-top">

                <div class="facility-name">

                    ${escapeHtml(latest.facility)}

                    <small>
                        ${escapeHtml(latest.emirate)}
                    </small>

                </div>


                <div class="detail-date">

                    ▣ ${fmt(latest.date)}

                    <small>
                        ♧ ${escapeHtml(
                            latest.team ||
                            "فريق الاتصال والتسويق"
                        )}
                    </small>

                </div>

            </div>


            <div class="info-box">

                <strong>
                    ملاحظات الزيارة
                </strong>

                ${escapeHtml(latest.notes)
                    || "لا توجد ملاحظات إضافية."}

            </div>


            <div class="compliance-box">

                <small>
                    نسبة الالتزام
                </small>

                <strong>
                    ${latest.compliance}%
                </strong>

                <span
                    class="status-dot${statusClass(latest.status)}">
                </span>

                ${escapeHtml(latest.status)}

            </div>


            ${gallery}


            <a
                class="primary detail-link"
                href="visit-details.html?id=${encodeURIComponent(latest.id)}">

                عرض التفاصيل الكاملة

            </a>

        `;

    } else {

        document.getElementById(
            "detailsContent"
        ).innerHTML =
            '<div class="empty">لا توجد زيارة محددة</div>';
    }
}


// ===============================
// SQL DIAGNOSTIC / EMERGENCY FALLBACK
// ===============================
async function renderSqlDiagnostics() {
    const box = document.getElementById("ehsSqlStatus");
    if (!window.EHSSQL || typeof EHSSQL.getDiagnostics !== "function") return;
    try {
        const d = await EHSSQL.getDiagnostics();
        if (box) {
            box.innerHTML = `SQL Server متصل — ${escapeHtml(d.server || "")} / ${escapeHtml(d.database || "")} — عدد الزيارات: <b>${Number(d.visits || 0)}</b>`;
            box.style.display = "block";
            box.style.color = "#16794a";
        }
    } catch (e) {
        if (box) {
            box.textContent = "تعذر فحص بيانات SQL Server: " + (e?.message || "خطأ غير معروف");
            box.style.display = "block";
            box.style.color = "#b42318";
        }
    }
}

async function emergencyDashboardRender() {
    try {
        const data = Array.isArray(window.EHS_SERVER_VISITS) ? normalizeVisits(window.EHS_SERVER_VISITS) : [];
        if (!data.length) return;
        const recent = [...data].sort((a,b) => String(b.date||"").localeCompare(String(a.date||"")));
        const total = recent.length;
        const facilities = new Set(recent.map(v => facilityKey(v.facility, v.emirate)).filter(Boolean)).size;
        const compliant = recent.filter(v => v.status === "ملتزم").length;
        const avg = total ? Math.round(recent.reduce((a,v)=>a+Number(v.compliance||0),0)/total) : 0;
        const set = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=String(val); };
        set("totalVisits", total); set("facilitiesVisited", facilities); set("completedVisits", compliant); set("avgCompliance", avg+"%"); set("donutTotal", total);
        const list = document.getElementById("recentVisits");
        if (list) list.innerHTML = recent.map(v => `<div class="recent" data-id="${escapeHtml(v.id)}"><div class="r-icon">▥</div><div class="r-main"><strong>${escapeHtml(v.facility || "غير محدد")}</strong><small>${fmt(v.date)}</small></div><div class="r-side"><span class="status-dot${statusClass(v.status)}"></span>${Number(v.compliance||0)}%</div></div>`).join("");
        document.querySelectorAll("#recentVisits .recent").forEach(x => x.onclick=()=>location.href=`visit-details.html?id=${encodeURIComponent(x.dataset.id)}`);
    } catch (e) { console.error("EHS emergency dashboard render failed", e); }
}

// ===============================
// INIT
// ===============================
window.addEventListener("ehsVisitsLoaded", function(e){
    if (Array.isArray(e.detail)) {
        window.EHS_SERVER_VISITS = e.detail.slice();
        try { localStorage.setItem("ehsVisits", JSON.stringify(e.detail)); } catch {}
    }
    render().catch(e => { console.error("EHS render failed", e); emergencyDashboardRender(); });
    refreshDashboardVisitCount();
});

async function refreshDashboardVisitCount() {
    const el = document.getElementById("totalVisits");
    if (!el || !window.EHSSQL || typeof EHSSQL.getVisitCountFromServer !== "function") return false;
    try {
        const count = await EHSSQL.getVisitCountFromServer();
        el.textContent = String(count);
        el.dataset.sqlCount = String(count);
        return true;
    } catch (e) {
        console.error("EHS SQL visit count failed:", e);
        return false;
    }
}

async function refreshDashboardFromSql() {
    if (!window.EHSSQL || typeof EHSSQL.getVisitsFromServer !== "function") return false;
    try {
        const serverVisits = await EHSSQL.getVisitsFromServer();
        if (!Array.isArray(serverVisits)) throw new Error("واجهة الزيارات أعادت بيانات غير صحيحة.");
        if (serverVisits.length > 0) {
            window.EHS_SERVER_VISITS = serverVisits.slice();
            try { localStorage.setItem("ehsVisits", JSON.stringify(serverVisits)); } catch {}
        } else {
            // SQL is empty: keep any legacy browser data instead of replacing it
            // with an empty array. This prevents an older installation from
            // appearing to have lost all visits before migration.
            let cached = [];
            try { cached = JSON.parse(localStorage.getItem("ehsVisits") || "[]"); } catch {}
            window.EHS_SERVER_VISITS = Array.isArray(cached) ? cached : [];
            const status = document.getElementById("ehsSqlStatus");
            if (status) {
                status.textContent = "SQL Server متصل، لكن جدول الزيارات فارغ. يتم عرض البيانات القديمة المحفوظة على هذا المتصفح إن وجدت.";
                status.style.display = window.EHS_SERVER_VISITS.length ? "block" : "none";
            }
        }
        return true;
    } catch (e) {
        console.error("EHS dashboard SQL refresh failed:", e);
        const status = document.getElementById("ehsSqlStatus");
        if (status) { status.textContent = "تعذر تحميل بيانات الزيارات من SQL Server: " + (e?.message || "خطأ غير معروف"); status.style.display = "block"; }
        window.EHS_SERVER_VISITS = Array.isArray(window.EHS_SERVER_VISITS) ? window.EHS_SERVER_VISITS : [];
        return false;
    }
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        const sqlOk = await refreshDashboardFromSql();
        // Render only after the SQL request has completed, so the KPI never
        // remains on the static HTML number or an older localStorage snapshot.
        try { await render(); } catch (e) { console.error("EHS render failed", e); await emergencyDashboardRender(); }
        await renderSqlDiagnostics();
        await refreshDashboardVisitCount();

        if (!sqlOk) {
            // One delayed retry handles the common case where the ASP.NET app
            // is still finishing its first request after startup.
            setTimeout(async () => {
                if (await refreshDashboardFromSql()) {
                    try { await render(); } catch (e) { console.error("EHS retry render failed", e); await emergencyDashboardRender(); }
                    await refreshDashboardVisitCount();
                } else {
                    await refreshDashboardVisitCount();
                }
            }, 700);
        }

        const from =
            document.getElementById("fromDate");

        const to =
            document.getElementById("toDate");


        if (from && to) {

            const savedFrom = localStorage.getItem("ehsDashboardFromDate") || "";
            const savedTo = localStorage.getItem("ehsDashboardToDate") || "";
            if (savedFrom) from.value = savedFrom;
            if (savedTo) to.value = savedTo;
            updateDateLabel();

            from.addEventListener(
                "change",
                () => {

                    if (
                        to.value &&
                        from.value > to.value
                    ) {
                        to.value = from.value;
                    }

                    localStorage.setItem("ehsDashboardFromDate", from.value || "");
                    localStorage.setItem("ehsDashboardToDate", to.value || "");
                    updateDateLabel();

                    render();
                }
            );


            to.addEventListener(
                "change",
                () => {

                    if (
                        from.value &&
                        to.value < from.value
                    ) {
                        from.value = to.value;
                    }

                    localStorage.setItem("ehsDashboardFromDate", from.value || "");
                    localStorage.setItem("ehsDashboardToDate", to.value || "");
                    updateDateLabel();

                    render();
                }
            );


            document
                .getElementById("clearFilter")
                ?.addEventListener(
                    "click",
                    clearFilter
                );


            updateDateLabel();
        }


        render();


        document
            .getElementById("closeDetails")
            ?.addEventListener(
                "click",
                () => {

                    document.getElementById(
                        "detailsContent"
                    ).innerHTML =
                        '<div class="empty">تم إغلاق التفاصيل</div>';
                }
            );
    }
);