const DB_NAME = "EHSVisitsDB";
const STORE_NAME = "visitImages";

function openDB(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB) return reject(new Error("IndexedDB غير متاح في المتصفح"));
    // لا نحدد رقم إصدار حتى لا يحدث VersionError إذا كان المتصفح لديه إصدار أحدث.
    const req=indexedDB.open(DB_NAME);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME,{keyPath:"id"});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("تعذر فتح قاعدة الصور"));
  });
}

function putFiles(visitId, files, prefix="image"){
  return new Promise(async(resolve,reject)=>{
    try{
      const db=await openDB();
      const tx=db.transaction(STORE_NAME,"readwrite");
      const store=tx.objectStore(STORE_NAME);
      const ids=[];
      files.forEach((file,i)=>{
        if(!file) return;
        const id=`${visitId}_${prefix}_${Date.now()}_${i}_${Math.random().toString(36).slice(2,7)}`;
        store.put({id,visitId,name:file.name,type:file.type||"application/octet-stream",file});
        ids.push(id);
      });
      tx.oncomplete=()=>{db.close();resolve(ids)};
      tx.onerror=()=>{db.close();reject(tx.error||new Error("تعذر حفظ المرفقات"))};
      tx.onabort=()=>{db.close();reject(tx.error||new Error("تم إلغاء حفظ المرفقات"))};
    }catch(e){reject(e)}
  });
}

function readVisits(){
  try{
    const saved=localStorage.getItem("ehsVisits");
    if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))return window.EHSAuth ? EHSAuth.filterVisits(parsed) : parsed;}
  }catch(e){console.error(e)}
  return [];
}
function saveVisits(v){if(window.EHSAuth) EHSAuth.saveScopedVisits(v); else localStorage.setItem("ehsVisits",JSON.stringify(v));}
function today(){return new Date().toISOString().slice(0,10)}
function getIdFromUrl(){const p=new URLSearchParams(location.search);return p.get("id")||p.get("edit")||""}

function ensureCorrectiveFields(){
  if(document.getElementById("correctiveActionWrap")) return;
  const action=document.getElementById("action");
  if(!action) return;
  const wide=action.closest("label")?.classList.contains("wide")?"wide":"";
  const wrap=document.createElement("div");
  wrap.id="correctiveActionWrap"; wrap.className=`${wide} corrective-wrap`;
  wrap.innerHTML=`
    <div class="corrective-actions-compact">
      <label class="corrective-title">الإجراء المتخذ *</label>
      <button type="button" id="takenActionToggle" class="corrective-toggle" aria-expanded="false">
        <span id="takenActionToggleText">إضافة إجراء...</span><span>⌄</span>
      </button>
      <div id="takenActionBody" class="corrective-body" hidden>
        <div id="takenActionList" class="corrective-list"></div>
      </div>
      <textarea id="takenAction" hidden aria-hidden="true"></textarea>
    </div>
    <label>دليل الإجراء المتخذ<input id="actionEvidence" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label>
    <small class="corrective-note">يظهر هذا القسم عند تغيير حالة الزيارة من غير ملتزم/بحاجة متابعة إلى ملتزم.</small>`;
  action.closest("label")?.insertAdjacentElement("afterend",wrap);
  initCorrectiveCompact();
}

function initCorrectiveCompact(){
  const toggle=document.getElementById("takenActionToggle");
  const body=document.getElementById("takenActionBody");
  const list=document.getElementById("takenActionList");
  const hidden=document.getElementById("takenAction");
  const text=document.getElementById("takenActionToggleText");
  if(!toggle||!body||!list||!hidden||!text||toggle.dataset.bound==="1") return;
  toggle.dataset.bound="1";

  const sync=()=>{
    const values=Array.from(list.querySelectorAll(".corrective-input")).map(x=>x.value.trim()).filter(Boolean);
    hidden.value=values.join("\n");
    text.textContent=values.length?`تمت إضافة ${values.length} إجراء`:'إضافة إجراء...';
  };
  const add=(value="")=>{
    const row=document.createElement("div");
    row.className="corrective-row";
    row.innerHTML=`<textarea class="corrective-input" placeholder="اكتب الإجراء الذي تم اتخاذه..."></textarea>
      <button type="button" class="corrective-remove" aria-label="حذف الإجراء">−</button>
      <button type="button" class="corrective-add" aria-label="إضافة إجراء">+</button>`;
    const input=row.querySelector(".corrective-input");
    input.value=value;
    input.addEventListener("input",sync);
    row.querySelector(".corrective-remove").addEventListener("click",()=>{
      row.remove();
      if(!list.querySelector(".corrective-row")) add("");
      sync();
    });
    row.querySelector(".corrective-add").addEventListener("click",()=>add(""));
    list.appendChild(row);
    sync();
    input.focus();
  };
  toggle.addEventListener("click",()=>{
    const open=body.hidden;
    body.hidden=!open;
    toggle.setAttribute("aria-expanded",open?"true":"false");
  });
  window.EHSCorrectiveActions={
    init(values){
      list.innerHTML="";
      const arr=Array.isArray(values)?values.map(v=>String(v||"").trim()).filter(Boolean):[];
      if(arr.length) arr.forEach(add); else add("");
      body.hidden=true;
      toggle.setAttribute("aria-expanded","false");
      sync();
    },
    getValues(){return Array.from(list.querySelectorAll(".corrective-input")).map(x=>x.value.trim()).filter(Boolean);},
    sync
  };
  add("");
}

function toggleCorrective(show){
  ensureCorrectiveFields();
  const wrap=document.getElementById("correctiveActionWrap");
  if(wrap) wrap.style.display=show?"grid":"none";
}


async function getStoredRecord(id){
  if(!id) return null;
  const db=await openDB();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,"readonly");
      const req=tx.objectStore(STORE_NAME).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||new Error("تعذر قراءة المرفق"));
    });
  }finally{ try{db.close()}catch{} }
}
function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    if(!blob) return reject(new Error("ملف الصورة غير موجود"));
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=()=>reject(r.error||new Error("تعذر قراءة الصورة"));
    r.readAsDataURL(blob);
  });
}
function pptSafeName(name){
  return String(name||"زيارة").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim().slice(0,100);
}
function pptDate(d){
  if(!d) return "-";
  try{return new Date(d+"T00:00:00").toLocaleDateString("ar-AE",{day:"2-digit",month:"2-digit",year:"numeric"});}
  catch{return d}
}
async function generateVisitPowerPoint(visit){
  if(typeof PptxGenJS==="undefined") throw new Error("تعذر تحميل مكتبة PowerPoint. تأكد من اتصال الإنترنت ثم أعد المحاولة.");
  const pptx=new PptxGenJS();
  pptx.layout="LAYOUT_WIDE";
  pptx.author="EHS";
  pptx.subject="تقرير زيارة ميدانية";
  pptx.title=`تقرير زيارة - ${visit.facility||"منشأة"}`;
  pptx.company="EHS";
  pptx.lang="ar-SA";
  pptx.theme={headFontFace:"Arial",bodyFontFace:"Arial",lang:"ar-SA"};
  const W=13.333,H=7.5;
  const title=String(visit.facility||"الزيارة الميدانية");
  const compliance=Number(visit.compliance)||0;
  const good=compliance>=80;
  const green="20A464", red="E0524D", navy="163A63", gray="667085", light="F5F7FA";
  const addHeader=(slide,txt,sub)=>{
    slide.addText(txt,{x:.55,y:.35,w:12.2,h:.5,fontFace:"Arial",fontSize:22,bold:true,color:navy,align:"right",rtlMode:true,margin:0});
    if(sub) slide.addText(sub,{x:.55,y:.9,w:12.2,h:.3,fontFace:"Arial",fontSize:10,color:gray,align:"right",rtlMode:true,margin:0});
    slide.addShape(pptx.ShapeType.line,{x:.55,y:1.25,w:12.2,h:0,line:{color:"D9E0E8",width:1}});
  };
  // Slide 1
  let slide=pptx.addSlide();
  slide.background={color:"F7F9FC"};
  slide.addText("تقرير زيارة ميدانية",{x:.7,y:1.45,w:11.9,h:.7,fontFace:"Arial",fontSize:30,bold:true,color:navy,align:"right",rtlMode:true,margin:0});
  slide.addText(title,{x:.7,y:2.25,w:11.9,h:.65,fontFace:"Arial",fontSize:25,bold:true,color:"222222",align:"right",rtlMode:true,margin:0});
  slide.addText(`${visit.emirate||"-"}  |  ${pptDate(visit.date)}`,{x:.7,y:3.0,w:11.9,h:.4,fontFace:"Arial",fontSize:15,color:gray,align:"right",rtlMode:true,margin:0});
  slide.addText(`${compliance}%`,{x:8.9,y:4.0,w:3.7,h:1.1,fontFace:"Arial",fontSize:38,bold:true,color:good?green:red,align:"center",margin:0});
  slide.addText(good?"ملتزم":"بحاجة إلى متابعة",{x:8.9,y:5.05,w:3.7,h:.4,fontFace:"Arial",fontSize:16,bold:true,color:good?green:red,align:"center",rtlMode:true,margin:0});
  slide.addText("نسبة الالتزام",{x:8.9,y:5.48,w:3.7,h:.3,fontFace:"Arial",fontSize:11,color:gray,align:"center",rtlMode:true,margin:0});

  // Slide 2 details
  slide=pptx.addSlide(); addHeader(slide,"بيانات الزيارة",`${title} — ${pptDate(visit.date)}`);
  const rows=[
    ["المنشأة",visit.facility],["الإمارة",visit.emirate],["تاريخ الزيارة",pptDate(visit.date)],
    ["الفريق",visit.team||"-"],["موظف الاتصال",visit.employeeName||visit.contactEmployee||"-"],
    ["المسمى الوظيفي",visit.employeeJobTitle||visit.contactJobTitle||"-"],
    ["المسؤول",visit.responsible||"-"],["المسمى الوظيفي",visit.jobTitle||"-"],
    ["التصنيف",visit.category||"-"],["الأولوية",visit.priority||"-"],
    ["الحالة",visit.status||"-"],["نسبة الالتزام",`${compliance}%`]
  ];
  rows.forEach((r,i)=>{
    const col=i%2, row=Math.floor(i/2), x=6.8-col*6.05;
    const y=1.55+row*.78;
    slide.addShape(pptx.ShapeType.roundRect,{x,y,w:5.65,h:.62,rectRadius:.06,fill:{color:"FFFFFF"},line:{color:"E2E7EE",width:1}});
    slide.addText(r[0],{x:x+.18,y:y+.09,w:2.0,h:.2,fontFace:"Arial",fontSize:9,color:gray,align:"right",rtlMode:true,margin:0});
    slide.addText(String(r[1]??"-"),{x:x+2.15,y:y+.07,w:3.25,h:.25,fontFace:"Arial",fontSize:12,bold:true,color:"222222",align:"right",rtlMode:true,margin:0});
  });

  // Slide 3 notes/actions
  slide=pptx.addSlide(); addHeader(slide,"الملاحظات والإجراءات",title);
  const blocks=[["ملاحظات الزيارة",visit.notes||"لا توجد ملاحظات إضافية."],["الإجراء المطلوب",visit.action||"لا يوجد إجراء مطلوب."],["الإجراء المتخذ",visit.takenAction||"لم يتم تسجيل إجراء متخذ."]];
  blocks.forEach((b,i)=>{
    const y=1.55+i*1.65;
    slide.addText(b[0],{x:.65,y,w:12,h:.3,fontFace:"Arial",fontSize:15,bold:true,color:navy,align:"right",rtlMode:true,margin:0});
    slide.addShape(pptx.ShapeType.roundRect,{x:.65,y:y+.4,w:12,h:1.05,rectRadius:.05,fill:{color:light},line:{color:"E1E6ED",width:1}});
    slide.addText(String(b[1]),{x:.9,y:y+.62,w:11.5,h:.65,fontFace:"Arial",fontSize:12,color:"333333",align:"right",valign:"mid",rtlMode:true,margin:.02});
  });

  // Slide 4 chart/history
  const all=readVisits().filter(v=>String(v.facility||"").trim()===String(visit.facility||"").trim()).sort((a,b)=>new Date(a.date)-new Date(b.date));
  slide=pptx.addSlide(); addHeader(slide,"تطور نسبة الالتزام للمنشأة",`عدد الزيارات: ${all.length}`);
  const cx=.9, cy=2.0, cw=11.5, ch=3.8, left=cx+.45, bottom=cy+ch-.35, top=cy+.25, right=cx+cw-.25;
  for(let n=0;n<=100;n+=20){
    const yy=bottom-(n/100)*(bottom-top);
    slide.addShape(pptx.ShapeType.line,{x:left,y:yy,w:right-left,h:0,line:{color:"E5E9EF",width:1}});
    slide.addText(`${n}%`,{x:.35,y:yy-.1,w:.45,h:.2,fontFace:"Arial",fontSize:8,color:gray,align:"right",margin:0});
  }
  slide.addShape(pptx.ShapeType.line,{x:left,y:top,w:0,h:bottom-top,line:{color:"98A2B3",width:1}});
  slide.addShape(pptx.ShapeType.line,{x:left,y:bottom,w:right-left,h:0,line:{color:"98A2B3",width:1}});
  if(all.length){
    const pts=all.map((v,i)=>({x:all.length===1?(left+right)/2:left+i*(right-left)/(all.length-1),y:bottom-(Math.max(0,Math.min(100,Number(v.compliance)||0))/100)*(bottom-top),v}));
    for(let i=1;i<pts.length;i++) slide.addShape(pptx.ShapeType.line,{x:pts[i-1].x,y:pts[i-1].y,w:pts[i].x-pts[i-1].x,h:pts[i].y-pts[i-1].y,line:{color:"E0524D",width:2.5}});
    pts.forEach(p=>{
      const c=Number(p.v.compliance)>=80?green:red;
      slide.addShape(pptx.ShapeType.ellipse,{x:p.x-.065,y:p.y-.065,w:.13,h:.13,fill:{color:c},line:{color:"FFFFFF",width:1}});
      slide.addText(`${Number(p.v.compliance)||0}%`,{x:p.x-.35,y:p.y-.38,w:.7,h:.2,fontFace:"Arial",fontSize:8,bold:true,color:c,align:"center",margin:0});
      slide.addText(pptDate(p.v.date),{x:p.x-.48,y:bottom+.12,w:.96,h:.22,fontFace:"Arial",fontSize:7,color:gray,align:"center",margin:0});
    });
  } else {
    slide.addText("لا توجد زيارات سابقة لهذه المنشأة.",{x:2,y:3.5,w:9,h:.4,fontFace:"Arial",fontSize:15,color:gray,align:"center",rtlMode:true});
  }

  // Images slides
  const ids=Array.isArray(visit.images)?visit.images:[];
  const imageItems=[];
  for(const id of ids){
    try{
      const rec=await getStoredRecord(id);
      if(rec && rec.file && String(rec.type||"").startsWith("image/")) imageItems.push({data:await blobToDataUrl(rec.file),name:rec.name||"صورة"});
    }catch(e){console.warn(e)}
  }
  for(let i=0;i<imageItems.length;i+=2){
    slide=pptx.addSlide(); addHeader(slide,"صور الزيارة",`${title} — صورة ${i+1} من ${imageItems.length}`);
    const group=imageItems.slice(i,i+2);
    group.forEach((im,j)=>{
      const x=j===0?6.85:.65;
      slide.addShape(pptx.ShapeType.roundRect,{x,y:1.55,w:5.85,h:5.2,rectRadius:.04,fill:{color:"FFFFFF"},line:{color:"E2E7EE",width:1}});
      slide.addImage({data:im.data,x:x+.12,y:1.68,w:5.6,h:4.65,sizingContain:true});
      slide.addText(im.name,{x:x+.2,y:6.45,w:5.4,h:.2,fontFace:"Arial",fontSize:8,color:gray,align:"center",rtlMode:true,margin:0});
    });
  }
  const filename=`EHS_Visit_${pptSafeName(title)}_${String(visit.date||"").replace(/-/g,"")}.pptx`;
  await pptx.writeFile({fileName:filename});
  return filename;
}

async function saveVisit(){
  const form=document.getElementById("visitForm");
  const saveBtn=document.getElementById("saveBtn");
  const editId=getIdFromUrl();
  const oldVisits=readVisits();
  const old=editId?oldVisits.find(v=>String(v.id)===String(editId)):null;

  if(editId && old && window.EHSAuth && !EHSAuth.canEditVisit(old)){
    alert("لا يمكنك تعديل هذه الزيارة لأنها مضافة بواسطة مستخدم آخر.");
    location.replace(`visit-details.html?id=${encodeURIComponent(editId)}`);
    return null;
  }

  const status=document.getElementById("status");
  const newStatus=status?.value||"";
  const changingToCompliant=!!old && old.status!=="ملتزم" && newStatus==="ملتزم";

  if(saveBtn){saveBtn.disabled=true;saveBtn.textContent="جاري الحفظ في قاعدة البيانات...";}

  try{
    const imageInput=document.getElementById("images");
    const imageFiles=imageInput?Array.from(imageInput.files||[]):[];
    const evidenceInput=document.getElementById("actionEvidence");
    const evidenceFile=evidenceInput?.files?.[0]||null;

    const rawFacility=(document.getElementById("facility")?.value||"").trim();
    let canonicalFacility=rawFacility;
    let canonicalEmirate=document.getElementById("emirate")?.value||"";
    try{
      const master=Array.isArray(window.EHS_FACILITIES)?window.EHS_FACILITIES:[];
      const n=v=>String(v||"").replace(/[\u064B-\u065F\u0670]/g,"").replace(/[إأآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ـ/g,"").replace(/\s+/g," ").trim().toLowerCase();
      const hit=master.find(f=>n(f.name)===n(rawFacility) || (f.englishName && n(f.englishName)===n(rawFacility)));
      if(hit){ canonicalFacility=hit.name; if(!canonicalEmirate) canonicalEmirate=hit.emirate||""; }
    }catch{}

    const visit={
      ...(old||{}),
      id:editId || null,
      facility:canonicalFacility,
      emirate:canonicalEmirate,
      date:document.getElementById("visitDate")?.value||today(),
      team:(document.getElementById("team")?.value||"").trim(),
      responsible:(document.getElementById("responsible")?.value||"").trim(),
      jobTitle:(document.getElementById("jobTitle")?.value||"").trim(),
      employeeName:(document.getElementById("contactEmployee")?.value||"").trim(),
      employeeJobTitle:(document.getElementById("contactJobTitle")?.value||"").trim(),
      employeeEmail:(document.getElementById("contactEmail")?.value||"").trim(),
      employeePhone:(document.getElementById("contactPhone")?.value||"").trim(),
      responsibleEmail:(document.getElementById("responsibleEmail")?.value||"").trim(),
      responsiblePhone:(document.getElementById("responsiblePhone")?.value||"").trim(),
      category:document.getElementById("category")?.value||"",
      priority:document.getElementById("priority")?.value||"",
      status:newStatus,
      compliance:Math.max(0,Math.min(100,Number(document.getElementById("compliance")?.value)||0)),
      notes:(window.EHSVisitNotes?.getNotes ? window.EHSVisitNotes.getNotes().join("\n") : (document.getElementById("notes")?.value||"").trim()),
      action:(document.getElementById("action")?.value||"").trim(),
      takenAction:old?.takenAction||"",
      ownerId:old?.ownerId||"",
      ownerName:old?.ownerName||"",
      ownerUsername:old?.ownerUsername||""
    };

    if(changingToCompliant){
      visit.takenAction=(window.EHSCorrectiveActions?.getValues ? window.EHSCorrectiveActions.getValues().join("\n") : (document.getElementById("takenAction")?.value||"").trim());
      if(!visit.takenAction){
        alert("يرجى كتابة الإجراء المتخذ قبل تحويل حالة الزيارة إلى ملتزم.");
        return null;
      }
    }

    // The actual write happens HERE. No localStorage -> SQL magic and no Date.now() ids.
    const result=await EHSSQL.saveVisitToServer(visit,imageFiles,evidenceFile);
    const serverId=String(result?.id||"");
    if(!serverId) throw new Error("الخادم لم يُرجع رقم الزيارة بعد الحفظ.");

    // Pull the authoritative row back from SQL Server immediately.
    const serverVisits=await EHSSQL.getVisitsFromServer();
    localStorage.setItem("ehsVisits",JSON.stringify(serverVisits));
    window.dispatchEvent(new CustomEvent('ehsVisitsLoaded',{detail:serverVisits}));

    alert(old?"تم تعديل الزيارة وحفظها في قاعدة البيانات بنجاح.":"تم حفظ الزيارة في قاعدة البيانات بنجاح.");

    try{
      if(saveBtn){saveBtn.textContent="جاري إنشاء ملف PowerPoint...";}
      const saved=serverVisits.find(v=>String(v.id)===serverId) || {...visit,id:serverId};
      await generateVisitPowerPoint(saved);
    }catch(pptErr){
      console.error(pptErr);
      alert("تم حفظ الزيارة في قاعدة البيانات، لكن تعذر إنشاء ملف PowerPoint: "+(pptErr.message||pptErr));
    }

    location.href=`visit-details.html?id=${encodeURIComponent(serverId)}`;
    return serverId;
  }catch(e){
    console.error("SAVE VISIT ERROR",e);
    alert("تعذر حفظ الزيارة في قاعدة البيانات:\n\n"+(e.message||e));
    return null;
  }finally{
    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent=editId?"حفظ التعديلات":"حفظ الزيارة";}
  }
}
function loadEdit(){
  const id=getIdFromUrl();
  const visits=readVisits();
  const v=id?visits.find(x=>String(x.id)===String(id)):null;
  const title=document.getElementById("pageTitle");
  const crumb=document.getElementById("formCrumb");
  const btn=document.getElementById("saveBtn");
  if(v){
    if(title) title.textContent="تعديل الزيارة الميدانية";
    if(crumb) crumb.innerHTML="لوحة التحكم <b>‹</b> الزيارات الميدانية <b>‹</b> تعديل الزيارة";
    if(btn) btn.textContent="حفظ التعديلات";
    const set=(id,val)=>{const el=document.getElementById(id);if(el&&val!=null)el.value=val};
    set("facility",v.facility);set("emirate",v.emirate);set("visitDate",v.date);set("team",v.team);
    set("responsible",v.responsible);set("jobTitle",v.jobTitle);set("contactEmployee",v.employeeName||v.contactEmployee);set("contactJobTitle",v.employeeJobTitle||v.contactJobTitle);
    set("contactEmail",v.employeeEmail||v.contactEmail);set("contactPhone",v.employeePhone||v.contactPhone);set("responsibleEmail",v.responsibleEmail);set("responsiblePhone",v.responsiblePhone);
    set("category",v.category);set("priority",v.priority);set("status",v.status);set("compliance",v.compliance);set("notes",v.notes);set("action",v.action);
    if(window.EHSVisitNotes){
      const savedNotes=String(v.notes||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      window.EHSVisitNotes.init(savedNotes);
    }
    ensureCorrectiveFields();
    if(v.status!=="ملتزم") toggleCorrective(false);
    if(window.EHSCorrectiveActions){
      const savedActions=String(v.takenAction||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      window.EHSCorrectiveActions.init(savedActions);
    }
    if(v.takenAction && !window.EHSCorrectiveActions){
      const ta=document.getElementById("takenAction"); if(ta) ta.value=v.takenAction;
    }
  }else{
    if(document.getElementById("visitDate")&&!document.getElementById("visitDate").value)document.getElementById("visitDate").value=today();
    toggleCorrective(false);
  }
  return v;
}

document.addEventListener("DOMContentLoaded",()=>{
  const form=document.getElementById("visitForm"); if(!form)return;
  const existing=loadEdit();
  const status=document.getElementById("status");
  status?.addEventListener("change",()=>{
    const oldStatus=existing?.status||"";
    toggleCorrective(!!existing && oldStatus!=="ملتزم" && status.value==="ملتزم");
  });
  if(existing && existing.status!=="ملتزم") toggleCorrective(false);
  if(!existing) ensureCorrectiveFields(),toggleCorrective(false);
  form.addEventListener("submit",e=>{e.preventDefault();saveVisit()});
});
