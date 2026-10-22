// Tablero de administración de Sere (sere.ar/admin).
//
// Vive en un archivo aparte y no dentro de index.html a propósito (22/10/2026,
// auditoría del tablero): así `/admin` tiene una Content-Security-Policy sin
// 'unsafe-inline' para scripts (ver `vercel.json`). Si alguna vez se cuela
// HTML ajeno en la página, un <script> inyectado no corre.
//
// ⚠️ No agregar <script> en línea ni atributos onclick en index.html: con esa
// política el navegador los bloquea en silencio.
// Clave pública por diseño, la misma de la app y de /c (ver el comentario
// largo en `web/c/index.html`). Lo que protege los datos es la base.
const SUPABASE_URL = 'https://ggygiihhnkjrerpinhha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneWdpaWhobmtqcmVycGluaGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjc5NjEsImV4cCI6MjA5NzEwMzk2MX0.lHPjyKjJIYD_lUTCF7uMBCKj9tCK_67OyrIFkCLQ-BI';

// Mismas claves que `objetivos.metrica` acepta en la base (CHECK de la migración).
const METRICAS = {
  profesionales_activos: 'Profesionales activos (aprobados, con cobro y agenda cargados)',
  profesionales_aprobados: 'Profesionales aprobados',
  postulaciones_pendientes: 'Postulaciones por revisar',
  usuarios_registrados: 'Personas registradas',
  usuarios_nuevos_mes: 'Personas nuevas en el mes',
  sesiones_completadas_mes: 'Sesiones hechas en el mes',
  sesiones_completadas_total: 'Sesiones hechas en total',
  clientes_primera_sesion_pagada: 'Clientes con al menos una sesión hecha y pagada',
  clientes_primera_sesion_pagada_mes: 'Clientes con su primera sesión hecha y pagada en el mes',
  clientes_que_volvieron: 'Clientes con 2 o más sesiones hechas y pagadas',
  lista_espera_personas: 'Lista de espera: personas',
  lista_espera_profesionales: 'Lista de espera: profesionales',
};

const GRUPOS = [
  ['Profesionales', [
    // Los rótulos dicen exactamente lo que cuenta `admin_metricas()` (auditoría
    // del 22/10/2026, hallazgo 5). "Activos" es configuración cargada, no prueba
    // que haya un turno libre ni que el cobro funcione.
    ['profesionales_activos', 'Activos: aprobados, con cobro y agenda cargados'],
    ['profesionales_aprobados', 'Aprobados'],
    ['postulaciones_pendientes', 'Postulaciones por revisar'],
    ['profesionales_sin_cobro', 'Aprobados sin cobro cargado'],
    ['profesionales_sin_agenda', 'Aprobados sin agenda cargada'],
  ]],
  ['Personas', [
    ['usuarios_registrados', 'Registradas'],
    ['usuarios_nuevos_mes', 'Registradas este mes'],
    ['clientes_primera_sesion_pagada', 'Con al menos una sesión hecha y pagada'],
    ['clientes_primera_sesion_pagada_mes', 'Primera sesión hecha y pagada este mes'],
    ['clientes_que_volvieron', 'Con 2 o más sesiones hechas y pagadas'],
  ]],
  ['Sesiones', [
    ['sesiones_proximas', 'Próximas confirmadas'],
    ['sesiones_completadas_mes', 'Hechas este mes'],
    ['sesiones_completadas_total', 'Hechas en total'],
    // La base no guarda cuándo se canceló una reserva: esto cuenta las
    // creadas este mes que ya están canceladas.
    ['cancelaciones_mes', 'Reservas de este mes ya canceladas'],
  ]],
  ['Lista de espera', [
    ['lista_espera_personas', 'Personas'],
    ['lista_espera_profesionales', 'Profesionales'],
  ]],
];

// Mismas claves que devuelve `admin_pendientes()`. El orden es el de urgencia:
// primero lo que tiene plazo con personas esperando, después lo administrativo.
// El tercer elemento es la pestaña donde se resuelve: la fila lleva ahí.
const COLAS = [
  ['problemas', 'Problemas reportados desde una sesión', 'moderacion', 'Plazo de respuesta: 24 h.'],
  ['denuncias', 'Denuncias sin resolver', 'moderacion'],
  ['garantias', 'Pedidos de garantía', 'moderacion'],
  ['reembolsos', 'Reembolsos pendientes', 'plata'],
  ['usdt_reclamos', 'Reclamos de pago en USDT', 'plata'],
  ['usdt_sueltas', 'Transferencias USDT sin reserva', 'plata'],
  ['pagos', 'Sesiones internacionales por pagarle al profesional', 'plata'],
  ['sin_cerrar', 'Sesiones confirmadas que terminaron hace más de 24 h sin cerrarse', null, 'No hay prueba de asistencia. Todavía no tienen lista en el tablero: se revisan en la base, mirando la evidencia antes de decidir.'],
  ['postulaciones', 'Postulaciones de profesionales', 'profesionales'],
  ['identidad', 'Verificaciones de identidad', 'profesionales'],
  ['credenciales', 'Títulos y matrículas por revisar', 'profesionales'],
];

// Qué significa `vencidos` en cada cola que lo usa.
const VENCIDOS = {
  problemas: 'fuera de plazo',
  reembolsos: 'que el automático ya no va a intentar: hay que hacerlos a mano',
};

const DUENOS = [['andre', 'Andre'], ['joaquin', 'Joaquín'], ['ambos', 'Ambos']];
const TIPOS = { esencial: 'Esencial', entregable: 'Entregable', resultado: 'Resultado' };
const ESTADOS = [['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['cumplido', 'Cumplido'], ['parcial', 'Parcial'], ['no_cumplido', 'No cumplido']];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Sesión ───────────────────────────────────────────────────────────────────
// `sessionStorage`, igual que /c: muere al cerrar la pestaña. Un tablero con
// datos de otros no tiene por qué quedar abierto en una compu prestada.
const CLAVE_SESION = 'sere_admin_sesion';
let sesion = null;
function guardarSesion(s) { sesion = s; try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s)); } catch (e) { /* modo privado */ } }
function leerSesion() { try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null'); } catch { return null; } }
function borrarSesion() { sesion = null; try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada */ } }

function desdeRespuestaAuth(c) {
  return { access_token: c.access_token, refresh_token: c.refresh_token, expira: Date.now() + (c.expires_in || 3600) * 1000 };
}

// El token dura una hora; con el tablero abierto más que eso, se renueva solo.
async function tokenVigente() {
  if (!sesion) return null;
  if (Date.now() < sesion.expira - 60_000) return sesion.access_token;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sesion.refresh_token }),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok || !c.access_token) { salir(); return null; }
  guardarSesion(desdeRespuestaAuth(c));
  return sesion.access_token;
}

class ErrorApi extends Error { constructor(status, cuerpo) { super(cuerpo?.message || `Error ${status}`); this.status = status; this.cuerpo = cuerpo; } }

async function api(ruta, { method = 'GET', body, prefer } = {}) {
  const token = await tokenVigente();
  if (!token) throw new ErrorApi(401, { message: 'Sesión vencida' });
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const texto = await r.text();
  const cuerpo = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw new ErrorApi(r.status, cuerpo);
  return cuerpo;
}

// ── Ingreso ──────────────────────────────────────────────────────────────────
async function pedirCodigo() {
  const mail = $('mail').value.trim().toLowerCase();
  $('errorMail').textContent = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { $('errorMail').textContent = 'Revisá el mail.'; return; }
  $('btnCodigo').disabled = true;
  try {
    const captchaToken = await window.pedirCaptchaToken?.();
    const r = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      // `create_user: false`: acá no se crean cuentas. Un mail sin cuenta no
      // recibe código y nadie se entera de si existía.
      body: JSON.stringify({ email: mail, create_user: false, gotrue_meta_security: { captcha_token: captchaToken } }),
    });
    if (r.status === 429) { $('errorMail').textContent = 'Ya te mandamos uno recién. Esperá un minuto.'; return; }
    // Con `create_user: false` un mail inexistente también da error; se muestra
    // el paso del código igual, para no confirmar qué mails tienen cuenta.
    $('mandadoA').textContent = `Si ${mail} tiene cuenta en Sere, te llegó un código.`;
    $('pasoMail').hidden = true; $('pasoCodigo').hidden = false;
    $('codigo').focus();
  } catch (e) {
    $('errorMail').textContent = 'No pudimos mandar el código. Probá en un momento.';
  } finally {
    $('btnCodigo').disabled = false;
  }
}

async function confirmarCodigo() {
  const mail = $('mail').value.trim().toLowerCase();
  const token = $('codigo').value.replace(/\D/g, '');
  $('errorCodigo').textContent = '';
  if (!token) { $('errorCodigo').textContent = 'Escribí el código.'; return; }
  $('btnConfirmar').disabled = true;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, token, type: 'email' }),
    });
    const c = await r.json().catch(() => ({}));
    if (!r.ok || !c.access_token) {
      $('errorCodigo').textContent = r.status === 429 ? 'Probaste varias veces seguidas. Esperá un momento.' : 'Ese código no coincide, o ya venció.';
      return;
    }
    guardarSesion(desdeRespuestaAuth(c));
    await despuesDelMail();
  } catch (e) {
    $('errorCodigo').textContent = 'No pudimos confirmar el código. Probá de nuevo.';
  } finally {
    $('btnConfirmar').disabled = false;
  }
}

// ── Segundo factor (22/10/2026) ──────────────────────────────────────────────
// El código por mail da una sesión `aal1`. Para operar como admin hace falta
// `aal2`: la base (`is_admin()`) y las funciones (`_shared/aal.ts`) lo exigen,
// así que esta pantalla no es la que protege, es la que permite cumplirlo.

/** Lo que dice el token de sí mismo. Solo para decidir qué paso mostrar: quien
 *  decide qué se puede hacer es el servidor, que valida la firma. */
function datosDelToken(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch { return {}; }
}

async function auth(ruta, { method = 'GET', body } = {}) {
  const token = await tokenVigente();
  if (!token) throw new Error('Sesión vencida. Volvé a entrar.');
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${ruta}`, {
    method,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await r.text();
  let cuerpo = {};
  try { cuerpo = texto ? JSON.parse(texto) : {}; } catch { cuerpo = {}; }
  if (!r.ok) throw new Error(cuerpo.msg || cuerpo.message || cuerpo.error_description || `Error ${r.status}`);
  return cuerpo;
}

let factorId = null;

function mostrarPaso(id) {
  ['pasoMail', 'pasoCodigo', 'pasoAlta', 'pasoFactor'].forEach((p) => { $(p).hidden = p !== id; });
  $('tablero').hidden = true; $('ingreso').hidden = false;
}

async function despuesDelMail() {
  const datos = datosDelToken(sesion.access_token);
  // ¿Es admin? Se mira la columna propia (cada uno puede leer la suya): sin
  // eso, una cuenta común vería el paso del segundo factor sin motivo.
  let esAdmin = false;
  try { esAdmin = !!(await api(`profiles?id=eq.${datos.sub}&select=is_admin`))[0]?.is_admin; } catch { /* queda en false */ }
  if (!esAdmin) {
    borrarSesion(); mostrarPaso('pasoMail');
    $('errorMail').textContent = 'Esa cuenta no es de administración.';
    return;
  }
  if (datos.aal === 'aal2') { await abrirTablero(); return; }

  const user = await auth('user');
  const verificado = (user.factors ?? []).find((f) => f.factor_type === 'totp' && f.status === 'verified');
  if (verificado) {
    factorId = verificado.id;
    mostrarPaso('pasoFactor');
    $('codigoFactor').focus();
    return;
  }
  // Primera vez: se borran los intentos de alta que quedaron a medias (un
  // factor sin verificar no sirve y ocupa lugar) y se arranca uno nuevo.
  for (const f of (user.factors ?? []).filter((x) => x.factor_type === 'totp' && x.status !== 'verified')) {
    try { await auth(`factors/${f.id}`, { method: 'DELETE' }); } catch { /* sigue */ }
  }
  const alta = await auth('factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: `Sere admin ${new Date().toISOString().slice(0, 16)}` } });
  factorId = alta.id;
  $('qrAlta').src = alta.totp?.qr_code ?? '';
  $('claveAlta').textContent = alta.totp?.secret ?? '';
  mostrarPaso('pasoAlta');
  $('codigoAlta').focus();
}

async function verificarFactor(campo, error, boton) {
  const codigo = $(campo).value.replace(/\D/g, '');
  $(error).textContent = '';
  if (codigo.length !== 6) { $(error).textContent = 'Son 6 dígitos.'; return; }
  $(boton).disabled = true;
  try {
    const desafio = await auth(`factors/${factorId}/challenge`, { method: 'POST', body: {} });
    const c = await auth(`factors/${factorId}/verify`, { method: 'POST', body: { challenge_id: desafio.id, code: codigo } });
    if (!c.access_token) throw new Error('sin sesión');
    guardarSesion(desdeRespuestaAuth(c));
    $(campo).value = '';
    await abrirTablero();
  } catch (e) {
    $(error).textContent = 'Ese código no coincide. Fijate que sea el de Sere y que la hora del teléfono esté bien.';
  } finally {
    $(boton).disabled = false;
  }
}

function mostrarIngreso() {
  mostrarPaso('pasoMail');
  $('codigo').value = '';
}

// Cierra la sesión también en el servidor (el token deja de servir) y recarga
// la página: así no queda en memoria nada de lo que se vio, ni listas ni
// estados de pestañas. Si el pedido al servidor falla, igual se sale.
async function salir() {
  const token = sesion?.access_token;
  borrarSesion();
  if (token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      });
    } catch (e) { /* sin red: la sesión local ya se borró */ }
  }
  location.reload();
}

// ── Tablero ──────────────────────────────────────────────────────────────────
let metricas = {};
let objetivos = [];
let mesVisto = primeroDelMes(new Date());

function primeroDelMes(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isoMes(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function esMesActual() { return isoMes(mesVisto) === isoMes(primeroDelMes(new Date())); }

async function abrirTablero() {
  try {
    await cargarMetricas();
  } catch (e) {
    // `no_autorizado` (42501): la cuenta existe pero no es de administración.
    if (e.cuerpo?.code === '42501' || e.status === 403) {
      borrarSesion(); mostrarIngreso();
      $('errorMail').textContent = 'Esa cuenta no es de administración.';
      return;
    }
    if (e.status === 401) { salir(); return; }
    throw e;
  }
  $('ingreso').hidden = true; $('tablero').hidden = false;
  await Promise.all([cargarPendientes(), cargarObjetivos()]);
}

async function cargarMetricas() {
  metricas = await api('rpc/admin_metricas', { method: 'POST', body: {} });
  const hora = new Date(metricas.generado).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  $('actualizado').textContent = `Actualizado a las ${hora}`;
  $('notaMetricas').textContent = `Sin contar ${metricas.cuentas_descartadas} cuentas de prueba, de administración o dadas de baja. "Este mes" es el mes en curso. "Hecha y pagada" es una sesión que ya ocurrió, con prueba de asistencia y cobro aprobado: las futuras ya pagadas no cuentan todavía.`;
  $('grupos').innerHTML = GRUPOS.map(([titulo, items]) => `
    <div class="caja${items.length >= 5 ? ' ancho' : ''}"><h3>${esc(titulo)}</h3><div class="tiles">
      ${items.map(([k, et]) => `<div class="tile${Number(metricas[k] ?? 0) === 0 ? ' cero' : ''}"><b>${esc(metricas[k] ?? 0)}</b><span>${esc(et)}</span></div>`).join('')}
    </div></div>`).join('');
}

function haceCuanto(fecha) {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  if (dias < 1) return 'Desde hoy';
  if (dias === 1) return 'Desde ayer';
  return `El más viejo, de hace ${dias} días`;
}

async function cargarPendientes() {
  let p;
  try {
    p = await api('rpc/admin_pendientes', { method: 'POST', body: {} });
  } catch (e) {
    $('listaAtencion').innerHTML = '<li class="error">No se pudo cargar.</li>';
    return;
  }
  const filas = COLAS.filter(([k]) => (p[k]?.cantidad ?? 0) > 0).map(([k, titulo, pestana, aclaracion]) => {
    const c = p[k];
    const vencidos = c.vencidos > 0 ? ` <span class="urgente">${c.vencidos} ${esc(VENCIDOS[k] ?? 'fuera de plazo')}</span>` : '';
    const detalle = [c.mas_antiguo ? haceCuanto(c.mas_antiguo) : '', aclaracion ?? ''].filter(Boolean).join('. ');
    const ir = pestana ? `<button class="btn sec chico" data-ir="${pestana}">Ver</button>` : '';
    return `<li${c.vencidos > 0 ? ' class="con-urgencia"' : ''}><b>${esc(c.cantidad)}</b><span class="que">${esc(titulo)}${vencidos}<br><span class="suave">${esc(detalle)}</span></span>${ir}</li>`;
  });
  $('listaAtencion').innerHTML = filas.length ? filas.join('') : '<li class="nada">✓ Nada pendiente. Todo al día.</li>';
  const deProfesionales = (p.postulaciones?.cantidad ?? 0) + (p.credenciales?.cantidad ?? 0);
  $('contProfesionales').textContent = deProfesionales > 0 ? deProfesionales : '';
  const deModeracion = (p.problemas?.cantidad ?? 0) + (p.denuncias?.cantidad ?? 0) + (p.garantias?.cantidad ?? 0);
  $('contModeracion').textContent = deModeracion > 0 ? deModeracion : '';
  const dePlata = ['reembolsos', 'usdt_reclamos', 'usdt_sueltas', 'pagos'].reduce((n, k) => n + (p[k]?.cantidad ?? 0), 0);
  $('contPlata').textContent = dePlata > 0 ? dePlata : '';
}

async function cargarObjetivos() {
  const nombreMes = mesVisto.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  $('mesNombre').textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  $('errorObjetivos').textContent = '';
  try {
    objetivos = await api(`objetivos?mes=eq.${isoMes(mesVisto)}&order=created_at.asc`);
  } catch (e) {
    $('errorObjetivos').textContent = 'No se pudieron cargar los objetivos.';
    objetivos = [];
  }
  pintarObjetivos();
}

// El avance automático es el valor de HOY. Para un mes que no es el actual no
// dice nada sobre ese mes, así que ahí se muestra el avance guardado.
function avanceDe(o) {
  if (o.metrica && esMesActual()) return { valor: Number(metricas[o.metrica] ?? 0), auto: true };
  return { valor: o.avance == null ? null : Number(o.avance), auto: false };
}

function pintarObjetivos() {
  $('columnas').innerHTML = DUENOS.map(([clave, nombre]) => {
    const lista = objetivos.filter((o) => o.dueno === clave);
    const cuerpo = lista.length ? lista.map(tarjetaObjetivo).join('') : '<p class="vacio">Sin objetivos cargados.</p>';
    return `<div class="caja"><h3>${esc(nombre)}</h3>${cuerpo}</div>`;
  }).join('');
}

function tarjetaObjetivo(o) {
  const { valor, auto } = avanceDe(o);
  let barra = '';
  if (o.meta) {
    const pct = valor == null ? 0 : Math.min(100, Math.round((valor / Number(o.meta)) * 100));
    const texto = valor == null ? `Meta: ${o.meta}` : `${valor} de ${o.meta}${auto ? ' (automático)' : ''}`;
    barra = `<div class="progreso"><i style="width:${pct}%"></i></div><div class="suave">${esc(texto)}</div>`;
  } else if (valor != null) {
    barra = `<div class="suave">Avance: ${esc(valor)}${auto ? ' (automático)' : ''}</div>`;
  }
  const congelar = o.metrica && esMesActual()
    ? `<button class="link" data-congelar="${o.id}" title="Guarda el valor de hoy como avance del mes">Guardar valor de hoy</button>` : '';
  return `<div class="obj">
    <div class="obj-cab"><span class="obj-titulo">${esc(o.titulo)}</span><span class="chip ${esc(o.tipo)}">${esc(TIPOS[o.tipo] ?? o.tipo)}</span></div>
    ${o.verificacion ? `<div class="suave">${esc(o.verificacion)}</div>` : ''}
    ${barra}
    ${o.nota ? `<div class="suave" style="margin-top:4px">${esc(o.nota)}</div>` : ''}
    <div class="obj-pie">
      <select data-estado="${o.id}" aria-label="Estado">${ESTADOS.map(([v, t]) => `<option value="${v}"${v === o.estado ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <button class="link" data-editar="${o.id}">Editar</button>
      ${congelar}
    </div>
  </div>`;
}

// ── Formulario ───────────────────────────────────────────────────────────────
let editando = null;

function abrirFormulario(o) {
  editando = o || null;
  $('dlgTitulo').textContent = o ? 'Editar objetivo' : 'Nuevo objetivo';
  $('fTitulo').value = o?.titulo ?? '';
  $('fDueno').value = o?.dueno ?? 'andre';
  $('fTipo').value = o?.tipo ?? 'entregable';
  $('fVerificacion').value = o?.verificacion ?? '';
  $('fMeta').value = o?.meta ?? '';
  $('fMetrica').value = o?.metrica ?? '';
  $('fAvance').value = o?.avance ?? '';
  $('fNota').value = o?.nota ?? '';
  $('btnBorrar').hidden = !o;
  $('errorForm').textContent = '';
  $('dlgObjetivo').showModal();
  $('fTitulo').focus();
}

const numeroONull = (v) => (v === '' || v == null ? null : Number(v));

async function guardarFormulario(ev) {
  ev.preventDefault();
  const datos = {
    titulo: $('fTitulo').value.trim(),
    dueno: $('fDueno').value,
    tipo: $('fTipo').value,
    verificacion: $('fVerificacion').value.trim() || null,
    meta: numeroONull($('fMeta').value),
    metrica: $('fMetrica').value || null,
    avance: numeroONull($('fAvance').value),
    nota: $('fNota').value.trim() || null,
  };
  if (!datos.titulo) { $('errorForm').textContent = 'Escribí el objetivo.'; return; }
  if (datos.meta !== null && !(datos.meta > 0)) { $('errorForm').textContent = 'La meta tiene que ser mayor que cero.'; return; }
  $('btnGuardar').disabled = true;
  try {
    if (editando) await api(`objetivos?id=eq.${editando.id}`, { method: 'PATCH', body: datos });
    else await api('objetivos', { method: 'POST', body: { ...datos, mes: isoMes(mesVisto) } });
    $('dlgObjetivo').close();
    await cargarObjetivos();
  } catch (e) {
    $('errorForm').textContent = 'No se pudo guardar. Probá de nuevo.';
  } finally {
    $('btnGuardar').disabled = false;
  }
}

async function borrarObjetivo() {
  if (!editando || !confirm(`¿Borrar "${editando.titulo}"?`)) return;
  try {
    await api(`objetivos?id=eq.${editando.id}`, { method: 'DELETE' });
    $('dlgObjetivo').close();
    await cargarObjetivos();
  } catch (e) {
    $('errorForm').textContent = 'No se pudo borrar.';
  }
}

async function cambiarEstado(id, estado) {
  try { await api(`objetivos?id=eq.${id}`, { method: 'PATCH', body: { estado } }); }
  catch (e) { $('errorObjetivos').textContent = 'No se pudo cambiar el estado.'; }
  await cargarObjetivos();
}

async function congelarAvance(id) {
  const o = objetivos.find((x) => x.id === id);
  if (!o?.metrica) return;
  try { await api(`objetivos?id=eq.${id}`, { method: 'PATCH', body: { avance: Number(metricas[o.metrica] ?? 0) } }); }
  catch (e) { $('errorObjetivos').textContent = 'No se pudo guardar el avance.'; }
  await cargarObjetivos();
}

// ── Cuentas de prueba ────────────────────────────────────────────────────────
let cuentasCargadas = false;

async function cargarCuentas() {
  $('errorCuentas').textContent = '';
  try {
    const filas = await api('rpc/admin_cuentas', { method: 'POST', body: {} });
    $('filasCuentas').innerHTML = filas.map((c) => `<tr>
      <td><input type="checkbox" data-interna="${c.id}"${c.interna ? ' checked' : ''} aria-label="De prueba" style="width:auto"></td>
      <td>${esc(c.nombre)}</td>
      <td class="mail">${esc(c.email)}</td>
      <td>${c.rol === 'coach' ? 'Profesional' : 'Persona'}</td>
      <td class="col-fecha">${esc(new Date(c.creada).toLocaleDateString('es-AR'))}</td>
    </tr>`).join('');
    cuentasCargadas = true;
  } catch (e) {
    $('errorCuentas').textContent = 'No se pudieron cargar las cuentas.';
  }
}

async function marcarInterna(id, interna, casilla) {
  casilla.disabled = true;
  try {
    if (interna) await api('cuentas_internas', { method: 'POST', body: { profile_id: id }, prefer: 'resolution=ignore-duplicates' });
    else await api(`cuentas_internas?profile_id=eq.${id}`, { method: 'DELETE' });
    await cargarMetricas();
    if (esMesActual()) pintarObjetivos();
  } catch (e) {
    casilla.checked = !interna;
    $('errorCuentas').textContent = 'No se pudo guardar el cambio.';
  } finally {
    casilla.disabled = false;
  }
}

// ── Acciones de admin (`admin-actions`) ──────────────────────────────────────
// La misma función que usa la app. Valida el token, confirma `is_admin` con la
// base y audita; acá solo se arma el pedido y se muestra lo que contesta.
async function llamarFuncion(fn, body) {
  const token = await tokenVigente();
  if (!token) throw new Error('Sesión vencida. Volvé a entrar.');
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // `guarantee-claim` contesta 401 en texto plano, no JSON.
  const texto = await r.text();
  let cuerpo = {};
  try { cuerpo = texto ? JSON.parse(texto) : {}; } catch { cuerpo = { error: texto }; }
  // Un `warning` es un éxito parcial: la acción se hizo, pero algo de lo que
  // venía después falló (casi siempre, el registro de auditoría). Se muestra
  // en pantalla y queda hasta que alguien lo cierre.
  if (cuerpo.warning) mostrarAvisoParcial(body.action ?? fn, cuerpo.warning);
  return { ok: r.ok, status: r.status, cuerpo };
}

function mostrarAvisoParcial(accion, texto) {
  const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'aviso aviso-parcial';
  div.innerHTML = `<b>Hecho, pero con un problema</b> (${esc(accion)}, ${esc(hora)}): ${esc(texto)} <button class="link" data-cerrar-aviso>Entendido</button>`;
  $('avisosParciales').appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function accionAdmin(body) {
  const { ok, status, cuerpo } = await llamarFuncion('admin-actions', body);
  if (!ok) throw new Error(cuerpo.error || `Error ${status}`);
  return cuerpo;
}

// Un documento firmado (DNI, selfie, matrícula) vence en 5 minutos y abrirlo
// queda auditado. La pestaña se abre ANTES de pedir el link: si se abre después
// de esperar la respuesta, el navegador lo toma como ventana emergente y la
// bloquea.
async function abrirDocumento(pedido) {
  const w = window.open('', '_blank');
  try {
    const { url } = await accionAdmin(pedido);
    if (w) { w.opener = null; w.location.href = url; } else location.href = url;
  } catch (e) {
    if (w) w.close();
    alert(`No se pudo abrir: ${e.message}`);
  }
}

// Solo links web. El link del video lo escribe quien se postula, y un
// `javascript:` en un href se ejecutaría con la sesión de un admin.
const linkSeguro = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-AR') : '');
const EXIGE_MATRICULA = ['Psicólogo/a', 'Nutricionista'];

let postulaciones = [];
let credenciales = [];
let abierto = null; // { id, tipo: 'entrevista' | 'rechazo' | 'rechazo-cred' }

async function cargarProfesionales() {
  await Promise.all([cargarPostulaciones(), cargarCredenciales()]);
}

async function cargarPostulaciones() {
  $('errorPostulaciones').textContent = '';
  try {
    const r = await accionAdmin({ action: 'list_coach_applications', status: $('filtroPostulaciones').value });
    postulaciones = r.applications ?? [];
  } catch (e) {
    postulaciones = [];
    $('errorPostulaciones').textContent = `No se pudieron cargar: ${e.message}`;
  }
  pintarPostulaciones();
}

async function cargarCredenciales() {
  $('errorCredenciales').textContent = '';
  try {
    const r = await accionAdmin({ action: 'list_pending_credentials' });
    credenciales = r.credentials ?? [];
  } catch (e) {
    credenciales = [];
    $('errorCredenciales').textContent = `No se pudieron cargar: ${e.message}`;
  }
  pintarCredenciales();
}

function requisito(cumple, texto, faltaTexto) {
  return `<div class="req"><span class="${cumple ? 'ok' : 'falta'}">${cumple ? '✓' : '•'}</span><span>${esc(cumple ? texto : faltaTexto)}</span></div>`;
}

function fichaPostulacion(c) {
  const pendiente = c.status === 'pendiente';
  const exigeMatricula = EXIGE_MATRICULA.includes(c.specialty);
  const video = linkSeguro(c.applicationVideoUrl);
  const datos = [c.specialty || 'Sin especialidad', c.price ? `$${Number(c.price).toLocaleString('es-AR')}` : '', c.nationality].filter(Boolean).join(' · ');

  let pasos = '';
  if (pendiente) {
    pasos = `<div class="requisitos">
      ${requisito(!!c.interviewedAt, `Entrevista registrada el ${fecha(c.interviewedAt)}`, 'Falta registrar la entrevista')}
      ${requisito(c.identidad === 'verificada', 'Identidad verificada',
        c.identidad === 'pendiente' ? 'Identidad: fotos cargadas, falta revisarlas' : 'Identidad: todavía no subió las fotos')}
      ${exigeMatricula ? requisito(c.matriculaVerificada, 'Matrícula verificada para esta profesión',
        c.matriculaPendiente ? 'Matrícula cargada: revisala abajo, en títulos y matrículas' : 'Matrícula: falta cargarla o corregirla') : ''}
    </div>`;
  }

  const identidad = pendiente && c.identidad === 'pendiente' ? `<div class="botonera">
      <button class="btn sec chico" data-foto="dni-frente" data-coach="${c.coachId}">Ver DNI, frente</button>
      <button class="btn sec chico" data-foto="dni-dorso" data-coach="${c.coachId}">Ver DNI, dorso</button>
      <button class="btn sec chico" data-foto="selfie" data-coach="${c.coachId}">Ver selfie con DNI</button>
      <button class="btn chico" data-identidad="${c.coachId}">Marcar identidad verificada</button>
    </div>` : '';

  let formulario = '';
  if (abierto?.id === c.coachId && abierto.tipo === 'entrevista') {
    formulario = `<div class="formulario-linea">
      <label for="txtEntrevista">Resumen privado de la entrevista</label>
      <textarea id="txtEntrevista" rows="3" maxlength="2000" placeholder="Criterio, experiencia y límites observados"></textarea>
      <div class="botonera"><button class="btn sec chico" data-cerrar>Cancelar</button><button class="btn chico" data-guardar-entrevista="${c.coachId}">Guardar entrevista</button></div>
    </div>`;
  } else if (abierto?.id === c.coachId && abierto.tipo === 'rechazo') {
    formulario = `<div class="formulario-linea">
      <label for="txtRechazo">Este texto le llega a ${esc(c.name)}. Decile qué corregir: puede volver a enviarla.</label>
      <textarea id="txtRechazo" rows="3" placeholder="El video no se ve o el link no abre."></textarea>
      <div class="botonera"><button class="btn sec chico" data-cerrar>Cancelar</button><button class="btn peligro chico" data-enviar-rechazo="${c.coachId}">Enviar rechazo</button></div>
    </div>`;
  }

  // Aprobar se ofrece solo cuando no falta nada; si falta algo, se dice qué en
  // vez de dejar tocar el botón para recibir un rechazo (el servidor lo vuelve
  // a controlar igual).
  const faltan = [
    !c.interviewedAt && 'la entrevista',
    c.identidad !== 'verificada' && 'la identidad',
    exigeMatricula && !c.matriculaVerificada && 'la matrícula',
  ].filter(Boolean);
  const acciones = pendiente && !abierto ? `<div class="botonera">
      ${!c.interviewedAt ? `<button class="btn sec chico" data-abrir="entrevista" data-coach="${c.coachId}">Registrar entrevista</button>` : ''}
      ${faltan.length
        ? `<button class="btn chico" disabled title="Falta ${esc(faltan.join(', '))}">Aprobar</button><span class="suave" style="align-self:center">Para aprobar falta ${esc(faltan.join(', ').replace(/, ([^,]*)$/, ' y $1'))}.</span>`
        : `<button class="btn chico" data-aprobar="${c.coachId}">Aprobar</button>`}
      <button class="btn sec chico" data-abrir="rechazo" data-coach="${c.coachId}">Rechazar</button>
    </div>` : '';

  return `<article class="caja ficha">
    <h3>${esc(c.name)}</h3>
    <div class="suave datos">${esc(datos)}<br>
      ${c.paisAtencion ? `Atiende desde ${esc([c.provinciaAtencion, c.paisAtencion].filter(Boolean).join(', '))} · ` : ''}Se postuló el ${esc(fecha(c.createdAt))}${c.email ? ` · ${esc(c.email)}` : ''}
      ${c.status === 'rechazada' && c.reviewedAt ? `<br>Rechazada el ${esc(fecha(c.reviewedAt))}` : ''}
    </div>
    ${pasos}
    ${identidad}
    ${c.bio ? `<div class="bloque"><b>Presentación</b>${esc(c.bio)}</div>` : ''}
    <div class="bloque"><b>Temas</b>${esc(c.topics?.join(', ') || 'Sin temas')}</div>
    <div class="bloque"><b>Cómo acompaña</b>${esc(c.estilo ?? 'Sin respuesta')} · Guía: ${esc(c.guia ?? 'sin respuesta')}<br>Focos: ${esc(c.focos?.join(', ') || 'sin respuesta')}</div>
    ${c.respuestaRiesgo ? `<div class="bloque"><b>Si alguien piensa en hacerse daño</b><div class="cita">${esc(c.respuestaRiesgo)}</div></div>` : ''}
    ${c.compromisoDerivar != null ? `<div class="bloque">${c.compromisoDerivar ? '✓ Se comprometió a derivar lo clínico' : 'No confirmó que deriva lo clínico'}</div>` : ''}
    ${c.notes ? `<div class="bloque"><b>${pendiente ? 'Rechazada antes por' : 'Motivo del rechazo'}</b><div class="cita">${esc(c.notes)}</div></div>` : ''}
    ${video ? `<div class="bloque"><a class="link" href="${esc(video)}" target="_blank" rel="noopener noreferrer">Ver video de postulación</a></div>`
      : c.applicationVideoUrl ? `<div class="aviso">El link del video no es una dirección web válida: ${esc(c.applicationVideoUrl)}</div>` : ''}
    ${formulario}
    ${acciones}
  </article>`;
}

function pintarPostulaciones() {
  $('listaPostulaciones').innerHTML = postulaciones.length
    ? postulaciones.map(fichaPostulacion).join('')
    : '<p class="vacio">No hay postulaciones en este estado.</p>';
}

const TIPO_CREDENCIAL = { matricula: 'Matrícula', titulo: 'Título', certificacion: 'Certificación' };

function fichaCredencial(c) {
  const esMatricula = c.kind === 'matricula';
  const rechazando = abierto?.id === c.id && abierto.tipo === 'rechazo-cred';
  const detalle = [c.institution, c.year, c.registration_number ? `N.º ${c.registration_number}` : ''].filter(Boolean).join(' · ');
  return `<article class="caja ficha">
    <h3>${esc(c.title)}</h3>
    <div class="suave datos">${esc(TIPO_CREDENCIAL[c.kind] ?? c.kind)} de ${esc(c.coach_name ?? 'Sin nombre')}${c.specialty ? ` (${esc(c.specialty)})` : ''}<br>${esc(detalle)}${detalle ? ' · ' : ''}Cargada el ${esc(fecha(c.created_at))}</div>
    ${!esMatricula && !c.coach_has_matricula ? '<div class="aviso">No tiene matrícula verificada. Aprobar esto suma a su perfil, pero no le da la marca de profesional: eso solo lo hace la matrícula.</div>' : ''}
    ${c.review_notes ? `<div class="bloque"><b>Nota anterior</b><div class="cita">${esc(c.review_notes)}</div></div>` : ''}
    ${c.has_file ? `<div class="botonera"><button class="btn sec chico" data-doc="${c.id}">Ver documento</button></div>` : '<div class="aviso">No subió documento.</div>'}
    ${rechazando ? `<div class="formulario-linea">
        <label for="txtRechazoCred">Este texto le llega al profesional. Decile qué corregir.</label>
        <textarea id="txtRechazoCred" rows="3"></textarea>
        <div class="botonera"><button class="btn sec chico" data-cerrar>Cancelar</button><button class="btn peligro chico" data-enviar-rechazo-cred="${c.id}">Enviar rechazo</button></div>
      </div>` : !abierto ? `<div class="botonera">
        ${esMatricula ? `<select id="prof-${c.id}" style="width:auto" aria-label="Profesión de la matrícula">
          <option value="">Profesión de la matrícula…</option>
          <option value="psicologia">Psicología</option>
          <option value="nutricion">Nutrición</option>
          <option value="otra">Otra</option>
        </select>` : ''}
        <button class="btn chico" data-verificar-cred="${c.id}">Verificar</button>
        <button class="btn sec chico" data-abrir="rechazo-cred" data-cred="${c.id}">Rechazar</button>
      </div>` : ''}
  </article>`;
}

function pintarCredenciales() {
  $('listaCredenciales').innerHTML = credenciales.length
    ? credenciales.map(fichaCredencial).join('')
    : '<p class="vacio">No hay títulos ni matrículas esperando.</p>';
}

function repintar() { pintarPostulaciones(); pintarCredenciales(); }

// Envuelve una acción: deshabilita los botones mientras corre, muestra el error
// tal como lo dice el servidor y recarga las listas y la atención al terminar.
async function hacer(boton, fn, okMsg) {
  const botones = document.querySelectorAll('#vistaProfesionales button');
  botones.forEach((b) => { b.disabled = true; });
  try {
    await fn();
    abierto = null;
    if (okMsg) alert(okMsg);
    await Promise.all([cargarProfesionales(), cargarPendientes()]);
  } catch (e) {
    alert(`No se pudo: ${e.message}`);
    botones.forEach((b) => { b.disabled = false; });
  }
}

function aprobar(c) {
  // Las mismas exigencias que la app. El servidor vuelve a controlarlas
  // (entrevista en `admin-actions`, identidad y matrícula en
  // `approve_coach_application`): esto es para avisar antes, no para proteger.
  if (!c.interviewedAt) return alert('Registrá la entrevista antes de aprobar.');
  if (c.identidad !== 'verificada') return alert('Mirá las fotos del DNI y la selfie, y marcá la identidad como verificada antes de aprobar.');
  if (EXIGE_MATRICULA.includes(c.specialty) && !c.matriculaVerificada) return alert('Verificá la matrícula correspondiente antes de aprobar.');
  if (!confirm(`¿Aprobar a ${c.name}?\n\nSe habilita su panel profesional. Aparece en las búsquedas cuando complete cobro y horarios.`)) return;
  hacer(null, () => accionAdmin({ action: 'set_coach_verified', coach_id: c.coachId, verified: true }), `Aprobaste a ${c.name}.`);
}

$('vistaProfesionales').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  const coach = (id) => postulaciones.find((c) => c.coachId === id);

  if (d.foto) return abrirDocumento({ action: 'identity_file_url', coach_id: d.coach, which: d.foto });
  if (d.doc) return abrirDocumento({ action: 'credential_file_url', credential_id: d.doc });
  if (d.cerrar !== undefined) { abierto = null; return repintar(); }
  if (d.abrir) {
    abierto = { id: d.coach || d.cred, tipo: d.abrir };
    repintar();
    document.querySelector('#vistaProfesionales textarea')?.focus();
    return;
  }
  if (d.identidad) {
    const c = coach(d.identidad);
    if (!confirm(`¿Identidad verificada?\n\nConfirmá que el nombre del DNI es "${c.name}" y que la cara de la selfie es la del DNI. Las tres fotos se borran al confirmar. Si algo no coincide, rechazá la postulación diciendo qué foto volver a subir.`)) return;
    return hacer(t, () => accionAdmin({ action: 'verify_identity', coach_id: c.coachId }), `Identidad de ${c.name} verificada. Las fotos se borraron.`);
  }
  if (d.guardarEntrevista) {
    const nota = $('txtEntrevista').value.trim();
    if (nota.length < 10) return alert('Anotá brevemente qué evaluaron en la entrevista (al menos 10 caracteres).');
    return hacer(t, () => accionAdmin({ action: 'record_coach_interview', coach_id: d.guardarEntrevista, notes: nota }), 'Entrevista registrada.');
  }
  if (d.aprobar) return aprobar(coach(d.aprobar));
  if (d.enviarRechazo) {
    const motivo = $('txtRechazo').value.trim();
    if (!motivo) return alert('Falta el motivo: le llega al profesional para que sepa qué corregir.');
    return hacer(t, () => accionAdmin({ action: 'reject_coach_application', coach_id: d.enviarRechazo, reason: motivo }), 'Rechazo enviado.');
  }
  if (d.verificarCred) {
    const c = credenciales.find((x) => x.id === d.verificarCred);
    const profesion = c.kind === 'matricula' ? $(`prof-${c.id}`).value : null;
    if (c.kind === 'matricula' && !profesion) return alert('Elegí de qué profesión es la matrícula, según el documento.');
    if (!confirm(`¿Verificar "${c.title}" de ${c.coach_name ?? 'este profesional'}?`)) return;
    return hacer(t, () => accionAdmin({ action: 'review_credential', credential_id: c.id, verified: true, profesion }), 'Credencial verificada.');
  }
  if (d.enviarRechazoCred) {
    const motivo = $('txtRechazoCred').value.trim();
    if (!motivo) return alert('Falta el motivo: le llega al profesional.');
    return hacer(t, () => accionAdmin({ action: 'review_credential', credential_id: d.enviarRechazoCred, verified: false, notes: motivo }), 'Rechazo enviado.');
  }
});

$('filtroPostulaciones').addEventListener('change', () => { abierto = null; cargarPostulaciones(); });

// ── Corregir nombre ──────────────────────────────────────────────────────────
let nombreCargado = false;
async function cargarAprobados() {
  try {
    const filas = await api('coaches?application_status=eq.aprobada&select=id,profiles!inner(name)&order=created_at.asc');
    $('nombreCoach').innerHTML = '<option value="">Elegí…</option>' + filas
      .map((c) => ({ id: c.id, nombre: (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)?.name ?? 'Sin nombre' }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
    nombreCargado = true;
  } catch (e) {
    alert('No se pudieron cargar los profesionales.');
  }
}
$('cajaNombre').addEventListener('toggle', () => { if ($('cajaNombre').open && !nombreCargado) cargarAprobados(); });
$('nombreCoach').addEventListener('change', () => {
  const op = $('nombreCoach').selectedOptions[0];
  $('nombreNuevo').value = $('nombreCoach').value ? op.textContent : '';
});
$('btnCorregirNombre').addEventListener('click', async () => {
  const id = $('nombreCoach').value;
  const actual = $('nombreCoach').selectedOptions[0]?.textContent;
  const nuevo = $('nombreNuevo').value.trim().replace(/\s+/g, ' ');
  const motivo = $('nombreMotivo').value.trim();
  if (!id) return alert('Elegí a quién le corregís el nombre.');
  if (nuevo.length < 2) return alert('Escribí el nombre correcto.');
  if (!motivo) return alert('Falta el motivo: queda en la auditoría.');
  if (!confirm(`¿Cambiar "${actual}" por "${nuevo}"?`)) return;
  try {
    await accionAdmin({ action: 'set_coach_name', coach_id: id, name: nuevo, reason: motivo });
    alert('Nombre corregido.');
    $('nombreMotivo').value = '';
    await cargarAprobados();
  } catch (e) { alert(`No se pudo: ${e.message}`); }
});

// ── Moderación ───────────────────────────────────────────────────────────────
const MOTIVO_PROBLEMA = {
  no_puedo_entrar: 'No puede entrar a la llamada',
  audio_video: 'No se ve o no se escucha',
  otro_no_llego: 'La otra parte no llegó',
  cobro: 'Problema con el cobro',
  otro: 'Otra cosa',
};
// Misma lista que `lib/reports.ts` (REPORT_REASONS).
const MOTIVO_DENUNCIA = {
  comportamiento: 'Comportamiento inapropiado o falta de respeto',
  contenido_ofensivo: 'Contenido ofensivo o inseguro',
  spam_estafa: 'Spam o intento de estafa',
  no_se_presento: 'No se presentó a la sesión',
  perfil_falso: 'Perfil falso o suplantación',
  otro: 'Otro',
};
const NIVELES = { advertencia: 'Advertencia', suspension: 'Suspensión', baja: 'Baja' };

let problemas = [];
let denuncias = [];
let sanciones = [];
let coachesVerificados = [];
let sancionAbierta = false;
let levantando = null;

async function nombresDe(ids) {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return new Map();
  const filas = await api(`profiles?id=in.(${unicos.join(',')})&select=id,name`);
  return new Map(filas.map((p) => [p.id, p.name]));
}

async function cargarModeracion() {
  await Promise.all([cargarProblemas(), cargarDenuncias(), cargarGarantias(), cargarSanciones()]);
}

async function cargarProblemas() {
  $('errorProblemas').textContent = '';
  try {
    problemas = await api('session_issues?estado=neq.resuelto&select=id,booking_id,reporter_id,rol,motivo,detalle,estado,respuesta,contexto_tecnico,created_at,bookings(scheduled_date,scheduled_time)&order=created_at.asc');
    const nombres = await nombresDe(problemas.map((p) => p.reporter_id));
    problemas.forEach((p) => { p.nombre = nombres.get(p.reporter_id) ?? 'Alguien'; });
  } catch (e) {
    problemas = [];
    $('errorProblemas').textContent = 'No se pudieron cargar.';
  }
  $('listaProblemas').innerHTML = problemas.length ? problemas.map((c) => {
    const horas = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 3_600_000);
    const b = Array.isArray(c.bookings) ? c.bookings[0] : c.bookings;
    const ctx = c.contexto_tecnico ?? {};
    const tecnico = [ctx.plataforma, ctx.version_so && `SO ${ctx.version_so}`, ctx.version_app && `app ${ctx.version_app}`, ctx.estado_sesion && `sesión ${ctx.estado_sesion}`].filter(Boolean).join(' · ');
    return `<article class="caja ficha">
      <h3>${esc(MOTIVO_PROBLEMA[c.motivo] ?? c.motivo)}</h3>
      <div class="suave datos">${esc(c.nombre)} (${esc(c.rol)}) · hace ${horas} h · ${c.estado === 'en_revision' ? 'en revisión' : 'sin responder'}
        ${horas >= 24 && c.estado !== 'en_revision' ? ' · <span class="urgente" style="color:var(--error);font-weight:600">fuera de plazo</span>' : ''}
        ${b ? `<br>Sesión del ${esc(String(b.scheduled_date).split('-').reverse().join('/'))} a las ${esc(String(b.scheduled_time).slice(0, 5))} hs` : ''}${tecnico ? `<br>${esc(tecnico)}` : ''}</div>
      ${c.detalle ? `<div class="cita">${esc(c.detalle)}</div>` : ''}
      ${c.respuesta ? `<div class="bloque"><b>Respuesta anterior</b><div class="cita">${esc(c.respuesta)}</div></div>` : ''}
      <div class="formulario-linea">
        <textarea id="resp-${c.id}" rows="2" maxlength="2000" placeholder="Respuesta (la lee la persona en la app)"></textarea>
        <div class="botonera" style="margin-top:0">
          <button class="btn sec chico" data-responder="${c.id}" data-estado="en_revision">Responder y dejar abierto</button>
          <button class="btn chico" data-responder="${c.id}" data-estado="resuelto">Responder y cerrar</button>
        </div>
      </div>
    </article>`;
  }).join('') : '<p class="vacio">No hay problemas abiertos.</p>';
}

async function cargarDenuncias() {
  $('errorDenuncias').textContent = '';
  try {
    denuncias = await api('reports?status=eq.pendiente&select=id,reason,details,created_at,reporter_id,reported_id&order=created_at.asc');
    const nombres = await nombresDe(denuncias.flatMap((r) => [r.reporter_id, r.reported_id]));
    denuncias.forEach((r) => { r.denunciante = nombres.get(r.reporter_id) ?? 'Alguien'; r.denunciado = nombres.get(r.reported_id) ?? 'Cuenta eliminada'; });
  } catch (e) {
    denuncias = [];
    $('errorDenuncias').textContent = 'No se pudieron cargar.';
  }
  $('listaDenuncias').innerHTML = denuncias.length ? denuncias.map((r) => `<article class="caja ficha">
      <h3>${esc(MOTIVO_DENUNCIA[r.reason] ?? r.reason)}</h3>
      <div class="suave datos">${esc(r.denunciante)} denunció a ${esc(r.denunciado)} · ${esc(fecha(r.created_at))}</div>
      ${r.details ? `<div class="cita">${esc(r.details)}</div>` : ''}
      <div class="botonera">
        <button class="btn chico" data-denuncia="${r.id}" data-resolucion="accionado" title="Se tomó una medida (por ejemplo, una sanción)">Accionado</button>
        <button class="btn sec chico" data-denuncia="${r.id}" data-resolucion="revisado" title="Se miró y no requiere medida">Revisado</button>
        <button class="btn sec chico" data-denuncia="${r.id}" data-resolucion="descartado" title="No corresponde">Descartado</button>
      </div>
    </article>`).join('') : '<p class="vacio">No hay denuncias sin revisar.</p>';
}

async function cargarGarantias() {
  $('errorGarantias').textContent = '';
  try {
    // Las pendientes van en su propia consulta y sin tope: antes salían de las
    // últimas 50 de cualquier estado, y una pendiente vieja podía quedar afuera
    // (auditoría del 22/10/2026, hallazgo 2).
    const [pendientes, resueltas] = await Promise.all([
      api('guarantee_claims?status=eq.pendiente&select=id,booking_id,status,requested_at&order=requested_at.asc'),
      api('guarantee_claims?status=neq.pendiente&select=id,booking_id,status,requested_at,resolved_at,resolved_by,notes&order=requested_at.desc&limit=50'),
    ]);
    $('listaGarantias').innerHTML = pendientes.map((c) => `<article class="caja ficha">
        <h3>Pedido de garantía</h3>
        <div class="suave datos">Pedida el ${esc(fecha(c.requested_at))} · reserva <code>${esc(c.booking_id)}</code></div>
        <div class="botonera"><button class="btn chico" data-revisar-garantia="${esc(c.booking_id)}">Revisar</button></div>
      </article>`).join('');
    $('listaGarantiasResueltas').innerHTML = resueltas.length ? resueltas.map((c) => `<div class="obj">
        <div class="obj-cab"><span class="obj-titulo">${esc(c.status)}</span><span class="suave">${esc(fecha(c.resolved_at ?? c.requested_at))}${c.resolved_by ? ` · ${esc(c.resolved_by)}` : ''}</span></div>
        ${c.notes ? `<div class="suave">${esc(c.notes)}</div>` : ''}
        <div class="suave"><code>${esc(c.booking_id)}</code></div>
      </div>`).join('') + (resueltas.length === 50 ? '<p class="suave">Se muestran las últimas 50.</p>' : '') : '<p class="vacio">Todavía no hay.</p>';
  } catch (e) {
    $('errorGarantias').textContent = 'No se pudieron cargar.';
  }
}

let garantiaRevisada = null;

async function verificarGarantia() {
  const id = $('garantiaReserva').value.trim();
  if (!id) return;
  $('resultadoGarantia').innerHTML = '<p class="suave">Verificando…</p>';
  try {
    // `dry_run`: corre las condiciones de §9.3 sin escribir nada. Un 422 no es
    // un fallo: es "no califica, y estos son los motivos".
    const { ok, cuerpo } = await llamarFuncion('guarantee-claim', { booking_id: id, dry_run: true });
    const alertas = Array.isArray(cuerpo.alertas) ? cuerpo.alertas : [];
    const motivos = Array.isArray(cuerpo.reasons) ? cuerpo.reasons : [];
    if (!ok && !motivos.length) { garantiaRevisada = null; $('resultadoGarantia').innerHTML = `<p class="error">${esc(cuerpo.error || 'No se pudo verificar.')}</p>`; return; }
    garantiaRevisada = { id, califica: ok };
    $('resultadoGarantia').innerHTML = `
      ${alertas.length ? `<div class="aviso"><b>Revisar antes de aprobar</b>${alertas.map((a) => `<br>· ${esc(a)}`).join('')}</div>` : ''}
      ${ok ? `<div class="requisitos"><div class="req"><span class="ok">✓</span><span>Califica. ${cuerpo.amount != null ? `Reintegro total: $${esc(Number(cuerpo.amount).toLocaleString('es-AR'))}` : 'Reintegro total'}${cuerpo.hours_since_session != null ? ` · ${esc(cuerpo.hours_since_session)} h desde la sesión` : ''}</span></div></div>`
        : `<div class="requisitos"><b style="color:var(--terra-ink)">No califica</b>${motivos.map((m) => `<div class="req"><span class="falta">•</span><span>${esc(m)}</span></div>`).join('')}<span class="suave">Podés rechazarla igual y dejar constancia: §9.3 permite denegar por abuso, y sin registro el reincidente es invisible.</span></div>`}
      <label for="garantiaMotivo">Motivo del rechazo (solo si vas a rechazar). La persona puede leerlo.</label>
      <textarea id="garantiaMotivo" rows="2"></textarea>
      <div class="botonera">
        ${ok ? '<button class="btn chico" id="btnAprobarGarantia">Aprobar y reembolsar</button>' : ''}
        <button class="btn peligro chico" id="btnRechazarGarantia">Rechazar</button>
      </div>`;
  } catch (e) {
    $('resultadoGarantia').innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

async function resolverGarantia(aprobar) {
  if (!garantiaRevisada) return;
  const motivo = $('garantiaMotivo')?.value.trim();
  if (!aprobar && !motivo) return alert('Falta el motivo: queda registrado para detectar reincidencia.');
  if (aprobar && !confirm('¿Aprobar y reembolsar? El reembolso se ejecuta solo en los próximos minutos.')) return;
  const body = aprobar ? { booking_id: garantiaRevisada.id } : { booking_id: garantiaRevisada.id, reject: motivo };
  const { ok, cuerpo } = await llamarFuncion('guarantee-claim', body);
  if (!ok) return alert(`No se pudo: ${cuerpo.error || 'probá de nuevo.'}`);
  alert(aprobar ? 'Aprobada. El reembolso queda marcado y se ejecuta en la próxima corrida (cada 5 min).' : 'Rechazada. Queda registrada la denegación.');
  garantiaRevisada = null;
  $('garantiaReserva').value = '';
  $('resultadoGarantia').innerHTML = '';
  await Promise.all([cargarGarantias(), cargarPendientes()]);
}

function sancionVigente(s) {
  if (s.revocadaAt || s.nivel === 'advertencia') return false;
  if (s.hasta === 'infinity') return true;
  const t = s.hasta ? new Date(s.hasta).getTime() : NaN;
  return Number.isFinite(t) && t > Date.now();
}

async function cargarSanciones() {
  $('errorSanciones').textContent = '';
  try {
    const [r, filas] = await Promise.all([
      accionAdmin({ action: 'list_sanctions' }),
      api('coaches?verified=eq.true&select=id,profiles!inner(name)&order=created_at.asc'),
    ]);
    sanciones = r.sanciones ?? [];
    coachesVerificados = filas
      .map((c) => ({ id: c.id, nombre: (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)?.name ?? 'Sin nombre' }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } catch (e) {
    $('errorSanciones').textContent = `No se pudieron cargar: ${e.message}`;
  }
  pintarSanciones();
}

function pintarSanciones() {
  $('formSancion').innerHTML = !sancionAbierta
    ? '<div class="botonera" style="margin:0 0 14px"><button class="btn chico" id="btnNuevaSancion">Aplicar una sanción</button></div>'
    : `<div class="caja ficha">
        <h3>Nueva sanción</h3>
        <label for="sCoach">Profesional</label>
        <select id="sCoach"><option value="">Elegí…</option>${coachesVerificados.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select>
        <div class="fila">
          <div><label for="sNivel">Escalón</label>
            <select id="sNivel"><option value="advertencia">Advertencia</option><option value="suspension">Suspensión</option><option value="baja">Baja</option></select></div>
          <div id="sCampoDias" hidden><label for="sDias">Días</label><input id="sDias" type="number" min="1" max="365" value="14"></div>
        </div>
        <label for="sMotivo">Motivo: lo lee el profesional</label>
        <textarea id="sMotivo" rows="3" placeholder="Qué pasó, en una o dos frases."></textarea>
        <label for="sEvidencia">Evidencia: solo la ve el equipo</label>
        <input id="sEvidencia" placeholder="Notas: IDs de reserva, qué se ve en las capturas.">
        <label for="sArchivos">Capturas o PDF (opcional)</label>
        <input id="sArchivos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,application/pdf">
        <div class="botonera"><button class="btn sec chico" id="btnCancelarSancion">Cancelar</button><button class="btn peligro chico" id="btnAplicarSancion">Aplicar</button></div>
      </div>`;
  $('listaSanciones').innerHTML = sanciones.length ? sanciones.map((s) => {
    const vigente = sancionVigente(s);
    const hasta = s.hasta === 'infinity' ? 'sin vencimiento' : s.hasta ? `hasta el ${fecha(s.hasta)}` : '';
    return `<article class="caja ficha" style="${s.revocadaAt ? 'opacity:.7' : ''}">
      <div class="obj-cab"><h3 style="flex:1">${esc(s.coachName)}</h3><span class="chip ${vigente ? 'resultado' : ''}">${esc(NIVELES[s.nivel] ?? s.nivel)}${vigente ? ' vigente' : ''}</span></div>
      <div class="suave datos">${esc(fecha(s.createdAt))}${hasta ? ` · ${esc(hasta)}` : ''}${s.revocadaAt ? ` · levantada el ${esc(fecha(s.revocadaAt))}` : ''}</div>
      <div class="bloque"><b>Motivo (lo ve el profesional)</b><div class="cita">${esc(s.motivo)}</div></div>
      ${s.evidencia ? `<div class="bloque"><b>Evidencia (solo el equipo)</b>${esc(s.evidencia)}</div>` : ''}
      ${s.revocadaMotivo ? `<div class="bloque"><b>Por qué se levantó</b>${esc(s.revocadaMotivo)}</div>` : ''}
      <div class="botonera">
        ${(s.adjuntos ?? []).map((a, i) => `<button class="btn sec chico" data-adjunto="${a.id}">${a.mime === 'application/pdf' ? 'PDF' : 'Captura'} ${i + 1}</button>`).join('')}
        <label class="btn sec chico" style="margin:0;cursor:pointer">Adjuntar<input type="file" multiple hidden data-adjuntar="${s.id}" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"></label>
        ${!s.revocadaAt && levantando !== s.id ? `<button class="btn sec chico" data-levantar="${s.id}">Levantar</button>` : ''}
      </div>
      ${levantando === s.id ? `<div class="formulario-linea">
        <label for="txtLevantar">Por qué se levanta (queda registrado)</label>
        <textarea id="txtLevantar" rows="2"></textarea>
        <div class="botonera"><button class="btn sec chico" data-cancelar-levantar>Cancelar</button><button class="btn chico" data-confirmar-levantar="${s.id}">Levantar sanción</button></div>
      </div>` : ''}
    </article>`;
  }).join('') : '<p class="vacio">No hay sanciones registradas.</p>';
}

const MIMES_EVIDENCIA = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

// El archivo no pasa por la función: ella firma una subida a un path que elige,
// el archivo va directo a storage y después ella confirma y registra. Sube de a
// uno y cuenta los que fallan, para que una captura mala no tire las demás.
async function subirEvidencia(sancionId, archivos) {
  let fallidos = 0;
  for (const f of archivos) {
    try {
      if (!MIMES_EVIDENCIA.includes(f.type)) throw new Error(`tipo no aceptado: ${f.type || 'desconocido'}`);
      const { path, token } = await accionAdmin({ action: 'sanction_evidence_upload', sancion_id: sancionId, mime: f.type });
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/sanction-evidence/${path}?token=${encodeURIComponent(token)}`, {
        method: 'PUT',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': f.type, 'x-upsert': 'false' },
        body: f,
      });
      if (!r.ok) throw new Error(`subida ${r.status}`);
      await accionAdmin({ action: 'sanction_evidence_register', sancion_id: sancionId, path, mime: f.type });
    } catch (e) {
      fallidos += 1;
      console.warn('[sanciones] adjunto', f.name, e);
    }
  }
  return fallidos;
}

async function aplicarSancion() {
  const coachId = $('sCoach').value;
  const nivel = $('sNivel').value;
  const motivo = $('sMotivo').value.trim();
  const evidencia = $('sEvidencia').value.trim();
  const dias = Number($('sDias').value);
  const archivos = [...$('sArchivos').files];
  if (!coachId) return alert('Elegí a quién se le aplica.');
  if (motivo.length < 10) return alert('Falta el motivo: lo va a leer el profesional y tiene que explicar qué pasó.');
  if (nivel === 'suspension' && (!Number.isFinite(dias) || dias < 1 || dias > 365)) return alert('Una suspensión necesita una duración de 1 a 365 días.');
  const nombre = coachesVerificados.find((c) => c.id === coachId)?.nombre ?? 'el profesional';
  const pregunta = nivel === 'advertencia' ? `¿Advertir a ${nombre}?\n\nNo cambia su visibilidad. Le llega una notificación con el motivo y queda registrada.`
    : `${nivel === 'suspension' ? `¿Suspender a ${nombre} ${dias} días?` : `¿Dar de baja a ${nombre}?`}\n\nSale del catálogo y no puede recibir reservas nuevas. Las sesiones ya agendadas las sigue atendiendo. Le llega una notificación con el motivo, y a la gente que atendía en los últimos 90 días le avisamos que no está tomando reservas, sin mencionar la sanción.`;
  if (!confirm(pregunta)) return;
  $('btnAplicarSancion').disabled = true;
  try {
    const r = await accionAdmin({ action: 'apply_sanction', coach_id: coachId, nivel, motivo, ...(nivel === 'suspension' ? { dias } : {}), ...(evidencia ? { evidencia } : {}) });
    // La sanción ya quedó. Los adjuntos van después porque necesitan su id; si
    // alguno falla, la sanción no se deshace y se puede adjuntar desde la ficha.
    const fallidos = r.sancion?.id && archivos.length ? await subirEvidencia(r.sancion.id, archivos) : 0;
    const avisados = Number(r.avisados ?? 0);
    alert(['Sanción aplicada.',
      avisados > 0 ? `Les avisamos a ${avisados === 1 ? '1 persona' : `${avisados} personas`} que atendían con este profesional, sin mencionar la sanción.` : '',
      fallidos > 0 ? `${fallidos} de ${archivos.length} adjuntos no se pudieron subir: agregalos desde la ficha.` : ''].filter(Boolean).join('\n\n'));
    sancionAbierta = false;
    await cargarSanciones();
  } catch (e) {
    alert(`No se pudo: ${e.message}`);
    $('btnAplicarSancion').disabled = false;
  }
}

$('vistaModeracion').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;

  if (d.responder) {
    const texto = $(`resp-${d.responder}`).value.trim();
    if (!texto) return alert('Falta la respuesta: la persona la lee en la sala de esa sesión.');
    t.disabled = true;
    try {
      await accionAdmin({ action: 'respond_session_issue', issue_id: d.responder, respuesta: texto, estado: d.estado });
      alert(d.estado === 'resuelto' ? 'Respondido y cerrado. Le avisamos.' : 'Respondido. Sigue abierto y le avisamos.');
      await Promise.all([cargarProblemas(), cargarPendientes()]);
    } catch (err) { alert(`No se pudo: ${err.message}`); t.disabled = false; }
    return;
  }
  if (d.denuncia) {
    t.disabled = true;
    try {
      await accionAdmin({ action: 'resolve_report', report_id: d.denuncia, status: d.resolucion });
      await Promise.all([cargarDenuncias(), cargarPendientes()]);
    } catch (err) { alert(`No se pudo: ${err.message}`); t.disabled = false; }
    return;
  }
  if (d.revisarGarantia) { $('garantiaReserva').value = d.revisarGarantia; return verificarGarantia(); }
  if (t.id === 'btnVerificarGarantia') return verificarGarantia();
  if (t.id === 'btnAprobarGarantia') return resolverGarantia(true);
  if (t.id === 'btnRechazarGarantia') return resolverGarantia(false);
  if (t.id === 'btnNuevaSancion') { sancionAbierta = true; pintarSanciones(); return; }
  if (t.id === 'btnCancelarSancion') { sancionAbierta = false; pintarSanciones(); return; }
  if (t.id === 'btnAplicarSancion') return aplicarSancion();
  if (d.adjunto) return abrirDocumento({ action: 'sanction_evidence_url', evidencia_id: d.adjunto });
  if (d.levantar) { levantando = d.levantar; pintarSanciones(); $('txtLevantar').focus(); return; }
  if (d.cancelarLevantar !== undefined) { levantando = null; pintarSanciones(); return; }
  if (d.confirmarLevantar) {
    const motivo = $('txtLevantar').value.trim();
    if (!motivo) return alert('Falta el motivo: el historial tiene que poder contar también nuestros errores.');
    t.disabled = true;
    try {
      await accionAdmin({ action: 'revoke_sanction', sancion_id: d.confirmarLevantar, motivo });
      levantando = null;
      await cargarSanciones();
    } catch (err) { alert(`No se pudo: ${err.message}`); t.disabled = false; }
  }
});

$('vistaModeracion').addEventListener('change', async (e) => {
  if (e.target.id === 'sNivel') { $('sCampoDias').hidden = e.target.value !== 'suspension'; return; }
  const input = e.target.closest('[data-adjuntar]');
  if (input && input.files.length) {
    const archivos = [...input.files];
    const fallidos = await subirEvidencia(input.dataset.adjuntar, archivos);
    if (fallidos > 0) alert(`${fallidos} de ${archivos.length} no se pudieron subir. Probá de nuevo con esos.`);
    await cargarSanciones();
  }
});
$('garantiaReserva').addEventListener('keydown', (e) => { if (e.key === 'Enter') verificarGarantia(); });

// ── Plata ────────────────────────────────────────────────────────────────────
// Las fórmulas son copia de `lib/payout.ts` y `lib/billing.ts` (redondeo
// incluido): el número de "a transferir" se tipea en una transferencia que no
// se deshace, y tiene que dar EXACTAMENTE lo mismo que en la app.
const coachNetFor = (amount, feePct) => Math.round((amount - Math.round(amount * feePct) / 100) * 100) / 100;
const USDT_NETWORK_FEE_USD = 1.5;
const platformDeliveryCost = (neto, rail) => (rail === 'usdt' ? USDT_NETWORK_FEE_USD : Math.round(neto * 2) / 100);
const comisionDe = (b) => {
  const amount = Number(b.amount ?? NaN), pct = Number(b.platform_fee_pct ?? NaN);
  return Number.isFinite(amount) && Number.isFinite(pct) ? Math.round(amount * pct) / 100 : 0;
};
const HASH_RE = /^[0-9a-fA-F]{64}$/;
// Si una consulta trae exactamente su tope, puede haber más filas que no
// llegaron: se dice, para no presentar una lista o un total parcial como
// completo (auditoría del 22/10/2026, hallazgo 2).
const avisoTope = (filas, tope, que) => (filas.length >= tope
  ? `<div class="aviso"><b>Lista incompleta:</b> se trajeron ${tope} ${que} y puede haber más. Hay que ampliar la consulta antes de confiar en este número.</div>` : '');
const dinero = (n) => Number(n).toFixed(2);
const fechaIso = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '');

let usdt = { claims: [], transfers: [] };
let pagos = [];
let topePagos = '';

async function cargarPlata() {
  await Promise.all([cargarUsdt(), cargarReembolsos(), cargarPagos(), cargarComisiones()]);
}

async function cargarUsdt() {
  $('errorUsdt').textContent = '';
  try {
    const r = await accionAdmin({ action: 'list_usdt_review' });
    usdt = { claims: r.claims ?? [], transfers: r.transfers ?? [] };
  } catch (e) {
    usdt = { claims: [], transfers: [] };
    $('errorUsdt').textContent = `No se pudo leer: ${e.message}`;
  }
  const claims = usdt.claims.map((c) => {
    const situacion = !c.reservaVencida ? 'La reserva todavía espera el pago. Aprobar acredita la sesión.'
      : c.puedeReactivar ? 'La reserva venció esperando el pago, pero el horario sigue libre: podés volver a dar la sesión o devolver el dinero.'
      : 'La reserva venció esperando el pago y el horario ya no está libre. Aprobar la deja para reintegro.';
    return `<article class="caja ficha">
      <h3>Comprobante en revisión · ${esc(dinero(c.recibido))} USDT</h3>
      <div class="suave datos">${c.esperado != null ? `Se esperaban ${esc(dinero(c.esperado))}` : 'Monto esperado desconocido'}${c.fecha ? ` · sesión del ${esc(fechaIso(c.fecha))} ${esc(String(c.hora ?? '').slice(0, 5))} hs` : ''}${c.coachName ? ` · ${esc(c.coachName)}` : ''}</div>
      <p>${esc(situacion)}</p>
      <div class="suave"><code>${esc(c.txId)}</code><br>desde <code>${esc(c.desde)}</code></div>
      <div class="formulario-linea">
        <input id="nota-${c.id}" placeholder="Motivo (obligatorio para rechazar)">
        <div class="botonera">
          ${c.reservaVencida && c.puedeReactivar ? `<button class="btn chico" data-claim="${c.id}" data-modo="reactivar">Acreditar y dar la sesión</button>` : ''}
          <button class="btn ${c.reservaVencida && c.puedeReactivar ? 'sec ' : ''}chico" data-claim="${c.id}" data-modo="aprobar">${c.reservaVencida ? 'Aprobar para reintegro' : 'Acreditar'}</button>
          <button class="btn sec chico" data-claim="${c.id}" data-modo="rechazar">Rechazar</button>
        </div>
      </div>
    </article>`;
  });
  const sueltas = usdt.transfers.map((t) => `<article class="caja ficha">
      <h3>Llegaron ${esc(dinero(t.monto))} USDT sin reserva</h3>
      <div class="suave datos">${esc(new Date(t.fecha).toLocaleString('es-AR'))}${t.estado === 'monto_menor' ? ' · los centavos coinciden con una reserva en espera, pero llegó de menos' : ''}</div>
      <p>Nadie presentó todavía un comprobante por esta transferencia. Si la persona escribe, pedile que lo cargue desde la pantalla de pago.</p>
      <div class="suave"><code>${esc(t.txId)}</code><br>desde <code>${esc(t.desde)}</code></div>
      <div class="formulario-linea">
        <input id="nota-${esc(t.txId)}" placeholder="Nota para descartarla (por ejemplo: prueba nuestra)">
        <div class="botonera"><button class="btn sec chico" data-descartar="${esc(t.txId)}">Descartar</button></div>
      </div>
    </article>`);
  $('listaUsdt').innerHTML = [...claims, ...sueltas].join('') || '<p class="vacio">No hay nada en revisión.</p>';
}

async function cargarReembolsos() {
  $('errorReembolsos').textContent = '';
  try {
    const filas = await api('bookings?payment_status=eq.reembolso_pendiente&select=id,payment_provider,usdt_amount,charged_amount,amount,currency,scheduled_date,scheduled_time,coach_name,refund_address,refund_network,refund_attempts,created_at&order=scheduled_date.asc&limit=100');
    const deUsdt = filas.filter((b) => b.payment_provider === 'usdt');
    const automaticos = filas.filter((b) => b.payment_provider !== 'usdt');
    const html = deUsdt.map((r) => {
      const monto = r.charged_amount != null ? Number(r.charged_amount) : r.usdt_amount != null ? Number(r.usdt_amount) : null;
      return `<article class="caja ficha">
        <h3>${monto != null ? `${esc(dinero(monto))} USDT` : 'Monto desconocido'}</h3>
        <div class="suave datos">Reembolso a mano · sesión del ${esc(fechaIso(r.scheduled_date))} ${esc(String(r.scheduled_time ?? '').slice(0, 5))} hs${r.coach_name ? ` · ${esc(r.coach_name)}` : ''}</div>
        ${r.refund_address ? `<div><code>${esc(r.refund_network)} · ${esc(r.refund_address)}</code></div>
          <div class="formulario-linea">
            <input id="tx-${r.id}" placeholder="Hash de la transacción (64 caracteres)" autocomplete="off" spellcheck="false">
            <div class="botonera"><button class="btn chico" data-reembolsado="${r.id}">Marcar reembolsado</button></div>
          </div>`
        : '<div class="aviso">La persona todavía no dio su dirección de reembolso. Pedísela por chat.</div>'}
      </article>`;
    });
    // Mercado Pago y PayPal se reembolsan solos (`mp-process-refunds` y
    // `paypal-process-refunds`, cada 5 minutos). Cada uno se rinde a los 6
    // intentos fallidos (MAX_ATTEMPTS) y deja la fila acá SIN avisar a nadie:
    // ese es el caso que hay que ver, porque la persona sigue sin su plata.
    // Encontrado el 22/10/2026 con un pago de prueba de $1 trabado desde agosto.
    const auto = automaticos.map((r) => {
      const rendido = (r.refund_attempts ?? 0) >= 6;
      const medio = r.payment_provider === 'paypal' ? 'PayPal' : 'Mercado Pago';
      return `<article class="caja ficha">
        <h3>${esc(medio)} · ${esc(r.currency ?? '')} ${esc(r.amount ?? '')}</h3>
        <div class="suave datos">Sesión del ${esc(fechaIso(r.scheduled_date))}${r.coach_name ? ` · ${esc(r.coach_name)}` : ''} · reserva <code>${esc(r.id)}</code></div>
        ${rendido
          ? `<div class="aviso"><b>El reembolso automático se rindió</b> después de ${esc(r.refund_attempts)} intentos fallidos y no lo va a volver a intentar. Hay que revisarlo y, si corresponde, devolverlo a mano desde ${esc(medio)}.</div>`
          : `<p class="suave">Se reembolsa solo en los próximos minutos${r.refund_attempts ? ` (lleva ${esc(r.refund_attempts)} intentos fallidos)` : ''}.</p>`}
      </article>`;
    });
    $('listaReembolsos').innerHTML = avisoTope(filas, 100, 'reembolsos') + ([...html, ...auto].join('') || '<p class="vacio">No hay reembolsos pendientes.</p>');
  } catch (e) {
    $('errorReembolsos').textContent = 'No se pudieron cargar.';
  }
}

async function cargarPagos() {
  $('errorPagos').textContent = '';
  try {
    // Dos consultas y no un embed, igual que la app: un profesional sin datos
    // de cobro desaparecería de la lista en vez de aparecer marcado.
    const filas = await api('bookings?payment_provider=neq.mp&status=eq.completada&payment_status=eq.aprobado&paid_out_at=is.null&select=id,coach_id,coach_name,scheduled_date,amount,platform_fee_pct,payment_provider&order=scheduled_date.asc&limit=500');
    topePagos = avisoTope(filas, 500, 'sesiones por pagar');
    const ids = [...new Set(filas.map((b) => b.coach_id).filter(Boolean))];
    const cuentas = ids.length ? await api(`coach_payout_accounts?coach_id=in.(${ids.join(',')})&select=coach_id,wallet,network,paypal_email`) : [];
    const porClave = new Map();
    for (const b of filas) {
      const amount = Number(b.amount ?? 0);
      const feePct = Number(b.platform_fee_pct ?? 20);
      const neto = coachNetFor(amount, feePct);
      // Una fila por (profesional, riel): un mismo profesional puede recibir
      // un pago por PayPal y otro por USDT, y no se pueden mezclar.
      const rail = b.payment_provider === 'usdt' ? 'usdt' : 'paypal';
      const clave = `${b.coach_id}|${rail}`;
      if (!porClave.has(clave)) {
        porClave.set(clave, { clave, coachName: b.coach_name, rail, bruto: 0, neto: 0, sesiones: [], destino: cuentas.find((c) => c.coach_id === b.coach_id) ?? null });
      }
      const e = porClave.get(clave);
      e.bruto += amount; e.neto += neto;
      e.sesiones.push({ bookingId: b.id, fecha: b.scheduled_date, amount, feePct, neto });
    }
    pagos = [...porClave.values()].map((e) => {
      const neto = Math.round(e.neto * 100) / 100;
      return { ...e, bruto: Math.round(e.bruto * 100) / 100, aTransferir: neto, costoPlataforma: platformDeliveryCost(neto, e.rail), noAlcanza: neto <= 0 };
    }).sort((a, b) => b.aTransferir - a.aTransferir);
  } catch (e) {
    // Vacía por error y vacía de verdad significan lo opuesto: "no le debemos
    // nada a nadie" contra "no pudimos averiguarlo". Se dice cuál es.
    pagos = [];
    $('errorPagos').textContent = `No se pudo leer la lista: ${e.message}`;
    $('listaPagos').innerHTML = '';
    return;
  }
  $('listaPagos').innerHTML = topePagos + (pagos.length ? pagos.map((p, i) => {
    const destino = p.rail === 'usdt'
      ? (p.destino?.wallet && p.destino?.network ? `${p.destino.network} · ${p.destino.wallet}` : null)
      : (p.destino?.paypal_email ? `PayPal · ${p.destino.paypal_email}` : null);
    return `<article class="caja ficha">
      <h3>${esc(p.coachName ?? 'Profesional sin nombre')}</h3>
      <div class="suave datos">${p.sesiones.length} ${p.sesiones.length === 1 ? 'sesión' : 'sesiones'} · bruto USD ${esc(dinero(p.bruto))} · se paga por ${p.rail === 'usdt' ? 'USDT' : 'PayPal'}</div>
      <div style="font-size:20px;font-weight:700">A transferir: USD ${esc(dinero(p.aTransferir))}</div>
      ${p.costoPlataforma > 0 ? `<div class="suave">Nos cuesta USD ${esc(dinero(p.costoPlataforma))} ${p.rail === 'usdt' ? 'de red' : 'de comisión de PayPal'} (no se le descuenta)</div>` : ''}
      ${p.noAlcanza ? '<div class="aviso">No hay nada que transferir en este riel todavía.</div>' : ''}
      <div class="bloque">${p.sesiones.map((x) => `<div class="suave"><code>${esc(fechaIso(x.fecha))} · USD ${esc(dinero(x.amount))} − ${esc(x.feePct)}% = ${esc(dinero(x.neto))}</code></div>`).join('')}</div>
      ${destino ? `<div><code>${esc(destino)}</code></div>
        <div class="formulario-linea">
          <input id="ref-${i}" placeholder="Hash de la tx o número de operación" autocomplete="off" spellcheck="false">
          <div class="botonera"><button class="btn chico" data-pagado="${i}"${p.noAlcanza ? ' disabled' : ''}>Marcar pagado</button></div>
        </div>`
      : `<div class="aviso">No tiene cargado el destino de ${p.rail === 'usdt' ? 'USDT (wallet y red)' : 'PayPal (mail)'}. Pedíselo antes de transferir.</div>`}
    </article>`;
  }).join('') : '<p class="vacio">No hay pagos pendientes a profesionales.</p>');
}

function agrupar(filas) {
  const mapa = new Map();
  for (const b of filas) {
    const mes = String(b.scheduled_date ?? '').slice(0, 7);
    if (mes.length !== 7) continue;
    const moneda = b.currency ?? 'ARS';
    const riel = b.payment_provider === 'mp' ? 'mp' : 'internacional';
    const clave = `${mes}|${b.coach_id}|${moneda}|${riel}`;
    if (!mapa.has(clave)) mapa.set(clave, { mes, coachName: b.coach_name, moneda, riel, sesiones: 0, bruto: 0, comision: 0 });
    const g = mapa.get(clave);
    g.sesiones += 1; g.bruto += Number(b.amount ?? 0); g.comision += comisionDe(b);
  }
  return [...mapa.values()]
    .map((g) => ({ ...g, bruto: Math.round(g.bruto * 100) / 100, comision: Math.round(g.comision * 100) / 100 }))
    .sort((a, b) => b.mes.localeCompare(a.mes) || b.comision - a.comision);
}

async function cargarComisiones() {
  $('errorComisiones').textContent = '';
  try {
    const filas = await api('bookings?payment_status=in.(aprobado,reembolsado,contracargo)&select=scheduled_date,coach_id,coach_name,amount,platform_fee_pct,currency,payment_provider,payment_status&order=scheduled_date.desc&limit=2000');
    const cobradas = agrupar(filas.filter((b) => b.payment_status === 'aprobado'));
    const reembolsadas = agrupar(filas.filter((b) => b.payment_status !== 'aprobado'));
    const totales = {};
    for (const g of cobradas) totales[g.moneda] = Math.round(((totales[g.moneda] ?? 0) + g.comision) * 100) / 100;
    const fila = (g) => `<tr><td>${esc(g.mes)}</td><td>${esc(g.coachName ?? 'Sin nombre')}</td><td>${g.sesiones}</td><td>${esc(g.moneda)} ${esc(dinero(g.bruto))}</td><td><b>${esc(g.moneda)} ${esc(dinero(g.comision))}</b></td><td class="col-fecha">${g.riel === 'mp' ? 'Mercado Pago' : 'Internacional'}</td></tr>`;
    const tabla = (gs) => `<div class="tabla"><table><thead><tr><th>Mes</th><th>Profesional</th><th>Sesiones</th><th>Bruto</th><th>Comisión</th><th class="col-fecha">Cómo se cobró</th></tr></thead><tbody>${gs.map(fila).join('')}</tbody></table></div>`;
    $('listaComisiones').innerHTML = `
      ${avisoTope(filas, 2000, 'reservas cobradas o reembolsadas: los totales pueden ser parciales')}
      ${Object.keys(totales).length ? `<div class="caja" style="margin-bottom:12px"><h3>Total de comisión cobrada</h3>${Object.entries(totales).map(([m, t]) => `<div style="font-size:20px;font-weight:700">${esc(m)} ${esc(dinero(t))}</div>`).join('')}<p class="suave" style="margin:6px 0 0">Mercado Pago: la retuvo el procesador, no pasó por una cuenta de Sere. Internacional: entró todo a Sere y se descontó al pagarle al profesional.</p></div>` : ''}
      <div class="caja">${cobradas.length ? tabla(cobradas) : '<p class="vacio">Todavía no hay comisiones cobradas.</p>'}</div>
      ${reembolsadas.length ? `<details class="caja" style="margin-top:12px"><summary>Reembolsadas o con contracargo (separadas, no restadas)</summary>${tabla(reembolsadas)}</details>` : ''}`;
  } catch (e) {
    $('errorComisiones').textContent = `No se pudo leer: ${e.message}`;
  }
}

$('vistaPlata').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t || t.disabled) return;
  const d = t.dataset;

  if (d.claim) {
    const c = usdt.claims.find((x) => x.id === d.claim);
    const motivo = $(`nota-${c.id}`).value.trim();
    const diferencia = c.esperado != null && Math.abs(c.recibido - c.esperado) >= 0.005
      ? ` Llegaron ${dinero(c.recibido)} y se esperaban ${dinero(c.esperado)}: la diferencia la absorbe Sere.` : '';
    if (d.modo === 'rechazar' && !motivo) return alert('Para rechazar un comprobante escribí por qué.');
    const pregunta = d.modo === 'reactivar' ? `¿Acreditar y volver a dar la sesión?\n\nEl horario sigue libre. Se crea de nuevo la reserva, ya pagada, y se avisa al profesional.${diferencia}`
      : d.modo === 'rechazar' ? '¿Rechazar el comprobante?'
      : c.reservaVencida ? '¿Aprobar para reintegro?\n\nLa reserva venció esperando el pago. No se reactiva: queda en reembolsos pendientes para que le devuelvas el dinero.'
      : `¿Acreditar el pago?\n\nSe confirma la sesión y se avisa al profesional.${diferencia}`;
    if (!confirm(pregunta)) return;
    t.disabled = true;
    try {
      const r = await accionAdmin({ action: 'resolve_usdt_claim', claim_id: c.id, approve: d.modo !== 'rechazar', motivo: motivo || undefined, reactivar: d.modo === 'reactivar' || undefined });
      await Promise.all([cargarUsdt(), cargarReembolsos(), cargarPendientes()]);
    } catch (err) { alert(`No se pudo: ${err.message}`); t.disabled = false; }
    return;
  }
  if (d.descartar) {
    const nota = document.getElementById(`nota-${d.descartar}`).value.trim();
    if (!nota) return alert('Escribí por qué se descarta esta transferencia.');
    t.disabled = true;
    try {
      await accionAdmin({ action: 'discard_usdt_transfer', tx_id: d.descartar, nota });
      await Promise.all([cargarUsdt(), cargarPendientes()]);
    } catch (err) { alert(`No se pudo: ${err.message}`); t.disabled = false; }
    return;
  }
  if (d.reembolsado) {
    const tx = $(`tx-${d.reembolsado}`).value.trim();
    if (!HASH_RE.test(tx)) return alert('Pegá el hash de la transacción: 64 caracteres, letras de la a a la f y números.');
    if (!confirm('¿Ya mandaste el reembolso? Queda registrado con ese hash como prueba.')) return;
    t.disabled = true;
    try {
      await accionAdmin({ action: 'mark_usdt_refunded', booking_id: d.reembolsado, refund_tx_id: tx });
      await Promise.all([cargarReembolsos(), cargarPendientes()]);
    } catch (err) { alert(`No se pudo registrar: ${err.message}`); t.disabled = false; }
    return;
  }
  if (d.pagado !== undefined) {
    const p = pagos[Number(d.pagado)];
    const ref = $(`ref-${d.pagado}`).value.trim();
    if (!ref) return alert('Pegá el hash de la transacción o el número de operación: es el comprobante.');
    // Marcar es irreversible desde el panel y declara que la plata ya salió.
    if (!confirm(`¿Ya transferiste USD ${dinero(p.aTransferir)} a ${p.coachName ?? 'este profesional'}?\n\nSe van a marcar ${p.sesiones.length} ${p.sesiones.length === 1 ? 'sesión' : 'sesiones'} como pagadas.`)) return;
    t.disabled = true;
    try {
      const r = await accionAdmin({ action: 'mark_coach_paid', booking_ids: p.sesiones.map((x) => x.bookingId), payout_reference: ref });
      await Promise.all([cargarPagos(), cargarPendientes()]);
    } catch (err) { alert(`No se pudo registrar: ${err.message}`); t.disabled = false; }
  }
});

// ── Registro ─────────────────────────────────────────────────────────────────
const ACCIONES = {
  set_coach_verified: 'cambió la publicación de un profesional',
  record_coach_interview: 'registró una entrevista',
  reject_coach_application: 'rechazó una postulación',
  set_coach_name: 'corrigió el nombre de un profesional',
  identity_file_url: 'abrió una foto de identidad',
  verify_identity: 'verificó la identidad de un profesional',
  credential_file_url: 'abrió un título o matrícula',
  review_credential: 'revisó un título o matrícula',
  resolve_report: 'resolvió una denuncia',
  respond_session_issue: 'respondió un problema de sesión',
  apply_sanction: 'aplicó una sanción',
  revoke_sanction: 'levantó una sanción',
  sanction_evidence_register: 'adjuntó evidencia a una sanción',
  sanction_evidence_url: 'abrió evidencia de una sanción',
  resolve_usdt_claim: 'resolvió un comprobante de USDT',
  discard_usdt_transfer: 'descartó una transferencia de USDT',
  mark_usdt_refunded: 'registró un reembolso en USDT',
  mark_coach_paid: 'registró un pago a un profesional',
};

Object.assign(ACCIONES, {
  objetivo_creado: 'creó un objetivo',
  objetivo_editado: 'editó un objetivo',
  objetivo_borrado: 'borró un objetivo',
  cuenta_marcada_prueba: 'marcó una cuenta como de prueba',
  cuenta_desmarcada_prueba: 'desmarcó una cuenta de prueba',
});
const TIPOS_OBJETO = { coach: 'Profesional', coach_credential: 'Título o matrícula', report: 'Denuncia', booking: 'Reserva', objetivo: 'Objetivo', profile: 'Cuenta', session_issue: 'Problema de sesión', sancion: 'Sanción', usdt_claim: 'Comprobante USDT', usdt_transfer: 'Transferencia USDT' };
const PAGINA_REGISTRO = 100;
let registro = [];
let registroHayMas = false;
const nombresObjeto = new Map();

// Nombre legible del objeto de cada entrada: profesionales y cuentas por su
// nombre; el resto por tipo y un id corto (sobrevive aunque se borre el objeto).
async function resolverNombres(filas) {
  const coaches = [...new Set(filas.filter((e) => e.target_type === 'coach' && e.target_id && !nombresObjeto.has(e.target_id)).map((e) => e.target_id))];
  const cuentas = [...new Set(filas.filter((e) => e.target_type === 'profile' && e.target_id && !nombresObjeto.has(e.target_id)).map((e) => e.target_id))];
  try {
    if (coaches.length) (await api(`coaches?id=in.(${coaches.join(',')})&select=id,profiles!inner(name)`))
      .forEach((c) => nombresObjeto.set(c.id, (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)?.name));
    if (cuentas.length) (await api(`profiles?id=in.(${cuentas.join(',')})&select=id,name`))
      .forEach((p) => nombresObjeto.set(p.id, p.name));
  } catch (e) { /* sin nombres se muestra el id */ }
}

async function cargarRegistro(desdeCero) {
  $('errorRegistro').textContent = '';
  try {
    const desde = desdeCero ? 0 : registro.length;
    const filas = await api(`admin_audit_log?select=id,admin_email,action,target_type,target_id,details,created_at&order=created_at.desc&limit=${PAGINA_REGISTRO}&offset=${desde}`);
    await resolverNombres(filas);
    registro = desdeCero ? filas : registro.concat(filas);
    registroHayMas = filas.length === PAGINA_REGISTRO;
  } catch (e) {
    $('errorRegistro').textContent = 'No se pudo cargar.';
  }
  pintarRegistro();
}

function pintarRegistro() {
  const admins = [...new Set(registro.map((e) => e.admin_email ?? 'Cuenta eliminada'))].sort();
  const acciones = [...new Set(registro.map((e) => e.action))].sort((a, b) => (ACCIONES[a] ?? a).localeCompare(ACCIONES[b] ?? b, 'es'));
  const fAdmin = $('filtroRegAdmin')?.value ?? '';
  const fAccion = $('filtroRegAccion')?.value ?? '';
  const fTexto = ($('filtroRegTexto')?.value ?? '').trim().toLowerCase();
  const visibles = registro.filter((e) => (!fAdmin || (e.admin_email ?? 'Cuenta eliminada') === fAdmin)
    && (!fAccion || e.action === fAccion)
    && (!fTexto || JSON.stringify([e.target_id, nombresObjeto.get(e.target_id), e.details]).toLowerCase().includes(fTexto)));
  $('listaRegistro').innerHTML = `
    <div class="fila" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:12px">
      <select id="filtroRegAdmin" aria-label="Filtrar por admin"><option value="">Todos los admins</option>${admins.map((a) => `<option${a === fAdmin ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <select id="filtroRegAccion" aria-label="Filtrar por acción"><option value="">Todas las acciones</option>${acciones.map((a) => `<option value="${esc(a)}"${a === fAccion ? ' selected' : ''}>${esc(ACCIONES[a] ?? a)}</option>`).join('')}</select>
      <input id="filtroRegTexto" placeholder="Buscar nombre o id" aria-label="Buscar en el registro" value="${esc(fTexto)}">
    </div>
    ${visibles.length ? visibles.map((e) => {
      const detalles = e.details ? Object.entries(e.details).filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : '';
      const nombre = nombresObjeto.get(e.target_id);
      const objeto = e.target_type ? `${TIPOS_OBJETO[e.target_type] ?? e.target_type}${nombre ? `: ${nombre}` : ''}${e.target_id ? ` (${String(e.target_id).slice(0, 8)})` : ''}` : '';
      return `<div class="obj">
        <div class="obj-cab"><span class="obj-titulo">${esc(e.admin_email ?? 'Cuenta eliminada')} ${esc(ACCIONES[e.action] ?? e.action)}</span><span class="suave">${esc(new Date(e.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span></div>
        ${objeto ? `<div>${esc(objeto)}</div>` : ''}
        ${detalles ? `<div class="suave">${esc(detalles)}</div>` : ''}
      </div>`;
    }).join('') : '<p class="vacio">No hay acciones con ese filtro.</p>'}
    ${registroHayMas ? '<div class="botonera"><button class="btn sec chico" id="btnMasRegistro">Ver más antiguas</button></div>' : ''}`;
}

$('vistaRegistro').addEventListener('change', (e) => {
  if (e.target.id === 'filtroRegAdmin' || e.target.id === 'filtroRegAccion') cargarRegistroFiltrado();
});
$('vistaRegistro').addEventListener('input', (e) => {
  if (e.target.id === 'filtroRegTexto') { clearTimeout(cargarRegistroFiltrado.t); cargarRegistroFiltrado.t = setTimeout(cargarRegistroFiltrado, 250); }
});
$('vistaRegistro').addEventListener('click', (e) => {
  if (e.target.id === 'btnMasRegistro') cargarRegistro(false);
});
// Filtrar no vuelve a pedir nada: repinta lo que ya se trajo, y devuelve el
// foco al campo donde se estaba escribiendo.
function cargarRegistroFiltrado() {
  const enfocado = document.activeElement?.id;
  const pos = document.activeElement?.selectionStart;
  pintarRegistro();
  if (enfocado) { const el = $(enfocado); el?.focus(); if (pos != null && el?.setSelectionRange) el.setSelectionRange(pos, pos); }
}

// ── Pestañas ─────────────────────────────────────────────────────────────────
// 🔴 Cada pestaña se vuelve a leer CADA VEZ que se entra, y "Actualizar"
// recarga la que se está mirando. Antes se cargaban una sola vez y "Actualizar"
// solo tocaba el Resumen: se podía hacer una transferencia mirando una lista
// que otra persona ya había resuelto (auditoría del 22/10/2026, hallazgo 1).
const VISTAS = { resumen: 'vistaResumen', profesionales: 'vistaProfesionales', moderacion: 'vistaModeracion', plata: 'vistaPlata', registro: 'vistaRegistro' };
const CARGAS = { profesionales: () => cargarProfesionales(), moderacion: () => cargarModeracion(), plata: () => cargarPlata(), registro: () => cargarRegistro(true) };
let pestanaActual = 'resumen';

async function cargarPestana(nombre) {
  if (!CARGAS[nombre]) return;
  $('cargandoVista').hidden = false;
  try { await CARGAS[nombre](); } finally { $('cargandoVista').hidden = true; }
}

function irAPestana(nombre) {
  pestanaActual = nombre;
  document.querySelectorAll('.pestanas [data-pestana]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.pestana === nombre)));
  Object.entries(VISTAS).forEach(([k, id]) => { $(id).hidden = k !== nombre; });
  window.scrollTo({ top: 0 });
  return cargarPestana(nombre);
}

document.querySelector('.pestanas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pestana]');
  if (b) irAPestana(b.dataset.pestana);
});
// Flechas izquierda y derecha entre pestañas, como pide el patrón de pestañas.
document.querySelector('.pestanas').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const nombres = Object.keys(VISTAS);
  const i = nombres.indexOf(pestanaActual) + (e.key === 'ArrowRight' ? 1 : -1);
  const siguiente = nombres[(i + nombres.length) % nombres.length];
  irAPestana(siguiente);
  $(`tab-${siguiente}`).focus();
});
$('tablero').addEventListener('click', (e) => {
  const ir = e.target.closest('[data-ir]');
  if (ir) { irAPestana(ir.dataset.ir); return; }
  const cerrar = e.target.closest('[data-cerrar-aviso]');
  if (cerrar) cerrar.closest('.aviso-parcial').remove();
});

// ── Eventos ──────────────────────────────────────────────────────────────────
$('btnCodigo').addEventListener('click', pedirCodigo);
$('mail').addEventListener('keydown', (e) => { if (e.key === 'Enter') pedirCodigo(); });
$('btnConfirmar').addEventListener('click', confirmarCodigo);
$('codigo').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmarCodigo(); });
$('btnAlta').addEventListener('click', () => verificarFactor('codigoAlta', 'errorAlta', 'btnAlta'));
$('codigoAlta').addEventListener('keydown', (e) => { if (e.key === 'Enter') verificarFactor('codigoAlta', 'errorAlta', 'btnAlta'); });
$('btnFactor').addEventListener('click', () => verificarFactor('codigoFactor', 'errorFactor', 'btnFactor'));
$('codigoFactor').addEventListener('keydown', (e) => { if (e.key === 'Enter') verificarFactor('codigoFactor', 'errorFactor', 'btnFactor'); });
$('btnSalir').addEventListener('click', salir);
$('btnRecargar').addEventListener('click', async () => {
  $('btnRecargar').disabled = true;
  try {
    await cargarMetricas();
    await Promise.all([cargarPendientes(), cargarObjetivos(), cargarPestana(pestanaActual)]);
  } finally { $('btnRecargar').disabled = false; }
});
$('mesAnterior').addEventListener('click', () => { mesVisto = new Date(mesVisto.getFullYear(), mesVisto.getMonth() - 1, 1); cargarObjetivos(); });
$('mesSiguiente').addEventListener('click', () => { mesVisto = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 1); cargarObjetivos(); });
$('btnNuevo').addEventListener('click', () => abrirFormulario(null));
$('btnCancelar').addEventListener('click', () => $('dlgObjetivo').close());
$('btnBorrar').addEventListener('click', borrarObjetivo);
$('formObjetivo').addEventListener('submit', guardarFormulario);
$('fMetrica').innerHTML += Object.entries(METRICAS).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('');
$('fMetrica').addEventListener('change', () => { $('campoAvance').hidden = !!$('fMetrica').value; });
$('dlgObjetivo').addEventListener('close', () => { $('campoAvance').hidden = false; });

$('columnas').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-editar]');
  if (ed) { abrirFormulario(objetivos.find((o) => o.id === ed.dataset.editar)); setTimeout(() => { $('campoAvance').hidden = !!$('fMetrica').value; }); return; }
  const cg = e.target.closest('[data-congelar]');
  if (cg) congelarAvance(cg.dataset.congelar);
});
$('columnas').addEventListener('change', (e) => {
  const sel = e.target.closest('[data-estado]');
  if (sel) cambiarEstado(sel.dataset.estado, sel.value);
});
$('cajaCuentas').addEventListener('toggle', () => { if ($('cajaCuentas').open && !cuentasCargadas) cargarCuentas(); });
$('filasCuentas').addEventListener('change', (e) => {
  const c = e.target.closest('[data-interna]');
  if (c) marcarInterna(c.dataset.interna, c.checked, c);
});

// ── Arranque ─────────────────────────────────────────────────────────────────
sesion = leerSesion();
// Con una sesión guardada se retoma donde quedó: si ya pasó el segundo factor
// entra directo; si no, se lo pide.
if (sesion) despuesDelMail().catch(() => salir());
else mostrarIngreso();
