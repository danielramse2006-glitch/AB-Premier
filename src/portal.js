import { api, notice, formatMatamorosDateTime, formatMatamorosTime } from './supabase.js';
import { celebrate, unlockSound, closeCelebration } from './celebration.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let current = null, photo = '', stream = null, busy = false, successTimer = null;

function msg(id, text, error = false) {
  $(id).innerHTML = text ? `<div class="${error ? 'error' : 'ok'}">${text}</div>` : '';
}

function setPin(value) {
  $('code').value = value.replace(/\D/g, '').slice(0, 4);
  document.querySelectorAll('.pin-dots span').forEach((dot, index) => dot.classList.toggle('filled', index < $('code').value.length));
}

function tickClock() {
  $('matamorosClock').textContent = `Hora Matamoros ${formatMatamorosTime(new Date())}`;
}

function resetKiosk() {
  clearTimeout(successTimer);
  current = null;
  busy = false;
  msg('lookupMessage', '');
  setPin('');
  $('clientArea').classList.add('hidden');
  $('nipStep').classList.remove('hidden');
  $('code').focus();
}

function showKioskMode(mode) {
  stopCamera();
  msg('lookupMessage', '');
  msg('registerMessage', '');
  $('visitModeButton').classList.toggle('active', mode === 'visit');
  $('registerModeButton').classList.toggle('active', mode === 'register');
  $('visitStep').classList.toggle('hidden', mode !== 'visit');
  $('registerStep').classList.toggle('hidden', mode !== 'register');
  if (mode === 'visit') resetKiosk();
}

function showClient(client) {
  current = client;
  const n = client.visits;
  $('clientCard').innerHTML = `<div class="kiosk-client"><img class="kiosk-avatar" alt="Socio AB Premier" src="${esc(client.photo_url || 'assets/logo-ab-premiere.png')}"><div><h2>${esc(client.full_name)}</h2>${client.premium ? '<span class="premium">Cliente Premium</span>' : ''}<p>Visitas acumuladas: <b>${n}</b></p><p>Ultima visita: <b>${esc(formatMatamorosDateTime(client.last_visit) || 'Sin visitas')}</b></p>${client.next_prize ? `<p>Proximo beneficio: <b>${esc(client.next_prize)}</b></p>` : '<p>Todos tus beneficios estan desbloqueados.</p>'}${client.one_away ? '<p class="kiosk-alert">Te falta un corte para ganar tu proximo beneficio.</p>' : ''}${client.birthday_month ? '<p class="kiosk-alert">Feliz mes de cumpleanos.</p>' : ''}</div></div>`;
  $('nipStep').classList.add('hidden');
  $('clientArea').classList.remove('hidden');
}

function showSuccess(data) {
  msg('lookupMessage', '');
  const nextText = data.next_prize
    ? `<p>Te faltan <b>${data.remaining_to_next}</b> cortes para desbloquear: <b>${esc(data.next_prize)}</b></p>`
    : '<p>Ya completaste todos los beneficios de Familia AB.</p>';
  $('clientCard').innerHTML = `<div class="visit-success"><p class="success-overline">Visita registrada</p><h2>Bienvenido, ${esc(current.full_name)}</h2><p class="success-number">Visita #${data.visit_number}</p><p>${esc(formatMatamorosDateTime(data.registered_at || new Date()))}</p>${nextText}<p>Gracias por ser parte de AB Premiere.</p><button type="button" onclick="resetKiosk()">Registrar otra visita</button><small>La pantalla volvera al inicio en 10 segundos.</small></div>`;
  successTimer = setTimeout(resetKiosk, 10000);
}

async function lookupClient() {
  if (busy) return;
  const code = $('code').value;
  if (code.length !== 4) return msg('lookupMessage', 'Ingresa tu NIP de 4 digitos.', true);
  busy = true;
  msg('lookupMessage', 'Consultando...');
  try {
    const d = await api('lookup', { code });
    showClient(d.client);
    msg('lookupMessage', '');
  } catch (e) {
    msg('lookupMessage', esc(e.message), true);
  } finally {
    busy = false;
  }
}

async function registerVisit() {
  if (!current || busy) return;
  if (!$('barber').value || !$('service').value) return msg('lookupMessage', 'Selecciona barbero y servicio.', true);
  unlockSound();
  busy = true;
  const button = $('registerVisitButton');
  button.disabled = true;
  button.textContent = 'Registrando...';
  try {
    const d = await api('visit', { code: current.code, barber_id: $('barber').value, service_id: $('service').value });
    if (d.courtesy_won && d.prize_name) {
      msg('lookupMessage', `Te ganaste <b>${esc(d.prize_name)}</b> en tu visita #${d.visit_number}.`);
      celebrate(d.prize_name, d.visit_number);
      resetKiosk();
    } else {
      const next = await api('lookup', { code: current.code });
      showSuccess({ ...d, registered_at: new Date(), next_prize: next.client.next_prize, remaining_to_next: Math.max(0, (next.client.next_courtesy || d.visit_number) - d.visit_number) });
    }
  } catch (e) {
    msg('lookupMessage', esc(e.message), true);
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = 'Registrar visita';
  }
}

async function startCamera() {
  try {
    if (stream) return;
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    $('video').srcObject = stream;
  } catch {
    msg('registerMessage', 'La camara no esta disponible; puedes continuar sin foto.', true);
  }
}

function stopCamera() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
}

function capture() {
  if (!stream) return msg('registerMessage', 'Primero enciende la camara.', true);
  const c = $('canvas'), v = $('video');
  if (!v.videoWidth) return;
  const scale = Math.min(1, 800 / v.videoWidth);
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  photo = c.toDataURL('image/jpeg', .8);
  msg('registerMessage', 'Foto capturada.');
}

$('registerForm').onsubmit = async e => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const d = await api('register', { full_name: $('fullName').value, birth_date: $('birthDate').value, phone: $('phone').value, photo });
    msg('registerMessage', `Socio creado: <b>${esc(d.name)}</b><br>NIP: <b style="font-size:34px">${esc(d.code)}</b>${d.photoWarning ? '<br>' + esc(d.photoWarning) : ''}`);
    e.target.reset();
    photo = '';
    stopCamera();
  } catch (e) {
    msg('registerMessage', esc(e.message), true);
  } finally {
    button.disabled = false;
  }
};

async function loadCatalogs() {
  const d = await api('catalogs');
  for (const [id, rows] of [['barber', d.barbers], ['service', d.services]]) {
    $(id).innerHTML = '<option value="">Selecciona...</option>' + rows.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  }
}

async function init() {
  tickClock();
  setInterval(tickClock, 1000);
  document.querySelectorAll('[data-key]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.key;
    if (key === 'back') setPin($('code').value.slice(0, -1));
    else setPin($('code').value + key);
  }));
  $('code').addEventListener('input', () => setPin($('code').value));
  $('lookupForm').addEventListener('submit', e => {
    e.preventDefault();
    lookupClient();
  });
  document.addEventListener('keydown', e => {
    if (!$('registerStep').classList.contains('hidden') || document.activeElement?.tagName === 'SELECT') return;
    if (document.activeElement?.tagName === 'INPUT' && document.activeElement.id !== 'code') return;
    if (/^\d$/.test(e.key)) setPin($('code').value + e.key);
    if (e.key === 'Backspace') setPin($('code').value.slice(0, -1));
    if (e.key === 'Enter' && !current) lookupClient();
  });
  try {
    await api('admin_session');
    await api('rewards');
    await loadCatalogs();
    $('connection').textContent = '';
    $('connection').classList.add('hidden');
    resetKiosk();
  } catch (e) {
    $('connection').innerHTML = `${esc(/Acci.n desconocida/.test(e.message) ? 'Falta activar los premios por cortes en Supabase.' : e.message)} <a href="admin.html?return=portal">Abrir administracion</a>`;
  }
}

Object.assign(window, { registerVisit, resetKiosk, showKioskMode, startCamera, capture });
window.addEventListener('pagehide', () => { closeCelebration(); clearTimeout(successTimer); stopCamera(); });
window.addEventListener('unhandledrejection', e => { e.preventDefault(); notice(e.reason?.message || 'No se pudo completar la operacion.'); });
init();
