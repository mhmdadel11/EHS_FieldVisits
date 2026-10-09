(function(){
  'use strict';
  const PAGE_SIZE = 11;
  let page = 1;
  let allVisits = [];

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const norm = v => String(v ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
  const facilityKey = (name) => {
    // Build a comparison key from the facility name only. The visit form may
    // save the emirate separately, so an emirate mismatch must never turn a
    // real visit into "لم تتم زيارتها بعد".
    return norm(name)
      .replace(/\s*[-،,\/]?\s*(ابوظبي|أبوظبي|دبي|الشارقه|الشارقة|عجمان|ام القيوين|أم القيوين|راس الخيمه|رأس الخيمة|الفجيره|الفجيرة)\s*$/,'')
      .replace(/[()\[\]{}]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  };

  function compact(v){ return facilityKey(v).replace(/[^\u0600-\u06FFa-z0-9]+/gi,''); }

  function nameMatches(visit, facility){
    const names=[visit?.facility, visit?.Facility, visit?.facilityName, visit?.FacilityName].filter(Boolean);
    const targets=[facility?.name, facility?.englishName].filter(Boolean);
    if(!names.length || !targets.length) return false;
    for(const n of names){
      const a=compact(n);
      if(!a) continue;
      for(const t of targets){
        const b=compact(t);
        if(!b) continue;
        if(a===b) return true;
        // Handle old records that contain the emirate or a small punctuation
        // suffix/prefix while avoiding very short false matches.
        if(a.length>=8 && b.length>=8 && (a.includes(b) || b.includes(a))) return true;
      }
    }
    return false;
  };

  const typeOf = f => {
    const n = norm(f.name);
    if (n.includes('مستشفى')) return 'مستشفى';
    if (n.includes('مركز')) return 'مركز صحي';
    return 'منشأة صحية';
  };
  const hoursOf = f => f.hours || 'ساعات العمل حسب نظام المنشأة';

  function visitsFor(f){
    return allVisits.filter(v => nameMatches(v,f));
  }

  function filtered(){
    const q = norm(document.getElementById('facilityDirectorySearch')?.value);
    const emirate = norm(document.getElementById('facilityDirectoryEmirate')?.value);
    const type = norm(document.getElementById('facilityDirectoryType')?.value);
    return (window.EHS_FACILITIES || []).filter(f => {
      const text = norm(`${f.name} ${f.englishName||''}`);
      return (!q || text.includes(q)) && (!emirate || norm(f.emirate) === emirate) && (!type || typeOf(f) === type);
    });
  }

  function render(){
    const grid = document.getElementById('facilityDirectoryGrid');
    const pager = document.getElementById('facilityDirectoryPager');
    if(!grid || !pager) return;
    const data = filtered();
    const pages = Math.max(1, Math.ceil(data.length/PAGE_SIZE));
    page = Math.min(page, pages);
    const start = (page-1)*PAGE_SIZE;
    const slice = data.slice(start,start+PAGE_SIZE);
    grid.innerHTML = slice.map(f => {
      const vs = visitsFor(f);
      const visited = vs.length > 0;
      return `<article class="facility-card ${visited?'visited':'not-visited'}">
        <h3>${esc(f.name)}</h3>
        <p class="facility-kind">نوع المنشأة: ${esc(typeOf(f))}</p>
        <div class="facility-hours"><strong>ساعات العمل</strong><br>${esc(hoursOf(f))}</div>
        <div class="facility-meta"><span>${esc(f.emirate||'الإمارة غير محددة')}</span><span>${visited ? `تمت زيارتها ${vs.length} ${vs.length===1?'مرة':'مرات'}` : 'لم تتم زيارتها بعد'}</span></div>
        <button type="button" class="facility-details-btn" data-id="${esc(f.groupId||f.name)}">عرض التفاصيل ←</button>
      </article>`;
    }).join('') || '<div class="facility-empty">لا توجد منشآت مطابقة للبحث.</div>';

    grid.querySelectorAll('.facility-details-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const f=(window.EHS_FACILITIES||[]).find(x=>String(x.groupId||x.name)===String(btn.dataset.id));
      if(!f)return;
      const vs=visitsFor(f);
      const dates=vs.map(v=>v.date||v.Date).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a));
      const box=document.getElementById('facilityDirectoryDetails');
      if(!box)return;
      box.innerHTML=`<div class="facility-detail-title"><strong>${esc(f.name)}</strong><button type="button" id="closeFacilityDirectoryDetails">×</button></div>
        <p>${esc(f.emirate||'')} · ${esc(typeOf(f))}</p>
        <p><strong>${vs.length}</strong> ${vs.length===1?'زيارة مسجلة':'زيارات مسجلة'}</p>
        ${dates.length?`<div class="facility-detail-dates">${dates.map(d=>`<span>${esc(formatDate(d))}</span>`).join('')}</div>`:'<p>لم تتم زيارة هذه المنشأة حتى الآن.</p>'}`;
      box.classList.add('open');
      document.getElementById('closeFacilityDirectoryDetails')?.addEventListener('click',()=>box.classList.remove('open'));
    }));

    let html='';
    html += `<button type="button" class="pager-btn" data-page="1">‹</button>`;
    html += `<button type="button" class="pager-btn" data-page="${Math.max(1,page-1)}">السابق</button>`;
    const nums=[]; for(let i=1;i<=pages;i++){ if(i<=3 || i>pages-2 || Math.abs(i-page)<=1) nums.push(i); else if(nums[nums.length-1]!=='…') nums.push('…'); }
    nums.forEach(n=>{ html += n==='…'?'<span class="pager-dots">…</span>':`<button type="button" class="pager-number ${n===page?'active':''}" data-page="${n}">${n}</button>`; });
    html += `<button type="button" class="pager-btn" data-page="${Math.min(pages,page+1)}">التالي</button><button type="button" class="pager-btn" data-page="${pages}">›</button>`;
    pager.innerHTML=html;
    pager.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{page=Number(b.dataset.page)||1;render();document.getElementById('facilityDirectory')?.scrollIntoView({behavior:'smooth',block:'start'});}));
  }

  function formatDate(d){
    const x=new Date(d); if(Number.isNaN(x.getTime())) return String(d);
    return `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}`;
  }

  async function load(){
    render();
    const apply = data => {
      if (Array.isArray(data) && data.length > 0) {
        allVisits = data.slice();
        render();
        return true;
      }
      return false;
    };
    // Read the SQL snapshot directly. Retry a few times because the dashboard
    // API may still be bootstrapping when this directory first renders.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (window.EHSSQL?.ready) { try { await window.EHSSQL.ready; } catch(e) {} }
        if (window.EHSSQL && typeof window.EHSSQL.getVisitsFromServer === 'function') {
          const server = await window.EHSSQL.getVisitsFromServer();
          if (apply(server)) return;
        }
        if (Array.isArray(window.EHS_SERVER_VISITS) && apply(window.EHS_SERVER_VISITS)) return;
      } catch(e) { console.error('Facility directory SQL load failed:', e); }
      await new Promise(r => setTimeout(r, 500));
    }
    // Last fallback: local browser cache, if an older installation still has it.
    try {
      const cached = JSON.parse(localStorage.getItem('ehsVisits') || '[]');
      if (apply(cached)) return;
    } catch(e) {}
    render();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ['facilityDirectorySearch','facilityDirectoryEmirate','facilityDirectoryType'].forEach(id=>{
      document.getElementById(id)?.addEventListener('input',()=>{page=1;render();});
      document.getElementById(id)?.addEventListener('change',()=>{page=1;render();});
    });
    document.getElementById('facilityDirectoryClear')?.addEventListener('click',()=>{
      ['facilityDirectorySearch','facilityDirectoryEmirate','facilityDirectoryType'].forEach(id=>{const x=document.getElementById(id);if(x)x.value='';});page=1;render();
    });
    // Refresh the facility cards immediately after SQL data arrives or a visit is saved.
    window.addEventListener('ehsVisitsLoaded', e => {
      if(Array.isArray(e.detail)){
        allVisits = e.detail.slice();
        render();
      }
    });
    window.addEventListener('storage', e => {
      if(e.key === 'ehsVisits'){
        try {
          const data = JSON.parse(e.newValue || '[]');
          if(Array.isArray(data)){ allVisits = data.slice(); render(); }
        } catch {}
      }
    });
    load();
  });
})();
