# PULSE · Supabase

Backend común de PULSE: base de datos, autenticación, Edge Functions y contrato compartido entre `pulse-landing`, `pulse-web` y la futura app de iOS. Es el único repositorio que modifica el esquema.

## Qué vive aquí

- `supabase/`: configuración, migraciones, Edge Functions, tests de base de datos y datos de ejemplo para local.
- `types/database.ts`: tipos generados del esquema. No se editan a mano.
- `docs/RULES.md` y `rules/fixtures/`: reglas de negocio compartidas por web e iOS y sus casos de prueba.
- `docs/ARCHITECTURE.md`: esquemas, tablas, políticas, funciones y su contrato.
- `docs/STATUS.md` y `docs/decisions/`.

## Quién lo usa

- `pulse-landing`: llama a las funciones de la lista de espera.
- `pulse-web` y la app de iOS: ya ahora, las reglas y sus casos de prueba; más adelante, Auth, datos y sincronización.
- Los otros repositorios nunca crean migraciones ni funciones. Copian los tipos y las fixtures con sus propios scripts para poder compilar sin depender de esta carpeta.

## Autoría (obligatorio, sin excepciones)

- Diego es el único autor visible del proyecto.
- Nunca escribas referencias a Claude, Claude Code, Anthropic, IA, "asistente", "agente", "generado automáticamente" o similares en código, SQL, comentarios, commits, PRs, README, documentación, changelogs, `package.json`, metadatos, nombres de archivos o ramas.
- Commits sin trailers `Co-Authored-By`, sin "Generated with" y sin enlaces de sesión.
- Commits en inglés con Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), pequeños y centrados en un cambio.
- No hagas push, no abras PRs y no reescribas historial sin que te lo pida.

## Comentarios

- Por defecto, ninguno. Solo para un porqué no evidente, nunca para narrar qué hace el código o el SQL.
- Prohibido: comentarios que mencionen fases, pasos, tareas o prompts, código comentado y TODOs sueltos. Lo pendiente va a `docs/STATUS.md`.

## Convenciones

- Migraciones con la CLI de Supabase (`supabase migration new <nombre>`), una por cambio y con nombre descriptivo en inglés. Una migración aplicada en un entorno compartido no se edita: se crea otra.
- SQL en minúsculas y `snake_case`. Tablas en plural y en inglés. Columnas `id uuid`, `created_at` y `updated_at` como `timestamptz` en UTC.
- RLS activado en todas las tablas desde la migración que las crea, con políticas explícitas y mínimas. Sin políticas para `anon` salvo necesidad justificada y registrada.
- Esquemas: `marketing` para la lista de espera, sin exponer en la API; `public` para los datos de la app, más adelante.
- Edge Functions en TypeScript (Deno), una carpeta por función, con validación de entrada, respuestas JSON coherentes y CORS restringido a los orígenes configurados por variable de entorno. Las funciones públicas (llamadas con la clave publicable en la cabecera `apikey`, sin usuario) se configuran con `verify_jwt = false` y validan y limitan en su propio código.
- Sin código muerto, `console.log` de depuración ni configuraciones sin uso.
- Antes de dar algo por terminado, revisa el diff completo como si fueras un revisor senior exigente y corrige lo que no pasaría la revisión.

## Seguridad y datos personales

- Claves nuevas de Supabase: la publicable (`sb_publishable_…`) es la única que puede estar en un frontend; las secretas (`sb_secret_…`) solo existen en las Edge Functions, que las leen de `SUPABASE_SECRET_KEYS`. No se usan las claves heredadas `anon` y `service_role`, que Supabase está retirando.
- Secretos propios en local en `supabase/functions/.env` (no versionado). `supabase/functions/.env.example` documenta los nombres sin valores. En remoto se configuran con `supabase secrets set`, solo con autorización.
- Datos mínimos: solo lo que la especificación pide. Nada de emails ni datos personales en los logs.
- No inventes credenciales, claves ni URLs de proyecto: si falta una, pregunta.

## Entornos

- Todo el desarrollo se hace en local con la CLI de Supabase (necesita Docker).
- Entornos remotos de desarrollo y producción: los crea Diego. Nunca ejecutes `db push`, despliegues de funciones, cambios de secretos, `link` ni ninguna operación remota sin autorización explícita en ese momento.

## Dependencias

- No añadas dependencias, servicios externos (por ejemplo, el proveedor de correo) ni extensiones de Postgres sin autorización expresa. Para proponer una, justifícala y verifica su licencia y mantenimiento.

## Tests

- Esquema y políticas RLS: tests de base de datos con `supabase test db` (pgTAP). Cada política tiene un test que demuestra lo que permite y lo que niega.
- Edge Functions: runner de tests de Deno, con casos válidos, inválidos, campo trampa, duplicados y límite de peticiones.
- Reglas compartidas: cada fixture de `rules/fixtures/` cumple el formato de `docs/RULES.md`.

## Calidad antes de dar algo por terminado

1. `supabase db reset` aplica todas las migraciones desde cero sin errores.
2. Tests de base de datos y de funciones en verde.
3. Tipos regenerados en `types/database.ts` si cambió el esquema.
4. `docs/ARCHITECTURE.md` refleja el esquema y el contrato de las funciones.
5. `docs/STATUS.md` actualizado.

Nunca afirmes que algo está probado si no lo has ejecutado. Si algo falla y no lo resuelves, dilo claramente.

## Comandos

Si alguno todavía no existe, se crea tal como se describe aquí durante la puesta en marcha. La CLI de Supabase se instala como dependencia de desarrollo de npm.

- `npm run db:start` / `npm run db:stop`: Supabase local.
- `npm run db:reset`: recrea la base local aplicando todas las migraciones.
- `npm run db:test`: tests de base de datos (pgTAP).
- `npm run functions:serve`: sirve las Edge Functions en local.
- `npm run functions:test`: tests de las funciones con Deno.
- `npm run types`: regenera `types/database.ts` desde la base local.
- `npm run check`: reset + tests de base de datos + tests de funciones. Debe pasar antes de cada commit.
