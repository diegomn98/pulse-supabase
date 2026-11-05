# 0004 · Acceso a la lista de espera con funciones RPC

- Estado: aceptada
- Fecha: 2026-11-05

## Contexto
`marketing.waitlist` vive en un esquema que no se expone en la API (0003), así que las Edge Functions no llegan a la tabla por la API REST aunque usen una clave secreta. Había dos opciones: conectarse directamente a Postgres desde las funciones o exponer funciones RPC en un esquema expuesto.

## Decisión
Funciones `public.join_waitlist` y `public.unsubscribe_waitlist`, con `security invoker` y `search_path` vacío. El permiso de ejecución se revoca explícitamente a `public`, `anon` y `authenticated` y solo se concede a `service_role`. Las Edge Functions las llaman con el cliente de Supabase y una clave secreta.

## Consecuencias
- No hace falta una cadena de conexión a Postgres ni un controlador en las funciones; se usa el mismo cliente y la misma clave que el resto.
- Con `security invoker` las funciones no amplían permisos: se ejecutan con los de quien llama, y solo `service_role` tiene acceso al esquema y a la tabla.
- La lógica de alta (inserción o actualización, reactivación) es atómica en una sola sentencia y se prueba con pgTAP.
- Las funciones aparecen en `types/database.ts`. Una llamada con la clave publicable recibe 401 y no aparecen en el esquema OpenAPI para `anon`.
- Cualquier función nueva en `public` recibe `execute` para `anon` y `authenticated` por los privilegios por defecto de Supabase; cada función de este tipo debe revocarlos de forma explícita y tener su test.
