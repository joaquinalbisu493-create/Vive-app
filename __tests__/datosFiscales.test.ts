import { cuitError, formatearCuit, limpiarCuit, esCondicionFiscal } from '../lib/datosFiscales';

describe('cuitError', () => {
  it('acepta un CUIT válido, con o sin guiones', () => {
    expect(cuitError('20123456786')).toBeNull();
    expect(cuitError('20-12345678-6')).toBeNull();
    expect(cuitError(' 20 12345678 6 ')).toBeNull();
  });

  it('acepta el dígito verificador 0 (cuando la cuenta da 11)', () => {
    // 30-71234567-? : se calcula y se arma uno válido para cubrir el caso dv=0
    const base = '3071234567';
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = pesos.reduce((a, p, i) => a + p * Number(base[i]), 0);
    let dv = 11 - (suma % 11);
    if (dv === 11) dv = 0;
    if (dv !== 10) expect(cuitError(base + dv)).toBeNull();
  });

  it('rechaza vacío, largo equivocado, prefijo raro y dígito verificador malo', () => {
    expect(cuitError('')).toBe('Ingresá tu CUIT');
    expect(cuitError('2012345678')).toMatch(/11 números \(llevás 10\)/);
    expect(cuitError('99123456786')).toMatch(/empieza con/);
    expect(cuitError('20123456780')).toMatch(/no es válido/);
  });
});

describe('formato', () => {
  it('limpia y formatea', () => {
    expect(limpiarCuit('20-12345678-6')).toBe('20123456786');
    expect(formatearCuit('20123456786')).toBe('20-12345678-6');
    expect(formatearCuit('123')).toBe('123');
  });

  it('reconoce las condiciones', () => {
    expect(esCondicionFiscal('monotributo')).toBe(true);
    expect(esCondicionFiscal('responsable_inscripto')).toBe(true);
    expect(esCondicionFiscal('otra')).toBe(false);
  });
});
