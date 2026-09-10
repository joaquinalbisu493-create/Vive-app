# Pendientes para Andre — al 10/09/2026

> Cuatro cosas que quedaron trabadas del lado de Joaquín + Claude porque
> **dependen de accesos de infra que tenés vos**. Cada una con el contexto justo
> y el comando/paso exacto para no volver a investigar. Ordenadas por impacto.

---

## 1. 🔴 Prueba 3 — medir la tarifa REAL de Mercado Pago

**Por qué:** todo el desglose de "cómo te pagamos" que ve el coach cuelga de
`MP_FEE_PCT_OBSERVED` en `lib/pricing.ts`, hoy en **4%** — medido sobre un pago de
**$1**, donde cualquier componente fijo distorsiona el porcentaje. Si el real no
es ~4%, la app le está prometiendo al coach un neto que no es.

**Por qué es tuyo:** la comisión se le cobra al `collector` = **Coach Prueba**, así
que vive en **el Mercado Pago de Coach Prueba** (tu cuenta). No está en nuestra
base (ni `bookings` ni la vista `operaciones_de_dinero` guardan el fee — chequeado).

**Qué hacer:** abrí en el MP de Coach Prueba cualquiera de los pagos de **$4.500**
(están todos `reembolsado`, pero MP conserva el fee original) y pasá el **"Costo de
Mercado Pago" / comisión** de ese pago. Con ese número:
`fee % = mercadopago_fee / 4500 × 100`. Ej: MP se llevó $180 → 4%.

**Qué se hace con eso:** una línea — `MP_FEE_PCT_OBSERVED = <valor>` en
`lib/pricing.ts`. Lo usan solos `lib/desglosePago.ts` y `screens/CoachPayoutScreen.tsx`.

---

## 2. 🔴 Prender el CAPTCHA (paso A.3 de `docs/anti-abuso-altas.md`)

**Estado:** el cliente está terminado y probado; los rate limits ya están
aplicados (`verify=10`, `otp=6`, anónimos off). Falta **solo prenderlo**, y es lo
único del anti-abuso que queda.

**Por qué es tuyo:** necesita la **Secret Key de Turnstile** (vive en Cloudflare,
no en el repo) y confirmar que **la build distribuida lleva la site key** (ya está
en EAS). 🔴 El orden es sagrado: prenderlo antes de que la gente esté en la build
con token la deja sin poder entrar.

**Qué hacer:** con la build distribuida confirmada y la Secret Key a mano, una sola
llamada (o el dashboard):
```bash
curl -X PATCH 'https://api.supabase.com/v1/projects/ggygiihhnkjrerpinhha/config/auth' \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"security_captcha_enabled":true,"security_captcha_provider":"turnstile","security_captcha_secret":"<SECRET KEY>"}'
```
Después el `curl` de A.4 del runbook tiene que dar **400**.

---

## 3. 🔴 DMARC de `vitaapp.com.ar`

**Por qué:** que los mails (incluido el OTP del checkout) no caigan en spam con un
remitente nuevo. Hoy no hay DMARC (verificado). El **DKIM de Resend ya está**, así
que DMARC va a **pasar por DKIM** — no hace falta SPF.

**Por qué es tuyo:** la zona DNS está en **Vercel, bajo tu cuenta** (Joaquín no
tiene acceso al panel de Domains).

**Qué hacer:** Vercel → tu scope → **Domains** → `vitaapp.com.ar` → **DNS Records**
→ Add:
- **Type** `TXT` · **Name** `_dmarc` · **Value** `v=DMARC1; p=none; rua=mailto:andrealbisu@gmail.com`

`p=none` solo monitorea, no rechaza nada.

---

## 4. 🔴 Revisar (y correr) el SQL del gate de alta de coach — PR #2

**Qué es:** el marcador de "alta de coach a medio hacer" se movió de `AsyncStorage`
(que se saltea borrando los datos de la app) a una columna del servidor,
`profiles.coach_alta_paso`. Script: `scripts/add-coach-alta-paso.sql`.

**Por qué es tuyo:** es un cambio estructural del flujo de auth → **regla #6**
(se revisa entre los dos), y conviene una prueba en dispositivo del arranque
(el AuthRedirect tiene historia de rebotes). El script está **SIN CORRER**.

**Estado seguro mientras tanto:** el código (`lib/altaCoach.ts`) ya usa fallback a
`AsyncStorage` si la columna no existe, así que **no rompe nada** corra o no el SQL.

**Qué hacer:** revisar el SQL, correrlo (trae su sección de verificación), probar
el arranque en dispositivo. Después se mergea el PR #2 (Claude reconcilia el
conflicto de `SCHEMA.md`/`CHANGELOG` contra main, sin force-push).

---

## Lo que ya quedó cerrado hoy (para contexto)

- ✅ IA con tope por persona/día + rate limits (en producción; PR #1 en main).
- ✅ Tier 2 de hardening: fallback de `necesitaVerificarMail`, banco de voz +
  guardarraíl transversal (C7), logging del piso de seguridad (D6), y el gate de
  coach de arriba (código; PR #2).
- ✅ Checkout web **Prueba 1** cerrada — y en el camino se encontraron y
  arreglaron **dos bugs** del arreglo del nombre del 09/09 que nunca funcionó:
  `id="nombre"` duplicado (#3) y el placeholder `'Usuario'` del trigger (#4). Los
  dos ya deployados. Confirmado contra la base que el coach ve el nombre real.
- ✅ Cuentas de prueba del checkout borradas de producción.
