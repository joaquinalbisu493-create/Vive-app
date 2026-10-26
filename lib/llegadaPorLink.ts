// Recordar que la persona llegó por el link de un profesional (`sere.ar/c/<slug>`).
//
// 🔴 Por qué existe (26/10/2026). Desde que los links de sere.ar abren la app,
// la persona que toca el link de un profesional reserva DENTRO de la app y no en
// la web. La primera sesión que viene por el link va al 0% de comisión (D13 en
// `docs/decisiones-pagos.md`), y eso cuelga de `bookings.origen = 'link'`, que
// hasta acá solo escribía `web-book`. Sin esta marca, abrir la app le cobraba al
// profesional el 20% justo en los clientes que trajo él.
//
// Se guarda en el teléfono y no en la cuenta: el link se puede abrir antes de
// tener cuenta, y la reserva llega después del alta. Vale por profesional y
// vence a los 30 días; la base solo acepta 'link' o 'app' desde la app
// (`trg_normalizar_origen`).
//
// ⚠️ No es un dato que haya que proteger: el link de cada profesional es
// público, así que cualquiera puede abrirlo. Marcar 'link' acá equivale a lo que
// ya permite la web.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE = 'sere_llegada_por_link';
const VIGENCIA_MS = 30 * 24 * 3_600_000;

type Llegadas = Record<string, number>;

async function leer(): Promise<Llegadas> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
    const datos = crudo ? JSON.parse(crudo) : {};
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    return {};
  }
}

/** `coachId` es `coaches.id`, el mismo que va en `bookings.coach_id`. */
export async function anotarLlegadaPorLink(coachId: string): Promise<void> {
  const ahora = Date.now();
  const datos = await leer();
  // Se aprovecha para tirar las vencidas: así la clave no crece para siempre.
  const vigentes: Llegadas = {};
  for (const [id, cuando] of Object.entries(datos)) {
    if (ahora - Number(cuando) < VIGENCIA_MS) vigentes[id] = Number(cuando);
  }
  vigentes[coachId] = ahora;
  try { await AsyncStorage.setItem(CLAVE, JSON.stringify(vigentes)); } catch { /* sin almacenamiento */ }
}

export async function llegoPorLink(coachId: string): Promise<boolean> {
  const cuando = Number((await leer())[coachId]);
  return Number.isFinite(cuando) && Date.now() - cuando < VIGENCIA_MS;
}
