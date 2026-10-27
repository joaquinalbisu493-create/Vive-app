# Textos legales de la competencia, comparados con los de Sere

> 27/10/2026. Para decidir qué redactamos nosotros y qué le preguntamos a la abogada.
> Lo que hace un competidor **no prueba que sea legal**: sirve como antecedente y
> para tomar ideas de redacción, no como validación.
> Hermanos: [`competencia-selia.md`](./competencia-selia.md) (Selia, términos de
> usuarios 2023 y de especialistas 2026 leídos enteros), [`paquete-abogado.md`](./paquete-abogado.md).

## Qué se leyó

| Quién | Qué es | Documentos |
|---|---|---|
| **TuTerapia** (TU TERAPIA SRL, Mar del Plata; antes Uruguay) | Marketplace de psicólogos, ~20% de comisión, cobra por la plataforma | Términos (PDF del 25/09/2026) y Política de privacidad (PDF) |
| **MiPsico** (mipsico.online) | Directorio de psicólogos, sin comisión ni cobro | Términos (abril 2026) y Política |
| **Centro Privado de Psicoterapias** (cpp.com.ar) | Centro que presta terapia online con sus profesionales | Condiciones generales |
| **Selia** (Colombia) | Marketplace, la referencia más armada | Ya analizada en `competencia-selia.md` |

Doctoralia Argentina no responde (doctoralia.com.ar sin servicio); Llamando al Doctor
no publica sus términos en el sitio.

## Conclusión en tres líneas

1. **Los textos argentinos son más pobres que los nuestros.** TuTerapia usa una plantilla
   genérica y su Política cita la ley uruguaya; nadie tiene un consentimiento específico para
   datos de salud; dos fijan jurisdicción exclusiva en contra del consumidor.
2. **Nadie resolvió públicamente las preguntas difíciles** (A.2 consentimiento de datos de
   salud, B.4 notas como historia clínica, cobro por cuenta y orden). No hay un antecedente
   local para copiar: por eso sigue haciendo falta la opinión de la abogada en esos puntos.
3. **Hay cuatro ideas concretas para tomar** (abajo, "Para adoptar").

## Comparación por tema

| Tema | Sere hoy | Competencia | Lectura |
|---|---|---|---|
| **Consentimiento datos de salud** (A.2) | Política §3: consentimiento separado, voluntario, revocable, con fecha y versión | TuTerapia: nada específico; Política genérica con ley uruguaya. MiPsico: no guarda datos de salud (es directorio). CPP: solo "confidencialidad" | Sere va adelante. Sin antecedente local: pregunta para la abogada |
| **Notas / historia clínica** (B.4) | T&C §16: el profesional es responsable del uso; las notas se borran al borrar la cuenta (Política §10) | **Selia: la herramienta es de Selia, pero el responsable legal de la historia clínica es el profesional, que mantiene indemne a Selia ante multas.** TuTerapia: la terapia es "de total responsabilidad del Licenciado". MiPsico no guarda nada | Tomar el modelo de Selia (ver abajo). El borrado inmediato sigue siendo pregunta para la abogada |
| **Cobro y rol de la plataforma** | T&C §4 intermediaria; §8 "por cuenta y orden" en dólares | TuTerapia cobra todo por la plataforma y fija tarifas, sin decir en nombre de quién. MiPsico no toca plata ("no es intermediario"). Selia: la comisión va en una propuesta privada, no en los términos | Lo nuestro es más explícito que el mercado. Ninguno resuelve el USDT ni PayPal |
| **Cancelaciones** | 24 h con reembolso total; garantía de primera sesión; arrepentimiento §9.4 | TuTerapia: menos de 48 h = sesión realizada, sin reembolso; 10 días de arrepentimiento por compra, paquetes sin reembolso. CPP: 48 h hábiles. PSICOlinea: 24 h | Sere es más generosa que el mercado; el estándar es 24 a 48 h |
| **Matrícula y entre provincias** (B.12) | T&C §5.2: el profesional responde por su matrícula | **CPP: "el lugar de prestación será el del lugar en el cual el profesional lleve a cabo la asistencia online y se encuentre matriculado".** MiPsico: verifica que la matrícula exista, sin garantizar aptitud ni vigencia futura | Tomar la cláusula de CPP (ver abajo) |
| **Verificación de credenciales** | T&C §6.1 "Perfil revisado por Sere" con alcance acotado | TuTerapia promete verificar título en los colegios y "evaluaciones periódicas" (promesa riesgosa). MiPsico acota el alcance, como nosotros | Lo nuestro está bien; no prometer de más como TuTerapia |
| **Jurisdicción** | §22.2 consumidor: su domicilio (art. 1109 CCyC); profesionales: Córdoba | TuTerapia: Mar del Plata para todos. CPP: CABA "con expresa exclusión de cualquier otro fuero". MiPsico: CABA, renuncia a otro fuero | La nuestra es la correcta; las de ellos probablemente son abusivas frente a consumidores |
| **Transferencia internacional** (A.3) | Política §7: detalle por proveedor, Supabase en San Pablo, acuerdo de tratamiento | MiPsico: Supabase en EEUU, invoca "salvaguardas contractuales" y la excepción de ejecución del contrato. TuTerapia: nada | La de MiPsico sugiere una base adicional (ejecución del contrato); confirmar con la abogada si aplica a datos sensibles |
| **Emergencias** | T&C §5.3: 911 y líneas, 135 de 8 a 24 h | MiPsico: banner fijo en todo el sitio con el 135 "gratuito las 24 hs" (dato dudoso: Befrienders dice 0 a 2 y 8 a 24 h). CPP: número de emergencias local | Nuestro horario es más preciso. Idea: aviso visible fijo, no solo en los T&C |
| **Datos anonimizados** | Política: finalidades | **TuTerapia §2 bis: uso de datos anonimizados (disociación irreversible) para estadísticas e informes de salud mental, solo agregados, nunca el contenido de las sesiones** | Útil si Sere quiere publicar estadísticas o informes |
| **Indemnidad del profesional** | T&C §19 | MiPsico §14: el profesional mantiene indemne a la plataforma por el servicio terapéutico que presta | Revisar que §19 cubra expresamente el servicio terapéutico |

## Para adoptar (redacción nuestra, sin abogada)

1. **Notas de sesión (modelo Selia).** En el acuerdo con profesionales y en T&C §16: Sere
   provee la herramienta; el profesional es el responsable de su historia clínica y de
   llevarla según su ley profesional; las notas de Sere no la reemplazan; el profesional
   mantiene indemne a Sere. Idea de producto: que el profesional pueda **exportar sus notas**
   antes de que se borren por la baja de un cliente.
2. **Lugar de prestación (modelo CPP).** En T&C §5.2 y en el acuerdo con profesionales:
   la sesión se considera prestada en el lugar donde el profesional atiende y está
   matriculado. Ayuda con la atención entre provincias (B.12); confirmar con la abogada.
3. **Aviso de emergencias visible** en la app y la web, no solo en los Términos.
   Antes, verificar el horario del 135 y el 0800 en la fuente oficial
   (casbuenosaires.com.ar no respondió el 27/10/2026).
4. **Indemnidad por el servicio profesional.** Hoy §19 cubre el incumplimiento, el contenido
   y la conducta del Usuario, pero no nombra la prestación. Sumar (modelo MiPsico §14) que el
   Profesional mantiene indemne a Sere por el servicio que presta a sus Clientes; va también
   en el acuerdo con profesionales.
5. **Cláusula de datos anonimizados** (modelo TuTerapia §2 bis), solo si se van a usar
   estadísticas agregadas.

## Para la abogada (sin cambios)

A.2 (base legal y consentimiento de datos de salud), B.4 (notas como historia clínica),
y el cobro en dólares con SAS (USDT ante la CNV, PayPal). Ningún competidor local los
resuelve.

## Fuentes

- TuTerapia, términos: https://www.tuterapia.com.ar/uploads/configuracion/terms_and_conditions-2026-09-25-125517.pdf
- TuTerapia, privacidad: https://www.tuterapia.com.ar/uploads/configuracion/politica_de_privacidad.pdf
- MiPsico, términos y privacidad: https://www.mipsico.online/terminos y https://www.mipsico.online/privacidad
- Centro Privado de Psicoterapias: https://cpp.com.ar/tecnologia/condiciones-generales/
- Horario del CAS: https://befrienders.org/hi/find-support-now/centro-de-asistencia-al-suicida
- TuTerapia, comisión ~20%: https://www.iproup.com/leaders/22546-tinder-psicologia-como-es-la-app-para-buscar-terapeuta
