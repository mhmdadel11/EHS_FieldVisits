const VISITS_KEY='ehsVisits';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const normalize=s=>String(s??'').trim().replace(/\s+/g,' ').toLowerCase();

function getVisits(){
  try{
    const x=JSON.parse(localStorage.getItem(VISITS_KEY)||'[]');
    return Array.isArray(x)?(window.EHSAuth?EHSAuth.filterVisits(x):x):[];
  }catch{return[]}
}

// المطلوب في دليل المسؤولين:
// كل منشأة تظهر مرة واحدة فقط، وعدد الزيارات = كل الزيارات المسجلة لهذه المنشأة.
// بيانات المسؤول التي نرسلها لصفحة الملف نأخذها من أحدث زيارة تحتوي على بيانات مسؤول كاملة.
function aggregate(){
  const map=new Map();

  getVisits().forEach(v=>{
    const facility=(v.facility||'غير محدد').trim()||'غير محدد';
    const facilityKey=normalize(facility);

    if(!map.has(facilityKey)){
      map.set(facilityKey,{
        facility,
        visits:[],
        responsible:'',
        jobTitle:'',
        email:'',
        phone:'',
        latestDate:''
      });
    }

    const row=map.get(facilityKey);
    row.visits.push(v);

    // نحتفظ بأكمل بيانات مسؤول من أحدث زيارة.
    const date=String(v.date||'');
    const hasContact=!!(v.responsible||v.responsibleEmail||v.responsiblePhone||v.jobTitle);
    const currentComplete=!!(row.responsible||row.email||row.phone||row.jobTitle);
    if(hasContact && (!currentComplete || date>=row.latestDate)){
      row.responsible=(v.responsible||row.responsible||'غير محدد').trim();
      row.jobTitle=(v.jobTitle||row.jobTitle||'-').trim();
      row.email=(v.responsibleEmail||row.email||'').trim();
      row.phone=(v.responsiblePhone||row.phone||'').trim();
      row.latestDate=date;
    }
  });

  return [...map.values()].sort((a,b)=>a.facility.localeCompare(b.facility,'ar'));
}

function render(){
  const rows=aggregate();
  const q=(document.getElementById('search')?.value||'').trim().toLowerCase();
  const filtered=rows.filter(r=>
    [r.facility,r.responsible,r.jobTitle,r.email,r.phone].join(' ').toLowerCase().includes(q)
  );

  // عدد المنشآت في دليل المسؤولين، وليس عدد الزيارات.
  document.getElementById('peopleCount').textContent=rows.length;

  document.getElementById('responsiblesBody').innerHTML=filtered.map(r=>{
    // نرسل مفتاح المنشأة + اسم المسؤول إلى صفحة الملف حتى تعرض كل زيارات المسؤول.
    // في المعتاد لكل منشأة مسؤول واحد؛ ولو تغير المسؤول، نستخدم أحدث مسؤول مسجل.
    const first=r.visits.find(v=>{
      const sameName=normalize(v.responsible)===normalize(r.responsible);
      return sameName && (v.responsibleEmail||v.responsiblePhone);
    }) || r.visits.find(v=>normalize(v.responsible)===normalize(r.responsible)) || r.visits[0] || {};
    const key=encodeURIComponent(
      first.responsibleEmail ? 'email:'+normalize(first.responsibleEmail) :
      first.responsiblePhone ? 'phone:'+String(first.responsiblePhone).replace(/\s+/g,'').trim() :
      'name:'+normalize(first.responsible)
    );
    const legacyName=encodeURIComponent(first.responsible||'');

    return `<tr>
      <td>${esc(r.facility)}</td>
      <td><span class="count-badge">${r.visits.length}</span></td>
      <td><a class="view-btn" href="responsible-details.html?key=${key}&facility=${encodeURIComponent(r.facility)}&name=${legacyName}">عرض الملف</a></td>
    </tr>`;
  }).join('')||'<tr><td colspan="3" class="empty">لا توجد بيانات مسؤولين</td></tr>';
}

document.addEventListener('DOMContentLoaded',async()=>{
  try{if(window.EHSSQL?.ready) await EHSSQL.ready;}catch(e){console.error(e)}
  if(!document.getElementById('responsiblesBody'))return;
  document.getElementById('search')?.addEventListener('input',render);
  render();
});

window.addEventListener('ehsVisitsLoaded',render);
