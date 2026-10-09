(function(){
  'use strict';
  const SESSION_KEY='ehsCurrentUser';
  const VISITS_KEY='ehsVisits';
  function current(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  function isAdmin(){return current()?.role==='admin'}
  function normalize(v){return String(v??'').trim().toLowerCase()}
  function readUsers(){ return []; }
  function saveUsers(){ throw new Error('المستخدمون تتم إدارتهم على الخادم فقط.'); }
  async function hash(text){
    const data=new TextEncoder().encode(String(text??''));
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function allVisits(){try{const v=JSON.parse(localStorage.getItem(VISITS_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function saveAllVisits(v){localStorage.setItem(VISITS_KEY,JSON.stringify(v))}
  function claimLegacyData(userId){
    const all=allVisits(); if(!all.length)return;
    const next=all.map(v=>v.ownerId?v:{...v,ownerId:userId}); saveAllVisits(next);
  }
  function filterVisits(list){ return current() && Array.isArray(list) ? list : []; }
  function stampVisit(v){ return {...v}; }
  function canEditVisit(v){
    const u=current(); if(!u||!v)return false;
    return u.role==='admin' || String(v.ownerId||'')===String(u.id||'');
  }
  function saveScopedVisits(list){
    if(!current()){location.replace('login.html');return}
    const incoming=Array.isArray(list)?list:[];
    const all=allVisits(); const byId=new Map(all.map(v=>[String(v.id),v]));
    incoming.forEach(v=>byId.set(String(v.id),v)); saveAllVisits([...byId.values()]);
  }
  async function logout(){
    try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});}catch{}
    sessionStorage.removeItem(SESSION_KEY); location.replace('login.html');
  }
  function guard(){
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(page==='login.html'||page==='register.html')return true;
    if(!current()){location.replace('login.html');return false}
    return true;
  }
  function setSession(u){sessionStorage.setItem(SESSION_KEY,JSON.stringify(u));}
  window.EHSAuth={SESSION_KEY,readUsers,saveUsers,current,isAdmin,hash,claimLegacyData,filterVisits,stampVisit,canEditVisit,saveScopedVisits,logout,guard,normalize,setSession};
  if(guard()) document.addEventListener('DOMContentLoaded',()=>{
    const u=current();
    const displayName=u?.name||u?.username||'المستخدم';
    document.querySelectorAll('[data-current-user]').forEach(el=>el.textContent=displayName);
    document.querySelectorAll('.header-actions').forEach(area=>{
      if(!area.querySelector('.current-user-badge')){
        const badge=document.createElement('div'); badge.className='current-user-badge';
        badge.innerHTML='<span class="current-user-avatar">👤</span><span><small>المستخدم الحالي</small><strong></strong></span>';
        badge.querySelector('strong').textContent=displayName+(u?.role==='admin'?' (مدير النظام)':''); area.insertBefore(badge,area.firstChild);
      }
    });
    document.querySelectorAll('.sidebar').forEach(sidebar=>{
      let link=sidebar.querySelector('.logout'); if(!link){link=document.createElement('a');link.className='logout';sidebar.appendChild(link)}
      link.href='login.html'; link.setAttribute('data-logout','1'); link.innerHTML='<span>⇥</span> تسجيل الخروج';
    });
    document.querySelectorAll('[data-logout]').forEach(el=>{if(!el.dataset.logoutBound){el.dataset.logoutBound='1';el.addEventListener('click',e=>{e.preventDefault();logout()})}});
    if(u?.role==='admin')document.body.classList.add('is-admin');
  });
})();
