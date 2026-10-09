/* EHS SQL Server API bridge - SQL Server is the source of truth. */
(function(){
  'use strict';

  async function readJson(response){
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if(!response.ok){
      const detail = data?.detail || data?.message || text || `HTTP ${response.status}`;
      throw new Error(detail);
    }
    return data;
  }

  async function getVisitCountFromServer(){
    const response = await fetch('/api/visits/count-raw?ts='+Date.now(), {
      cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}
    });
    const data = await readJson(response);
    return Number(data?.count || 0);
  }

  async function getVisitsFromServer(){
    let response = await fetch('/api/visits/raw?ts='+Date.now(), {
      cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}
    });
    if(response.ok) return await readJson(response);

    // Fallback to the normal EF endpoint. This keeps the dashboard working
    // even if the direct SQL reader is unavailable on an older deployment.
    const rawError = await response.text().catch(()=> '');
    console.warn('EHS raw visits endpoint failed; trying normal endpoint.', rawError);
    response = await fetch('/api/visits?ts='+Date.now(), {
      cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}
    });
    return await readJson(response);
  }


  async function getCurrentUserFromServer(){
    const response = await fetch('/api/auth/me?ts='+Date.now(), {cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}});
    return await readJson(response);
  }

  async function getDiagnostics(){
    const response = await fetch('/api/visits/diagnostics?ts='+Date.now(), {
      cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}
    });
    return await readJson(response);
  }

  async function syncVisitsFromServer(){
    const data = await getVisitsFromServer();
    if(Array.isArray(data)){
      // Never destroy the browser's existing visit cache when SQL returns an
      // empty list. This is important for older installations where visits
      // were previously stored in localStorage and have not yet been migrated.
      if(data.length > 0){
        window.EHS_SERVER_VISITS = data.slice();
        try { localStorage.setItem('ehsVisits', JSON.stringify(data)); } catch {}
        window.dispatchEvent(new CustomEvent('ehsVisitsLoaded', {detail:data}));
      } else {
        let cached = [];
        try { cached = JSON.parse(localStorage.getItem('ehsVisits') || '[]'); } catch {}
        if(Array.isArray(cached) && cached.length){
          window.EHS_SERVER_VISITS = cached.slice();
          window.dispatchEvent(new CustomEvent('ehsVisitsLoaded', {detail:cached}));
        } else {
          window.EHS_SERVER_VISITS = [];
          window.dispatchEvent(new CustomEvent('ehsVisitsLoaded', {detail:[]}));
        }
      }
    }
    return data;
  }

  async function saveVisitToServer(visit, imageFiles, actionEvidenceFile){
    const fd = new FormData();
    // Do NOT send a browser-generated id for a new visit. SQL Server must generate it.
    if(visit?.id != null && /^\d+$/.test(String(visit.id)) && Number(visit.id) <= 2147483647){
      fd.append('Id', String(visit.id));
    }

    const fields = {
      Facility:visit?.facility || '', Emirate:visit?.emirate || '', Date:visit?.date || '',
      Team:visit?.team || '', Responsible:visit?.responsible || '', JobTitle:visit?.jobTitle || '',
      EmployeeName:visit?.employeeName || visit?.contactEmployee || '',
      EmployeeJobTitle:visit?.employeeJobTitle || visit?.contactJobTitle || '',
      EmployeeEmail:visit?.employeeEmail || visit?.contactEmail || '',
      EmployeePhone:visit?.employeePhone || visit?.contactPhone || '',
      ResponsibleEmail:visit?.responsibleEmail || '', ResponsiblePhone:visit?.responsiblePhone || '',
      Category:visit?.category || '', Priority:visit?.priority || '', Status:visit?.status || '',
      Compliance:String(Math.max(0,Math.min(100,Number(visit?.compliance)||0))),
      Notes:visit?.notes || '', Action:visit?.action || '', TakenAction:visit?.takenAction || '',
      // Owner fields are intentionally omitted: the ASP.NET server assigns ownership from the authenticated cookie.
    };
    Object.entries(fields).forEach(([key,value])=>fd.append(key,String(value ?? '')));

    (imageFiles || []).forEach(file=>{ if(file && file.size) fd.append('Images', file, file.name); });
    if(actionEvidenceFile && actionEvidenceFile.size) fd.append('ActionEvidence', actionEvidenceFile, actionEvidenceFile.name);

    const response = await fetch('/api/visits', {method:'POST', body:fd, credentials:'same-origin', cache:'no-store'});
    return await readJson(response);
  }

  async function deleteVisitFromServer(id){
    const response = await fetch('/api/visits/'+encodeURIComponent(id), {
      method:'DELETE', credentials:'same-origin', cache:'no-store'
    });
    return await readJson(response);
  }

  window.EHSSQL = {
    getVisitsFromServer,
    getDiagnostics,
    getCurrentUserFromServer,
    getVisitCountFromServer,
    syncVisitsFromServer,
    saveVisitToServer,
    deleteVisitFromServer,
    ready: Promise.resolve()
  };

  // Load SQL data once when every page starts. Pages can await EHSSQL.ready.
  window.EHSSQL.ready = syncVisitsFromServer().catch(error=>{
    console.error('SQL Server load failed:', error);
    window.dispatchEvent(new CustomEvent('ehsSqlError', {detail:error}));
    throw error;
  });
})();

// V53 cache-busted facility visit count integration.
