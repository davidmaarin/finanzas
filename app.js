'use strict';

/* =====================================================================
   Utilidades
   ===================================================================== */
/* COMPATIBILIDAD DE DATOS — los datos del usuario viven solo en su iPhone:
   - No cambiar nunca STORE_KEY ni borrar/renombrar campos existentes; solo añadir campos con valor por defecto.
   - Cualquier cambio de formato se migra en normalize() y sube SCHEMA (load() guarda antes una copia del original). */
const STORE_KEY = 'finanzas.v1';
const SCHEMA = 2;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round2 = n => Math.round(n * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function parseNum(s) {
  s = String(s ?? '').trim().replace(/[\s€$£]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? round2(n) : 0;
}
const toInput = n => (n ? String(round2(n)).replace('.', ',') : '');

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const curMonth = () => todayISO().slice(0, 7);
const dateOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const monthName = ym => MONTHS[+ym.slice(5, 7) - 1];
const monthLabel = ym => `${cap(monthName(ym))} ${ym.slice(0, 4)}`;
const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
function dayLabel(iso) {
  if (iso === todayISO()) return 'Hoy';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (iso === isoOf(y)) return 'Ayer';
  const d = dateOf(iso);
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return cap(d.toLocaleDateString('es-ES', opts));
}
const shortDate = iso => dateOf(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

const NF2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const NF0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
// Modo discreto: oculta las cantidades en toda la app (se recuerda entre aperturas)
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } };
let privacy = lsGet('finanzas.private') === '1';
function money(n, { sign = false, short = false } = {}) {
  if (privacy) return S.currency === '€' ? '•••• €' : `${S.currency}••••`;
  const abs = Math.abs(n);
  const f = (short && abs >= 1000 ? NF0 : NF2).format(abs);
  const s = n < -0.004 ? '−' : sign && n > 0.004 ? '+' : '';
  return S.currency === '€' ? `${s}${f} €` : `${s}${S.currency}${f}`;
}
const kfmt = n => privacy ? '•••' : (n >= 1000 ?(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + 'k' : String(Math.round(n)));

/* =====================================================================
   Iconos
   ===================================================================== */
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  home: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
  pie: svg('<path d="M21 12.5A9 9 0 1 1 11.5 3v9.5z"/><path d="M15 3.4A9 9 0 0 1 20.6 9H15z"/>'),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.6"'),
  minus: svg('<path d="M5 12h14"/>', 'stroke-width="2.6"'),
  gear: svg('<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>'),
  left: svg('<path d="m15 18-6-6 6-6"/>'),
  right: svg('<path d="m9 18 6-6-6-6"/>'),
  back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  down: svg('<path d="M12 4v13M6 11l6 6 6-6M5 21h14"/>'),
  up: svg('<path d="M12 20V7M6 13l6-6 6 6M5 3h14"/>'),
  arrowUp: svg('<path d="M7 17 17 7M8 7h9v9"/>', 'stroke-width="2.4"'),
  arrowDown: svg('<path d="M17 7 7 17M16 17H7V8"/>', 'stroke-width="2.4"'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  del: svg('<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m17 9-6 6M11 9l6 6"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
};

/* =====================================================================
   Datos
   ===================================================================== */
const COLORS = ['#ff6b6b', '#ff8787', '#ffa94d', '#ffd43b', '#a9e34b', '#69db7c', '#38d9a9', '#63e6be', '#3bc9db', '#4dabf7', '#748ffc', '#9775fa', '#e599f7', '#f783ac', '#adb5bd'];
const DEFAULT_CATS = [
  ['super', 'Supermercado', '🛒', '#69db7c', 'expense'],
  ['comer', 'Comer fuera', '🍔', '#ffa94d', 'expense'],
  ['transp', 'Transporte', '🚗', '#4dabf7', 'expense'],
  ['casa', 'Casa', '🏠', '#9775fa', 'expense'],
  ['factu', 'Facturas', '💡', '#ffd43b', 'expense'],
  ['ocio', 'Ocio', '🎉', '#f783ac', 'expense'],
  ['compras', 'Compras', '🛍️', '#e599f7', 'expense'],
  ['salud', 'Salud', '💊', '#ff6b6b', 'expense'],
  ['subs', 'Suscripciones', '📺', '#748ffc', 'expense'],
  ['viajes', 'Viajes', '✈️', '#38d9a9', 'expense'],
  ['regalosg', 'Regalos', '🎁', '#ff8787', 'expense'],
  ['educ', 'Formación', '📚', '#3bc9db', 'expense'],
  ['otros-g', 'Otros', '📦', '#adb5bd', 'expense'],
  ['nomina', 'Nómina', '💼', '#38d9a9', 'income'],
  ['extra', 'Extras', '💻', '#63e6be', 'income'],
  ['regalo', 'Regalos', '🎁', '#ffa94d', 'income'],
  ['invers', 'Inversiones', '📈', '#a9e34b', 'income'],
  ['venta', 'Ventas', '🏷️', '#4dabf7', 'income'],
  ['otros-i', 'Otros', '💰', '#adb5bd', 'income'],
];
const PROTECTED = ['otros-g', 'otros-i'];
const DEFAULT_ACCOUNTS = [
  { id: 'banco', name: 'Cuenta principal', emoji: '🏦', color: '#748ffc', initial: 0 },
  { id: 'efectivo', name: 'Efectivo', emoji: '💵', color: '#69db7c', initial: 0 },
];

function fresh() {
  return {
    version: SCHEMA,
    currency: '€',
    quickStart: false,
    categories: DEFAULT_CATS.map(([id, name, emoji, color, type]) => ({ id, name, emoji, color, type, budget: 0 })),
    accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a })),
    lastAcc: 'banco',
    tx: [],
    recurring: [],
    goals: [],
  };
}
function normalize(d) {
  const f = fresh();
  const out = { ...f, ...d };
  out.categories = Array.isArray(d.categories) && d.categories.length ? d.categories : f.categories;
  for (const id of PROTECTED) if (!out.categories.some(c => c.id === id)) out.categories.push(f.categories.find(c => c.id === id));
  out.accounts = Array.isArray(d.accounts) && d.accounts.length ? d.accounts : f.accounts;
  out.tx = Array.isArray(d.tx) ? d.tx : [];
  out.recurring = Array.isArray(d.recurring) ? d.recurring : [];
  out.goals = Array.isArray(d.goals) ? d.goals : [];
  // Datos de la v1 (sin cuentas): todo va a la primera cuenta
  const ids = new Set(out.accounts.map(a => a.id));
  const first = out.accounts[0].id;
  for (const t of out.tx) {
    if (!ids.has(t.acc)) t.acc = first;
    if (t.type === 'transfer' && !ids.has(t.to)) t.to = first;
  }
  for (const r of out.recurring) if (!ids.has(r.acc)) r.acc = first;
  if (!ids.has(out.lastAcc)) out.lastAcc = first;
  return out;
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { console.error(e); }
  if (!raw) return fresh();
  let d;
  try { d = JSON.parse(raw); }
  catch (e) {
    // Datos ilegibles: se apartan intactos antes de que nada pueda sobrescribirlos
    lsSet(`finanzas.rescate.${Date.now()}`, raw);
    console.error(e);
    return fresh();
  }
  const from = d.version || 1;
  if (from < SCHEMA) lsSet(`finanzas.antes-de-v${SCHEMA}`, raw); // copia previa a la migración
  const out = normalize(d);
  out.version = Math.max(SCHEMA, from);
  return out;
}
let S = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠️ No se pudo guardar. ¿Almacenamiento lleno?'); }
}
function commit() { save(); render(); }

const ui = { tab: 'home', month: curMonth(), filter: 'all', query: '', catFilter: null, accFilter: null, donut: 'expense' };

/* ---------- Consultas ---------- */
const catById = new Proxy({}, { get: (_, id) => S.categories.find(c => c.id === id) });
const cat = id => catById[id] || { id, name: 'Sin categoría', emoji: '❔', color: '#adb5bd', type: 'expense', budget: 0 };
const catsOf = type => S.categories.filter(c => c.type === type);
const monthTx = ym => S.tx.filter(t => t.date.startsWith(ym));
const byNewest = (a, b) => (b.date === a.date ? (b.created || 0) - (a.created || 0) : b.date < a.date ? -1 : 1);
function totals(list) {
  let inc = 0, exp = 0;
  for (const t of list) {
    if (t.type === 'income') inc += t.amount;
    else if (t.type === 'expense') exp += t.amount;
  }
  return { inc: round2(inc), exp: round2(exp), bal: round2(inc - exp) };
}

/* ---------- Cuentas ---------- */
const acc = id => S.accounts.find(a => a.id === id) || S.accounts[0];
const multiAcc = () => S.accounts.length > 1;
// Movimiento neto de un movimiento sobre una cuenta
function accDelta(t, id) {
  if (t.type === 'income') return t.acc === id ? t.amount : 0;
  if (t.type === 'expense') return t.acc === id ? -t.amount : 0;
  return (t.to === id ? t.amount : 0) - (t.acc === id ? t.amount : 0);
}
function accMoves(id) { return round2(S.tx.reduce((s, t) => s + accDelta(t, id), 0)); }
function accBalance(id) { return round2((acc(id).initial || 0) + accMoves(id)); }
function totalBalance() { return round2(S.accounts.reduce((s, a) => s + accBalance(a.id), 0)); }
function sumByCat(list, type) {
  const m = new Map();
  for (const t of list) if (t.type === type) m.set(t.cat, (m.get(t.cat) || 0) + t.amount);
  return [...m].map(([id, v]) => ({ c: cat(id), v: round2(v) })).sort((a, b) => b.v - a.v);
}
function usage(type, days = 120) {
  const since = isoOf(new Date(Date.now() - days * 864e5));
  const m = new Map();
  for (const t of S.tx) if (t.type === type && t.date >= since) m.set(t.cat, (m.get(t.cat) || 0) + 1);
  return m;
}
function sortedCats(type) {
  const u = usage(type);
  const list = catsOf(type);
  return list.map((c, i) => ({ c, i })).sort((a, b) => (u.get(b.c.id) || 0) - (u.get(a.c.id) || 0) || a.i - b.i).map(x => x.c);
}
function favorites() {
  const since = isoOf(new Date(Date.now() - 90 * 864e5));
  const m = new Map();
  for (const t of S.tx) {
    if (t.date < since || t.rec || t.type === 'transfer') continue;
    const k = JSON.stringify([t.type, t.cat, t.amount, t.note || '', t.acc]);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([k]) => { const [type, c, amount, note, a] = JSON.parse(k); return { type, cat: c, amount, note, acc: a }; })
    .filter(f => catById[f.cat] && S.accounts.some(a => a.id === f.acc));
}

/* ---------- Recurrentes ---------- */
function runRecurring() {
  const now = curMonth(), today = new Date().getDate();
  let added = 0;
  for (const r of S.recurring) {
    let ym = r.last ? addMonths(r.last, 1) : r.start || now;
    let guard = 0;
    while (ym <= now && guard++ < 240) {
      const day = Math.min(r.day, daysIn(ym));
      if (ym === now && today < day) break;
      S.tx.push({ id: uid(), type: r.type, amount: r.amount, cat: r.cat, acc: r.acc || S.accounts[0].id, note: r.note, date: `${ym}-${pad(day)}`, rec: r.id, created: Date.now() });
      r.last = ym;
      added++;
      ym = addMonths(ym, 1);
    }
  }
  if (added) save();
  return added;
}

/* =====================================================================
   Componentes
   ===================================================================== */
function monthSwitch() {
  return `<div class="month-switch">
    <button data-action="month" data-d="-1" aria-label="Mes anterior">${I.left}</button>
    <span>${monthLabel(ui.month)}</span>
    <button data-action="month" data-d="1" aria-label="Mes siguiente" ${ui.month >= curMonth() ? 'disabled' : ''}>${I.right}</button>
  </div>`;
}

function txRow(t, showDate = false) {
  if (t.type === 'transfer') {
    const a = acc(t.acc), b = acc(t.to);
    return `<button class="tx" data-action="edit" data-id="${t.id}">
      <span class="tx-ico" style="--c:#a99bff">⇄</span>
      <span class="tx-main"><b>${esc(t.note || 'Transferencia')}</b><small>${a.emoji} ${esc(a.name)} → ${b.emoji} ${esc(b.name)}${showDate ? ' · ' + shortDate(t.date) : ''}</small></span>
      <span class="tx-amt transfer">${money(t.amount)}</span>
    </button>`;
  }
  const c = cat(t.cat);
  const sub = [esc(c.name)];
  if (multiAcc()) sub.push(acc(t.acc).emoji);
  if (showDate) sub.push(shortDate(t.date));
  return `<button class="tx" data-action="edit" data-id="${t.id}">
    <span class="tx-ico" style="--c:${c.color}">${c.emoji}</span>
    <span class="tx-main"><b>${esc(t.note || c.name)}</b><small>${t.rec ? I.repeat : ''}${sub.join(' · ')}</small></span>
    <span class="tx-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span>
  </button>`;
}

function ring(pct, color, size, stroke, inner = '') {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/>
    <circle class="prog" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" style="--full:${C}"/>
  </svg>${inner}`;
}

function swatches(sel) {
  return `<div class="swatches" data-value="${sel}">${COLORS.map(c => `<button type="button" data-color="${c}" style="--c:${c}" class="${c === sel ? 'sel' : ''}" aria-label="Color"></button>`).join('')}</div>`;
}

/* =====================================================================
   Vistas
   ===================================================================== */
function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches 🌙' : h < 13 ? 'Buenos días ☀️' : h < 21 ? 'Buenas tardes 👋' : 'Buenas noches 🌙';
}
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

let currentFavs = [];

function viewHome() {
  const list = monthTx(ui.month);
  const { inc, exp, bal } = totals(list);
  const all = totalBalance();
  const rate = inc > 0 ? Math.round((bal / inc) * 100) : null;
  currentFavs = favorites();
  let installBanner = '';
  if (!isStandalone() && !localStorage.getItem('finanzas.hideInstall')) {
    installBanner = `<div class="banner"><div><b>📲 Instálala en tu iPhone</b>En Safari pulsa <span class="share-ico">${I.share}</span> Compartir → <b style="display:inline">Añadir a pantalla de inicio</b>. Se abrirá como una app, a pantalla completa.</div><button class="x" data-action="hide-install" aria-label="Cerrar">${I.x}</button></div>`;
  }
  return `
  <header class="page-head">
    <div><p class="eyebrow">${greeting()}</p><h1>Mis finanzas</h1></div>
    <button class="icon-btn" data-action="tab" data-tab="settings" aria-label="Ajustes">${I.gear}</button>
  </header>
  ${installBanner}
  ${backupBanner()}
  ${summaryCard()}
  ${monthSwitch()}
  <section class="hero">
    <button class="hero-tap" data-action="privacy" aria-label="${privacy ? 'Mostrar cantidades' : 'Ocultar cantidades'}">
      <span class="hero-label" style="display:block">Saldo total <span class="eye">${privacy ? I.eyeOff : I.eye}</span></span>
      <span class="hero-amount" style="display:block">${money(all)}</span>
    </button>
    <div class="hero-row">
      <div class="hero-pill"><span class="arrow inc">${I.arrowDown}</span><div><small>Ingresos</small><b>${money(inc)}</b></div></div>
      <div class="hero-pill"><span class="arrow exp">${I.arrowUp}</span><div><small>Gastos</small><b>${money(exp)}</b></div></div>
    </div>
    <div class="hero-foot"><span>Balance de ${monthName(ui.month)} <b>${money(bal, { sign: true })}</b></span>${rate !== null ? `<span class="chip-light">${rate >= 0 ? '💪' : '⚠️'} Ahorras ${rate}%</span>` : ''}</div>
  </section>
  <div class="quick-row">
    <button class="quick exp" data-action="add" data-type="expense"><span class="qi">${I.minus}</span>Gasto</button>
    <button class="quick inc" data-action="add" data-type="income"><span class="qi">${I.plus}</span>Ingreso</button>
  </div>
  ${currentFavs.length ? `<p class="favs-label">${I.bolt} Un toque para repetir</p><div class="favs">${currentFavs.map((f, i) => {
    const c = cat(f.cat);
    return `<button class="fav ${f.type}" data-action="fav" data-i="${i}"><span class="e" style="--c:${c.color}">${c.emoji}</span>${esc(f.note || c.name)} <b>${f.type === 'income' ? '+' : ''}${money(f.amount)}</b></button>`;
  }).join('')}</div>` : ''}
  ${accountsCard()}
  ${S.tx.length === 0 ? emptyHome() : `
    ${donutCard(list)}
    ${dailyCard(list)}
    ${budgetMini(list)}
    ${trendCard()}
    ${recentCard(list)}`}
  `;
}

function accountsCard() {
  const rows = S.accounts.map(a => ({ a, b: accBalance(a.id) }));
  const total = rows.reduce((s, r) => s + r.b, 0);
  return `<section class="card">
    <div class="card-head"><h3>Mis cuentas</h3>
      <div style="display:flex;gap:14px">${multiAcc() ? `<button class="link" data-action="transfer">⇄ Transferir</button>` : ''}<button class="link" data-action="acc-new">+ Cuenta</button></div></div>
    <div class="acc-list">${rows.map(({ a, b }) => `<button class="acc" data-action="acc-edit" data-id="${a.id}">
      <span class="tx-ico" style="--c:${a.color}">${a.emoji}</span>
      <span class="tx-main"><b>${esc(a.name)}</b>${b < 0 ? '<small>en negativo</small>' : ''}</span>
      <span class="tx-amt ${b < 0 ? 'neg' : ''}">${money(b)}</span></button>`).join('')}</div>
    ${rows.length > 1 ? `<div class="acc-total"><span>Total</span><b>${money(total)}</b></div>` : ''}
  </section>`;
}

/* ---------- Aviso semanal de copia de seguridad ---------- */
const daysSince = iso => (iso ? Math.floor((dateOf(todayISO()) - dateOf(iso)) / 864e5) : Infinity);
function backupDue() {
  if (S.tx.length < 5) return false;
  if (daysSince(lsGet('finanzas.lastBackup')) < 7) return false;
  return daysSince(lsGet('finanzas.backupSnooze')) >= 1;
}
function backupBanner() {
  if (!backupDue()) return '';
  const last = lsGet('finanzas.lastBackup');
  return `<div class="banner backup"><div style="flex:1"><b>💾 Toca hacer la copia semanal</b>
    ${last ? `Última copia hace ${daysSince(last)} días.` : 'Aún no has hecho ninguna.'} Tus datos solo están en este iPhone: guárdala en iCloud Drive.
    <div class="banner-actions"><button class="btn-soft accent" data-action="backup">Hacer copia ahora</button><button class="btn-soft" data-action="backup-later">Mañana</button></div></div></div>`;
}

/* ---------- Resúmenes de quincena y de mes ---------- */
const inDays = (list, from, to) => list.filter(t => { const d = +t.date.slice(8); return d >= from && d <= to; });
function pendingSummary() {
  const cm = curMonth();
  const p = new Date().getDate() >= 16
    ? { id: `${cm}-Q1`, ym: cm, from: 1, to: 15, kind: 'q' }
    : { id: `${addMonths(cm, -1)}-M`, ym: addMonths(cm, -1), from: 1, to: 31, kind: 'm' };
  if (lsGet('finanzas.seen.' + p.id)) return null;
  if (!inDays(monthTx(p.ym), p.from, p.to).some(t => t.type !== 'transfer')) return null;
  return p;
}
function summaryCard(p = pendingSummary()) {
  if (!p) return '';
  const list = inDays(monthTx(p.ym), p.from, p.to);
  const prevYm = addMonths(p.ym, -1);
  const prevList = inDays(monthTx(prevYm), p.from, p.to);
  const { inc, exp, bal } = totals(list);
  const prev = totals(prevList);
  const rate = inc > 0 ? Math.round((bal / inc) * 100) : null;
  const diff = prev.exp > 0 ? Math.round(((exp - prev.exp) / prev.exp) * 100) : null;
  const prevCat = new Map(sumByCat(prevList, 'expense').map(d => [d.c.id, d.v]));
  const top = sumByCat(list, 'expense').slice(0, 3);
  const spent = new Map(sumByCat(list, 'expense').map(d => [d.c.id, d.v]));
  const bud = catsOf('expense').filter(c => c.budget > 0);
  const biggest = list.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
  const isQ = p.kind === 'q';
  const title = isQ ? `Tu primera quincena de ${monthName(p.ym)}` : `Así fue ${monthName(p.ym)}`;
  const prevName = isQ ? `la 1ª quincena de ${monthName(prevYm)}` : monthName(prevYm);

  let headline;
  if (bal > 0) headline = `Has ahorrado <b class="down">${money(bal)}</b>${rate !== null ? ` (${rate}% de lo que ingresaste)` : ''} 💪`;
  else if (bal < 0) headline = `Has gastado <b class="up">${money(-bal)}</b> más de lo que has ingresado`;
  else headline = 'Has gastado exactamente lo que has ingresado';

  let budgetLine = '';
  if (bud.length) {
    if (isQ) {
      const hot = bud.filter(c => (spent.get(c.id) || 0) >= c.budget * 0.5);
      budgetLine = hot.length
        ? `⚠️ A mitad de mes ya llevas más de la mitad del presupuesto en ${hot.map(c => `${c.emoji} ${esc(c.name)}`).join(', ')}.`
        : '✅ Vas bien: ningún presupuesto ha pasado de la mitad.';
    } else {
      const over = bud.filter(c => (spent.get(c.id) || 0) > c.budget);
      budgetLine = over.length
        ? `🎯 Cumpliste ${bud.length - over.length} de ${bud.length} presupuestos. Te pasaste en ${over.map(c => `${c.emoji} ${esc(c.name)} (+${money((spent.get(c.id) || 0) - c.budget)})`).join(', ')}.`
        : `🏆 ¡Cumpliste los ${bud.length} presupuestos!`;
    }
  }

  return `<section class="card summary">
    <div class="card-head"><h3>📊 ${title}</h3><button class="x" data-action="summary-ok" data-id="${p.id}" aria-label="Cerrar">${I.x}</button></div>
    <p class="summary-head">${headline}</p>
    <div class="summary-figs">
      <div><small>Ingresos</small><b class="down">${money(inc)}</b></div>
      <div><small>Gastos</small><b class="up">${money(exp)}</b></div>
    </div>
    ${diff !== null ? `<p class="summary-line2">${diff > 0 ? '📈' : '📉'} Has gastado un <b class="${diff > 0 ? 'up' : 'down'}">${Math.abs(diff)}% ${diff > 0 ? 'más' : 'menos'}</b> que en ${prevName}.</p>` : ''}
    ${top.length ? `<p class="summary-sub">Donde más se fue</p>
      ${top.map(({ c, v }) => {
        const pv = prevCat.get(c.id) || 0;
        const ch = pv > 0 ? Math.round(((v - pv) / pv) * 100) : null;
        return `<div class="summary-cat"><span class="tx-ico" style="--c:${c.color}">${c.emoji}</span><span class="nm">${esc(c.name)}</span>
          ${ch !== null && Math.abs(ch) >= 5 ? `<span class="ch ${ch > 0 ? 'up' : 'down'}">${ch > 0 ? '▲' : '▼'} ${Math.abs(ch)}%</span>` : ''}<b>${money(v)}</b></div>`;
      }).join('')}` : ''}
    ${biggest ? `<p class="summary-line2">💸 Mayor gasto: <b>${esc(biggest.note || cat(biggest.cat).name)}</b>, ${money(biggest.amount)} el ${shortDate(biggest.date)}.</p>` : ''}
    ${budgetLine ? `<p class="summary-line2">${budgetLine}</p>` : ''}
    <button class="btn-soft accent" style="width:100%;margin-top:6px" data-action="summary-ok" data-id="${p.id}">Entendido</button>
  </section>`;
}

function emptyHome() {
  return `<section class="card empty">
    <div class="big">🌱</div>
    <h3>Empieza a controlar tu dinero</h3>
    <p>Apunta tu primer gasto o ingreso con los botones de arriba. Cuantos más movimientos, más útiles serán las gráficas.</p>
    <button class="btn-soft" style="width:100%" data-action="demo">${I.sparkle} Ver la app con datos de ejemplo</button>
  </section>`;
}

function donutCard(list) {
  const type = ui.donut;
  const data = sumByCat(list, type);
  const total = data.reduce((s, d) => s + d.v, 0);
  const head = `<div class="card-head"><h3>Por categoría</h3>
    <div class="mini-seg"><button class="${type === 'expense' ? 'on' : ''}" data-action="donut" data-t="expense">Gastos</button><button class="${type === 'income' ? 'on' : ''}" data-action="donut" data-t="income">Ingresos</button></div></div>`;
  if (!total) return `<section class="card">${head}<p class="muted" style="margin:0">Sin ${type === 'expense' ? 'gastos' : 'ingresos'} este mes.</p></section>`;
  let items = data.slice(0, 6);
  if (data.length > 6) items.push({ c: { id: null, name: 'Resto', color: '#5c6080', emoji: '…' }, v: data.slice(6).reduce((s, d) => s + d.v, 0) });
  const r = 58, C = 2 * Math.PI * r, gap = items.length > 1 ? 2.5 : 0;
  let off = 0;
  const segs = items.map(it => {
    const len = (it.v / total) * C;
    const s = `<circle r="${r}" cx="75" cy="75" fill="none" stroke="${it.c.color}" stroke-width="20" stroke-dasharray="${Math.max(len - gap, 0.5)} ${C}" stroke-dashoffset="${-off}"/>`;
    off += len;
    return s;
  }).join('');
  return `<section class="card">${head}
    <div class="donut-wrap">
      <div class="donut-box">
        <svg class="donut" viewBox="0 0 150 150"><g transform="rotate(-90 75 75)"><circle r="${r}" cx="75" cy="75" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="20"/>${segs}</g></svg>
        <div class="donut-center"><small>Total</small><b>${money(total, { short: true })}</b></div>
      </div>
      <div class="legend">${items.map(it => `<button ${it.c.id ? `data-action="cat-filter" data-id="${it.c.id}"` : ''}>
        <span class="sw" style="background:${it.c.color}"></span><span class="nm">${it.c.emoji} ${esc(it.c.name)}</span><span class="pc">${Math.round((it.v / total) * 100)}%</span></button>`).join('')}</div>
    </div></section>`;
}

function dailyCard(list) {
  const ym = ui.month, n = daysIn(ym);
  const arr = Array(n).fill(0);
  for (const t of list) if (t.type === 'expense') arr[+t.date.slice(8) - 1] += t.amount;
  const max = Math.max(...arr, 1);
  const isCur = ym === curMonth(), today = new Date().getDate();
  const W = 320, H = 120, base = H - 16, top = 10, bw = W / n;
  const elapsed = isCur ? today : n;
  const avg = arr.slice(0, elapsed).reduce((a, b) => a + b, 0) / elapsed;
  const bars = arr.map((v, i) => {
    const h = v > 0 ? Math.max((v / max) * (base - top), 3) : 2;
    const future = isCur && i + 1 > today;
    const fill = isCur && i + 1 === today ? 'url(#gToday)' : v > 0 ? 'url(#gBar)' : 'rgba(255,255,255,.08)';
    return `<rect class="bar" style="--i:${i}" x="${(i * bw + bw * 0.18).toFixed(2)}" y="${(base - h).toFixed(2)}" width="${(bw * 0.64).toFixed(2)}" height="${h.toFixed(2)}" rx="${Math.min(bw * 0.32, 4).toFixed(2)}" fill="${fill}" opacity="${future ? 0.35 : 1}"/>`;
  }).join('');
  const labels = [1, 8, 15, 22, n].map(d => `<text x="${((d - 0.5) * bw).toFixed(1)}" y="${H - 2}" text-anchor="middle">${d}</text>`).join('');
  const avgY = base - (avg / max) * (base - top);
  return `<section class="card">
    <div class="card-head"><h3>Gasto diario</h3><small>máx. ${money(max, { short: true })}</small></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="gBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff7d95"/><stop offset="1" stop-color="#ff5d7d" stop-opacity=".55"/></linearGradient>
        <linearGradient id="gToday" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b9a8ff"/><stop offset="1" stop-color="#7c5cff"/></linearGradient>
      </defs>
      ${avg > 0 ? `<line x1="0" x2="${W}" y1="${avgY}" y2="${avgY}" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 4"/><text x="${W}" y="${avgY - 4}" text-anchor="end">media ${kfmt(avg)}</text>` : ''}
      ${bars}${labels}
    </svg></section>`;
}

function trendCard() {
  const months = [];
  for (let k = 5; k >= 0; k--) months.push(addMonths(ui.month, -k));
  const data = months.map(ym => ({ ym, ...totals(monthTx(ym)) }));
  const max = Math.max(...data.map(d => Math.max(d.inc, d.exp)), 1);
  const W = 320, H = 140, base = H - 18, top = 14, gw = W / 6, bw = gw * 0.26;
  const bars = data.map((d, i) => {
    const x = i * gw + gw / 2;
    const hi = Math.max((d.inc / max) * (base - top), d.inc ? 3 : 0);
    const he = Math.max((d.exp / max) * (base - top), d.exp ? 3 : 0);
    const cur = d.ym === ui.month;
    return `<rect class="bar" style="--i:${i * 3}" x="${x - bw - 1.5}" y="${base - hi}" width="${bw}" height="${hi}" rx="3.5" fill="#2ee6a6" opacity="${cur ? 1 : 0.55}"/>
      <rect class="bar" style="--i:${i * 3 + 1}" x="${x + 1.5}" y="${base - he}" width="${bw}" height="${he}" rx="3.5" fill="#ff5d7d" opacity="${cur ? 1 : 0.55}"/>
      <text x="${x}" y="${H - 3}" text-anchor="middle" style="${cur ? 'fill:#f4f5fb' : ''}">${monthName(d.ym).slice(0, 3)}</text>
      ${d.inc || d.exp ? `<text x="${x}" y="${base - Math.max(hi, he) - 4}" text-anchor="middle" style="fill:${d.bal >= 0 ? '#2ee6a6' : '#ff5d7d'}">${d.bal >= 0 ? '+' : '−'}${kfmt(Math.abs(d.bal))}</text>` : ''}`;
  }).join('');
  return `<section class="card">
    <div class="card-head"><h3>Últimos 6 meses</h3><div class="chart-legend"><span><i style="background:#2ee6a6"></i>Ingresos</span><span><i style="background:#ff5d7d"></i>Gastos</span></div></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}">${bars}</svg></section>`;
}

function budgetBar(c, spent, pace) {
  const pct = c.budget ? spent / c.budget : 0;
  const cls = pct >= 1 ? 'over' : pct >= 0.8 ? 'mid' : '';
  const left = round2(c.budget - spent);
  return `<button class="budget" data-action="budget" data-id="${c.id}">
    <div class="budget-top">
      <span class="tx-ico" style="--c:${c.color}">${c.emoji}</span>
      <span class="nm">${esc(c.name)}<small>${left >= 0 ? `Quedan ${money(left)}` : `<span class="up">Te pasas ${money(-left)}</span>`}</small></span>
      <span class="amt"><b>${money(spent, { short: true })}</b><br>de ${money(c.budget, { short: true })}</span>
    </div>
    <div class="bar-track"><div class="bar-fill ${cls}" style="--w:${Math.min(pct, 1) * 100}%"></div>${pace < 1 ? `<span class="bar-pace" style="left:${pace * 100}%"></span>` : ''}</div>
  </button>`;
}

function budgetMini(list) {
  const spent = new Map(sumByCat(list, 'expense').map(d => [d.c.id, d.v]));
  const cats = catsOf('expense').filter(c => c.budget > 0)
    .map(c => ({ c, s: spent.get(c.id) || 0 })).sort((a, b) => b.s / b.c.budget - a.s / a.c.budget).slice(0, 3);
  const pace = ui.month === curMonth() ? new Date().getDate() / daysIn(ui.month) : 1;
  if (!cats.length) {
    return `<section class="card"><div class="card-head"><h3>Presupuestos</h3></div>
      <p class="muted" style="margin:0 0 12px">Pon un límite mensual a tus categorías y te avisaré visualmente cuando te acerques.</p>
      <button class="btn-soft" style="width:100%" data-action="tab" data-tab="budget">Crear presupuestos</button></section>`;
  }
  return `<section class="card"><div class="card-head"><h3>Presupuestos</h3><button class="link" data-action="tab" data-tab="budget">Ver todos</button></div>
    ${cats.map(({ c, s }) => budgetBar(c, s, pace)).join('')}</section>`;
}

function recentCard(list) {
  const items = [...list].sort(byNewest).slice(0, 6);
  return `<section class="card"><div class="card-head"><h3>Últimos movimientos</h3><button class="link" data-action="tab" data-tab="tx">Ver todos</button></div>
    ${items.length ? `<div class="tx-list">${items.map(t => txRow(t, true)).join('')}</div>` : '<p class="muted" style="margin:0">Nada por aquí este mes.</p>'}</section>`;
}

/* ---------- Movimientos ---------- */
function viewTx() {
  const fc = ui.catFilter ? cat(ui.catFilter) : null;
  return `
  <header class="page-head"><h1>Movimientos</h1><button class="icon-btn" data-action="add" data-type="expense" aria-label="Añadir">${I.plus}</button></header>
  ${monthSwitch()}
  <div class="search">${I.search}<input id="q" type="search" placeholder="Buscar en todos los meses…" value="${esc(ui.query)}" autocomplete="off"></div>
  <div class="chips">
    ${[['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ...(multiAcc() ? [['transfer', '⇄']] : [])].map(([k, l]) => `<button class="chip ${ui.filter === k ? 'on' : ''}" data-action="filter" data-f="${k}">${l}</button>`).join('')}
    ${fc ? `<button class="chip on" data-action="clear-cat">${fc.emoji} ${esc(fc.name)} ${I.x}</button>` : ''}
    ${ui.accFilter ? `<button class="chip on" data-action="clear-acc">${acc(ui.accFilter).emoji} ${esc(acc(ui.accFilter).name)} ${I.x}</button>` : ''}
  </div>
  <div id="tx-list">${txListHTML()}</div>`;
}

function txListHTML() {
  const q = norm(ui.query.trim());
  let list = q ? S.tx.filter(t => {
    const c = cat(t.cat);
    return norm(t.note).includes(q) || norm(c.name).includes(q) || norm(acc(t.acc).name).includes(q) || NF2.format(t.amount).includes(q) || String(t.amount).includes(q);
  }) : monthTx(ui.month);
  if (ui.filter !== 'all') list = list.filter(t => t.type === ui.filter);
  if (ui.catFilter) list = list.filter(t => t.cat === ui.catFilter);
  if (ui.accFilter) list = list.filter(t => t.acc === ui.accFilter || t.to === ui.accFilter);
  list.sort(byNewest);
  if (!list.length) {
    return `<div class="card empty"><div class="big">${q ? '🔍' : '🧾'}</div><h3>${q ? 'Sin resultados' : 'Sin movimientos'}</h3><p>${q ? 'Prueba con otra palabra o importe.' : 'Pulsa + para apuntar uno.'}</p></div>`;
  }
  const { inc, exp } = totals(list);
  const groups = new Map();
  for (const t of list) { if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t); }
  return `<div class="summary-line"><span>${list.length} movimiento${list.length === 1 ? '' : 's'}${q ? ' · todos los meses' : ''}</span>
      <span>${inc ? `<b class="down">+${money(inc)}</b> ` : ''}${exp ? `<b class="up">−${money(exp)}</b>` : ''}</span></div>
    ${[...groups].map(([d, items]) => {
      const net = totals(items).bal;
      const onlyTransfers = items.every(t => t.type === 'transfer');
      return `<div class="tx-group"><div class="tx-day"><span>${dayLabel(d)}</span><span class="num">${onlyTransfers ? '' : money(net, { sign: true })}</span></div>
        <div class="tx-list">${items.map(t => txRow(t)).join('')}</div></div>`;
    }).join('')}`;
}

/* ---------- Presupuestos ---------- */
function viewBudget() {
  const list = monthTx(ui.month);
  const spent = new Map(sumByCat(list, 'expense').map(d => [d.c.id, d.v]));
  const cats = catsOf('expense');
  const withB = cats.filter(c => c.budget > 0).sort((a, b) => (spent.get(b.id) || 0) / b.budget - (spent.get(a.id) || 0) / a.budget);
  const without = cats.filter(c => !(c.budget > 0));
  const isCur = ui.month === curMonth();
  const pace = isCur ? new Date().getDate() / daysIn(ui.month) : 1;
  const totalB = round2(withB.reduce((s, c) => s + c.budget, 0));
  const spentB = round2(withB.reduce((s, c) => s + (spent.get(c.id) || 0), 0));
  const left = round2(totalB - spentB);
  const daysLeft = isCur ? daysIn(ui.month) - new Date().getDate() + 1 : 0;
  const pct = totalB ? spentB / totalB : 0;
  const color = pct >= 1 ? '#ff5d7d' : pct >= 0.8 ? '#ffc24b' : '#2ee6a6';
  return `
  <header class="page-head"><h1>Presupuestos</h1></header>
  ${monthSwitch()}
  ${withB.length ? `<section class="card">
    <div class="budget-hero">
      <div class="ring-box">${ring(pct, color, 112, 12, `<div class="ring-center"><b>${Math.round(pct * 100)}%</b><small>usado</small></div>`)}</div>
      <div class="kv">
        <small>${left >= 0 ? 'Te quedan' : 'Te has pasado'}</small>
        <span class="big-num" style="color:${left >= 0 ? 'var(--text)' : 'var(--expense)'}">${money(Math.abs(left))}</span>
        <small>de ${money(totalB)} presupuestados</small>
        ${isCur && left > 0 ? `<span class="tag ok">≈ ${money(left / daysLeft)}/día hasta fin de mes</span>` : ''}
        ${left < 0 ? `<span class="tag bad">Por encima del límite</span>` : ''}
      </div>
    </div></section>
  <section class="card">
    <div class="card-head"><h3>Por categoría</h3>${isCur ? '<small>│ = ritmo ideal</small>' : ''}</div>
    ${withB.map(c => budgetBar(c, spent.get(c.id) || 0, pace)).join('')}
  </section>` : `<section class="card empty"><div class="big">🎯</div><h3>Sin presupuestos todavía</h3><p>Toca una categoría de abajo para ponerle un límite mensual.</p></section>`}
  <p class="section-title">Sin presupuesto</p>
  <section class="card">
    ${without.map(c => `<button class="nobudget" data-action="budget" data-id="${c.id}">
      <span class="tx-ico" style="--c:${c.color}">${c.emoji}</span>
      <span class="nm">${esc(c.name)}<small>${money(spent.get(c.id) || 0)} este mes</small></span>
      <span class="link">Definir</span></button>`).join('') || '<p class="muted" style="margin:0">Todas tus categorías tienen presupuesto 👏</p>'}
  </section>`;
}

/* ---------- Metas ---------- */
function viewGoals() {
  const saved = round2(S.goals.reduce((s, g) => s + g.saved, 0));
  const target = round2(S.goals.reduce((s, g) => s + g.target, 0));
  return `
  <header class="page-head"><h1>Metas</h1><button class="icon-btn" data-action="goal-new" aria-label="Nueva meta">${I.plus}</button></header>
  ${S.goals.length ? `
  <section class="hero" style="background:linear-gradient(135deg,#0fb6a0,#1d7fe0 60%,#6a4dff)">
    <p class="hero-label">Ahorrado en tus metas</p>
    <p class="hero-amount">${money(saved)}</p>
    <div class="bar-track" style="background:rgba(255,255,255,.2)"><div class="bar-fill" style="--w:${target ? Math.min(saved / target, 1) * 100 : 0}%;background:#fff"></div></div>
    <div class="hero-foot"><span>Objetivo total <b>${money(target)}</b></span><span class="chip-light">${target ? Math.round((saved / target) * 100) : 0}%</span></div>
  </section>
  ${S.goals.map(goalCard).join('')}` : `<section class="card empty"><div class="big">🐷</div><h3>Crea tu primera meta</h3>
    <p>Un viaje, un fondo de emergencia, un coche… Ve apartando dinero y mira cómo se llena.</p>
    <button class="btn-soft accent" style="width:100%" data-action="goal-new">${I.plus} Nueva meta</button></section>`}`;
}

function goalCard(g) {
  const pct = g.target ? g.saved / g.target : 0;
  const rest = round2(g.target - g.saved);
  let plan = '';
  if (rest > 0 && g.deadline) {
    const months = monthsBetween(curMonth(), g.deadline) + 1;
    plan = months > 0 ? ` · ${money(rest / months)}/mes hasta ${monthName(g.deadline)} ${g.deadline.slice(0, 4)}` : ' · plazo vencido';
  }
  return `<section class="card" style="--c:${g.color}">
    <div class="goal" data-action="goal-edit" data-id="${g.id}" role="button">
      <div class="ring-box">${ring(pct, g.color, 76, 8, `<div class="ring-center">${g.emoji}</div>`)}</div>
      <div class="goal-main">
        <h4>${esc(g.name)}</h4>
        <p><span class="amt">${money(g.saved)}</span> de ${money(g.target)}</p>
        <p>${rest > 0 ? `Faltan ${money(rest)}${plan}` : '<span class="done-badge">🎉 ¡Meta conseguida!</span>'}</p>
      </div>
      <b style="font-size:18px">${Math.round(pct * 100)}%</b>
    </div>
    <div class="goal-actions">
      <button class="btn-soft" data-action="goal-move" data-id="${g.id}" data-dir="-1">${I.minus} Retirar</button>
      <button class="btn-soft accent" data-action="goal-move" data-id="${g.id}" data-dir="1">${I.plus} Aportar</button>
    </div>
  </section>`;
}

/* ---------- Ajustes ---------- */
function viewSettings() {
  const catBlock = type => `<div class="cat-list">${catsOf(type).map(c => `<button class="cat-pill" style="--c:${c.color}" data-action="cat-edit" data-id="${c.id}"><span>${c.emoji}</span>${esc(c.name)}</button>`).join('')}
    <button class="cat-pill add" data-action="cat-new" data-type="${type}"><span>＋</span>Nueva</button></div>`;
  return `
  <header class="page-head"><button class="icon-btn" data-action="tab" data-tab="home" aria-label="Volver">${I.back}</button><h1 style="flex:1">Ajustes</h1></header>
  <section class="card">
    <h3>General</h3>
    <div class="row"><span>Moneda</span>
      <select id="currency">${['€', '$', '£', 'CHF ', 'MX$'].map(c => `<option value="${c}" ${S.currency === c ? 'selected' : ''}>${c.trim()}</option>`).join('')}</select></div>
    <label class="row"><span><b>Abrir en modo rápido</b><small>Al abrir la app aparece directamente el teclado para apuntar un gasto.</small></span>
      <input type="checkbox" class="switch" id="quickStart" ${S.quickStart ? 'checked' : ''}></label>
    <label class="row"><span><b>Modo discreto</b><small>Oculta las cantidades. También puedes tocar el saldo en Inicio.</small></span>
      <input type="checkbox" class="switch" id="privacyToggle" ${privacy ? 'checked' : ''}></label>
  </section>

  <section class="card">
    <div class="card-head"><h3>Cuentas</h3><button class="link" data-action="acc-new">+ Añadir</button></div>
    ${S.accounts.map(a => `<button class="rec" data-action="acc-edit" data-id="${a.id}">
      <span class="tx-ico" style="--c:${a.color}">${a.emoji}</span>
      <span class="tx-main"><b>${esc(a.name)}</b><small>${S.tx.filter(t => t.acc === a.id || t.to === a.id).length} movimientos</small></span>
      <span class="tx-amt">${money(accBalance(a.id))}</span></button>`).join('')}
  </section>

  <section class="card">
    <div class="card-head"><h3>Fijos y recurrentes</h3><button class="link" data-action="rec-new">+ Añadir</button></div>
    ${S.recurring.length ? S.recurring.map(r => { const c = cat(r.cat); return `<button class="rec" data-action="rec-edit" data-id="${r.id}">
      <span class="tx-ico" style="--c:${c.color}">${c.emoji}</span>
      <span class="tx-main"><b>${esc(r.note || c.name)}</b><small>${I.repeat} Día ${r.day} de cada mes</small></span>
      <span class="tx-amt ${r.type}">${r.type === 'income' ? '+' : '−'}${money(r.amount)}</span></button>`; }).join('')
      : '<p class="muted" style="margin:0">Alquiler, nómina, gimnasio, Netflix… Se apuntan solos cada mes.</p>'}
  </section>

  <section class="card"><div class="card-head"><h3>Categorías de gasto</h3></div>${catBlock('expense')}</section>
  <section class="card"><div class="card-head"><h3>Categorías de ingreso</h3></div>${catBlock('income')}</section>

  <section class="card">
    <h3>Tus datos</h3>
    <p class="muted" style="margin:6px 0 0;font-size:13.5px">Todo se guarda solo en este dispositivo: nadie más lo ve. Haz una copia de seguridad de vez en cuando (por ejemplo, a iCloud Drive).</p>
    <div class="btn-list">
      <button class="btn-row" data-action="backup">${I.down}<span>Hacer copia de seguridad<small style="display:block;color:var(--muted);font-weight:500;font-size:12.5px">${lsGet('finanzas.lastBackup') ? `Última: ${dayLabel(lsGet('finanzas.lastBackup')).toLowerCase()}` : 'Nunca has hecho una'}</small></span></button>
      <button class="btn-row" data-action="restore">${I.up} Restaurar copia</button>
      <button class="btn-row" data-action="csv">${I.table} Exportar a Excel (CSV)</button>
      <button class="btn-row" data-action="demo">${I.sparkle} Añadir datos de ejemplo</button>
      <button class="btn-row danger" data-action="wipe">${I.trash} Borrar todos los datos</button>
    </div>
  </section>

  <section class="card">
    <h3>Instalar en el iPhone</h3>
    <ol class="steps">
      <li>Abre esta página en <b>Safari</b>.</li>
      <li>Pulsa <b>Compartir</b> (el cuadrado con la flecha).</li>
      <li>Elige <b>Añadir a pantalla de inicio</b>.</li>
      <li>Ábrela siempre desde ese icono: funciona sin conexión.</li>
    </ol>
  </section>
  <p class="version">Finanzas · v1.2 · ${S.tx.length} movimientos guardados</p>`;
}

/* =====================================================================
   Render
   ===================================================================== */
const VIEWS = { home: viewHome, tx: viewTx, budget: viewBudget, goals: viewGoals, settings: viewSettings };
function render() {
  const y = window.scrollY;
  $('#view').innerHTML = VIEWS[ui.tab]();
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab || (ui.tab === 'settings' && b.dataset.tab === 'home')));
  window.scrollTo(0, y);
}
function setTab(t) {
  ui.tab = t;
  const v = $('#view');
  v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  render();
  window.scrollTo(0, 0);
}

/* =====================================================================
   Hojas (bottom sheets)
   ===================================================================== */
let sheetCleanup = null, sheetGen = 0;
function openSheet(html, mount, cls = '') {
  closeSheet(true);
  const gen = ++sheetGen;
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
  root.classList.add('open');
  const sheet = $('.sheet', root);
  requestAnimationFrame(() => requestAnimationFrame(() => gen === sheetGen && root.classList.add('show')));
  $('.backdrop', root).addEventListener('click', () => closeSheet());
  enableDrag(sheet);
  wireForm(sheet);
  sheetCleanup = mount ? mount(sheet) : null;
}
function closeSheet(immediate) {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) return;
  if (typeof sheetCleanup === 'function') sheetCleanup();
  sheetCleanup = null;
  root.classList.remove('show');
  const gen = sheetGen;
  const done = () => { if (gen !== sheetGen) return; root.classList.remove('open'); root.innerHTML = ''; };
  if (immediate) done(); else setTimeout(done, 300);
}
function enableDrag(sheet) {
  let y0 = null, dy = 0;
  const start = e => {
    if (!e.target.closest('.grabber, .sheet-title, .seg, .amount-display')) return;
    if (sheet.scrollTop > 0) return;
    y0 = e.touches[0].clientY; dy = 0; sheet.classList.add('dragging');
  };
  const move = e => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translate(-50%, ${dy}px)`;
  };
  const end = () => {
    if (y0 === null) return;
    y0 = null; sheet.classList.remove('dragging'); sheet.style.transform = '';
    if (dy > 110) closeSheet();
  };
  sheet.addEventListener('touchstart', start, { passive: true });
  sheet.addEventListener('touchmove', move, { passive: true });
  sheet.addEventListener('touchend', end);
}
function wireForm(sheet) {
  sheet.addEventListener('click', e => {
    const sw = e.target.closest('[data-color]');
    if (sw) {
      const w = sw.closest('.swatches');
      $$('[data-color]', w).forEach(x => x.classList.toggle('sel', x === sw));
      w.dataset.value = sw.dataset.color;
    }
    const sb = e.target.closest('.seg button[data-v]');
    if (sb) {
      const w = sb.closest('.seg');
      $$('button', w).forEach(x => x.classList.toggle('on', x === sb));
      w.dataset.value = sb.dataset.v;
      w.dispatchEvent(new CustomEvent('segchange', { detail: sb.dataset.v }));
    }
  });
}
function formSheet({ title, body, onSave, onDelete, saveLabel = 'Guardar', mount }) {
  openSheet(`<h2 class="sheet-title">${title}</h2><div class="form">${body}</div>
    <div class="sheet-actions">${onDelete ? `<button class="btn-ghost danger" data-del aria-label="Eliminar">${I.trash}</button>` : ''}<button class="btn-primary" data-save>${saveLabel}</button></div>`,
    sheet => {
      $('[data-save]', sheet).addEventListener('click', () => { if (onSave(sheet) !== false) closeSheet(); });
      if (onDelete) $('[data-del]', sheet).addEventListener('click', () => { if (onDelete(sheet) !== false) closeSheet(); });
      return mount ? mount(sheet) : null;
    });
}

/* ---------- Hoja de movimiento (con teclado numérico propio) ---------- */
function defaultCat(type) {
  return sortedCats(type)[0]?.id || (type === 'expense' ? 'otros-g' : 'otros-i');
}
function accPills(role, sel, exclude) {
  return `<div class="acc-row" data-role="${role}">${S.accounts.map(a => `<button class="acc-pill ${a.id === sel ? 'sel' : ''}" data-acc="${a.id}" style="--c:${a.color}" ${a.id === exclude ? 'disabled' : ''}>${a.emoji} ${esc(a.name)}</button>`).join('')}</div>`;
}
function openTxSheet({ type = 'expense', id = null } = {}) {
  const editing = id ? S.tx.find(t => t.id === id) : null;
  if (type === 'transfer' && !multiAcc()) type = 'expense';
  const t0 = editing ? editing.type : type;
  const startAcc = editing ? editing.acc
    : ui.accFilter && S.accounts.some(a => a.id === ui.accFilter) ? ui.accFilter
    : t0 === 'transfer' ? S.accounts[0].id : acc(S.lastAcc).id;
  const st = {
    type: t0,
    amount: editing ? toInput(editing.amount) : '',
    cat: editing && editing.cat ? editing.cat : defaultCat(t0 === 'income' ? 'income' : 'expense'),
    acc: startAcc,
    to: editing?.to || (S.accounts.find(a => a.id !== startAcc) || S.accounts[0]).id,
    date: editing ? editing.date : ui.month === curMonth() ? todayISO() : `${ui.month}-01`,
  };
  const types = [['expense', 'Gasto'], ['income', 'Ingreso']];
  if (multiAcc() || st.type === 'transfer') types.push(['transfer', '⇄ Mover']);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];
  openSheet(`
    <div class="seg" data-value="${st.type}">
      ${types.map(([v, l]) => `<button data-v="${v}" class="${st.type === v ? 'on' : ''}">${l}</button>`).join('')}
    </div>
    <div class="amount-display" id="amtBox"><span class="amt" id="amt">0</span><span class="cur">${esc(S.currency.trim())}</span></div>
    <div id="pick"></div>
    <div class="meta-row">
      <input class="input" id="note" placeholder="Nota (opcional)" maxlength="60" value="${esc(editing?.note || '')}" autocomplete="off">
      <label class="date-chip">${I.cal}<span id="dateLbl"></span><input type="date" id="date" value="${st.date}" max="${todayISO()}"></label>
    </div>
    ${editing ? (editing.rec ? `<p class="hint" style="margin:0 2px 10px">${I.repeat.replace('<svg', '<svg style="width:12px;height:12px;display:inline;vertical-align:-1px"')} Generado por un movimiento recurrente</p>` : '')
      : `<label class="check" id="repeatRow"><input type="checkbox" id="repeat"> Repetir cada mes</label>`}
    <div class="keypad">${keys.map(k => `<button class="key" data-k="${k}">${k === 'del' ? I.del : k}</button>`).join('')}</div>
    <div class="sheet-actions">
      ${editing ? `<button class="btn-ghost danger" id="delTx" aria-label="Eliminar">${I.trash}</button>` : ''}
      <button class="btn-primary" id="saveTx"></button>
    </div>`,
    sheet => {
      const amtEl = $('#amt', sheet), box = $('#amtBox', sheet);
      const drawAmount = () => {
        const a = st.amount;
        const [i, d] = a.split(',');
        const intPart = (i || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        amtEl.textContent = a.includes(',') ? `${intPart},${d}` : a ? intPart : '0';
        box.classList.toggle('empty', !a);
      };
      const drawPick = () => {
        const pick = $('#pick', sheet);
        if (st.type === 'transfer') {
          pick.innerHTML = `<div class="xfer">
            <p class="xfer-label">Desde <span>${money(accBalance(st.acc))} disponibles</span></p>${accPills('acc', st.acc)}
            <p class="xfer-label">Hacia</p>${accPills('to', st.to, st.acc)}</div>`;
          return;
        }
        pick.innerHTML = `<div class="cat-grid">${sortedCats(st.type).map(c =>
          `<button class="cat-tile ${c.id === st.cat ? 'sel' : ''}" data-cat="${c.id}" style="--c:${c.color}"><span>${c.emoji}</span><small>${esc(c.name)}</small></button>`).join('')}</div>
          ${multiAcc() ? accPills('acc', st.acc) : ''}`;
      };
      const drawType = () => {
        for (const t of ['expense', 'income', 'transfer']) sheet.classList.toggle('t-' + t, st.type === t);
        const rr = $('#repeatRow', sheet);
        if (rr) rr.style.display = st.type === 'transfer' ? 'none' : '';
        $('#saveTx', sheet).textContent = editing ? 'Guardar cambios' : { expense: 'Añadir gasto', income: 'Añadir ingreso', transfer: 'Transferir' }[st.type];
      };
      const drawDate = () => {
        const t = todayISO();
        $('#dateLbl', sheet).textContent = st.date === t ? 'Hoy' : dayLabel(st.date) === 'Ayer' ? 'Ayer' : shortDate(st.date);
      };
      const bump = () => { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); };
      const press = k => {
        let a = st.amount;
        if (k === 'del') a = a.slice(0, -1);
        else if (k === ',') { if (a.includes(',')) return bump(); a = (a || '0') + ','; }
        else {
          if (a.includes(',')) { if (a.split(',')[1].length >= 2) return bump(); }
          else if (a.replace(/^0+/, '').length >= 7) return bump();
          a = a === '0' ? k : a + k;
        }
        st.amount = a;
        drawAmount();
      };
      const submit = () => {
        const amount = parseNum(st.amount);
        if (amount <= 0) return bump();
        const note = $('#note', sheet).value.trim();
        const isT = st.type === 'transfer';
        if (isT && st.acc === st.to) return bump();
        const fields = isT
          ? { type: 'transfer', amount, acc: st.acc, to: st.to, note, date: st.date }
          : { type: st.type, amount, cat: st.cat, acc: st.acc, note, date: st.date };
        if (!isT) S.lastAcc = st.acc;
        if (editing) {
          if (isT) delete editing.cat; else delete editing.to;
          Object.assign(editing, fields);
          commit(); closeSheet();
          toast('✓ Cambios guardados');
          return;
        }
        const tx = { id: uid(), ...fields, created: Date.now() };
        if (!isT && $('#repeat', sheet)?.checked) {
          const r = { id: uid(), type: st.type, amount, cat: st.cat, acc: st.acc, note, day: +st.date.slice(8), last: st.date.slice(0, 7) };
          S.recurring.push(r);
          tx.rec = r.id;
        }
        S.tx.push(tx);
        commit(); closeSheet();
        const msg = isT
          ? `⇄ ${money(amount)}: ${acc(st.acc).emoji} → ${acc(st.to).emoji} ${esc(acc(st.to).name)}`
          : `${cat(st.cat).emoji} ${st.type === 'expense' ? 'Gasto' : 'Ingreso'} de ${money(amount)} añadido`;
        toast(msg, {
          label: 'Deshacer', fn: () => {
            S.tx = S.tx.filter(t => t.id !== tx.id);
            if (tx.rec) S.recurring = S.recurring.filter(r => r.id !== tx.rec);
            commit();
          },
        });
      };

      $('.seg', sheet).addEventListener('segchange', e => {
        st.type = e.detail;
        if (st.type !== 'transfer' && cat(st.cat).type !== st.type) st.cat = defaultCat(st.type);
        if (st.type === 'transfer' && st.to === st.acc) st.to = (S.accounts.find(a => a.id !== st.acc) || S.accounts[0]).id;
        drawType(); drawPick();
      });
      $('#pick', sheet).addEventListener('click', e => {
        const c = e.target.closest('[data-cat]');
        if (c) {
          st.cat = c.dataset.cat;
          $$('.cat-tile', sheet).forEach(x => x.classList.toggle('sel', x === c));
          return;
        }
        const a = e.target.closest('[data-acc]');
        if (!a || a.disabled) return;
        const role = a.closest('.acc-row').dataset.role;
        if (role === 'acc' && st.type === 'transfer' && st.to === a.dataset.acc) st.to = st.acc;
        st[role] = a.dataset.acc;
        const scroll = $('.cat-grid', sheet)?.scrollLeft;
        drawPick();
        if (scroll) $('.cat-grid', sheet).scrollLeft = scroll;
      });
      $('.keypad', sheet).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      $('#date', sheet).addEventListener('change', e => { if (e.target.value) { st.date = e.target.value; drawDate(); } });
      $('#saveTx', sheet).addEventListener('click', submit);
      $('#delTx', sheet)?.addEventListener('click', () => {
        const copy = { ...editing };
        S.tx = S.tx.filter(t => t.id !== editing.id);
        commit(); closeSheet();
        toast('Movimiento eliminado', { label: 'Deshacer', fn: () => { S.tx.push(copy); commit(); } });
      });
      const onKey = e => {
        if (e.target.matches('input:not([type=checkbox]), select, textarea')) { if (e.key === 'Enter') submit(); return; }
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === ',' || e.key === '.') press(',');
        else if (e.key === 'Backspace') press('del');
        else if (e.key === 'Enter') submit();
        else if (e.key === 'Escape') closeSheet();
        else return;
        e.preventDefault();
      };
      document.addEventListener('keydown', onKey);

      drawAmount(); drawType(); drawPick(); drawDate();
      return () => document.removeEventListener('keydown', onKey);
    });
}

/* ---------- Cuentas ---------- */
function openAccSheet(id = null) {
  const a = id ? acc(id) : { name: '', emoji: '💳', color: COLORS[Math.floor(Math.random() * COLORS.length)], initial: 0 };
  const used = id ? S.tx.filter(t => t.acc === id || t.to === id).length : 0;
  formSheet({
    title: id ? `${a.emoji} ${esc(a.name)}` : 'Nueva cuenta',
    body: `<div class="field-row emoji">
        <div class="field"><label>Icono</label><input class="input" id="ae" value="${esc(a.emoji)}" maxlength="8" autocomplete="off"></div>
        <div class="field"><label>Nombre</label><input class="input" id="an" value="${esc(a.name)}" maxlength="24" placeholder="Ej. Tarjeta, Ahorros, Revolut" autocomplete="off"></div>
      </div>
      <div class="field"><label>Saldo actual (${esc(S.currency.trim())})</label>
        <input class="input" id="ab" inputmode="decimal" value="${id ? toInput(accBalance(id)) || '0' : ''}" placeholder="0,00"></div>
      <p class="hint">${id ? 'Si no cuadra con tu banco, escribe el saldo real y se ajusta sin tocar tus movimientos.' : 'Lo que tienes ahora mismo en esta cuenta.'}</p>
      <div class="field"><label>Color</label>${swatches(a.color)}</div>
      ${id ? `<button type="button" class="btn-soft" data-see style="width:100%">${I.list} Ver sus ${used} movimientos</button>` : ''}`,
    onSave: s => {
      const name = $('#an', s).value.trim();
      if (!name) { $('#an', s).focus(); return false; }
      const balance = parseNum($('#ab', s).value);
      const data = { name, emoji: $('#ae', s).value.trim() || '💳', color: $('.swatches', s).dataset.value };
      if (id) { Object.assign(a, data); a.initial = round2(balance - accMoves(id)); }
      else S.accounts.push({ id: uid(), ...data, initial: balance });
      commit();
      toast(id ? '✓ Cuenta actualizada' : `${data.emoji} Cuenta creada`);
    },
    onDelete: id && S.accounts.length > 1 ? () => {
      const other = S.accounts.find(x => x.id !== id);
      if (!confirm(used ? `¿Eliminar "${a.name}"? Sus ${used} movimientos pasarán a "${other.name}".` : `¿Eliminar "${a.name}"?`)) return false;
      S.tx.forEach(t => { if (t.acc === id) t.acc = other.id; if (t.to === id) t.to = other.id; });
      // Transferencias que ahora irían de una cuenta a sí misma: ya no tienen sentido
      S.tx = S.tx.filter(t => !(t.type === 'transfer' && t.acc === t.to));
      S.recurring.forEach(r => { if (r.acc === id) r.acc = other.id; });
      other.initial = round2((other.initial || 0) + (a.initial || 0));
      S.accounts = S.accounts.filter(x => x.id !== id);
      if (ui.accFilter === id) ui.accFilter = null;
      commit();
    } : null,
    mount: s => {
      $('[data-see]', s)?.addEventListener('click', () => { closeSheet(); ui.accFilter = id; ui.catFilter = null; ui.filter = 'all'; setTab('tx'); });
    },
  });
}


/* ---------- Otras hojas ---------- */
function openBudgetSheet(id) {
  const c = cat(id);
  const spentNow = totals(monthTx(curMonth()).filter(t => t.cat === id && t.type === 'expense')).exp;
  const prevAvg = round2([1, 2, 3].reduce((s, k) => s + totals(monthTx(addMonths(curMonth(), -k)).filter(t => t.cat === id && t.type === 'expense')).exp, 0) / 3);
  formSheet({
    title: `${c.emoji} Presupuesto · ${esc(c.name)}`,
    body: `<div class="field"><label>Límite mensual (${esc(S.currency.trim())})</label>
      <input class="input" id="b" inputmode="decimal" placeholder="Ej. 200" value="${toInput(c.budget)}"></div>
      <p class="hint">Este mes llevas ${money(spentNow)}. Media de los últimos 3 meses: ${money(prevAvg)}.</p>`,
    onSave: s => { c.budget = parseNum($('#b', s).value); commit(); toast(c.budget ? '🎯 Presupuesto guardado' : 'Presupuesto quitado'); },
    onDelete: c.budget ? () => { c.budget = 0; commit(); toast('Presupuesto quitado'); } : null,
    mount: s => { setTimeout(() => $('#b', s).focus(), 320); },
  });
}

function openCatSheet({ id = null, type = 'expense' } = {}) {
  const c = id ? cat(id) : { name: '', emoji: type === 'expense' ? '🏷️' : '💵', color: COLORS[Math.floor(Math.random() * COLORS.length)], type, budget: 0 };
  const used = id ? S.tx.filter(t => t.cat === id).length : 0;
  formSheet({
    title: id ? 'Editar categoría' : `Nueva categoría de ${type === 'expense' ? 'gasto' : 'ingreso'}`,
    body: `<div class="field-row emoji">
        <div class="field"><label>Icono</label><input class="input" id="ce" value="${esc(c.emoji)}" maxlength="8" autocomplete="off"></div>
        <div class="field"><label>Nombre</label><input class="input" id="cn" value="${esc(c.name)}" maxlength="24" placeholder="Ej. Mascotas" autocomplete="off"></div>
      </div>
      <p class="hint">Toca el icono y usa el teclado de emojis 😀</p>
      <div class="field"><label>Color</label>${swatches(c.color)}</div>
      ${id && used ? `<p class="hint">${used} movimiento${used === 1 ? '' : 's'} usan esta categoría.</p>` : ''}`,
    onSave: s => {
      const name = $('#cn', s).value.trim();
      if (!name) { $('#cn', s).focus(); return false; }
      const emoji = $('#ce', s).value.trim() || '🏷️';
      const color = $('.swatches', s).dataset.value;
      if (id) Object.assign(c, { name, emoji, color });
      else S.categories.push({ id: uid(), name, emoji, color, type, budget: 0 });
      commit();
    },
    onDelete: id && !PROTECTED.includes(id) ? () => {
      const fallback = c.type === 'expense' ? 'otros-g' : 'otros-i';
      if (!confirm(used ? `¿Eliminar "${c.name}"? Sus ${used} movimientos pasarán a "Otros".` : `¿Eliminar "${c.name}"?`)) return false;
      S.tx.forEach(t => { if (t.cat === id) t.cat = fallback; });
      S.recurring.forEach(r => { if (r.cat === id) r.cat = fallback; });
      S.categories = S.categories.filter(x => x.id !== id);
      commit();
    } : null,
  });
}

function catSelect(type, sel) {
  return catsOf(type).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('');
}
function openRecSheet(id = null) {
  const r = id ? S.recurring.find(x => x.id === id) : { type: 'expense', amount: 0, cat: 'casa', note: '', day: new Date().getDate() };
  formSheet({
    title: id ? 'Editar recurrente' : 'Nuevo gasto/ingreso fijo',
    body: `<div class="seg" data-value="${r.type}"><button type="button" data-v="expense" class="${r.type === 'expense' ? 'on' : ''}">Gasto</button><button type="button" data-v="income" class="${r.type === 'income' ? 'on' : ''}">Ingreso</button></div>
      <div class="field"><label>Concepto</label><input class="input" id="rn" value="${esc(r.note)}" placeholder="Ej. Alquiler, Nómina, Gimnasio" maxlength="40"></div>
      <div class="field-row">
        <div class="field"><label>Importe</label><input class="input" id="ra" inputmode="decimal" value="${toInput(r.amount)}" placeholder="0,00"></div>
        <div class="field"><label>Día del mes</label><input class="input" id="rd" inputmode="numeric" value="${r.day}"></div>
      </div>
      <div class="field"><label>Categoría</label><select class="input" id="rc">${catSelect(r.type, r.cat)}</select></div>
      ${multiAcc() ? `<div class="field"><label>Cuenta</label><select class="input" id="racc">${S.accounts.map(a => `<option value="${a.id}" ${a.id === (r.acc || S.accounts[0].id) ? 'selected' : ''}>${a.emoji} ${esc(a.name)}</option>`).join('')}</select></div>` : ''}
      ${id ? '<p class="hint">Los cambios se aplican a los próximos meses.</p>' : '<label class="check" style="margin:0"><input type="checkbox" id="rnow" checked> Apuntar también el de este mes si el día ya ha pasado</label>'}`,
    onSave: s => {
      const amount = parseNum($('#ra', s).value);
      const day = Math.min(31, Math.max(1, parseInt($('#rd', s).value, 10) || 1));
      if (amount <= 0) { $('#ra', s).focus(); return false; }
      const data = { type: $('.seg', s).dataset.value, amount, day, cat: $('#rc', s).value, acc: $('#racc', s)?.value || S.accounts[0].id, note: $('#rn', s).value.trim() };
      if (id) Object.assign(r, data);
      else {
        const nr = { id: uid(), ...data, start: curMonth(), last: $('#rnow', s).checked ? null : curMonth() };
        S.recurring.push(nr);
        const n = runRecurring();
        if (n) toast(`${I.repeat.replace('<svg', '<svg style="width:14px;height:14px;display:inline;vertical-align:-2px"')} Apuntado el de este mes`);
      }
      commit();
    },
    onDelete: id ? () => {
      if (!confirm('¿Dejar de repetir este movimiento? Los ya apuntados se mantienen.')) return false;
      S.recurring = S.recurring.filter(x => x.id !== id);
      S.tx.forEach(t => { if (t.rec === id) delete t.rec; });
      commit();
    } : null,
    mount: s => {
      $('.seg', s).addEventListener('segchange', e => { $('#rc', s).innerHTML = catSelect(e.detail, e.detail === 'expense' ? 'casa' : 'nomina'); });
    },
  });
}

function openGoalSheet(id = null) {
  const g = id ? S.goals.find(x => x.id === id) : { name: '', emoji: '✈️', target: 0, saved: 0, color: '#4dabf7', deadline: '' };
  formSheet({
    title: id ? 'Editar meta' : 'Nueva meta de ahorro',
    body: `<div class="field-row emoji">
        <div class="field"><label>Icono</label><input class="input" id="ge" value="${esc(g.emoji)}" maxlength="8"></div>
        <div class="field"><label>Nombre</label><input class="input" id="gn" value="${esc(g.name)}" placeholder="Ej. Viaje a Japón" maxlength="30"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Objetivo</label><input class="input" id="gt" inputmode="decimal" value="${toInput(g.target)}" placeholder="0,00"></div>
        <div class="field"><label>Ya ahorrado</label><input class="input" id="gs" inputmode="decimal" value="${toInput(g.saved)}" placeholder="0,00"></div>
      </div>
      <div class="field"><label>Fecha límite (opcional)</label><input class="input" id="gd" type="month" value="${g.deadline || ''}" min="${curMonth()}"></div>
      <div class="field"><label>Color</label>${swatches(g.color)}</div>`,
    onSave: s => {
      const name = $('#gn', s).value.trim(), target = parseNum($('#gt', s).value);
      if (!name) { $('#gn', s).focus(); return false; }
      if (target <= 0) { $('#gt', s).focus(); return false; }
      const data = { name, target, emoji: $('#ge', s).value.trim() || '🎯', saved: parseNum($('#gs', s).value), deadline: $('#gd', s).value, color: $('.swatches', s).dataset.value };
      if (id) Object.assign(g, data); else S.goals.push({ id: uid(), ...data });
      commit();
    },
    onDelete: id ? () => { if (!confirm(`¿Eliminar la meta "${g.name}"?`)) return false; S.goals = S.goals.filter(x => x.id !== id); commit(); } : null,
  });
}

function openGoalMove(id, dir) {
  const g = S.goals.find(x => x.id === id);
  formSheet({
    title: `${g.emoji} ${dir > 0 ? 'Aportar a' : 'Retirar de'} ${esc(g.name)}`,
    saveLabel: dir > 0 ? 'Aportar' : 'Retirar',
    body: `<div class="field"><label>Cantidad</label><input class="input" id="gm" inputmode="decimal" placeholder="0,00" style="font-size:24px;height:58px;font-weight:700"></div>
      <p class="hint">Ahora: ${money(g.saved)} de ${money(g.target)}</p>`,
    onSave: s => {
      const v = parseNum($('#gm', s).value);
      if (v <= 0) { $('#gm', s).focus(); return false; }
      const before = g.saved;
      g.saved = round2(Math.max(0, g.saved + dir * v));
      commit();
      if (dir > 0 && before < g.target && g.saved >= g.target) toast(`🎉 ¡Has completado "${esc(g.name)}"!`);
      else toast(dir > 0 ? `🐷 +${money(v)} a ${esc(g.name)}` : `−${money(v)} de ${esc(g.name)}`);
    },
    mount: s => { setTimeout(() => $('#gm', s).focus(), 320); },
  });
}

/* =====================================================================
   Toast
   ===================================================================== */
let toastTimer;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${msg}</span>${action ? `<button>${action.label}</button>` : ''}`;
  if (action) $('button', el).addEventListener('click', () => { action.fn(); el.classList.remove('show'); });
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2800);
}

/* =====================================================================
   Exportar / importar
   ===================================================================== */
async function shareOrDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const file = new File([blob], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
function exportCSV() {
  if (!S.tx.length) return toast('No hay movimientos que exportar');
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Concepto', 'Importe'].join(';')];
  const num = n => n.toFixed(2).replace('.', ',');
  for (const t of [...S.tx].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (t.type === 'transfer') {
      rows.push([t.date, 'Transferencia', '', q(`${acc(t.acc).name} → ${acc(t.to).name}`), q(t.note || ''), num(t.amount)].join(';'));
      continue;
    }
    rows.push([t.date, t.type === 'income' ? 'Ingreso' : 'Gasto', q(cat(t.cat).name), q(acc(t.acc).name), q(t.note || ''), (t.type === 'income' ? '' : '-') + num(t.amount)].join(';'));
  }
  shareOrDownload('﻿' + rows.join('\r\n'), `finanzas-${todayISO()}.csv`, 'text/csv');
}
async function backup() {
  const ok = await shareOrDownload(JSON.stringify({ app: 'finanzas', exported: new Date().toISOString(), data: S }, null, 1), `finanzas-copia-${todayISO()}.json`, 'application/json');
  if (!ok) return;
  lsSet('finanzas.lastBackup', todayISO());
  render();
  toast('💾 Copia hecha. Próximo aviso en 7 días');
}
function restore(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed.data || parsed;
      if (!Array.isArray(data.tx) || !Array.isArray(data.categories)) throw new Error('formato');
      if (!confirm(`La copia tiene ${data.tx.length} movimientos. Sustituirá tus datos actuales. ¿Continuar?`)) return;
      lsSet('finanzas.antes-de-restaurar', JSON.stringify(S));
      S = normalize(data);
      S.version = Math.max(SCHEMA, data.version || 1);
      runRecurring();
      commit();
      toast('✓ Copia restaurada');
    } catch (e) { toast('⚠️ Ese archivo no es una copia válida'); }
  };
  reader.readAsText(file);
}

function loadDemo() {
  if (S.tx.length && !confirm('Se añadirán movimientos de ejemplo a tus datos. ¿Continuar?')) return;
  const rnd = (a, b) => round2(a + Math.random() * (b - a));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const now = new Date();
  for (let k = 5; k >= 0; k--) {
    const ym = addMonths(curMonth(), -k);
    const last = k === 0 ? now.getDate() : daysIn(ym);
    const bank = S.accounts[0].id;
    const cash = (S.accounts.find(a => a.id === 'efectivo') || S.accounts[S.accounts.length - 1]).id;
    const add = (day, type, c, amount, note = '') => {
      const a = c === 'comer' && amount < 15 ? cash : bank;
      if (day <= last) S.tx.push({ id: uid(), type, amount: round2(amount), cat: c, acc: a, note, date: `${ym}-${pad(day)}`, created: Date.now() + day });
    };
    if (cash !== bank) for (const d of [3, 17]) if (d <= last) S.tx.push({ id: uid(), type: 'transfer', amount: 50, acc: bank, to: cash, note: 'Cajero', date: `${ym}-${pad(d)}`, created: Date.now() + d });
    add(1, 'income', 'nomina', 1850, 'Nómina');
    if (Math.random() < 0.4) add(18, 'income', 'extra', rnd(120, 400), 'Proyecto freelance');
    add(2, 'expense', 'casa', 650, 'Alquiler');
    add(5, 'expense', 'factu', rnd(40, 75), 'Luz');
    add(8, 'expense', 'factu', 35, 'Internet y móvil');
    add(10, 'expense', 'subs', 12.99, 'Netflix');
    add(12, 'expense', 'subs', 10.99, 'Spotify');
    add(15, 'expense', 'salud', 39.9, 'Gimnasio');
    for (let d = 3; d <= 28; d += 7) add(d, 'expense', 'super', rnd(38, 92), 'Compra semanal');
    for (let d = 2; d <= 28; d += 3) add(d, 'expense', 'comer', 1.5, 'Café');
    for (let d = 4; d <= 28; d += pick([4, 5, 6])) add(d, 'expense', 'comer', rnd(12, 38), pick(['Cena', 'Menú del día', 'Sushi', 'Pizza']));
    for (let d = 6; d <= 28; d += 9) add(d, 'expense', 'transp', pick([20, 40, 54.3]), pick(['Gasolina', 'Abono transporte']));
    add(pick([9, 16, 23]), 'expense', 'ocio', rnd(15, 60), pick(['Cine', 'Concierto', 'Escape room']));
    add(pick([11, 20]), 'expense', 'compras', rnd(25, 120), pick(['Zapatillas', 'Ropa', 'Amazon']));
  }
  const budgets = { super: 300, comer: 160, ocio: 80, transp: 100, compras: 120, factu: 120 };
  for (const c of S.categories) if (budgets[c.id] && !c.budget) c.budget = budgets[c.id];
  if (!S.accounts.some(a => a.id === 'ahorro')) S.accounts.push({ id: 'ahorro', name: 'Cuenta ahorro', emoji: '🐷', color: '#f783ac', initial: 4200 });
  if (!S.accounts[0].initial) S.accounts[0].initial = 1200;
  if (!S.goals.length) {
    S.goals.push({ id: uid(), name: 'Fondo de emergencia', emoji: '🛟', target: 5000, saved: 1850, color: '#38d9a9', deadline: '' });
    S.goals.push({ id: uid(), name: 'Viaje a Japón', emoji: '🗾', target: 3000, saved: 720, color: '#f783ac', deadline: addMonths(curMonth(), 10) });
  }
  commit();
  toast('✨ Datos de ejemplo cargados. Bórralos desde Ajustes.');
}

/* =====================================================================
   Eventos
   ===================================================================== */
const ACTIONS = {
  tab: el => setTab(el.dataset.tab),
  month: el => { ui.month = addMonths(ui.month, +el.dataset.d); render(); },
  add: el => openTxSheet({ type: el.dataset.type }),
  edit: el => openTxSheet({ id: el.dataset.id }),
  fav: el => {
    const f = currentFavs[+el.dataset.i]; if (!f) return;
    const tx = { id: uid(), type: f.type, amount: f.amount, cat: f.cat, acc: f.acc, note: f.note, date: todayISO(), created: Date.now() };
    S.tx.push(tx); commit();
    toast(`${cat(f.cat).emoji} ${esc(f.note || cat(f.cat).name)} ${money(f.amount)} añadido`, { label: 'Deshacer', fn: () => { S.tx = S.tx.filter(t => t.id !== tx.id); commit(); } });
  },
  filter: el => { ui.filter = el.dataset.f; render(); },
  'cat-filter': el => { ui.catFilter = el.dataset.id; ui.filter = 'all'; setTab('tx'); },
  'clear-cat': () => { ui.catFilter = null; render(); },
  'clear-acc': () => { ui.accFilter = null; render(); },
  transfer: () => openTxSheet({ type: 'transfer' }),
  'acc-new': () => openAccSheet(),
  'acc-edit': el => openAccSheet(el.dataset.id),
  donut: el => { ui.donut = el.dataset.t; render(); },
  budget: el => openBudgetSheet(el.dataset.id),
  'goal-new': () => openGoalSheet(),
  'goal-edit': el => openGoalSheet(el.dataset.id),
  'goal-move': el => openGoalMove(el.dataset.id, +el.dataset.dir),
  'cat-edit': el => openCatSheet({ id: el.dataset.id }),
  'cat-new': el => openCatSheet({ type: el.dataset.type }),
  'rec-new': () => openRecSheet(),
  'rec-edit': el => openRecSheet(el.dataset.id),
  privacy: () => {
    privacy = !privacy;
    lsSet('finanzas.private', privacy ? '1' : null);
    render();
    toast(privacy ? '🙈 Cantidades ocultas. Toca el saldo para verlas' : '👀 Cantidades visibles');
  },
  'backup-later': () => { lsSet('finanzas.backupSnooze', todayISO()); render(); },
  'summary-ok': el => { lsSet('finanzas.seen.' + el.dataset.id, '1'); render(); },
  'hide-install': () => { localStorage.setItem('finanzas.hideInstall', '1'); render(); },
  csv: exportCSV,
  backup,
  restore: () => $('#restoreFile').click(),
  demo: loadDemo,
  wipe: () => {
    if (!confirm('¿Borrar TODOS tus datos? Esto no se puede deshacer.')) return;
    if (!confirm('¿Seguro? Te recomiendo hacer antes una copia de seguridad.')) return;
    S = fresh(); commit(); setTab('home'); toast('Datos borrados');
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el, e);
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { ui.query = e.target.value; $('#tx-list').innerHTML = txListHTML(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'currency') { S.currency = t.value; commit(); }
  else if (t.id === 'quickStart') { S.quickStart = t.checked; save(); toast(t.checked ? '⚡ La app se abrirá lista para apuntar' : 'Modo rápido desactivado'); }
  else if (t.id === 'privacyToggle') { privacy = t.checked; lsSet('finanzas.private', privacy ? '1' : null); render(); }
  else if (t.id === 'restoreFile' && t.files[0]) { restore(t.files[0]); t.value = ''; }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (runRecurring()) render();
});

/* =====================================================================
   Arranque
   ===================================================================== */
$$('.ti').forEach(el => { el.innerHTML = I[el.dataset.icon]; });
runRecurring();
render();

const hash = location.hash.replace('#', '');
if (hash === 'gasto' || hash === 'ingreso') {
  openTxSheet({ type: hash === 'gasto' ? 'expense' : 'income' });
  history.replaceState(null, '', location.pathname + location.search);
} else if (S.quickStart) {
  openTxSheet({ type: 'expense' });
}

if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
