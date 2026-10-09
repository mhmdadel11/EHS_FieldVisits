document.addEventListener('DOMContentLoaded',()=>{
  if(EHSAuth.current()){location.replace('index.html');return;}
  const form=document.getElementById('registerForm'),err=document.getElementById('registerError');
  form.addEventListener('submit',async e=>{
    e.preventDefault();err.textContent='';
    const name=document.getElementById('fullName').value.trim();
    const username=document.getElementById('username').value.trim();
    const password=document.getElementById('password').value;
    const confirm=document.getElementById('confirmPassword').value;
    if(!name||!username||!password){err.textContent='من فضلك أكمل جميع البيانات.';return}
    if(password.length<12){err.textContent='كلمة المرور يجب ألا تقل عن 12 حرفًا.';return}
    if(password!==confirm){err.textContent='تأكيد كلمة المرور غير مطابق.';return}
    try{
      const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({name,username,password})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.message||'تعذر إنشاء الحساب.');
      EHSAuth.setSession(data); location.replace('index.html');
    }catch(ex){err.textContent=ex.message||'تعذر إنشاء الحساب.';}
  });
});
