// Tono determinístico por persona, para los avatares sin foto del lado del
// profesional (Inicio, Tus personas, y donde aparezca una inicial). La misma
// persona cae SIEMPRE en el mismo color, en todas las pantallas — ayuda a
// reconocerla sin leer el nombre.
//
// Los cinco tonos son variantes de tokens que ya existen en la paleta: terracota
// (`ViveColors.primary`/audio), verde salvia (lectura), azulado (podcast),
// violáceo (video) y arena (durazno). No son colores inventados.

export type AvatarTono = {
  grad: [string, string]; // gradiente del círculo (claro → oscuro)
  ink: string;            // color de las iniciales encima
};

const PALETA: readonly AvatarTono[] = [
  { grad: ['#C7805E', '#A5583B'], ink: '#FFF3E8' }, // terracota
  { grad: ['#6E9A6A', '#4A7A5A'], ink: '#F3EEDF' }, // verde salvia
  { grad: ['#8495B0', '#5C6A86'], ink: '#F3EEDF' }, // azulado
  { grad: ['#9B7FB0', '#7A5E92'], ink: '#F3EEDF' }, // violáceo
  { grad: ['#CBA877', '#A8864F'], ink: '#4A3A1E' }, // arena
];

// Hash estable (djb2-ish) → índice de la paleta. Estable entre sesiones y
// plataformas: solo depende de la cadena, no de nada del runtime.
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Tono de avatar para una persona. `key` debe ser estable: el `id` del perfil
 *  idealmente (o el nombre si no hay id). */
export function avatarTono(key: string | null | undefined): AvatarTono {
  const k = (key ?? '').trim();
  if (!k) return PALETA[0];
  return PALETA[hash(k) % PALETA.length];
}
