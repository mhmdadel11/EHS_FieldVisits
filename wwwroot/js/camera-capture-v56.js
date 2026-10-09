/* V56: direct camera capture for visit photos. Uses getUserMedia so the user can take several photos in one visit. */
(function(){
  'use strict';
  let stream = null;
  let cameraFiles = [];
  let video, modal, status, count;

  const $ = id => document.getElementById(id);

  function allFiles(){
    const input = $('images');
    return input ? Array.from(input.files || []) : [];
  }

  function syncInput(){
    renderPreview();
  }

  function renderPreview(){
    const box = $('imagePreview');
    if(!box) return;
    box.innerHTML = '';
    const files = allFiles();
    files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      const img = document.createElement('img');
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      img.alt = file.name || 'صورة الزيارة';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'preview-remove';
      remove.title = 'حذف الصورة';
      remove.textContent = '×';
      remove.addEventListener('click', () => removeFile(index));
      const name = document.createElement('span');
      name.className = 'preview-name';
      name.textContent = file.name || 'صورة';
      item.append(img, remove, name);
      box.appendChild(item);
    });
  }

  function removeFile(index){
    const input = $('images');
    if(!input || !window.DataTransfer) return;
    const files = Array.from(input.files || []);
    const removed = files[index];
    if(!removed) return;
    files.splice(index,1);
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    input.files = dt.files;
    if(String(removed.name || '').startsWith('visit-camera-')) cameraFiles = Math.max(0, cameraFiles - 1);
    renderPreview();
    updateCount();
  }

  function closeCamera(){
    if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    modal?.classList.remove('open');
    if(video) video.srcObject = null;
    status?.classList.remove('show');
  }

  async function openCamera(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      alert('الكاميرا المباشرة غير مدعومة في هذا المتصفح. استخدم «اختيار صور» بدلًا منها.');
      return;
    }
    modal.classList.add('open');
    status.textContent = 'جاري فتح الكاميرا… اسمح للمتصفح بالوصول إلى الكاميرا.';
    status.classList.add('show');
    try{
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
      video.srcObject = stream;
      await video.play();
      status.classList.remove('show');
      updateCount();
    }catch(err){
      console.error('Camera permission/error:', err);
      status.textContent = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        ? 'تم رفض صلاحية الكاميرا. اسمح للمتصفح باستخدام الكاميرا ثم جرّب مرة أخرى.'
        : 'تعذر فتح الكاميرا. تأكد من أن الصفحة تعمل عبر HTTPS وأن الكاميرا غير مستخدمة بواسطة تطبيق آخر.';
      status.classList.add('show');
    }
  }

  function updateCount(){
    if(count) count.textContent = `تم التقاط ${cameraFiles.length} صورة — يمكنك التقاط صور إضافية.`;
  }

  function capture(){
    if(!stream || !video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    const maxW = 1600;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d', {alpha:false});
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
      if(!blob) return;
      const stamp = new Date().toISOString().replace(/[:.]/g,'-');
      const file = new File([blob], `visit-camera-${stamp}.jpg`, {type:'image/jpeg',lastModified:Date.now()});
      const input = $('images');
      if(input && window.DataTransfer){
        const dt = new DataTransfer();
        Array.from(input.files || []).forEach(f=>dt.items.add(f));
        dt.items.add(file);
        input.files = dt.files;
        cameraFiles += 1;
        renderPreview();
        updateCount();
      }
    }, 'image/jpeg', .82);
  }

  function buildModal(){
    modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-dialog" role="dialog" aria-modal="true" aria-label="تصوير بالكاميرا">
        <div class="camera-head"><strong>📷 تصوير صور الزيارة</strong><button type="button" class="camera-close" aria-label="إغلاق">×</button></div>
        <div class="camera-stage"><video playsinline autoplay muted></video><div class="camera-status"></div></div>
        <div class="camera-count"></div>
        <div class="camera-controls"><button type="button" class="capture-btn" aria-label="التقاط صورة">●</button><button type="button" class="camera-done">تم</button></div>
      </div>`;
    document.body.appendChild(modal);
    video = modal.querySelector('video');
    status = modal.querySelector('.camera-status');
    count = modal.querySelector('.camera-count');
    modal.querySelector('.camera-close').addEventListener('click',closeCamera);
    modal.querySelector('.camera-done').addEventListener('click',closeCamera);
    modal.querySelector('.capture-btn').addEventListener('click',capture);
    modal.addEventListener('click',e=>{ if(e.target===modal) closeCamera(); });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const input = $('images');
    const openBtn = $('openCameraBtn');
    if(!input || !openBtn) return;
    cameraFiles = [];
    buildModal();
    openBtn.addEventListener('click',openCamera);
    input.addEventListener('change',()=>renderPreview());
    renderPreview();
    window.addEventListener('pagehide',closeCamera);
  });
})();
