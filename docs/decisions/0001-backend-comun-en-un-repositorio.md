# 0001 · Backend común en un repositorio propio

- Estado: aceptada
- Fecha: 2026-11-05

## Contexto
PULSE tiene tres aplicaciones (landing, web e iOS) que usan el mismo Supabase: la cuenta y los datos deben seguir al usuario de un dispositivo a otro, y la lista de espera vive junto a los usuarios. Si cada repositorio modificara el esquema, las migraciones chocarían. Además, web e iOS implementan las mismas reglas de negocio en lenguajes distintos.

## Decisión
`pulse-supabase` es el único repositorio que modifica el esquema, las políticas y las Edge Functions. También guarda los tipos generados, las reglas compartidas (`docs/RULES.md`) y sus casos de prueba (`rules/fixtures/`).

## Consecuencias
- Los demás repositorios no crean migraciones ni funciones: lo piden aquí.
- Cada consumidor copia los tipos y las fixtures con su propio script, para compilar sin depender de esta carpeta.
- Web e iOS ejecutan las mismas fixtures, así que una regla no puede comportarse distinto en cada plataforma sin que falle un test.
