const EMPLOYEES_KEY='ehsEmployees';
const VISITS_KEY='ehsVisits';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const normalize=s=>String(s??'').trim().toLowerCase();
function getEmployees(){try{const x=JSON.parse(localStorage.getItem(EMPLOYEES_KEY)||'[]');return Array.isArray(x)?(window.EHSAuth?EHSAuth.filterVisits(x):x):[]}catch{return[]}}
function getVisits(){try{const x=JSON.parse(localStorage.getItem(VISITS_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function saveEmployees(x){localStorage.setItem(EMPLOYEES_KEY,JSON.stringify(x))}

// موظف الاتصال هو مصدر بيانات دليل الموظفين من صفحة الزيارات الميدانية.
function employeeFromVisit(v){
  const name=String(v.employeeName||v.contactEmployee||v.employee||v.staffName||'').trim();
  if(!name) return null;
  return {
    name,
    jobTitle:String(v.employeeJobTitle||v.contactJobTitle||v.employeeTitle||'').trim(),
    email:String(v.employeeEmail||v.contactEmail||'').trim(),
    phone:String(v.employeePhone||v.contactPhone||'').trim()
  };
}

function buildEmployees(){
  const map=new Map();
  getEmployees().forEach(e=>{
    const name=String(e.name||'').trim(); if(!name)return;
    map.set(normalize(name),{id:e.id,name,jobTitle:e.jobTitle||'',email:e.email||'',phone:e.phone||'',visits:[]});
  });
  getVisits().forEach(v=>{
    const info=employeeFromVisit(v); if(!info)return;
    const key=normalize(info.name);
    if(!map.has(key)) map.set(key,{id:key,name:info.name,jobTitle:info.jobTitle,email:info.email,phone:info.phone,visits:[]});
    const e=map.get(key);
    if(!e.jobTitle&&info.jobTitle)e.jobTitle=info.jobTitle;
    if(!e.email&&info.email)e.email=info.email;
    if(!e.phone&&info.phone)e.phone=info.phone;
    e.visits.push(v);
  });
  return [...map.values()].sort((a,b)=>b.visits.length-a.visits.length||a.name.localeCompare(b.name,'ar'));
}

function formatDate(value){
  if(!value) return '-';
  const raw=String(value).slice(0,10);
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
}

function facilityKey(value){
  return normalize(String(value||'').replace(/\s+/g,' ').replace(/[أإآ]/g,'ا'));
}

function openFacilityDates(employeeName, facilityName, dates){
  const modal=document.getElementById('facilityDatesModal');
  const title=document.getElementById('facilityDatesTitle');
  const employee=document.getElementById('facilityDatesEmployee');
  const body=document.getElementById('facilityDatesBody');
  if(!modal||!body) return;
  title.textContent=facilityName || 'تواريخ الزيارات';
  employee.textContent=`الموظف: ${employeeName}`;
  const unique=[...new Set((dates||[]).filter(Boolean).map(String))].sort().reverse();
  body.innerHTML=unique.length
    ? `<div class="facility-date-list">${unique.map((d,i)=>`<div class="facility-date-row"><span class="facility-date-index">${i+1}</span><strong>${esc(formatDate(d))}</strong></div>`).join('')}</div>`
    : '<div class="empty">لا توجد تواريخ زيارات لهذا المركز</div>';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}

function closeFacilityDates(){
  const modal=document.getElementById('facilityDatesModal');
  if(!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

function render(){
  const employees=buildEmployees();
  const q=normalize(document.getElementById('employeeSearch')?.value);
  const filtered=employees.filter(e=>normalize(e.name).includes(q));
  document.getElementById('employeeCount').textContent=employees.length;
  const body=document.getElementById('employeesBody');
  body.innerHTML=filtered.map(e=>{
    const facilityMap=new Map();
    e.visits.forEach(v=>{
      const raw=String(v.facility||'').trim();
      if(!raw) return;
      const key=facilityKey(raw);
      if(!facilityMap.has(key)) facilityMap.set(key,{name:raw,dates:[]});
      const item=facilityMap.get(key);
      const d=v.date||v.visitDate;
      if(d) item.dates.push(d);
    });
    const facilities=[...facilityMap.values()];
    const facilityHtml=facilities.length
      ? `<div class="employee-facilities">${facilities.map((f,idx)=>`<button type="button" class="employee-facility" data-employee="${esc(e.name)}" data-facility-index="${idx}"><span class="facility-name">${esc(f.name)}</span><b>${f.dates.length}</b></button>`).join('')}</div>`
      : '-';
    return `<tr>
      <td><strong>${esc(e.name)}</strong></td>
      <td><span class="count-badge">${e.visits.length}</span></td>
      <td>${facilityHtml}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="3" class="empty">لا توجد بيانات موظفين</td></tr>';

  body.querySelectorAll('.employee-facility').forEach(btn=>btn.addEventListener('click',()=>{
    const emp=employees.find(x=>x.name===btn.dataset.employee);
    if(!emp) return;
    const map=new Map();
    emp.visits.forEach(v=>{
      const raw=String(v.facility||'').trim(); if(!raw)return;
      const key=facilityKey(raw);
      if(!map.has(key)) map.set(key,{name:raw,dates:[]});
      const d=v.date||v.visitDate; if(d) map.get(key).dates.push(d);
    });
    const list=[...map.values()];
    const item=list[Number(btn.dataset.facilityIndex)];
    if(item) openFacilityDates(emp.name,item.name,item.dates);
  }));
}
function openForm(){document.getElementById('employeeFormCard').classList.remove('hidden');document.getElementById('employeeName').focus();document.getElementById('employeeFormCard').scrollIntoView({behavior:'smooth',block:'start'})}
function closeForm(){document.getElementById('employeeFormCard').classList.add('hidden');document.getElementById('employeeForm').reset()}
document.addEventListener('DOMContentLoaded',async()=>{
  try{if(window.EHSSQL?.ready) await EHSSQL.ready;}catch(e){console.error(e)}
  document.getElementById('addEmployeeTop')?.addEventListener('click',openForm);
  document.getElementById('cancelEmployee')?.addEventListener('click',closeForm);
  document.getElementById('employeeSearch')?.addEventListener('input',render);

  // إغلاق نافذة تواريخ الزيارات: زر X + الخلفية + مفتاح Escape
  document.querySelectorAll('[data-close-facility-dates]').forEach(el=>{
    el.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      closeFacilityDates();
    });
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closeFacilityDates();
  });

  document.getElementById('employeeForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('employeeName').value.trim(); if(!name)return;
    const employees=getEmployees();
    if(employees.some(x=>normalize(x.name)===normalize(name))){alert('الموظف موجود بالفعل.');return;}
    employees.push({id:Date.now(),name,createdAt:new Date().toISOString()});
    saveEmployees(employees); closeForm(); render(); alert('تم حفظ الموظف بنجاح.');
  });
  render();
});

window.addEventListener('ehsVisitsLoaded',render);
