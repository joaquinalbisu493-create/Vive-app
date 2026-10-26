// La ficha de una sesión sin cerrar: qué dice la evidencia de la videollamada,
// puesta en palabras para que un admin decida.
//
// Una reserva queda `confirmada` para siempre cuando `complete_confirmed_sessions()`
// no la puede completar (necesita dos personas a la vez en la sala) y
// `session-attendance` no la puede cancelar (solo cancela si el veredicto es
// reembolso). Pasa en tres casos: no hay registro de Daily, el registro no
// alcanza para decidir, o la persona no se presentó (veredicto "cobrar": el
// profesional cobra, pero nunca hubo dos en la sala). El tablero los muestra y
// el admin cierra con `close_unclosed_session`.
//
// Esto NO decide: devuelve la evidencia y lo que diría la regla de §9.5. La
// regla es la misma `veredictoAsistencia` que aplica el cron, así que el tablero
// no puede contradecir lo que el sistema hace solo.
//
// Sin imports de Deno a propósito: lo prueba Jest.

import { veredictoAsistencia, type Participante, type Veredicto } from './asistencia.ts';

export type ParteEnSala = {
  rol: 'cliente' | 'profesional' | 'otro';
  /** Minutos desde el horario agendado (negativo = entró antes). */
  entroMin: number;
  /** Minutos que estuvo conectado en ese tramo. */
  minutos: number;
};

export type Evidencia = {
  /** `sin_registro` = no hay fila en `session_attendance` para esta reserva. */
  veredicto: Veredicto | { veredicto: 'sin_registro' };
  partes: ParteEnSala[];
  maxSimultaneos: number | null;
};

/** Una sesión terminó hace más de 24 h. Mismo corte que `admin_pendientes()`. */
export function terminoHaceMasDe24h(inicioMs: number, duracionMin: number | null, ahora: number): boolean {
  if (!Number.isFinite(inicioMs)) return false;
  return inicioMs + (duracionMin ?? 60) * 60_000 + 24 * 3_600_000 < ahora;
}

export function evidenciaDeSesion(opts: {
  asistencia: { raw: unknown; participants_count: number | null; max_simultaneous: number | null } | null;
  clienteId: string;
  profesionalId: string | null;
  inicioMs: number;
}): Evidencia {
  const { asistencia, clienteId, profesionalId, inicioMs } = opts;
  if (!asistencia) return { veredicto: { veredicto: 'sin_registro' }, partes: [], maxSimultaneos: null };

  const participantes: Participante[] = [];
  // deno-lint-ignore no-explicit-any
  const meetings = (asistencia.raw as any)?.data;
  if (Array.isArray(meetings)) {
    for (const m of meetings) {
      if (Array.isArray(m?.participants)) participantes.push(...(m.participants as Participante[]));
    }
  }

  const partes: ParteEnSala[] = participantes
    .filter(p => Number.isFinite(Number(p?.join_time)))
    .map(p => ({
      rol: p.user_id === clienteId ? 'cliente' as const
        : profesionalId && p.user_id === profesionalId ? 'profesional' as const
        : 'otro' as const,
      entroMin: Math.round((Number(p.join_time) * 1000 - inicioMs) / 60_000),
      minutos: Math.round(Number(p.duration ?? 0) / 60),
    }))
    .sort((a, b) => a.entroMin - b.entroMin);

  // Mismo atajo que `session-attendance`: lista vacía con el cero ya escrito
  // (solo se escribe pasadas 24 h) es la constancia de que no entró nadie.
  const veredicto: Veredicto = participantes.length === 0 && asistencia.participants_count === 0
    ? { veredicto: 'reembolso', motivo: 'no_vino_nadie' }
    : profesionalId
      ? veredictoAsistencia({ participantes, clienteId, profesionalId, inicioMs })
      : { veredicto: 'sin_datos' };

  return { veredicto, partes, maxSimultaneos: asistencia.max_simultaneous };
}
