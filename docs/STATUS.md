# Estado

Puesta en marcha terminada y lista de espera en curso: existe el esquema `marketing` con la tabla `waitlist`, RLS sin políticas, las funciones RPC `public.join_waitlist`, `public.mark_welcome_sent` y `public.unsubscribe_waitlist` (solo para `service_role`) y sus tests pgTAP. La Edge Function `join-waitlist` está hecha y probada en local: valida, filtra el campo trampa, limita peticiones, da de alta con la RPC y envía el correo «Ya estás en la lista» con Resend. La Edge Function `unsubscribe` también está hecha y probada en local: la llama la página `/baja` de la landing con el token del enlace del correo ([0006](decisions/0006-baja-desde-la-landing.md)). Hay un test pgTAP que exige RLS en todas las tablas de `public` y `marketing`. Contiene también la documentación, las reglas compartidas y sus primeras fixtures (`interval-total` y `streak`).

## Plan por fases

### Fase 0 · Puesta en marcha ✓
- [x] `package.json` con la CLI de Supabase como dependencia de desarrollo y los scripts de `CLAUDE.md` › Comandos.
- [x] `supabase init`, `config.toml` y `.gitignore` (sin `supabase/functions/.env`).
- [x] `supabase/functions/.env.example` con los nombres de los secretos.
- [x] Supabase local arrancando (`npm run db:start`) y `npm run check` en verde.

### Fase 1 · Lista de espera
- [x] Migración del esquema `marketing` y la tabla `waitlist` con RLS, sin exponer en la API.
- [x] Tests pgTAP de la tabla y de que el rol anónimo no puede leer ni escribir.
- [x] Funciones RPC `join_waitlist` y `unsubscribe_waitlist` con `execute` solo para `service_role` y sus tests ([0004](decisions/0004-acceso-a-la-lista-de-espera-por-rpc.md)).
- [x] Función RPC `mark_welcome_sent` para registrar `welcome_sent_at` tras enviar el correo, con sus tests.
- [x] Edge Function `join-waitlist` con validación, campo trampa, límite de peticiones y tests.
- [x] Plantilla del correo «Ya estás en la lista» (HTML y texto plano).
- [x] Envío con Resend ([0005](decisions/0005-correo-con-resend.md)); si falla, el alta se mantiene y `welcome_sent_at` queda vacío.
- [x] Edge Function `unsubscribe` con `POST { token }`, CORS, límite de peticiones y tests; enlace «Darme de baja» a `SITE_URL/baja?token=…` ([0006](decisions/0006-baja-desde-la-landing.md)).
- [ ] Página `/baja` en `pulse-landing` (texto y diseño) que llame a `unsubscribe`, preferiblemente tras pulsar un botón.
- [x] Tipos regenerados y contrato actualizado en `docs/ARCHITECTURE.md`.
- [ ] Datos legales del pie del correo: sustituir [NOMBRE O RAZÓN SOCIAL] y [DIRECCIÓN].
- [ ] Reintento de los correos de bienvenida que fallaron (`welcome_sent_at` vacío) sin esperar a una nueva alta, si hace falta.

### Fase 2 · Entornos remotos
- [ ] Proyectos de desarrollo y producción creados por Diego.
- [ ] Dominio de envío verificado en Resend en la región de Irlanda (`eu-west-1`) y `EMAIL_FROM` con ese dominio.
- [ ] Secretos configurados (`ALLOWED_ORIGINS`, `SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`) y despliegue de migraciones y funciones (con autorización en cada paso).

### Fase 3 · Datos de la app (cuando la web funcione en local)
- [ ] Modelo de datos y estrategia de sincronización (ADR).
- [ ] Tablas de la app con RLS por usuario y sus tests.
- [ ] Catálogo de ejercicios.
- [ ] Auth con Apple, Google y email, con las plantillas de correo del diseño.

## Reglas compartidas

- Decididas y con fixtures: `interval-total`, `streak`.
- Decididas sin fixtures todavía: `goal`, `volume`.
- Pendientes: `week` (hora de inicio o de fin, cambio de objetivo), `next-routine`, `records`, `one-rep-max`.

## Decisiones abiertas

- Remitente definitivo (dominio y dirección de `EMAIL_FROM`).
- Doble opt-in o alta directa en la lista de espera.
- Estrategia de sincronización y forma de guardar rutinas y resultados.

## Riesgos

- La CLI de Supabase en local necesita Docker instalado y arrancado.
- El límite de peticiones de `join-waitlist` y `unsubscribe` vive en memoria de cada instancia: no se comparte entre instancias ni sobrevive a un reinicio. Si hay abuso, habrá que llevarlo a la base de datos.
- El enlace «Darme de baja» depende de que la landing esté publicada en `SITE_URL` y de que su origen esté en `ALLOWED_ORIGINS`.
- Sin baja en un clic (RFC 8058): Gmail y Yahoo la exigen a quien envía correos masivos. No afecta al correo de bienvenida, pero sí afectaría a un envío del lanzamiento a toda la lista.
