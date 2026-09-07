import { api, notice } from './supabase.js';
import { celebrate, unlockSound, closeCelebration } from './celebration.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current=null,photo='',stream=null,busy=false;
function msg(id,text,error=false){$(id).innerHTML=`<div class="message ${error?'error':''}" role="status">${text}</div>`;}
function tab(id){document.querySelectorAll('.panel,.tabs .btn').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');$('tab'+id[0].toUpperCase()+id.slice(1)).classList.add('active');if(id!=='register')stopCamera();}
async function loadCatalogs(){const d=await api('catalogs');for(const [id,rows] of [['barber',d.barbers],['service',d.services]])$(id).innerHTML='<option value="">Selecciona…</option>'+rows.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');}
$('lookupForm').onsubmit=async e=>{
 e.preventDefault();current=null;$('clientArea').classList.add('hidden');
 try{const d=await api('lookup',{code:$('code').value});current=d.client;const n=current.visits;
 $('clientCard').innerHTML=`<div class="client-result"><img class="avatar" alt="Socio AB Premier" src="${esc(current.photo_url||'assets/logo-ab-premiere.png')}"><div><h2>${esc(current.full_name)}</h2>${current.premium?'<span class="premium">★ Cliente Premium</span>':''}<p>Código: <b>${esc(current.code)}</b> · Último corte: ${esc(current.last_visit?.slice(0,10)||'Sin cortes')}</p><div class="stats"><div class="stat"><b>${n}</b>Cortes acumulados</div><div class="stat"><b>${current.next_courtesy??'★'}</b>${current.next_courtesy?'Próximo premio':'Nivel Premium'}</div></div>${current.next_prize?`<p>Tu próximo premio: <b>${esc(current.next_prize)}</b></p>`:'<p>¡Completaste todos los premios de Familia AB!</p>'}${current.one_away?'<div class="message">🎁 ¡Te falta un corte para ganar tu próximo premio!</div>':''}${current.birthday_month?'<div class="message">🎂 ¡Feliz mes de cumpleaños!</div>':''}</div></div>`;
 $('lookupMessage').textContent='';$('clientArea').classList.remove('hidden');
 }catch(e){msg('lookupMessage',esc(e.message),true);}
};
async function registerVisit(){
 if(!current||busy)return;
 if(!$('barber').value||!$('service').value)return msg('lookupMessage','Selecciona un barbero y un servicio.',true);
 unlockSound();busy=true;const button=$('registerVisitButton');button.disabled=true;button.textContent='Registrando corte…';
 try{const d=await api('visit',{code:current.code,barber_id:$('barber').value,service_id:$('service').value});
  msg('lookupMessage',d.courtesy_won?`🎉 ¡Te ganaste <b>${esc(d.prize_name)}</b> en tu corte ${d.visit_number}!`:`Corte registrado. Ya llevas <b>${d.visit_number} cortes</b>.`);
  if(d.courtesy_won&&d.prize_name)celebrate(d.prize_name,d.visit_number);
  current=null;$('clientArea').classList.add('hidden');$('lookupForm').reset();
 }catch(e){msg('lookupMessage',esc(e.message),true);}finally{busy=false;button.disabled=false;button.textContent='Registrar corte';}
}
async function startCamera(){try{if(stream)return;stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});$('video').srcObject=stream;}catch{msg('registerMessage','La cámara no está disponible; puedes continuar sin foto.',true);}}
function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=null;}
function capture(){if(!stream)return;const c=$('canvas'),v=$('video');if(!v.videoWidth)return;const scale=Math.min(1,800/v.videoWidth);c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);c.getContext('2d').drawImage(v,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.8);msg('registerMessage','Fotografía capturada.');}
$('registerForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const d=await api('register',{full_name:$('fullName').value,birth_date:$('birthDate').value,phone:$('phone').value,photo});msg('registerMessage',`Socio creado. Código: <b>${esc(d.code)}</b>${d.photoWarning?'<br>'+esc(d.photoWarning):''}`);e.target.reset();photo='';stopCamera();}catch(e){msg('registerMessage',esc(e.message),true);}finally{button.disabled=false;}};
async function init(){try{await api('admin_session');await api('rewards');await loadCatalogs();$('portalContent').classList.remove('hidden');$('connection').innerHTML='Sesión de atención activa. <a href="admin.html">Abrir administración</a>';}catch(e){$('connection').textContent=e.message.includes('Acción desconocida')?'Falta activar los premios por cortes en Supabase. Ejecuta la actualización de premios.':e.message;const a=document.createElement('a');a.href='admin.html?return=portal';a.className='btn';a.textContent='Iniciar sesión';$('connection').append(document.createElement('br'),a);}}
Object.assign(window,{tab,startCamera,capture,registerVisit});
window.addEventListener('pagehide',()=>{stopCamera();closeCelebration();});
window.addEventListener('unhandledrejection',e=>{e.preventDefault();notice(e.reason?.message||'No se pudo completar la operación.');});
init();
