/* V57: mobile camera + browser camera capture for visit photos. */
(function(){
  'use strict';
  let stream=null, cameraFiles=0, video, modal, status, count;
  const $=id=>document.getElementById(id);
  function inputFiles(){ const i=$('images'); return i?Array.from(i.files||[]):[]; }
  function renderPreview(){
    const box=$('imagePreview'); if(!box) return;
    const total=inputFiles().length;
    box.innerHTML=total
      ? `<div class="selected-images-count">📷 تم اختيار ${total} ${total===1?'صورة':'صور'} للزيارة</div>`
      : '';
  }
  function setFiles(files){
    const input=$('images'); if(!input||!window.DataTransfer) return;
    const dt=new DataTransfer(); inputFiles().forEach(f=>dt.items.add(f)); Array.from(files||[]).forEach(f=>dt.items.add(f)); input.files=dt.files; renderPreview();
  }
  function removeFile(index){ const files=inputFiles(); if(!files[index]||!window.DataTransfer)return; files.splice(index,1); const dt=new DataTransfer(); files.forEach(f=>dt.items.add(f)); $('images').files=dt.files; renderPreview(); }
  function closeCamera(){ if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;} if(modal)modal.classList.remove('open'); if(video)video.srcObject=null; }
  async function openCamera(){
    if(!navigator.mediaDevices?.getUserMedia){ alert('استخدم زر «📱 كاميرا الموبايل» لفتح كاميرا الهاتف مباشرة.'); return; }
    modal.classList.add('open'); status.textContent='جاري فتح الكاميرا… اسمح بالوصول إلى الكاميرا.'; status.classList.add('show');
    try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}); video.srcObject=stream; await video.play(); status.classList.remove('show'); updateCount(); }
    catch(e){ console.error(e); status.textContent=e?.name==='NotAllowedError'?'تم رفض صلاحية الكاميرا. اسمح للمتصفح باستخدام الكاميرا.':'تعذر فتح الكاميرا. على الهاتف تأكد أن الموقع يعمل عبر HTTPS.'; status.classList.add('show'); }
  }
  function updateCount(){ if(count)count.textContent=`تم التقاط ${cameraFiles} صورة — يمكنك التقاط صور إضافية.`; }
  function capture(){
    if(!stream||!video||video.readyState<2)return; const c=document.createElement('canvas'); const maxW=1600; const scale=Math.min(1,maxW/video.videoWidth); c.width=Math.max(1,Math.round(video.videoWidth*scale)); c.height=Math.max(1,Math.round(video.videoHeight*scale)); c.getContext('2d').drawImage(video,0,0,c.width,c.height);
    c.toBlob(blob=>{ if(!blob)return; const f=new File([blob],`visit-camera-${Date.now()}.jpg`,{type:'image/jpeg',lastModified:Date.now()}); setFiles([f]); cameraFiles++; updateCount(); },'image/jpeg',.82);
  }
  function buildModal(){
    modal=document.createElement('div'); modal.className='camera-modal'; modal.innerHTML='<div class="camera-dialog" role="dialog" aria-modal="true"><div class="camera-head"><strong>📷 تصوير صور الزيارة</strong><button type="button" class="camera-close">×</button></div><div class="camera-stage"><video playsinline autoplay muted></video><div class="camera-status"></div></div><div class="camera-count"></div><div class="camera-controls"><button type="button" class="capture-btn">●</button><button type="button" class="camera-done">تم</button></div></div>'; document.body.appendChild(modal);
    video=modal.querySelector('video'); status=modal.querySelector('.camera-status'); count=modal.querySelector('.camera-count'); modal.querySelector('.camera-close').onclick=closeCamera; modal.querySelector('.camera-done').onclick=closeCamera; modal.querySelector('.capture-btn').onclick=capture;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const images=$('images'), cam=$('openCameraBtn'), mobile=$('cameraInput'); if(!images)return;
    buildModal();
    cam?.addEventListener('click',openCamera);
    mobile?.addEventListener('change',()=>{ setFiles(mobile.files); mobile.value=''; });
    images.addEventListener('change',renderPreview); renderPreview(); window.addEventListener('pagehide',closeCamera);
  });
})();
