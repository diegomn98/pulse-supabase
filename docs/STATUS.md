# Estado

Puesta en marcha terminada: proyecto local de Supabase con la CLI y Deno como dependencias de desarrollo, sin migraciones ni funciones todavía. Hay un test pgTAP que exige RLS en todas las tablas de `public` y `marketing`. Contiene también la documentación, las reglas compartidas y sus primeras fixtures (`interval-total` y `streak`).

## Plan por fases

### Fase 0 · Puesta en marcha ✓
- [x] `package.json` con la CLI de Supabase como dependencia de desarrollo y los scripts de `CLAUDE.md` › Comandos.
- [x] `supabase init`, `config.toml` y `.gitignore` (sin `supabase/functions/.env`).
- [x] `supabase/functions/.env.example` con los nombres de los secretos.
- [x] Supabase local arrancando (`npm run db:start`) y `npm run check` en verde.

### Fase 1 · Lista de espera
- [ ] Migración del esquema `marketing` y la tabla `waitlist` con RLS, sin exponer en la API.
- [ ] Tests pgTAP de la tabla y de que el rol anónimo no puede leer ni escribir.
- [ ] Edge Function `join-waitlist` con validación, campo trampa, límite de peticiones y tests.
- [ ] Plantilla del correo «Ya estás en la lista» (HTML y texto plano).
- [ ] Envío con el proveedor de correo (necesita decidirlo).
- [ ] Edge Function `unsubscribe` (necesita el texto de la página de confirmación).
- [ ] Tipos regenerados y contrato actualizado en `docs/ARCHITECTURE.md`.

### Fase 2 · Entornos remotos
- [ ] Proyectos de desarrollo y producción creados por Diego.
- [ ] Secretos configurados y despliegue de migraciones y funciones (con autorización en cada paso).

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

- Proveedor de correo y remitente.
- Doble opt-in o alta directa en la lista de espera.
- Página de confirmación de baja.
- Estrategia de sincronización y forma de guardar rutinas y resultados.

## Riesgos

- La CLI de Supabase en local necesita Docker instalado y arrancado.
