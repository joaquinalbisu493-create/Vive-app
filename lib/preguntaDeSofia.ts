/**
 * La pregunta que Sofía hizo en la tarjeta de Inicio, de camino al Diario.
 *
 * 🔔 Viaja por acá, en memoria, y no como parámetro de la ruta: antes iba en
 * `/diario?pregunta=…`, y cualquier link `viveapp://diario?pregunta=…` ponía el
 * texto que quisiera debajo de "Sofía te preguntó esto." (auditoría de
 * seguridad, 27/10/2026, corrida 2). Un link de afuera no puede escribir acá:
 * solo la tarjeta de Inicio, justo antes de abrir el Diario.
 */
let pendiente: string | null = null;

export function dejarPreguntaParaElDiario(texto: string): void {
  pendiente = texto;
}

/** La devuelve una sola vez: la siguiente apertura del Diario ya no la ve. */
export function tomarPreguntaParaElDiario(): string | null {
  const t = pendiente;
  pendiente = null;
  return t;
}
