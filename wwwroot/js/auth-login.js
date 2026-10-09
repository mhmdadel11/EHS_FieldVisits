document.addEventListener('DOMContentLoaded',()=>{
  if(EHSAuth.current()){location.replace('index.html');return;}
  const form=document.getElementById('loginForm'),err=document.getElementById('loginError');
  form.addEventListener('submit',async e=>{
    e.preventDefault(); err.textContent='';
    const username=document.getElementById('username').value.trim();
    const password=document.getElementById('password').value;
    try{
      const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({username,password})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.message||'اسم المستخدم أو كلمة المرور غير صحيحة.');
      EHSAuth.setSession(data); location.replace('index.html');
    }catch(ex){err.textContent=ex.message||'تعذر تسجيل الدخول.';}
  });
});
