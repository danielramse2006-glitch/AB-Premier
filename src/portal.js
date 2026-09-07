import { api, notice } from './supabase.js';
import { celebrate, unlockSound, closeCelebration } from './celebration.js';

const $ = id => document.getElementById(id);
const base = import.meta.env.BASE_URL;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let current = null;
let busy = false;
let successTimer = null;
const visitAudio = new Audio(`${base}assets/visit-registered.mp4`);
visitAudio.preload = 'auto';
let visitContext;
let visitBuffer;
let visitSource;

function msg(text, error = false) {
  $('lookupMessage').innerHTML = text ? `<div class="${error ? 'error' : 'ok'}">${text}</div>` : '';
}

function setPin(value) {
  $('code').value = value.replace(/\D/g, '').slice(0, 4);
  document.querySelectorAll('.pin-dots span').forEach((dot, index) => dot.classList.toggle('filled', index < $('code').value.length));
}

function resetKiosk() {
  clearTimeout(successTimer);
  current = null;
  busy = false;
  msg('');
  setPin('');
  $('clientArea').classList.add('hidden');
  $('nipStep').classList.remove('hidden');
  $('code').focus();
}

function showClient(client) {
  current = client;
  const n = client.visits;
  $('clientCard').innerHTML = `<div class="kiosk-client"><img class="kiosk-avatar" alt="Socio AB Premier" src="${esc(client.photo_url || 'assets/logo-ab-premiere.png')}"><div><h2>${esc(client.full_name)}</h2>${client.premium ? '<span class="premium">Cliente Premium</span>' : ''}<p>Visita actual: <b>${n}</b></p>${client.next_prize ? `<p>Proximo beneficio: <b>${esc(client.next_prize)}</b></p>` : '<p>Todos tus beneficios estan desbloqueados.</p>'}${client.one_away ? '<p class="kiosk-alert">Te falta un corte para ganar tu proximo beneficio.</p>' : ''}${client.birthday_month ? '<p class="kiosk-alert">Feliz mes de cumpleanos.</p>' : ''}</div></div>`;
  $('nipStep').classList.add('hidden');
  $('clientArea').classList.remove('hidden');
}

function playVisitSound() {
  if (visitContext && visitBuffer && visitContext.state === 'running') {
    visitSource?.stop();
    visitSource = visitContext.createBufferSource();
    visitSource.buffer = visitBuffer;
    visitSource.connect(visitContext.destination);
    visitSource.start();
    return;
  }
  visitAudio.currentTime = 0;
  visitAudio.play().catch(() => {});
}

function unlockVisitSound() {
  try {
    visitContext ??= new (window.AudioContext || window.webkitAudioContext)();
    visitContext.resume().catch(() => {});
    if (!visitBuffer) {
      fetch(`${base}assets/visit-registered.mp4`)
        .then(r => r.arrayBuffer())
        .then(b => visitContext.decodeAudioData(b))
        .then(b => { visitBuffer = b; })
        .catch(() => {});
    }
  } catch {}
}

function showSuccess(data) {
  msg('');
  const nextText = data.next_prize
    ? `<p>Te faltan <b>${data.remaining_to_next}</b> cortes para desbloquear: <b>${esc(data.next_prize)}</b></p>`
    : '<p>Ya completaste todos los beneficios de Familia AB.</p>';
  $('clientCard').innerHTML = `<div class="visit-success"><p class="success-overline">Visita registrada</p><h2>Bienvenido, ${esc(current.full_name)}</h2><p class="success-number">Visita #${data.visit_number}</p>${nextText}<p>Gracias por ser parte de AB Premiere.</p><small>La pantalla volvera al inicio en 5 segundos.</small></div>`;
  playVisitSound();
  successTimer = setTimeout(resetKiosk, 5000);
}

async function lookupClient() {
  if (busy) return;
  const code = $('code').value;
  if (code.length !== 4) return msg('Ingresa tu NIP de 4 digitos.', true);
  busy = true;
  msg('Consultando...');
  try {
    const d = await api('lookup', { code });
    showClient(d.client);
    msg('');
  } catch (e) {
    msg(esc(e.message), true);
  } finally {
    busy = false;
  }
}

async function registerVisit() {
  if (!current || busy) return;
  if (!$('barber').value || !$('service').value) return msg('Selecciona barbero y servicio.', true);
  unlockSound();
  unlockVisitSound();
  busy = true;
  const button = $('registerVisitButton');
  button.disabled = true;
  button.textContent = 'Registrando...';
  try {
    const d = await api('visit', { code: current.code, barber_id: $('barber').value, service_id: $('service').value });
    if (d.courtesy_won && d.prize_name) {
      msg(`Te ganaste <b>${esc(d.prize_name)}</b> en tu visita #${d.visit_number}.`);
      celebrate(d.prize_name, d.visit_number);
      resetKiosk();
    } else {
      const next = await api('lookup', { code: current.code });
      showSuccess({ ...d, next_prize: next.client.next_prize, remaining_to_next: Math.max(0, (next.client.next_courtesy || d.visit_number) - d.visit_number) });
    }
  } catch (e) {
    msg(esc(e.message), true);
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = 'Registrar visita';
  }
}

async function loadCatalogs() {
  const d = await api('catalogs');
  for (const [id, rows] of [['barber', d.barbers], ['service', d.services]]) {
    $(id).innerHTML = '<option value="">Selecciona...</option>' + rows.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  }
}

async function init() {
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
    if (document.activeElement?.tagName === 'SELECT') return;
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

Object.assign(window, { registerVisit, resetKiosk });
window.addEventListener('pagehide', () => { closeCelebration(); clearTimeout(successTimer); visitSource?.stop(); visitAudio.pause(); });
window.addEventListener('unhandledrejection', e => { e.preventDefault(); notice(e.reason?.message || 'No se pudo completar la operacion.'); });
init();
