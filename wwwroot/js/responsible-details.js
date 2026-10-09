const DB_NAME="EHSVisitsDB", STORE_NAME="visitImages";
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=s=>s?new Date(s+'T00:00:00').toLocaleDateString('ar-AE',{day:'2-digit',month:'2-digit',year:'numeric'}):'-';
const norm=s=>String(s??'').trim().replace(/\s+/g,' ').toLowerCase();
const phone=s=>String(s??'').replace(/\s+/g,'').trim();
const personKey=v=>{const email=norm(v.responsibleEmail);const ph=phone(v.responsiblePhone);const name=norm(v.responsible);return email?'email:'+email:ph?'phone:'+ph:'name:'+name};
function visits(){try{const x=JSON.parse(localStorage.getItem('ehsVisits')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function openDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(new Error('IndexedDB غير متاح'));const req=indexedDB.open(DB_NAME);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function getStored(id){if(!id)return null;try{const db=await openDB();const rec=await new Promise((res,rej)=>{const tx=db.transaction(STORE_NAME,'readonly'),rq=tx.objectStore(STORE_NAME).get(id);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error)});db.close();if(!rec)return null;const blob=rec.file||rec.image;if(!blob)return null;return {url:URL.createObjectURL(blob),type:rec.type||blob.type||'',name:rec.name||'ملف'}}catch(e){console.error(e);return null}}
let urls=[];
function field(label,value){return `<div class="profile-field"><small>${label}</small><strong>${esc(value||'-')}</strong></div>`}
function statusClass(s){return s==='ملتزم'?'ok':s==='بحاجة متابعة'?'warn':'bad'}
async function render(){
 const p=new URLSearchParams(location.search), key=p.get('key')||'', legacy=p.get('name')||'';
 const all=visits();
 let vs=key?all.filter(v=>personKey(v)===key):(legacy?all.filter(v=>norm(v.responsible)===norm(legacy)):[]);
 vs.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const person=vs[0]||{}; const name=person.responsible||legacy||'المسؤول';
 document.title=name+' - EHS';
 const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
 set('personName',name);set('profileName',name);set('profileNameInline',name);set('profileJob',person.jobTitle||'مسؤول');set('personAvatar',(name.trim()[0]||'م'));
 const email=person.responsibleEmail||'';const ph=person.responsiblePhone||'';
 const ee=document.getElementById('profileEmailValue'),pe=document.getElementById('profilePhoneValue');
 if(ee)ee.innerHTML=email?`<a href="mailto:${esc(email)}">${esc(email)}</a>`:'-';
 if(pe)pe.innerHTML=ph?`<a href="tel:${esc(ph)}">${esc(ph)}</a>`:'-';
 set('personVisitCount',vs.length);set('personDone',vs.filter(v=>v.status==='ملتزم').length);set('personFacilities',new Set(vs.map(v=>norm(v.facility)).filter(Boolean)).size);set('personLast',vs[0]?fmt(vs[0].date):'-');set('visitSummary',`تم تسجيل ${vs.length} زيارة لهذا المسؤول`);
 const root=document.getElementById('personVisits'); if(!root)return;
 if(!vs.length){root.innerHTML='<div class="empty">لا توجد زيارات مسجلة لهذا المسؤول</div>';return}
 root.innerHTML='';
 for(const v of vs){
   const canEdit=window.EHSAuth?EHSAuth.canEditVisit(v):true;
   const actionBtn=canEdit?`<a class="edit-btn" href="new-visit.html?edit=${encodeURIComponent(v.id)}">تعديل الزيارة</a>`:'';
   const item=document.createElement('article');item.className='visit-detail-item';
   item.innerHTML=`<div class="visit-top"><div><h3>${esc(v.facility||'-')}</h3><small>${esc(v.emirate||'-')} · ${fmt(v.date)}</small></div><span class="status-pill ${statusClass(v.status)}">${esc(v.status||'-')}</span></div>
   <div class="visit-meta-grid">
    ${field('المنشأة',v.facility)}${field('الإمارة',v.emirate)}${field('تاريخ الزيارة',fmt(v.date))}${field('الفريق',v.team)}
    ${field('موظف الاتصال',v.employeeName||v.contactEmployee)}${field('المسمى الوظيفي',v.employeeJobTitle||v.contactJobTitle)}${field('بريد موظف الاتصال',v.employeeEmail||v.contactEmail)}${field('هاتف موظف الاتصال',v.employeePhone||v.contactPhone)}
    ${field('المسؤول',v.responsible)}${field('المسمى الوظيفي للمسؤول',v.jobTitle)}${field('بريد المسؤول',v.responsibleEmail)}${field('هاتف المسؤول',v.responsiblePhone)}
    ${field('التصنيف',v.category)}${field('الأولوية',v.priority)}${field('نسبة الالتزام',(Number(v.compliance)||0)+'%')}${field('أضاف الزيارة',v.ownerName||v.ownerUsername)}
   </div>
   <div class="visit-long-details">
    <div><b>الملاحظات</b><p>${esc(v.notes||'لا توجد ملاحظات إضافية.')}</p></div>
    <div><b>الإجراء المطلوب</b><p>${esc(v.action||'لا يوجد إجراء مطلوب.')}</p></div>
    ${v.takenAction?`<div><b>الإجراء المتخذ</b><p>${esc(v.takenAction)}</p></div>`:''}
   </div>
   <div class="visit-attachments"><div><b>صور الزيارة</b><div class="visit-images" data-images></div></div><div><b>دليل الإجراء المتخذ</b><div data-evidence class="evidence-links"></div></div></div>
   <div class="visit-actions"><a class="view-btn" href="visit-details.html?id=${encodeURIComponent(v.id)}">عرض التفاصيل الكاملة</a>${actionBtn}</div>`;
   root.appendChild(item);
   const imgRoot=item.querySelector('[data-images]');
   const ids=Array.isArray(v.images)?v.images:[];
   if(!ids.length) imgRoot.innerHTML='<span class="muted">لا توجد صور</span>';
   for(const id of ids){const value=String(id||"");let rec=null;if(value.startsWith("/uploads/")||value.startsWith("http://")||value.startsWith("https://")){rec={url:value,type:"image/*",name:decodeURIComponent(value.split("/").pop()||"صورة الزيارة")};}else{rec=await getStored(id);}if(rec){urls.push(rec.url);const wrap=document.createElement("div");wrap.className="visit-image-thumb";wrap.innerHTML=String(rec.type||"").startsWith("image/")?`<img src="${rec.url}" alt="صورة الزيارة"><span>${esc(rec.name)}</span>`:`<a class="secondary" href="${rec.url}" target="_blank">${esc(rec.name)}</a>`;imgRoot.appendChild(wrap)}}
   const evRoot=item.querySelector('[data-evidence]');
   if(v.actionEvidence){const value=String(v.actionEvidence||"");let ev=null;if(value.startsWith("/uploads/")||value.startsWith("http://")||value.startsWith("https://")){ev={url:value,type:/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(value)?"image/*":"",name:decodeURIComponent(value.split("/").pop()||"دليل الإجراء")};}else{ev=await getStored(value);}if(ev){urls.push(ev.url);evRoot.innerHTML=String(ev.type||"").startsWith("image/")?`<a href="${ev.url}" target="_blank"><img class="evidence-image" src="${ev.url}" alt="دليل الإجراء"></a>`:`<a class="secondary" href="${ev.url}" target="_blank" download="${esc(ev.name)}">فتح الدليل: ${esc(ev.name)}</a>`}} else evRoot.innerHTML='<span class="muted">لا يوجد دليل مرفق</span>';
 }
}
window.addEventListener('beforeunload',()=>urls.forEach(u=>{try{URL.revokeObjectURL(u)}catch{}}));
document.addEventListener('DOMContentLoaded',async()=>{try{if(window.EHSSQL?.ready) await EHSSQL.ready;}catch(e){console.error(e)} render();});
window.addEventListener('ehsVisitsLoaded',render);