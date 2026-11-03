// datosFiscales — CUIT y condición frente al IVA del profesional, puro y sin
// imports (así lo carga Jest).
//
// Para qué: Sere (SAS, Responsable Inscripto) le factura su comisión a cada
// profesional, A si es Responsable Inscripto y B si es monotributista o exento.
//
// ⚠️ La validación del CUIT está DUPLICADA como CHECK en la base
// (`public.cuit_valido`, migración 20261103010000). Acá para avisar mientras se
// escribe, allá porque la pantalla nunca es la frontera. Si cambia una, cambia
// la otra.

export type CondicionFiscal = 'monotributo' | 'responsable_inscripto' | 'exento';

export const CONDICIONES: { id: CondicionFiscal; label: string; desc: string }[] = [
  { id: 'monotributo', label: 'Monotributo', desc: 'Te hacemos factura B' },
  { id: 'responsable_inscripto', label: 'Responsable Inscripto', desc: 'Te hacemos factura A y te sirve como crédito de IVA' },
  { id: 'exento', label: 'Exento de IVA', desc: 'Te hacemos factura B' },
];

export function esCondicionFiscal(v: unknown): v is CondicionFiscal {
  return CONDICIONES.some(c => c.id === v);
}

const PREFIJOS = ['20', '23', '24', '27', '30', '33', '34'];
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Deja solo los dígitos: se acepta "20-12345678-6" o con espacios. */
export function limpiarCuit(cuit: string): string {
  return cuit.replace(/\D/g, '');
}

/** "20123456786" → "20-12345678-6" (para mostrar). */
export function formatearCuit(cuit: string): string {
  const c = limpiarCuit(cuit);
  if (c.length !== 11) return cuit;
  return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
}

/** `null` si está bien; si no, el motivo para mostrar debajo del campo. */
export function cuitError(cuit: string): string | null {
  const c = limpiarCuit(cuit);
  if (!c) return 'Ingresá tu CUIT';
  if (c.length !== 11) return `El CUIT tiene 11 números (llevás ${c.length})`;
  if (!PREFIJOS.includes(c.slice(0, 2))) return 'Un CUIT empieza con 20, 23, 24, 27, 30, 33 o 34';
  const suma = PESOS.reduce((acc, p, i) => acc + p * Number(c[i]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10 || dv !== Number(c[10])) return 'Ese CUIT no es válido: revisá los números';
  return null;
}
