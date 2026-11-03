// Pestaña Facturación del tablero (03/11/2026). Usa lo de admin.js ($, api,
// esc, dinero) y los cálculos de facturacion-calculo.js.
//
// No emite nada ante ARCA: arma cada factura con los números listos para
// copiar, y cuando Andre la hizo la anota en `facturas_comision`.

const FC = window.FacturacionCalculo;
const fact = { bookings: [], fiscales: [], facturas: [], tarjetas: [], notas: [] };

const nombreMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const ultimoDia = (mes) => { const [a, m] = mes.split('-').map(Number); return new Date(Date.UTC(a, m, 0)).getUTCDate(); };
const fechaAR = (iso) => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
const cuitLindo = (c) => `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
// Para pegar en ARCA: sin separador de miles y con coma decimal.
const paraArca = (n) => Number(n).toFixed(2).replace('.', ',');
const plata = (moneda, n) => `${moneda === 'USD' ? 'USD' : '$'} ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CONDICION = { monotributo: 'Responsable Monotributo', responsable_inscripto: 'IVA Responsable Inscripto', exento: 'IVA Sujeto Exento' };
const hoyAR = () => FC.mesAR(new Date().toISOString()) + '-' + new Date(Date.now() - 3 * 3600e3).toISOString().slice(8, 10);
const mesAnterior = (mes) => { const [a, m] = mes.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };

function dato(etiqueta, valor, copia) {
  return `<div class="dato"><span>${esc(etiqueta)}</span><span><b>${esc(valor)}</b>${copia != null ? `<button class="btn sec chico copiar" data-copiar="${esc(copia)}">Copiar</button>` : ''}</span></div>`;
}

function formAnotar(clave) {
  return `<div class="anotar">
      <div><label for="pv-${clave}">Punto de venta</label><input id="pv-${clave}" inputmode="numeric" placeholder="1"></div>
      <div><label for="num-${clave}">Número</label><input id="num-${clave}" inputmode="numeric" placeholder="23"></div>
      <div><label for="fecha-${clave}">Fecha</label><input id="fecha-${clave}" type="date" value="${hoyAR()}"></div>
    </div>`;
}

function opcionesMes(select, meses, elegido) {
  select.innerHTML = meses.map((m) => `<option value="${m}"${m === elegido ? ' selected' : ''}>${esc(nombreMes(m))}</option>`).join('');
  select.value = elegido;
}

async function cargarFacturacion() {
  $('errorFacturacion').textContent = '';
  try {
    const [bookings, fiscales, facturas] = await Promise.all([
      api('bookings?payment_status=in.(aprobado,reembolsado,contracargo)&paid_at=not.is.null&select=id,coach_id,coach_name,amount,platform_fee_pct,currency,payment_status,referral_discount,paid_at&order=paid_at.desc&limit=5000'),
      api('coach_datos_fiscales?select=coach_id,cuit,condicion'),
      api('facturas_comision?select=*&order=fecha.desc,created_at.desc'),
    ]);
    Object.assign(fact, { bookings, fiscales, facturas });
    if (bookings.length >= 5000) $('errorFacturacion').textContent = 'Hay más de 5000 cobros y no se trajeron todos: avisale a Claude antes de facturar.';

    const actual = FC.mesAR(new Date().toISOString());
    const meses = [...new Set([actual, ...bookings.map((b) => FC.mesAR(b.paid_at)).filter(Boolean)])].sort().reverse();
    const elegido = $('mesFactura').value || (meses.includes(mesAnterior(actual)) ? mesAnterior(actual) : actual);
    opcionesMes($('mesFactura'), meses, elegido);
    const emisiones = [...new Set([actual, ...facturas.map((f) => f.fecha.slice(0, 7))])].sort().reverse();
    opcionesMes($('mesEmision'), emisiones, $('mesEmision').value || actual);
    pintarFacturacion();
  } catch (e) {
    $('errorFacturacion').textContent = `No se pudo leer: ${e.message}`;
  }
}

function pintarFacturacion() {
  const mes = $('mesFactura').value;
  fact.tarjetas = FC.facturasDelMes(fact.bookings, fact.fiscales, fact.facturas, mes);
  fact.notas = FC.notasPendientes(fact.bookings, fact.facturas);
  const nombreDe = (id) => fact.bookings.find((b) => b.coach_id === id)?.coach_name ?? 'Sin nombre';

  const pendientes = fact.tarjetas.filter((t) => t.estado === 'pendiente').length;
  const sinCuit = fact.tarjetas.filter((t) => t.estado === 'sin_cuit').length;
  const hechas = fact.tarjetas.filter((t) => t.estado === 'hecha').length;
  $('contFacturacion').textContent = (pendientes + sinCuit + fact.notas.length) || '';
  $('resumenFacturacion').innerHTML = fact.tarjetas.length || fact.notas.length
    ? `<div class="caja" style="margin-top:12px"><b>${esc(nombreMes(mes))}:</b> ${pendientes} por hacer · ${hechas} hechas${sinCuit ? ` · <span style="color:var(--error)">${sinCuit} sin CUIT</span>` : ''}${fact.notas.length ? ` · ${fact.notas.length} nota${fact.notas.length > 1 ? 's' : ''} de crédito por hacer` : ''}</div>`
    : '';

  const concepto = `Servicio de intermediación tecnológica (comisión), ${nombreMes(mes).toLowerCase()}`;
  $('listaFacturas').innerHTML = fact.tarjetas.length ? fact.tarjetas.map((t, i) => {
    const titulo = `<h3>${esc(t.coach_name ?? 'Sin nombre')} <span class="chip">${t.moneda}</span> ${t.estado === 'hecha' ? '<span class="chip esencial">Hecha</span>' : t.estado === 'sin_cuit' ? '<span class="chip alta">Falta el CUIT</span>' : `<span class="chip alta">Factura ${t.letra}</span>`}</h3>
      <p class="suave" style="margin:0 0 8px">${t.sesiones} sesión${t.sesiones > 1 ? 'es' : ''} cobrada${t.sesiones > 1 ? 's' : ''} en ${esc(nombreMes(mes).toLowerCase())}</p>`;
    if (t.estado === 'hecha') {
      const f = t.factura;
      return `<div class="caja factura">${titulo}
        ${dato('Comprobante', `Factura ${f.letra} ${FC.numeroComprobante(f.punto_venta, f.numero)}`)}
        ${dato('Fecha', fechaAR(f.fecha))}
        ${dato('Total', plata(f.moneda, f.total))}
        ${t.afuera.length ? `<div class="aviso">${t.afuera.length} cobro${t.afuera.length > 1 ? 's' : ''} de este mes quedaron afuera de la factura (se acreditaron después de hacerla). Consultalo con Emilse antes de hacer nada.</div>` : ''}
        <div class="botonera"><button class="btn sec chico" data-borrar="${f.id}">Me equivoqué al anotarla</button></div>
      </div>`;
    }
    if (t.estado === 'sin_cuit') {
      return `<div class="caja factura">${titulo}
        ${dato('Total a facturar', plata(t.moneda, t.total))}
        <div class="aviso">Todavía no cargó su CUIT ni su condición frente al IVA (en la app: Perfil → Datos para tu factura). Pedíselo. Si vive afuera y no tiene CUIT, la factura es otra (tipo E): consultalo con Emilse.</div>
      </div>`;
    }
    const desde = `01/${mes.slice(5)}/${mes.slice(0, 4)}`, hasta = `${ultimoDia(mes)}/${mes.slice(5)}/${mes.slice(0, 4)}`;
    return `<div class="caja factura">${titulo}
      ${dato('Tipo de comprobante', `Factura ${t.letra}`)}
      ${dato('Condición frente al IVA', CONDICION[t.condicion])}
      ${dato('CUIT', cuitLindo(t.cuit), t.cuit)}
      ${dato('Período', `${desde} al ${hasta}`)}
      ${dato('Concepto', concepto, concepto)}
      ${t.moneda === 'USD' ? dato('Moneda', 'Dólar (cargá la cotización que pide ARCA)') : ''}
      ${dato('Neto', plata(t.moneda, t.neto), t.letra === 'A' ? paraArca(t.neto) : null)}
      ${dato('IVA 21%', plata(t.moneda, t.iva))}
      ${dato('Total', plata(t.moneda, t.total), t.letra === 'B' ? paraArca(t.total) : null)}
      <p class="suave" style="margin:8px 0 0">${t.letra === 'A' ? 'En ARCA pegá el <b>neto</b> como precio: ARCA suma el IVA.' : 'En ARCA pegá el <b>total</b> como precio: en la factura B el IVA va adentro.'} Antes de confirmar, el total de ARCA tiene que dar ${esc(plata(t.moneda, t.total))}.</p>
      ${formAnotar(`f${i}`)}
      <div class="botonera"><button class="btn chico" data-anotar="${i}">Ya la hice</button></div>
    </div>`;
  }).join('') : `<div class="caja"><p class="vacio">No hay comisiones cobradas en ${esc(nombreMes(mes).toLowerCase())} para facturar.</p></div>`;

  $('listaNotas').innerHTML = fact.notas.length ? fact.notas.map((n, i) => {
    const f = n.factura;
    return `<div class="caja factura">
      <h3>${esc(nombreDe(f.coach_id))} <span class="chip alta">Nota de crédito ${f.letra}</span></h3>
      <p class="suave" style="margin:0 0 8px">${n.sesiones} sesión${n.sesiones > 1 ? 'es' : ''} reembolsada${n.sesiones > 1 ? 's' : ''} de la factura ${f.letra} ${FC.numeroComprobante(f.punto_venta, f.numero)}</p>
      ${dato('Factura asociada', `${f.letra} ${FC.numeroComprobante(f.punto_venta, f.numero)} del ${fechaAR(f.fecha)}`)}
      ${dato('CUIT', cuitLindo(f.cuit), f.cuit)}
      ${dato('Neto', plata(f.moneda, n.neto), f.letra === 'A' ? paraArca(n.neto) : null)}
      ${dato('IVA 21%', plata(f.moneda, n.iva))}
      ${dato('Total', plata(f.moneda, n.total), f.letra === 'B' ? paraArca(n.total) : null)}
      ${formAnotar(`n${i}`)}
      <div class="botonera"><button class="btn chico" data-anotar-nota="${i}">Ya la hice</button></div>
    </div>`;
  }).join('') : '<div class="caja"><p class="vacio">No hay notas de crédito por hacer.</p></div>';

  pintarEmilse();
}

function pintarEmilse() {
  const mes = $('mesEmision').value;
  const nombreDe = (id) => fact.bookings.find((b) => b.coach_id === id)?.coach_name ?? 'Sin nombre';
  const delMes = fact.facturas.filter((f) => f.fecha.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!delMes.length) { $('textoEmilse').value = `Sin comprobantes emitidos en ${nombreMes(mes).toLowerCase()}.`; return; }
  const totales = {};
  const lineas = delMes.map((f) => {
    const signo = f.comprobante === 'nota_credito' ? -1 : 1;
    const t = (totales[f.moneda] ??= { neto: 0, iva: 0, total: 0 });
    t.neto += signo * f.neto; t.iva += signo * f.iva; t.total += signo * f.total;
    const tipo = f.comprobante === 'nota_credito' ? `Nota de crédito ${f.letra}` : `Factura ${f.letra}`;
    return `${fechaAR(f.fecha)} | ${tipo} ${FC.numeroComprobante(f.punto_venta, f.numero)} | CUIT ${cuitLindo(f.cuit)} | ${nombreDe(f.coach_id)} | Neto ${plata(f.moneda, signo * f.neto)} | IVA ${plata(f.moneda, signo * f.iva)} | Total ${plata(f.moneda, signo * f.total)}`;
  });
  const resumen = Object.entries(totales).map(([m, t]) => `Total ${m}: neto ${plata(m, t.neto)}, IVA ${plata(m, t.iva)}, total ${plata(m, t.total)}`);
  $('textoEmilse').value = [`Comprobantes de comisión emitidos por Sere en ${nombreMes(mes).toLowerCase()}:`, '', ...lineas, '', ...resumen].join('\n');
}

function leerAnotacion(clave) {
  const pv = Number($(`pv-${clave}`).value.trim()), numero = Number($(`num-${clave}`).value.trim()), fecha = $(`fecha-${clave}`).value;
  if (!Number.isInteger(pv) || pv < 1 || pv > 99999) { alert('El punto de venta es un número entero (por ejemplo 1).'); return null; }
  if (!Number.isInteger(numero) || numero < 1 || numero > 99999999) { alert('El número de comprobante es un número entero (por ejemplo 23).'); return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { alert('Elegí la fecha de la factura.'); return null; }
  return { pv, numero, fecha };
}

$('vistaFacturacion').addEventListener('change', (e) => {
  if (e.target.id === 'mesFactura') pintarFacturacion();
  if (e.target.id === 'mesEmision') pintarEmilse();
});

$('vistaFacturacion').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t || t.disabled) return;
  const d = t.dataset;

  if (d.copiar !== undefined) {
    try { await navigator.clipboard.writeText(d.copiar); const antes = t.textContent; t.textContent = 'Copiado'; setTimeout(() => { t.textContent = antes; }, 1200); }
    catch (err) { alert(`No se pudo copiar. Copialo a mano: ${d.copiar}`); }
    return;
  }
  if (t.id === 'copiarEmilse') {
    try { await navigator.clipboard.writeText($('textoEmilse').value); t.textContent = 'Copiado'; setTimeout(() => { t.textContent = 'Copiar'; }, 1200); }
    catch (err) { $('textoEmilse').select(); }
    return;
  }

  if (d.anotar !== undefined) {
    const x = fact.tarjetas[Number(d.anotar)];
    const a = leerAnotacion(`f${d.anotar}`);
    if (!a) return;
    if (!confirm(`¿Anotar la Factura ${x.letra} ${FC.numeroComprobante(a.pv, a.numero)} a ${x.coach_name ?? 'este profesional'} por ${plata(x.moneda, x.total)}?\n\nHacelo solo si ARCA ya te la dio y el total coincide.`)) return;
    t.disabled = true;
    try {
      await api('facturas_comision', { method: 'POST', prefer: 'return=minimal', body: {
        coach_id: x.coach_id, periodo: x.periodo, moneda: x.moneda, comprobante: 'factura', letra: x.letra,
        cuit: x.cuit, condicion: x.condicion, neto: x.neto, iva: x.iva, total: x.total,
        punto_venta: a.pv, numero: a.numero, fecha: a.fecha, booking_ids: x.booking_ids,
      } });
      await cargarFacturacion();
    } catch (err) {
      alert(err.status === 409 ? 'Ya hay una factura anotada para este profesional y mes, o ese número de comprobante ya se usó.' : `No se pudo anotar: ${err.message}`);
      t.disabled = false;
    }
    return;
  }

  if (d.anotarNota !== undefined) {
    const n = fact.notas[Number(d.anotarNota)], f = n.factura;
    const a = leerAnotacion(`n${d.anotarNota}`);
    if (!a) return;
    if (!confirm(`¿Anotar la Nota de crédito ${f.letra} ${FC.numeroComprobante(a.pv, a.numero)} por ${plata(f.moneda, n.total)}, asociada a la factura ${FC.numeroComprobante(f.punto_venta, f.numero)}?`)) return;
    t.disabled = true;
    try {
      await api('facturas_comision', { method: 'POST', prefer: 'return=minimal', body: {
        coach_id: f.coach_id, periodo: f.periodo, moneda: f.moneda, comprobante: 'nota_credito', letra: f.letra,
        cuit: f.cuit, condicion: f.condicion, neto: n.neto, iva: n.iva, total: n.total,
        punto_venta: a.pv, numero: a.numero, fecha: a.fecha, booking_ids: n.booking_ids, factura_id: f.id,
      } });
      await cargarFacturacion();
    } catch (err) {
      alert(err.status === 409 ? 'Ese número de nota de crédito ya está anotado.' : `No se pudo anotar: ${err.message}`);
      t.disabled = false;
    }
    return;
  }

  if (d.borrar) {
    if (!confirm('¿Borrar esta anotación?\n\nEsto NO anula la factura en ARCA: solo la saca de este registro, por si la anotaste mal. Si la factura está mal hecha, se anula con una nota de crédito en ARCA. El borrado queda en el Registro.')) return;
    t.disabled = true;
    try {
      await api(`facturas_comision?id=eq.${encodeURIComponent(d.borrar)}`, { method: 'DELETE', prefer: 'return=minimal' });
      await cargarFacturacion();
    } catch (err) {
      alert(err.status === 409 ? 'No se puede: tiene una nota de crédito asociada.' : `No se pudo borrar: ${err.message}`);
      t.disabled = false;
    }
  }
});
