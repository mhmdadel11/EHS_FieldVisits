const DB_NAME="EHSVisitsDB", STORE_NAME="visitImages";
async function getVisits(){
  try{
    if(window.EHSSQL?.getVisitsFromServer){
      const serverVisits=await window.EHSSQL.getVisitsFromServer();
      if(Array.isArray(serverVisits)){
        localStorage.setItem("ehsVisits",JSON.stringify(serverVisits));
        return window.EHSAuth?EHSAuth.filterVisits(serverVisits):serverVisits;
      }
    }
  }catch(e){console.warn("تعذر تحميل الزيارات من SQL Server، سيتم استخدام البيانات المحلية",e)}
  try{const r=localStorage.getItem("ehsVisits");const v=r?JSON.parse(r):[];return window.EHSAuth?EHSAuth.filterVisits(v):v}catch{return[]}
}
function fmt(d){return d?new Date(d+"T00:00:00").toLocaleDateString("ar-AE",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"}
function monthYear(d){return d?new Date(d+"T00:00:00").toLocaleDateString("ar-AE",{month:"long",year:"numeric"}):"-"}
function esc(s){return String(s??"").replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:"id"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function getStored(id){if(!id)return null;try{const db=await openDB();const rec=await new Promise((res,rej)=>{const tx=db.transaction(STORE_NAME,"readonly"),rq=tx.objectStore(STORE_NAME).get(id);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error)});db.close();if(!rec)return null;const blob=rec.file||rec.image;if(!blob)return null;return {url:URL.createObjectURL(blob),type:rec.type||blob.type||"",name:rec.name||""}}catch(e){console.error(e);return null}}

let urls=[];
function statusColor(n){return Number(n)>=80?"green":"red"}
async function renderFacilityChart(current){
  const root=document.getElementById("facilityChart"); if(!root)return;
  const visits=await getVisits();
  const currentFacility=String(current.facility||current.Facility||"").trim();
  const all=visits.filter(v=>String(v.facility??v.Facility??"").trim()===currentFacility).sort((a,b)=>new Date(a.date??a.Date)-new Date(b.date??b.Date));
  if(!all.length){root.innerHTML="";return}
  const W=Math.max(760,all.length*110+80), H=330, pad={l:55,r:25,t:38,b:72};
  const iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
  const x=i=>pad.l+(all.length===1?iw/2:(i*iw/(all.length-1)));
  const y=v=>pad.t+ih-(Math.max(0,Math.min(100,Number(v)||0))/100)*ih;
  const valueOf = v => {
    const raw=v.compliance ?? v.Compliance ?? v.compliancePercentage ?? v.CompliancePercentage;
    const n=Number(raw);
    if(Number.isFinite(n) && n>0) return Math.max(0,Math.min(100,n));
    return 0;
  };
  const dateOf = v => v.date ?? v.Date;
  const pts=all.map((v,i)=>({x:x(i),y:y(valueOf(v)),v,value:valueOf(v),date:dateOf(v),i}));
  const path=pts.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ");
  const grids=[0,20,40,60,80,100].map(n=>{const yy=y(n);return `<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="#e5e9ef"/><text x="${pad.l-10}" y="${yy+4}" text-anchor="end" font-size="11" fill="#7b8492">${n}%</text>`}).join("");
  const labels=pts.map((p,i)=>`<text x="${p.x}" y="${H-pad.b+24}" text-anchor="middle" font-size="10" fill="#687385">${esc(fmt(p.date))}</text><text x="${p.x}" y="${H-pad.b+42}" text-anchor="middle" font-size="10" fill="#9aa3b0">${esc(monthYear(p.date))}</text>`).join("");
  const points=pts.map(p=>{
    const c=statusColor(p.value);
    const pointColor=c==="green"?"#20a464":"#e0524d";
    const textColor=c==="green"?"#168650":"#d43f3a";
    return `<g><circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${pointColor}" stroke="#fff" stroke-width="2"/><text x="${p.x}" y="${p.y-13}" text-anchor="middle" font-size="11" font-weight="800" fill="${textColor}">${p.value}%</text><title>${fmt(p.date)} — ${p.value}%</title></g>`
  }).join("");
  root.innerHTML=`<div class="chart-scroll"><svg class="facility-line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="تطور نسبة الالتزام للمنشأة"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="#9ca6b4"/><line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="#9ca6b4"/>${grids}<path d="${path}" fill="none" stroke="#247df0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points}${labels}</svg></div><div class="chart-legend"><span>● 80% فأعلى = ملتزم</span><span>● أقل من 80% = يحتاج متابعة</span></div>`;
}

async function render(){
  const id=new URLSearchParams(location.search).get("id");
  const visits=await getVisits();
  const v=visits.find(x=>String(x.id)===String(id));
  const root=document.getElementById("visitDetails"); if(!root)return;
  if(!v){root.innerHTML='<div class="panel empty">الزيارة غير موجودة</div>';return}
  const canEdit=window.EHSAuth ? EHSAuth.canEditVisit(v) : true;
  const actionButtons=canEdit?`<a class="secondary" href="new-visit.html?id=${encodeURIComponent(v.id)}">✎ تعديل الزيارة</a><button class="danger-btn" id="deleteVisit">حذف الزيارة</button>`:`<span class="muted" style="padding:10px 14px">عرض فقط — لا يمكنك تعديل زيارة مستخدم آخر</span>`;
  root.innerHTML=`<div class="detail-page-head"><div><h2>${esc(v.facility)}</h2><p>${esc(v.emirate)} · ${fmt(v.date)}</p></div><div class="detail-actions">${actionButtons}</div></div>
  <div class="details-grid"><div class="panel"><h3>بيانات الزيارة</h3><div class="data-grid">
  ${[['المنشأة',v.facility],['الإمارة',v.emirate],['تاريخ الزيارة',fmt(v.date)],['الفريق',v.team||'-'],['موظف الاتصال',v.employeeName||v.contactEmployee||'-'],['المسمى الوظيفي',v.employeeJobTitle||v.contactJobTitle||'-'],['المسؤول',v.responsible||'-'],['المسمى الوظيفي',v.jobTitle||'-'],['التصنيف',v.category||'-'],['الأولوية',v.priority||'-'],['الحالة',v.status||'-'],['نسبة الالتزام',(Number(v.compliance)||0)+'%'],['أضاف الزيارة',v.ownerName||v.ownerUsername||'غير محدد']].map(([a,b])=>`<div><small>${a}</small><strong>${esc(b)}</strong></div>`).join("")}</div></div>
  <div class="panel"><h3>ملاحظات الزيارة</h3><div class="long-text">${esc(v.notes)||"لا توجد ملاحظات إضافية."}</div><h3>الإجراء المطلوب</h3><div class="long-text">${esc(v.action)||"لا يوجد إجراء مطلوب."}</div>${v.takenAction?`<h3>الإجراء المتخذ</h3><div class="long-text">${esc(v.takenAction)}</div>`:""}</div></div>
  <div class="panel facility-history"><div class="panel-head"><div><h3>تطور نسبة الالتزام للمنشأة</h3><p class="muted">جميع زيارات ${esc(v.facility)} مرتبة حسب التاريخ</p></div></div><div id="facilityChart"></div></div>
  <div class="panel gallery-panel"><div class="panel-head"><h3>صور الزيارة</h3><span id="imageCount">0 صورة</span></div><div id="gallery" class="gallery"></div></div>
  <div class="panel evidence-panel" id="evidencePanel" style="display:none"><h3>دليل الإجراء المتخذ</h3><div id="evidenceContent"></div></div>`;

  renderFacilityChart(v);
  const deleteBtn=document.getElementById("deleteVisit");
  if(deleteBtn) deleteBtn.onclick=async()=>{
    if(!confirm("هل أنت متأكد من حذف هذه الزيارة؟")) return;
    try{
      await EHSSQL.deleteVisitFromServer(v.id);
      const rows=await EHSSQL.getVisitsFromServer();
      localStorage.setItem("ehsVisits",JSON.stringify(rows));
      location.href="index.html";
    }catch(e){
      alert("تعذر حذف الزيارة من قاعدة البيانات:\n\n"+(e.message||e));
    }
  };

  const gallery=document.getElementById("gallery");
  // SQL Server is authoritative for uploaded visit images. Fetch the image
  // rows directly instead of depending on the legacy localStorage image IDs.
  let sqlImages=[];
  try{
    const r=await fetch(`/api/visits/${encodeURIComponent(v.id)}/images?ts=${Date.now()}`,{cache:"no-store",credentials:"same-origin",headers:{Accept:"application/json"}});
    if(r.ok) sqlImages=await r.json();
  }catch(e){ console.warn("تعذر تحميل صور الزيارة من الخادم",e); }

  const imageRows=Array.isArray(sqlImages)?sqlImages:[];
  for(const row of imageRows){
    const name=String(row?.fileName||"");
    if(!name) continue;
    const url=`/api/visits/${encodeURIComponent(v.id)}/image/${encodeURIComponent(name)}`;
    urls.push(url);
    gallery.insertAdjacentHTML("beforeend",`<div class="gallery-item"><img src="${esc(url)}" alt="صورة الزيارة" loading="lazy"><span>${esc(name)}</span></div>`);
  }

  // Legacy browser-only images are still supported for older visits.
  if(!imageRows.length){
    const ids=Array.isArray(v.images)?v.images:[];
    for(const id of ids){
      const value=String(id||"");
      let rec=null;
      if(value.startsWith("/uploads/") || value.startsWith("http://") || value.startsWith("https://")){
        const name=decodeURIComponent(value.split("/").pop()||"صورة الزيارة");
        rec={url:`/api/visits/${encodeURIComponent(v.id)}/image/${encodeURIComponent(name)}`,name,type:"image/*"};
      }else{ rec=await getStored(id); }
      if(rec){urls.push(rec.url);gallery.insertAdjacentHTML("beforeend",`<div class="gallery-item"><img src="${esc(rec.url)}" alt="صورة الزيارة"><span>${esc(rec.name)}</span></div>`)}
    }
  }
  document.getElementById("imageCount").textContent=`${gallery.children.length} صورة`;
  if(!gallery.children.length)gallery.innerHTML='<div class="empty">لا توجد صور لهذه الزيارة</div>';
  // ActionEvidence is now stored by ASP.NET/SQL Server as a public file path.
  // Older records may still contain an IndexedDB id, so support both formats.
  if(v.actionEvidence){
    const evidenceValue=String(v.actionEvidence||"");
    let ev=null;
    if(evidenceValue.startsWith("/uploads/") || evidenceValue.startsWith("http://") || evidenceValue.startsWith("https://")){
      const url=evidenceValue;
      const name=decodeURIComponent(url.split("/").pop()||"دليل الإجراء");
      const isImage=/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
      ev={url,name,type:isImage?"image/*":""};
    }else{
      ev=await getStored(evidenceValue);
    }
    if(ev){
      const panel=document.getElementById("evidencePanel"), content=document.getElementById("evidenceContent");
      if(panel && content){
        panel.style.display="block";
        if(String(ev.type||"").startsWith("image/")){
          content.innerHTML=`<a href="${esc(ev.url)}" target="_blank" rel="noopener"><img class="evidence-image" src="${esc(ev.url)}" alt="دليل الإجراء"></a>`;
        }else{
          content.innerHTML=`<a class="secondary" href="${esc(ev.url)}" target="_blank" rel="noopener" download="${esc(ev.name)}">فتح دليل الإجراء: ${esc(ev.name)}</a>`;
        }
      }
    }
  }
}
window.addEventListener("beforeunload",()=>urls.forEach(u=>{try{URL.revokeObjectURL(u)}catch{}}));
document.addEventListener("DOMContentLoaded",render);
