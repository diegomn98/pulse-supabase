# 0002 · Entornos

- Estado: aceptada
- Fecha: 2026-11-05

## Contexto
Hace falta desarrollar y probar sin tocar los datos reales de la lista de espera ni, más adelante, los de los usuarios.

## Decisión
- Local: Supabase con la CLI para todo el desarrollo y los tests.
- Remoto: un proyecto de desarrollo y otro de producción, creados y gestionados por Diego.
- Ninguna operación remota (migraciones, funciones, secretos, `link`) sin su autorización explícita en ese momento.

## Consecuencias
- Hace falta Docker en local.
- La landing y las apps usan las URLs y claves públicas de cada entorno mediante variables de entorno, nunca escritas en el código.
