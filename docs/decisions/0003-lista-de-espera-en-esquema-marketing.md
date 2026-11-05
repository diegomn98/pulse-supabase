# 0003 · Lista de espera en el esquema `marketing`

- Estado: aceptada
- Fecha: 2026-11-05

## Contexto
La lista de espera guarda emails de personas que todavía no son usuarias y no tiene relación con los datos de la app. No debe ser accesible desde ningún cliente.

## Decisión
Tabla `marketing.waitlist`, con RLS y sin políticas, en un esquema que no se expone en la API. Solo las Edge Functions `join-waitlist` y `unsubscribe` acceden, con una clave secreta.

## Consecuencias
- La landing no puede leer ni escribir la tabla aunque alguien obtenga su clave pública.
- Para avisar en el lanzamiento se exporta la lista desde el panel o con una función específica, nunca desde un cliente.
