# Reglas compartidas

Reglas de negocio que web e iOS implementan cada una en su lenguaje y que deben dar exactamente el mismo resultado. La descripción funcional está en `../pulse-web/docs/PRODUCT_SPEC.md` (reglas `RN-xx`); aquí está la definición exacta y sus casos de prueba.

Una regla solo se implementa cuando su estado es «decidida». Las pendientes se deciden con Diego y se registran como ADR antes de escribir su definición y sus fixtures.

## Formato de las fixtures

Un archivo JSON por caso en `rules/fixtures/<regla>/<caso>.json`:

```json
{
  "rule": "streak",
  "description": "Qué demuestra el caso, en una frase",
  "input": {},
  "expected": {}
}
```

- `rule` coincide con el nombre de la carpeta. `input` y `expected` siguen la forma descrita en cada regla.
- Fechas de calendario como `AAAA-MM-DD`; instantes como ISO 8601 en UTC.
- Web e iOS ejecutan todas las fixtures en sus tests. Cada repositorio las copia con su script (`npm run sync:rules` en web) para compilar sin depender de esta carpeta.

## Reglas

### `interval-total` · duración de una rutina de intervalos · decidida

- **Entrada:** `{ exercises, rounds, workSeconds, restSeconds, preparationSeconds }`.
- **Definición:** cada ronda empieza con su preparación y alterna trabajo y descanso, sin descanso tras el último ejercicio. La preparación de la ronda siguiente hace de transición.
  `ronda = preparationSeconds + exercises × workSeconds + (exercises − 1) × restSeconds`; `total = rounds × ronda`.
- **Salida:** `{ totalSeconds }`.
- Plantilla inicial: 7 ejercicios, 2 rondas, 30 / 20 / 20 → 700 s (11:40).

### `streak` · racha de semanas · decidida

- **Entrada:** `{ weeks: [{ start, sessions, goal }], currentWeek: { start, sessions, goal } }`. `weeks` son las semanas anteriores ya cerradas, en orden cronológico y consecutivas; `start` es el lunes de cada una.
- **Definición:** una semana está cumplida si `sessions ≥ goal`. La racha actual es el número de semanas cumplidas seguidas que terminan en la última semana cerrada, más uno si la semana en curso ya está cumplida. La semana en curso sin cumplir no rompe la racha mientras no termine. La mejor racha es la racha más larga del historial, contando la semana en curso si está cumplida.
- **Salida:** `{ current, best }`.

### `week` · a qué semana pertenece una sesión · pendiente

- Decidido: la semana va de lunes a domingo en la zona horaria del usuario.
- Pendiente: si cuenta la hora de inicio o la de fin de la sesión (propuesta: la de inicio), y qué objetivo se aplica si cambia a mitad de semana (propuesta: el vigente al cerrarla).

### `goal` · objetivo semanal · decidida

- Entre 2 y 7 sesiones. Cuentan sesiones, no días: dos el mismo día suman dos.
- Las sesiones por encima del objetivo no pasan a la semana siguiente.
- Cuenta una sesión terminada, completa o con «Terminar y guardar». Una descartada con «Salir sin guardar» no existe.

### `volume` · volumen de fuerza · decidida

- Suma de `reps × peso` de las series hechas. Las series sin peso (peso corporal) no suman: en el diseño, Fondos aparece con «—».

### `next-routine` · lo que toca · pendiente

- Decidido: se propone la rutina que más tiempo lleva sin hacerse. Tras un parón se propone la más corta por duración estimada.
- Pendiente: desempate, cómo entran las rutinas sin probar y cuántos días cuentan como parón.

### `records` y `one-rep-max` · pendiente

- Pendiente: qué cuenta como récord y fórmula del 1RM estimado.
