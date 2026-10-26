import { evidenciaDeSesion, terminoHaceMasDe24h } from '../supabase/functions/_shared/sesion-sin-cerrar';

const CLIENTE = 'cli-1';
const PRO = 'pro-1';
const INICIO = Date.UTC(2026, 9, 20, 18, 0, 0);
const seg = (min: number) => (INICIO + min * 60_000) / 1000;
const sala = (participants: unknown[]) => ({
  raw: { data: [{ participants }] }, participants_count: participants.length, max_simultaneous: 1,
});

describe('terminoHaceMasDe24h', () => {
  it('corta a las 24 h del FIN de la sesión, no del inicio', () => {
    const fin = INICIO + 50 * 60_000;
    expect(terminoHaceMasDe24h(INICIO, 50, fin + 24 * 3_600_000 - 1)).toBe(false);
    expect(terminoHaceMasDe24h(INICIO, 50, fin + 24 * 3_600_000 + 1)).toBe(true);
  });

  it('sin duración usa 60 minutos, como el cron', () => {
    expect(terminoHaceMasDe24h(INICIO, null, INICIO + 25 * 3_600_000 - 1)).toBe(false);
    expect(terminoHaceMasDe24h(INICIO, null, INICIO + 25 * 3_600_000 + 1)).toBe(true);
  });

  it('una fecha ilegible nunca cuenta como terminada', () => {
    expect(terminoHaceMasDe24h(NaN, 50, Date.now())).toBe(false);
  });
});

describe('evidenciaDeSesion', () => {
  it('sin fila de asistencia dice "sin registro"', () => {
    const e = evidenciaDeSesion({ asistencia: null, clienteId: CLIENTE, profesionalId: PRO, inicioMs: INICIO });
    expect(e.veredicto).toEqual({ veredicto: 'sin_registro' });
    expect(e.partes).toEqual([]);
  });

  it('el cero escrito por el cron es "no vino nadie"', () => {
    const e = evidenciaDeSesion({
      asistencia: { raw: { data: [] }, participants_count: 0, max_simultaneous: null },
      clienteId: CLIENTE, profesionalId: PRO, inicioMs: INICIO,
    });
    expect(e.veredicto).toEqual({ veredicto: 'reembolso', motivo: 'no_vino_nadie' });
  });

  it('una lista vacía SIN el cero no decide nada', () => {
    const e = evidenciaDeSesion({
      asistencia: { raw: { data: [] }, participants_count: null, max_simultaneous: null },
      clienteId: CLIENTE, profesionalId: PRO, inicioMs: INICIO,
    });
    expect(e.veredicto).toEqual({ veredicto: 'sin_datos' });
  });

  // El caso típico de sesión trabada: el profesional esperó y la persona no vino.
  it('el profesional esperó y la persona no vino: cobra', () => {
    const e = evidenciaDeSesion({
      asistencia: sala([{ user_id: PRO, join_time: seg(-2), duration: 25 * 60 }]),
      clienteId: CLIENTE, profesionalId: PRO, inicioMs: INICIO,
    });
    expect(e.veredicto).toEqual({ veredicto: 'cobrar', motivo: 'cliente_no_entro' });
    expect(e.partes).toEqual([{ rol: 'profesional', entroMin: -2, minutos: 25 }]);
  });

  it('marca quién es quién y ordena por hora de entrada', () => {
    const e = evidenciaDeSesion({
      asistencia: sala([
        { user_id: CLIENTE, join_time: seg(4), duration: 600 },
        { user_id: PRO, join_time: seg(1), duration: 3000 },
        { user_id: 'alguien', join_time: seg(2), duration: 60 },
      ]),
      clienteId: CLIENTE, profesionalId: PRO, inicioMs: INICIO,
    });
    expect(e.partes.map(p => p.rol)).toEqual(['profesional', 'otro', 'cliente']);
  });

  it('sin perfil del profesional no se arriesga a un veredicto', () => {
    const e = evidenciaDeSesion({
      asistencia: sala([{ user_id: CLIENTE, join_time: seg(0), duration: 600 }]),
      clienteId: CLIENTE, profesionalId: null, inicioMs: INICIO,
    });
    expect(e.veredicto).toEqual({ veredicto: 'sin_datos' });
    expect(e.partes[0].rol).toBe('cliente');
  });
});
