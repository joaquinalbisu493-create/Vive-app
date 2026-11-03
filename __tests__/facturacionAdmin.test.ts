// eslint-disable-next-line @typescript-eslint/no-require-imports
const F = require('../web/admin/facturacion-calculo.js');

const b = (over: Record<string, unknown>) => ({
  id: Math.random().toString(36).slice(2),
  coach_id: 'c1', coach_name: 'Sofía', amount: 31000, platform_fee_pct: 20,
  currency: 'ARS', payment_status: 'aprobado', referral_discount: 0,
  paid_at: '2027-02-10T15:00:00Z', ...over,
});

describe('importes (IVA incluido en la comisión)', () => {
  it('separa neto e IVA sin cambiar el total', () => {
    expect(F.importes(6200)).toEqual({ neto: 5123.97, iva: 1076.03, total: 6200 });
    expect(F.importes(62000)).toEqual({ neto: 51239.67, iva: 10760.33, total: 62000 });
  });
});

describe('mesAR', () => {
  it('usa la hora de Argentina', () => {
    expect(F.mesAR('2027-03-01T02:00:00Z')).toBe('2027-02'); // 23 h del 28/02 en AR
    expect(F.mesAR('2027-03-01T03:00:00Z')).toBe('2027-03');
  });
});

describe('facturasDelMes', () => {
  const fiscales = [{ coach_id: 'c1', cuit: '20123456786', condicion: 'monotributo' }];

  it('agrupa por profesional y moneda, con letra según condición', () => {
    const bs = [b({}), b({ platform_fee_pct: 15 }), b({ currency: 'USD', amount: 50, platform_fee_pct: 25 }), b({ paid_at: '2027-03-05T12:00:00Z' })];
    const fs = F.facturasDelMes(bs, fiscales, [], '2027-02');
    expect(fs).toHaveLength(2);
    const ars = fs.find((x: any) => x.moneda === 'ARS');
    expect(ars).toMatchObject({ estado: 'pendiente', letra: 'B', sesiones: 2, total: 10850 });
  });

  it('A para responsable inscripto; sin CUIT queda marcado', () => {
    expect(F.facturasDelMes([b({})], [{ coach_id: 'c1', cuit: '20123456786', condicion: 'responsable_inscripto' }], [], '2027-02')[0].letra).toBe('A');
    expect(F.facturasDelMes([b({})], [], [], '2027-02')[0].estado).toBe('sin_cuit');
  });

  it('no factura comisión cero (promo) ni reembolsadas', () => {
    expect(F.facturasDelMes([b({ platform_fee_pct: 0 }), b({ payment_status: 'reembolsado' })], fiscales, [], '2027-02')).toHaveLength(0);
  });

  it('reconoce la ya anotada y avisa lo que quedó afuera', () => {
    const x = b({}), y = b({});
    const factura = { id: 'f1', comprobante: 'factura', coach_id: 'c1', periodo: '2027-02-01', moneda: 'ARS', booking_ids: [x.id] };
    const [f] = F.facturasDelMes([x, y], fiscales, [factura], '2027-02');
    expect(f.estado).toBe('hecha');
    expect(f.afuera).toEqual([y.id]);
  });
});

describe('notasPendientes', () => {
  it('pide nota de crédito por lo reembolsado después de facturar, una sola vez', () => {
    const x = b({ payment_status: 'reembolsado' }), y = b({});
    const factura = { id: 'f1', comprobante: 'factura', coach_id: 'c1', periodo: '2027-02-01', moneda: 'ARS', booking_ids: [x.id, y.id] };
    const ns = F.notasPendientes([x, y], [factura]);
    expect(ns).toHaveLength(1);
    expect(ns[0]).toMatchObject({ sesiones: 1, total: 6200 });
    const nota = { id: 'n1', comprobante: 'nota_credito', factura_id: 'f1', booking_ids: [x.id] };
    expect(F.notasPendientes([x, y], [factura, nota])).toHaveLength(0);
  });

  it('formatea el número de comprobante', () => {
    expect(F.numeroComprobante(1, 23)).toBe('00001-00000023');
  });
});
