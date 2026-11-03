// Cálculos de la facturación mensual de la comisión (03/11/2026). Puro y sin
// DOM: lo usa el tablero (`facturacion.js`) y lo prueba Jest
// (`__tests__/facturacionAdmin.test.ts`).
//
// Reglas:
// - Una factura por profesional, mes y moneda. El mes es el del COBRO
//   (`paid_at`, hora de Argentina): Mercado Pago retiene la comisión al cobrar.
// - Total de la factura = comisión que se retuvo. Durante el lanzamiento el IVA
//   lo absorbe Sere (T&C 8.4), así que el IVA va ADENTRO: neto = total / 1,21.
//   Si algún día se traspasa al profesional, `IVA_INCLUIDO` pasa a false y el
//   total es comisión + 21% (y `mp-create-payment` tiene que retener eso).
// - Letra A al Responsable Inscripto, B al monotributista y al exento.
// - Sesión reembolsada DESPUÉS de facturada: nota de crédito por su comisión.

(function (raiz) {
  const IVA_PCT = 21;
  const IVA_INCLUIDO = true;
  const r2 = (n) => Math.round(n * 100) / 100;

  /** 'YYYY-MM' en hora de Argentina (UTC−3 fijo, sin horario de verano). */
  function mesAR(ts) {
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) return null;
    return new Date(t - 3 * 3600e3).toISOString().slice(0, 7);
  }

  function comisionDe(b) {
    const amount = Number(b.amount), pct = Number(b.platform_fee_pct);
    if (!Number.isFinite(amount) || !Number.isFinite(pct)) return 0;
    const desc = Number(b.referral_discount ?? 0);
    return Math.max(0, r2(Math.round(amount * pct) / 100 - (Number.isFinite(desc) && desc > 0 ? desc : 0)));
  }

  /** Separa neto e IVA de una comisión. */
  function importes(comision) {
    if (IVA_INCLUIDO) {
      const total = r2(comision);
      const neto = r2(total / (1 + IVA_PCT / 100));
      return { neto, iva: r2(total - neto), total };
    }
    const neto = r2(comision);
    const iva = r2(neto * IVA_PCT / 100);
    return { neto, iva, total: r2(neto + iva) };
  }

  const letraDe = (condicion) => (condicion === 'responsable_inscripto' ? 'A' : 'B');

  /**
   * Las facturas del mes, una por profesional y moneda.
   * estado: 'hecha' | 'pendiente' | 'sin_cuit'
   */
  function facturasDelMes(bookings, fiscales, facturas, mes) {
    const grupos = new Map();
    for (const b of bookings) {
      if (b.payment_status !== 'aprobado' || mesAR(b.paid_at) !== mes) continue;
      const c = comisionDe(b);
      if (c <= 0) continue;
      const moneda = b.currency === 'USD' ? 'USD' : 'ARS';
      const k = `${b.coach_id}|${moneda}`;
      if (!grupos.has(k)) grupos.set(k, { coach_id: b.coach_id, coach_name: b.coach_name, moneda, comision: 0, booking_ids: [] });
      const g = grupos.get(k);
      g.comision = r2(g.comision + c);
      g.booking_ids.push(b.id);
    }
    const periodo = `${mes}-01`;
    return [...grupos.values()].map((g) => {
      const hecha = facturas.find((f) => f.comprobante === 'factura' && f.coach_id === g.coach_id && f.periodo === periodo && f.moneda === g.moneda);
      const fiscal = fiscales.find((f) => f.coach_id === g.coach_id) ?? null;
      const base = { ...g, periodo, sesiones: g.booking_ids.length, ...importes(g.comision) };
      if (hecha) {
        const cubiertas = new Set(hecha.booking_ids);
        const afuera = g.booking_ids.filter((id) => !cubiertas.has(id));
        return { ...base, estado: 'hecha', factura: hecha, afuera };
      }
      if (!fiscal) return { ...base, estado: 'sin_cuit' };
      return { ...base, estado: 'pendiente', cuit: fiscal.cuit, condicion: fiscal.condicion, letra: letraDe(fiscal.condicion) };
    }).sort((a, b) => (a.coach_name ?? '').localeCompare(b.coach_name ?? '') || a.moneda.localeCompare(b.moneda));
  }

  /** Notas de crédito que faltan: sesiones facturadas que después se reembolsaron. */
  function notasPendientes(bookings, facturas) {
    const porId = new Map(bookings.map((b) => [b.id, b]));
    const out = [];
    for (const f of facturas) {
      if (f.comprobante !== 'factura') continue;
      const yaAnuladas = new Set(facturas.filter((n) => n.comprobante === 'nota_credito' && n.factura_id === f.id).flatMap((n) => n.booking_ids));
      const ids = f.booking_ids.filter((id) => {
        const b = porId.get(id);
        return b && (b.payment_status === 'reembolsado' || b.payment_status === 'contracargo') && !yaAnuladas.has(id);
      });
      if (!ids.length) continue;
      const comision = r2(ids.reduce((s, id) => s + comisionDe(porId.get(id)), 0));
      if (comision <= 0) continue;
      out.push({ factura: f, booking_ids: ids, sesiones: ids.length, comision, ...importes(comision) });
    }
    return out;
  }

  /** "00001-00000023" */
  const numeroComprobante = (pv, n) => `${String(pv).padStart(5, '0')}-${String(n).padStart(8, '0')}`;

  const api = { IVA_PCT, IVA_INCLUIDO, mesAR, comisionDe, importes, letraDe, facturasDelMes, notasPendientes, numeroComprobante };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.FacturacionCalculo = api;
})(typeof window !== 'undefined' ? window : globalThis);
