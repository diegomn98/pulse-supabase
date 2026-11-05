# Arquitectura del backend

Un único proyecto de Supabase por entorno para todo PULSE. Este documento es la referencia del esquema y del contrato de las funciones; se actualiza con cada cambio.

## Estructura del repositorio

```
supabase/
  config.toml
  migrations/            una migración por cambio
  functions/
    join-waitlist/
    unsubscribe/
    _shared/             código común de las funciones (validación, CORS, correo)
  tests/                 tests pgTAP
  seed.sql               datos de ejemplo solo para local
  functions/.env.example nombres de los secretos propios, sin valores
types/
  database.ts            generado con `npm run types`
rules/
  fixtures/              casos de prueba de las reglas compartidas
docs/
```

## Esquemas

| Esquema | Contenido | Expuesto en la API |
|---|---|---|
| `marketing` | Lista de espera | No |
| `public` | Funciones RPC de la lista de espera; datos de la app (más adelante) | Sí, siempre con RLS |

## Lista de espera

### Tabla `marketing.waitlist`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | Clave primaria, por defecto `gen_random_uuid()` |
| `email` | `text` | En minúsculas y sin espacios; único |
| `platforms` | `text[]` | Subconjunto de `ios`, `android`, `web` (restricción de comprobación) |
| `source` | `text` | `hero` o `footer` |
| `created_at` | `timestamptz` | Por defecto `now()` |
| `updated_at` | `timestamptz` | Se actualiza en cada cambio |
| `welcome_sent_at` | `timestamptz` | Cuándo se envió el correo de bienvenida |
| `unsubscribe_token` | `uuid` | Único, por defecto `gen_random_uuid()` |
| `unsubscribed_at` | `timestamptz` | Nulo mientras siga apuntado |

- Restricciones: `email = lower(btrim(email))` y entre 3 y 254 caracteres; `platforms <@ {ios, android, web}`; `source in (hero, footer)`.
- `updated_at` lo mantiene el trigger `waitlist_set_updated_at` con la función `marketing.set_updated_at()`.
- RLS activado y sin políticas: solo las funciones, con una clave secreta, leen y escriben.
- Permisos: `anon` y `authenticated` no tienen `usage` en el esquema ni privilegios en la tabla; `service_role` tiene `usage` y `select`, `insert` y `update`.
- El esquema `marketing` no se expone en la API, así que tampoco aparece en `types/database.ts`.
- Tests: `supabase/tests/marketing_waitlist_test.sql`. Demuestran que `anon` y `authenticated` no pueden leer ni escribir, y que RLS bloquea a `anon` aunque se le concedieran privilegios por error.

### Funciones RPC

Las Edge Functions acceden a `marketing.waitlist` a través de dos funciones en `public` ([0004](decisions/0004-acceso-a-la-lista-de-espera-por-rpc.md)), llamadas con el cliente de Supabase y una clave secreta (`supabase.rpc(...)`).

- Ambas son `language sql`, `security invoker` y con `search_path = ''`: se ejecutan con los permisos de quien llama.
- Permisos: `execute` revocado explícitamente a `public`, `anon` y `authenticated`; solo `service_role` puede ejecutarlas. Con la clave publicable la API responde 401 (`42501`) y las funciones no aparecen en su esquema OpenAPI.

| Función | Argumentos | Devuelve | Comportamiento |
|---|---|---|---|
| `join_waitlist` | `email text`, `platforms text[]`, `source text` | Una fila `{ send_welcome boolean, unsubscribe_token uuid }` | Normaliza el email (`lower(btrim(...))`). Si no existe, lo inserta. Si existe, sustituye las plataformas, conserva el `source` original y pone `unsubscribed_at` a nulo. La respuesta es igual exista o no el email. `send_welcome` es `true` mientras `welcome_sent_at` sea nulo; `unsubscribe_token` sirve para el enlace de baja del correo. |
| `unsubscribe_waitlist` | `token uuid` | Nada (204 por la API) | Marca `unsubscribed_at = now()` si el token existe y no estaba dado de baja. Un token desconocido o una segunda baja no cambian nada ni dan error. |

- Las restricciones de la tabla siguen aplicando: plataformas o `source` fuera de los valores permitidos devuelven error (`23514`), así que la Edge Function valida antes de llamar.
- Tests: `supabase/tests/waitlist_rpc_test.sql`. Demuestran que `public`, `anon` y `authenticated` no pueden ejecutarlas, que `service_role` sí, y cubren alta nueva, email existente, reactivación, correo ya enviado y baja con token válido, repetido y desconocido.

### Edge Function `join-waitlist`

- **Llamada:** pública, con la clave publicable en la cabecera `apikey` y `verify_jwt = false`.
- **Petición:** `POST` con JSON `{ "email": string, "platforms": ("ios" | "android" | "web")[], "source": "hero" | "footer", "website": string }`. `website` es el campo trampa y debe llegar vacío.
- **Comportamiento:**
  1. Valida el email y las plataformas. Si el campo trampa viene relleno, responde éxito sin guardar.
  2. Limita las peticiones por IP y por email.
  3. Llama a `join_waitlist`: si el email no existe, lo inserta; si existe, actualiza las plataformas y, si estaba dado de baja, lo reactiva. No revela si ya existía.
  4. Si `send_welcome` es `true`, envía el correo de bienvenida con el enlace de baja (`unsubscribe_token`) y guarda `welcome_sent_at` (falta la función que lo registra; ver `docs/STATUS.md`).
- **Respuestas:**

| Caso | Código | Cuerpo |
|---|---|---|
| Alta correcta, ya existente o campo trampa | 200 | `{ "ok": true }` |
| Datos inválidos | 400 | `{ "ok": false, "error": "invalid_input" }` |
| Demasiadas peticiones | 429 | `{ "ok": false, "error": "rate_limited" }` |
| Error interno o del proveedor de correo | 500 | `{ "ok": false, "error": "server_error" }` |

- **CORS:** solo los orígenes de `ALLOWED_ORIGINS`.
- **Variables de entorno:** `ALLOWED_ORIGINS`, `SITE_URL` y las del proveedor de correo (por decidir). `SUPABASE_URL` y `SUPABASE_SECRET_KEYS` las aporta Supabase; no se usan las claves heredadas.

### Edge Function `unsubscribe`

- `GET ?token=<uuid>`. Llama a `unsubscribe_waitlist`: si el token existe, marca `unsubscribed_at` y responde con una página breve de confirmación. Si no existe, la misma página, sin revelar nada.
- Texto y aspecto de la página: por decidir.

### Correo «Ya estás en la lista»

- Diseño: `../pulse-imagenes/02-web/29-correos-verificar-cuenta-recuperar-contrasena-y-lista-de-espera/03-correo-ya-estas-en-la-lista.png`.
- Textos: «Ya estás en la lista» · «¡Gracias por apuntarte! Te escribiremos en cuanto PULSE esté disponible para iOS, Android y web, para que seas de los primeros en probarla.» · los tres tipos (Intervalos «Con voz guía», Running «Con GPS», Fuerza «Series y pesos») · «Solo te escribiremos para avisarte del lanzamiento. Nada de spam.» · «Un abrazo, El equipo de PULSE» · pie con [NOMBRE O RAZÓN SOCIAL] · [DIRECCIÓN] y enlaces a Privacidad, Términos y «Darme de baja».
- HTML compatible con clientes de correo (tablas y estilos en línea) y versión de texto plano, en `supabase/functions/_shared/`.

## Datos de la app (más adelante)

Se diseñan cuando la web funcione en local, a partir de `pulse-web/docs/PRODUCT_SPEC.md` (sección 3) y del modelo de dominio que haya quedado en la web. Principios ya fijados:

- Todas las tablas de usuario con `user_id` referenciando `auth.users` y políticas `user_id = auth.uid()`.
- IDs `uuid` generados en el cliente (local-first) y fechas en UTC.
- Catálogo de ejercicios global de solo lectura; ejercicios propios por usuario.
- Auth con Apple, Google y email. Las plantillas de correo de Auth siguen los diseños «Confirma tu email» y «Crea una contraseña nueva» de la misma carpeta de capturas.

Pendiente de decidir: estrategia de sincronización (propuesta: `updated_at` del servidor, borrado lógico con `deleted_at` y última escritura gana por registro) y si las estructuras de rutina y resultado se guardan normalizadas o como `jsonb` versionado.
