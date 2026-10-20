# Paquete para la consulta contable: Sere

> 20/10/2026. Reemplaza a `fiscal-instrucciones.md` como lo que se le manda a la
> contadora (ese archivo queda como historia y notas internas). Números
> verificados contra el código y la base de producción ese día.
> Hermanos: `paquete-abogado.md` (la parte legal), `mapa-del-dinero.md` (el
> detalle de cada riel de cobro).

## Mail de encuadre

> Hola,
>
> Te escribo por **Sere**, una aplicación de bienestar para Argentina que estoy
> por publicar en App Store y Google Play. Ya estoy inscripto en el Monotributo
> y la app ya cobra de verdad (todavía solo pagos de prueba con mis propias
> cuentas), pero antes de abrirla al público necesito resolver cómo se factura y
> si la forma en que entra la plata del exterior es compatible con el
> Monotributo.
>
> Abajo te dejo cómo funciona el negocio, qué está decidido y las preguntas
> concretas, ordenadas por urgencia. Lo que necesito de vos está al final.
> Las partes legales (BCRA, CNV, contratos) las está viendo un abogado; te las
> marco donde se cruzan con lo tuyo.
>
> Gracias,
> Andre

---

## Si solo hay una hora

1. **2.1**: la plata del exterior entra entera a mi cuenta. ¿Cuenta para el tope
   del Monotributo? Bloquea el lanzamiento.
2. **2.2**: ¿el profesional que atiende a alguien del exterior es exportador
   igual, aunque cobre yo?
3. **2.3**: cómo, a quién y cada cuánto facturo mi comisión.
4. **2.4**: vamos a ser dos socios. ¿Cómo se ordena eso fiscalmente?

---

## 1. Qué es Sere y cómo circula la plata

**Quién opera.** Yo, Andre Albisu Lambertini, persona humana en **Monotributo,
categoría A**. Actividad **631200 (Portales web)** a nivel nacional y **631201**
en Ingresos Brutos de Córdoba (Monotributo Unificado). Factura tipo **C**. No hay
sociedad.

**Qué hace la app.** Dos cosas:

1. **Un marketplace.** La gente reserva y paga sesiones por videollamada con
   profesionales (coaches y psicólogos/as). El precio lo fija cada profesional.
2. **Herramientas propias de bienestar** (respiración, diario, registro de
   ánimo). Son gratis; no generan ingresos.

**Cómo gano.** Solo con una **comisión sobre cada sesión**. Sere se presenta en
los Términos como **intermediaria**: no presta la sesión, no la factura, y
factura únicamente su comisión.

| Cómo se cobra la sesión | 1.ª sesión de cada par cliente–profesional | De la 2.ª en adelante |
|---|---|---|
| En pesos, Mercado Pago | 20% | 15% |
| En dólares, PayPal o USDT | 25% | 20% |

- Si el cliente llegó por el **enlace propio del profesional**, la primera sesión
  no tiene comisión.
- Quien entra **invitado por otro usuario** tiene 10% de descuento en su primera
  sesión, y ese 10% sale de mi comisión (el profesional cobra lo mismo).
- Si una sesión se reembolsa, el reembolso sale de la parte del profesional y yo
  resigno la comisión.

**Los tres medios de cobro no se comportan igual, y es el centro de todo:**

| Medio | Moneda | ¿La plata pasa por mi cuenta? |
|---|---|---|
| **Mercado Pago** | pesos | **No.** Pago dividido: Mercado Pago le acredita al profesional en su propia cuenta y me retiene la comisión a mí. |
| **PayPal** | dólares | **Sí.** Entra el total a mi cuenta de PayPal y después le transfiero su parte. |
| **USDT** (cripto, red TRC20) | dólares | **Sí.** Entra el total a mi billetera y después le transfiero. |

Los medios en dólares los cobro yo por dos motivos. Uno técnico: en USDT no hay
forma de dividir el pago, Stripe Connect no le paga a cuentas argentinas, y el
pago dividido de PayPal existe pero lo habilitan según volumen, que hoy no
tengo. El otro, la razón original: que cada profesional no tuviera que exportar
por su cuenta. La pregunta 2.2 es justamente si eso es cierto.

**Estado.** Pre-lanzamiento. **No hubo ninguna venta real.** Los 41 pagos que
registra el sistema (agosto a octubre de 2026) fueron pruebas: el profesional
era una cuenta mía y quien pagaba era yo o mi hermano. De esos, 30 se
reembolsaron. Lo que quedó sin devolver suma unos pocos pesos y USD 6,28 en
USDT.

**La app no emite facturas.** Todavía no hay integración con ARCA. El panel de
administración agrupa mi comisión por mes, profesional, moneda y medio de cobro,
para tener el material listo para facturar.

---

## 2. Preguntas, por orden de urgencia

### 2.1 La plata de terceros y el tope del Monotributo 🔴 bloquea el lanzamiento

En PayPal y USDT entra a mi cuenta el **total** de la sesión, aunque lo mío es
solo la comisión (20-25%). Los Términos dicen que la cobro "**por cuenta y orden
del profesional**" y que retengo esos fondos "a los solos efectos de
liquidarlos".

Lo que encontré: el Anexo de la Ley 24.977 define el ingreso bruto como el
obtenido "por cuenta propia **o ajena**", así que temo que el total compute
igual.

- [ ] ¿Ese total cuenta para mi categoría, o solo la comisión?
- [ ] ¿Cómo tengo que documentarlo para que quede claro que el resto es del
      profesional? ¿Alcanza con la cláusula de los Términos, o hace falta algo
      más (un mandato firmado, un comprobante por cada transferencia)?
- [ ] Si computa: ¿cuántas sesiones en dólares por mes aguanta la categoría A, y
      hasta dónde llego antes de quedar afuera del Monotributo? Por lo que
      calculé, con unas 150 sesiones internacionales por mes la cuota supera lo
      que gano con ellas.
- [ ] El tope está en pesos y cobro en dólares: una devaluación me acerca al tope
      sin que cambie nada del negocio. ¿Hay forma de prevenirlo?

> Se cruza con el abogado: le pregunté si recibir y retener plata de terceros
> siendo persona física exige inscribirme en el BCRA, y si por el USDT tengo
> obligaciones ante la CNV o la UIF. Si alguna de esas da que no, el medio se
> posterga y esta pregunta se achica.

### 2.2 ¿El profesional exporta igual? 🔴

Cuando un profesional argentino atiende a alguien que está en el exterior, el
servicio se exporta. Los Términos dicen que el profesional factura la sesión al
cliente y yo solo mi comisión.

- [ ] Si el criterio es dónde se aprovecha el servicio y no por dónde pasó la
      plata, ¿el profesional es exportador aunque cobre yo? ¿Tiene que emitir
      factura E al cliente del exterior?
- [ ] Si es así, ¿qué le conviene hacer a un profesional monotributista que toma
      una sesión de afuera de vez en cuando? Le preparé un documento explicando
      cómo cobra en dólares y **no lo mandé** porque depende de esta respuesta.
- [ ] Al profesional le transfiero en dólares (PayPal o USDT) o en pesos por
      transferencia. ¿Cambia algo para él según cuál elija?
- [ ] Si exporta igual, ¿sería más prolijo que en PayPal cobre él directo (con
      el pago dividido, cuando lo habiliten) y yo solo reciba la comisión? Eso
      también me sacaría la plata de terceros de 2.1.

### 2.3 Cómo facturo mi comisión 🔴

- [ ] ¿A quién le facturo? Mi lectura es que mi cliente es el profesional (la
      comisión sale de su parte), no la persona que reserva.
- [ ] ¿Cada cuánto? ¿Una factura por sesión o un resumen mensual por
      profesional?
- [ ] En Mercado Pago la comisión la retiene Mercado Pago y me la acredita a mí;
      nunca pasa por la cuenta del profesional. ¿Cambia algo en cómo se
      documenta?
- [ ] Si el profesional vive en el exterior, ¿mi comisión pasa a ser exportación
      de servicios (factura E)? ¿Suma al tope? Hoy la app guarda desde dónde
      atiende el profesional, pero no su domicilio fiscal.
- [ ] ¿Hay algo que me impida tener profesionales que no sean argentinos?
- [ ] ¿Tengo que pedirles a los profesionales su constancia de inscripción para
      darlos de alta?
- [ ] ¿Desde cuándo tengo que tener la facturación resuelta? ¿Desde la primera
      venta real?
- [ ] ¿Me conviene automatizar la emisión (factura electrónica desde la app) o
      con el volumen inicial alcanza con hacerlo a mano?
- [ ] Los pagos de prueba (sección 1): ¿hay que documentarlos o facturarlos de
      alguna forma, aunque haya sido plata mía entre cuentas mías?

### 2.4 Vamos a ser dos socios 🟠 nueva

Voy a armar Sere con mi hermano, **Joaquín Albisu**, como socio. Los porcentajes
y las condiciones los estamos definiendo. Hoy todo está a mi nombre: el
Monotributo, la marca SERE (presentada en el INPI el 17/10/2026, clases 9, 41,
42 y 44), el dominio sere.ar y las cuentas de Mercado Pago, PayPal y la billetera
de USDT.

- [ ] Mientras siga todo a mi nombre, ¿cómo le llega a Joaquín su parte sin que
      todo me cuente a mí? ¿Él tiene que estar inscripto en algo?
- [ ] ¿Conviene armar una sociedad (SAS u otra) y cuándo: ahora, al lanzar, o
      recién cuando haya volumen? Entiendo que una sociedad no puede ser
      monotributista, así que pasaría a facturar con IVA.
- [ ] Joaquín va a pasar temporadas largas fuera del país. ¿Tiene alguna
      consecuencia fiscal que un socio no resida en Argentina?
- [ ] Cuando exista la sociedad: ¿cómo y cuándo le paso la marca, el dominio y
      las cuentas, y qué costo fiscal tiene?
- [ ] Hasta ahora puse yo la plata de los gastos. ¿Cómo se registran esos aportes
      para que cuenten cuando armemos la sociedad?

> Se cruza con el abogado, que tiene la parte contractual (B.13 de su paquete:
> pasar los Términos y los datos de los usuarios a una futura sociedad).

### 2.5 ¿Monotributo o Responsable Inscripto?

Como monotributista, el IVA de mis gastos se pierde. Como Responsable Inscripto,
con ventas de exportación (exentas), ese IVA sería crédito a favor. Lo que más
podría pesar es la publicidad: por lo que investigué, con pauta de más de unos
$500.000 por mes ya convendría ser RI.

- [ ] ¿Desde qué nivel de gasto conviene, en números de hoy?
- [ ] ¿Qué gastos generan crédito? Varios son servicios del exterior (sección 3).
- [ ] ¿Cuánto cuesta administrativamente ser RI?
- [ ] Si paso a RI, mi comisión pasa a llevar IVA: o el profesional paga 20% + IVA,
      o el 20% pasa a incluir el IVA y gano menos. ¿Hay alguna otra opción?

### 2.6 Preguntas más chicas

- [ ] **USDT.** ¿Qué tratamiento tiene cobrar en cripto? ¿Cómo se valúa, al
      cobrarlo o al venderlo? ¿Cambia algo respecto de recibir dólares?
- [ ] **Ingresos Brutos en Córdoba.** El art. 238 del Código Tributario
      Provincial excluye la parte de terceros (inc. b) y las exportaciones
      (inc. g). ¿Me aplica, y cómo lo declaro?
- [ ] **Impuestos sobre los cobros.** PayPal y Mercado Pago, ¿me aplican
      retenciones o percepciones que tenga que computar?
- [ ] **Comprobantes de los gastos del exterior.** ¿Qué tengo que guardar de
      cada uno?

---

## 3. Gastos, por si los pide

Todo lo pago yo, a mi nombre.

- **Servicios del exterior:** Supabase (base de datos y servidor, USD 25 por
  mes), Anthropic (inteligencia artificial, con tope de uso), Apple Developer
  (USD 99 por año), Google Play (pago único de USD 25), Daily.co (videollamadas,
  gratis hasta cierto volumen), y otros en plan gratis por ahora (Vercel,
  Resend, Cloudflare).
- **En Argentina:** registro de la marca SERE en el INPI, 4 clases, **$165.036**
  (17/10/2026); dominio sere.ar (unos $25.000 por año, NIC Argentina); dominio
  anterior vitaapp.com.ar (se sigue renovando por la redirección).
- **Costos que pago en cada cobro en dólares:** PayPal cobra cerca del 5,4% + USD
  0,30 por pago, y transferirle al profesional también tiene costo. Esos costos
  salen de mi comisión, no de la parte del profesional.

---

## 4. Lo que ya está decidido

- **Figura:** Monotributo, persona humana. Elegido para no cargar IVA con cero
  facturación. Contra asumida: respondo con mi patrimonio.
- **Rol:** Sere es intermediaria (agente), no vende la sesión. Factura solo la
  comisión. No es agente de retención ni percepción.
- **Comisiones** como en la sección 1.
- **Se lanza con los tres medios**, salvo que alguna respuesta (tuya o del
  abogado) obligue a postergar uno.

---

## 5. Qué necesito de vos

1. Las respuestas de **2.1 a 2.4**, que son las que deciden si lanzo con los
   medios en dólares y cómo.
2. **Un procedimiento de facturación** concreto: qué comprobante, a quién, cada
   cuánto, y qué tengo que guardar de cada cobro y cada transferencia al
   profesional. Lo quiero tener funcionando antes de la primera venta real.
3. Tu opinión sobre **la sociedad**: si conviene, cuándo y qué tipo.
4. Si querés llevar mi contabilidad de acá en adelante, **qué incluiría y cuánto
   costaría**.
5. Cualquier cosa que veas mal y que no haya preguntado.
