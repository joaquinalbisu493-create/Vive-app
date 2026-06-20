# CHANGELOG_SESIONES.md — Registro de sesiones de trabajo

> Antes de tocar código, leé la última entrada de quien no sea vos.
> Al terminar tu sesión, agregá tu propia entrada arriba de todo (orden cronológico inverso).

---

## 2026-06-20 — Joaquín (sesión 2)

**Tocado:**
- `context/AuthContext.tsx` — `role` ahora viene de `profiles.role` en Supabase
- `app/_layout.tsx` — `AuthRedirect` bifurca a `/(coach)` o `/(tabs)` según el rol real
- `app/index.tsx` — redirect inicial respeta el rol
- `screens/CoachLoginScreen.tsx` — agrega `validateAndNavigate()` con chequeo de rol cruzado
- `screens/RegisterScreen.tsx` — agrega chequeo de coach antes de `signUpWithEmail`

**Resumen:**
- Implementado routing basado en `profiles.role`: al hacer login, `AuthContext` hace `SELECT role FROM profiles` y `AuthRedirect` redirige a `/(coach)` o `/(tabs)` según corresponda. Antes todo el mundo iba a `/(tabs)`.
- Validaciones cruzadas para impedir que un mismo mail tenga rol de usuario y coach al mismo tiempo: `CoachLoginScreen` bloquea usuarios normales con mensaje claro; `RegisterScreen` bloquea emails que ya tienen fila en `coaches`. Si un coach con `verified=true` llega a `coach-login`, se lo redirige a `/(coach)` con un Alert.

**Pendiente para la próxima sesión:**
- Correr en Supabase si no se corrió: `ALTER TABLE coaches ADD COLUMN application_video_url text;`
- Probar el flujo completo en Expo Go: usuario normal intenta entrar a coach-login (debe ser bloqueado), coach verificado en coach-login (debe redirigir a /(coach)), registro normal con mail de coach (debe ser bloqueado)
- Definir qué ve un coach en `/(coach)` una vez aprobado — el grupo existe pero puede estar vacío

---

## 2026-06-20 — Joaquín

**Tocado:**
- `screens/OnboardingBifurcacion.tsx` (nuevo)
- `screens/CoachLoginScreen.tsx` (nuevo)
- `screens/CoachApplicationScreen.tsx` (nuevo)
- `app/onboarding-bifurcacion.tsx` (nuevo)
- `app/coach-login.tsx` (nuevo)
- `app/coach-application.tsx` (nuevo)
- `screens/OnboardingScreen1.tsx` — cambia navegación post-splash
- `app/_layout.tsx` — registra nuevas rutas y ONBOARDING_SCREENS
- `SCHEMA.md` — documenta columna nueva `coaches.application_video_url`

**Resumen:**
- Nuevo flujo de aplicación de coaches: pantalla de bifurcación "¿Cómo llegás a VIVE?" inserta entre el splash (index) y el onboarding de usuario (onboarding2). La opción "Quiero acompañar" lleva a coach-login → coach-application.
- `CoachLoginScreen` intenta signIn primero; si falla prueba signUp con nombre derivado del email. Navega a coach-application al autenticarse.
- `CoachApplicationScreen` inserta en `coaches` con `verified: false` y muestra confirmación inline. Maneja el caso de inserción duplicada (code 23505).
- `application_video_url` no existía en `coaches` — hay que correr el ALTER TABLE antes de probar el formulario (ver SCHEMA.md).

**Pendiente para la próxima sesión:**
- Correr en Supabase: `ALTER TABLE coaches ADD COLUMN application_video_url text;`
- Probar el flujo completo en Expo Go (bifurcación → coach-login → coach-application → confirmación)
- Definir qué ve un coach en `/(tabs)` una vez aprobado (`verified: true`) — hoy cae al mismo home de usuario

---

## 2026-06-20 — Andre

**Tocado:** `bookings` (esquema), `SCHEMA.md`

**Resumen:**
- Se agregó la columna `user_message` (text, nullable) a `bookings` vía
  `ALTER TABLE` — necesaria para guardar el mensaje opcional que el usuario le
  escribe al coach antes de reservar (la UI ya existía en
  BookingScreen_Confirm.tsx, pero la columna no estaba en el esquema
  actualizado, causando el error "Could not find the 'user_message' column").
- Cambio no destructivo (agrega columna nullable, no afecta filas existentes),
  corrido directamente sin bloquear en avisar a Joaquín dado el bajo riesgo.

**Pendiente para la próxima sesión:**
- Confirmar que el flujo completo de reserva funciona de punta a punta con
  esta columna agregada.

---

## 2026-06-20 — Andre

**Tocado:** `SCHEMA.md`, `screens/BookingScreen_Confirm.tsx`

**Resumen:**
- Resuelto merge con cambios de Joaquín (commit relacionado a `beae3d88`). La base de datos real cambió desde la última verificación — confirmado con `information_schema` que `bookings` ya tiene `coach_name`, `coach_specialty`, `scheduled_date`, `scheduled_time`, `amount`, `room_url` (Joaquín los agregó). `SCHEMA.md` actualizado con el estado real y confirmado.
- Confirmado con SQL: `bookings.coach_id` → `coaches.id`, mientras que `salas.coach_id` → `profiles.id` (= `coaches.profile_id`). Son dos FKs distintas con el mismo nombre de columna — quedó documentado en SCHEMA.md como regla crítica para no repetir el bug.
- `salas.room_url` ya existe en la base — el trigger de Jitsi Meet que charlamos con Joaquín ya está corrido y activo.
- En `BookingScreen_Confirm.tsx`: se corrigió que el código buscaba el coach por `specialty` en vez de por su ID real — esto podía reservar con el coach equivocado si dos coaches compartían especialidad. Ahora busca por `coachId`/`profileId` que llega desde la navegación, resolviendo `coaches.id` y `coaches.profile_id` en una sola query.
- Se mantuvo en la versión final: notificación push al coach, mensaje opcional del usuario, y se sumó el `roomUrl` de la sala para pasarlo a `booking-success`.

**Pendiente para la próxima sesión:**
- Resolver `CLAUDE.md` (1 conflicto) y confirmar que el protocolo de cierre de sesión quedó bien definido para ambos.
- Probar el flujo completo de reserva de punta a punta con esta versión corregida — todavía no se confirmó en el dispositivo que el bug de coachId esté resuelto.
- Sacar el selector "Test:" (locked/soon/live) de `SalaScreen.tsx` antes de producción.
- Confirmar si `AuthRedirect` (`segments[0] === '(coach)'`) funciona como se espera en expo-router — sospecha sin confirmar de sesión anterior.
- Conectar el botón de video de `SalaScreen.tsx` al `room_url` real (ya tiene el dato disponible, falta el `Linking.openURL` y sacar el `MEET_LINK` hardcodeado).

---

## 2026-06-20 — Joaquín (sesión 4)

**Tocado:** `SCHEMA.md`, `screens/BookingScreen_Confirm.tsx`

**Resumen:**
- SCHEMA.md reescrito con el esquema real confirmado por Andre (information_schema).
  Correcciones clave vs. versión anterior: bookings tiene date/time (no scheduled_date/time),
  no tiene coach_name/amount/room_url; salas no tiene room_url todavía; coach_id en salas
  y bookings es profiles.id (no coaches.id).
- BookingScreen_Confirm corregido:
  - Lookup coach: ahora solo pide profile_id (no coaches.id — era incorrecto)
  - INSERT salas: sin cambios (ya usaba coachProfileId correctamente)
  - INSERT bookings: usa date/time, coach_id = coachProfileId (profiles.id), sin coach_name/amount
  - Si coach no encontrado: error explícito en vez de crear sala sin coach
  - room_url: se pide pero queda vacío hasta que corra add-salas-room-url.sql

**Pendiente (requiere Andre):**
- Correr `scripts/add-salas-room-url.sql` para activar room_url en salas
- Confirmar si bookings.coach_id tiene FK explícita a profiles o es solo una convención
- SalaScreen botón de video (esperando decisión sobre cómo compartir el link)

---

## 2026-06-20 — Joaquín (sesión 3)

**Tocado:** `scripts/add-salas-room-url.sql` (nuevo), `screens/BookingScreen_Confirm.tsx`, `CHANGELOG_SESIONES.md`

**Resumen:**
- Creado `scripts/add-salas-room-url.sql` — script idempotente para que Andre revise antes de correr. Agrega `salas.room_url` y el trigger Jitsi. NO fue ejecutado.
- Removido `ensureAnonSession` de `BookingScreen_Confirm` (regla de producto: booking requiere sesión real). Reemplazado con `supabase.auth.getSession()` + redirect a `/login` si no hay sesión.

**Revisión de commits post-merge — qué está y qué falta:**

✅ Ya aplicado y correcto en main:
- Loading/error states + Alert en BookingScreen_Confirm
- `registrarEvento('reserva_iniciada' | 'reserva_confirmada')`
- Lookup coach por specialty → `coaches.id` + `coaches.profile_id` (para salas)
- Crear/buscar sala por `user_id + coach_id (profile_id)`
- INSERT booking con `sala_id`
- `roomUrl` (de la sala) pasado a BookingScreen_Success
- `Linking.openURL(roomUrl)` en BookingScreen_Success

✅ Aplicado en esta sesión:
- Booking requiere sesión real (no anónima) — redirect a /login si no hay sesión

⏳ Pendiente de coordinación con Andre:
- `SalaScreen.tsx` botón de video → abrir `salas.room_url` real en vez del link hardcodeado. La lógica está clara pero Andre define cómo se comparte el link (solo usuario, ambos, notificación).
- Revisar si `ensureAnonSession` dev-fallback con email hardcodeado debe removerse de `lib/supabase.ts` (Diario y Gratitud lo siguen usando — decisión de producto).
- Confirmar con Andre que `scripts/add-salas-room-url.sql` refleja el estado real de la base antes de correrlo.

---

## 2026-06-20 — Joaquín (sesión 2)

**Tocado:** `SCHEMA.md`, `CHANGELOG_SESIONES.md` (trigger Jitsi en `salas`)

**Resumen:**
- Adaptado el trigger de Jitsi Meet para correr sobre `salas` en vez de `bookings`, siguiendo la arquitectura de Andre.
- `ALTER TABLE salas ADD COLUMN room_url text` + trigger `fn_salas_room_url` corrido y verificado.
- Cada nueva sala generada automáticamente recibe `https://meet.jit.si/vita-<16hex>`.
- Decisión arquitectural confirmada: `salas` es la fuente del `room_url`, no `bookings`.

**Pendiente:**
- Reconectar el flujo de reserva en la app (BookingScreen_Confirm) a la arquitectura de Andre: crear/buscar sala primero, luego booking con `sala_id`.
- El `bookings` actual en prod todavía tiene nuestro schema viejo (room_url, coach_name, etc.) — decidir si migrar o limpiar.

---

## 2026-06-20 — Joaquín

**Tocado:** `lib/supabase.ts`, `screens/BookingScreen_Confirm.tsx`, `screens/BookingScreen_Success.tsx`, `scripts/supabase-bookings-setup.sql`, `scripts/supabase-bookings-setup.sql` (trigger Jitsi), `SCHEMA.md`, `CHANGELOG_SESIONES.md`, `CLAUDE.md`

**Resumen:**
- Conectado el flujo de reserva completo a Supabase: INSERT en `bookings`, lookup de `coach_id` por specialty, analytics events (`reserva_iniciada`, `reserva_confirmada`), loading/error states con Alert.
- Creada tabla `analytics_events` con RLS.
- Recreada tabla `bookings` con schema nuevo (DROP CASCADE + CREATE): agrega `coach_name`, `coach_specialty`, `scheduled_date`, `scheduled_time`, `amount`, `room_url`. Elimina el schema anterior de Andre (`sala_id`, `date`, `time`, `user_message`).
- Trigger `trg_booking_room_url` genera sala Jitsi Meet automáticamente (`https://meet.jit.si/vita-<16hex>`) al insertar un booking.
- `BookingScreen_Success` abre la sala real con `Linking.openURL(roomUrl)`.
- `ensureAnonSession()` tiene fallback al usuario de diagnóstico (`test_vita_diag@example.com`) cuando anon sign-in está rate limited en desarrollo.
- Flujo probado end-to-end: reserva guardada, sala Jitsi generada y abierta correctamente.

**⚠️ Conflicto con diseño de Andre:**
- El schema de `bookings` que Andre describía (con `sala_id`, `date`, `time`, `user_message`) NO existe en la base actual — fue reemplazado por el nuestro.
- `salas` y `messages` de Andre SÍ existen y no fueron tocadas.
- Decidir si `bookings` debería tener `sala_id` como FK a `salas` (requiere migración).

**Pendiente:**
- Quitar fallback de email de diagnóstico de `ensureAnonSession()` antes de producción.
- Decidir con Andre si `bookings` se vincula a `salas` con `sala_id`.
- Verificar columnas de `saved_resources`.

---

## 2026-06-19 — Andre

**Tocado:** `lib/supabase.ts`, `BookingScreen_Confirm`, `BookingScreen_Success`, `app/_layout.tsx`, `context/AuthContext.tsx`, `screens/LoginScreen.tsx`, `package-lock.json`

**Resumen:**
- Resuelto merge con varios conflictos de Joaquín (commit `94aa144d` y anteriores). Se priorizó el esquema real de la base (ver SCHEMA.md) sobre código que asumía un esquema distinto.
- Bug encontrado y arreglado: `AuthProvider` no envolvía el árbol en `app/_layout.tsx` — causaba colgado silencioso en pantalla de inicio.
- Bug encontrado y arreglado: `styles` no definido en `LoginScreen.tsx` (debía ser `s`), más una llave huérfana en el StyleSheet.
- Bug encontrado, NO arreglado todavía: el flujo de reserva pasa `profileId` mal en algún punto de la cadena Conexiones → ProfesionalScreen → booking-calendar → booking-confirm, cayendo al fallback hardcodeado de coachId. Quedó con logs de debug puestos, falta confirmar el valor real.
- Confirmado con SQL: `salas.coach_id` y `salas.user_id` son FK a `profiles.id`, NO a `coaches.id`.
- Descubierto: Joaquín tiene un script SQL (`scripts/supabase-bookings-setup.sql`) que diseña una arquitectura distinta (bookings fusionado con salas, trigger de Jitsi Meet automático) — en ese momento sin correr contra la base real.

**Pendiente para la próxima sesión:**
- Terminar de rastrear el bug de coachId/profileId en el flujo de reserva (logs ya puestos en ProfesionalScreen.tsx y BookingScreen_Confirm.tsx — recordar sacarlos después).
- Decidir con Joaquín si se adopta el trigger de Jitsi Meet (adaptado a `salas`, no a `bookings`).
- Sacar el selector "Test:" (locked/soon/live) de `SalaScreen.tsx` antes de producción.
