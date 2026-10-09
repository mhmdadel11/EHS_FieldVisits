/* V54: authoritative facility visit counter.
   This script intentionally runs AFTER facilities-directory.js and directly
   updates the existing cards. It uses the SQL Server visit list and does not
   depend on the old card renderer's state. */
(function(){
  'use strict';

  const norm = v => String(v ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/ـ/g, '').replace(/[–—−]/g, '-')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();

  const compact = v => norm(v).replace(/[^\u0600-\u06FFa-z0-9]+/gi, '');

  function variants(v){
    const n=norm(v);
    const noEm=n.replace(/\s*[-،,\/]?\s*(ابوظبي|دبي|الشارقه|الشارقة|عجمان|ام القيوين|راس الخيمه|الفجيره)\s*$/,'').trim();
    return [n,noEm,compact(n),compact(noEm)].filter(Boolean);
  }

  function matches(visit, facility){
    const names=[visit?.facility,visit?.Facility,visit?.facilityName,visit?.FacilityName].filter(Boolean);
    const targets=[facility?.name,facility?.englishName].filter(Boolean);
    for(const a0 of names){
      for(const b0 of targets){
        for(const a of variants(a0)) for(const b of variants(b0)){
          if(a===b) return true;
          if(a.length>=8 && b.length>=8 && (a.includes(b)||b.includes(a))) return true;
        }
      }
    }
    return false;
  }

  async function loadVisits(){
    try{
      if(window.EHSSQL?.ready){ try{ await window.EHSSQL.ready; }catch{} }
      if(window.EHSSQL?.getVisitsFromServer){
        const x=await window.EHSSQL.getVisitsFromServer();
        if(Array.isArray(x) && x.length) return x;
      }
    }catch(e){ console.warn('V54 SQL facility counter:',e); }
    try{
      const x=JSON.parse(localStorage.getItem('ehsVisits')||'[]');
      return Array.isArray(x)?x:[];
    }catch{return []}
  }

  function updateCards(visits){
    const facilities=Array.isArray(window.EHS_FACILITIES)?window.EHS_FACILITIES:[];
    document.querySelectorAll('#facilityDirectoryGrid .facility-card').forEach(card=>{
      const title=card.querySelector('h3');
      const spans=card.querySelectorAll('.facility-meta span');
      if(!title || spans.length<2) return;
      const facility=facilities.find(f=>norm(f.name)===norm(title.textContent));
      const f=facility || {name:title.textContent};
      const count=visits.filter(v=>matches(v,f)).length;
      spans[1].textContent=count===0?'لم تتم زيارتها بعد':count===1?'تمت زيارتها مرة':count===2?'تمت زيارتها مرتين':`تمت زيارتها ${count} مرات`;
      spans[1].style.color=count?'#18864b':'#e0524d';
      spans[1].style.fontWeight='700';
      card.dataset.visitCount=String(count);
    });
  }

  async function refresh(){
    const visits=await loadVisits();
    updateCards(visits);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    // Run after the directory has rendered, then repeat after SQL/event refreshes.
    refresh();
    setTimeout(refresh,300);
    setTimeout(refresh,1000);
    setTimeout(refresh,2000);
    window.addEventListener('ehsVisitsLoaded',()=>refresh());
    window.addEventListener('storage',e=>{if(e.key==='ehsVisits')refresh();});
  });
})();
