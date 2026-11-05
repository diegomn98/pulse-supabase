# 0006 · Baja de la lista de espera desde la landing

- Estado: aceptada
- Fecha: 2026-11-05

## Contexto
El correo de bienvenida lleva un enlace «Darme de baja» con el `unsubscribe_token`. El plan era que el enlace abriera la Edge Function `unsubscribe` con `GET` y que esta devolviera una página de confirmación, pero Supabase reescribe a `text/plain` las respuestas `text/html` de las Edge Functions a peticiones `GET`, así que la función no puede servir esa página. Además, una baja por `GET` la pueden disparar sin querer los escáneres de enlaces de los proveedores de correo, que abren los enlaces antes que la persona.

## Decisión
- La página de baja vive en la landing, en `/baja`. El enlace del correo y la cabecera `List-Unsubscribe` apuntan a `${SITE_URL}/baja?token=<unsubscribe_token>`.
- La landing lee el token de la URL y llama a `unsubscribe` con `POST`, JSON `{ "token": "<uuid>" }` y la clave publicable en la cabecera `apikey`, igual que con `join-waitlist`.
- `unsubscribe` es pública (`verify_jwt = false`), con CORS restringido a `ALLOWED_ORIGINS` y límite de peticiones por IP. Llama a `unsubscribe_waitlist` y responde `200 { "ok": true }` tanto si el token existe como si no o si ya estaba dado de baja, para no revelar qué tokens son válidos. Un token sin formato de UUID es `400 invalid_input`.

## Consecuencias
- El texto y el diseño de la página de baja se deciden y se mantienen en `pulse-landing`, junto al resto de páginas públicas.
- La baja necesita que la landing esté disponible y que su origen esté en `ALLOWED_ORIGINS`.
- Un `GET` sobre el enlace no da de baja a nadie por sí solo. Si la landing llama a la función al cargar la página, un escáner que ejecute JavaScript sí podría hacerlo; pedir confirmación con un botón lo evita.
- No hay baja en un clic según RFC 8058 (`List-Unsubscribe-Post`): la cabecera `List-Unsubscribe` abre la página. Si en el futuro se envían correos masivos que lo exijan, hará falta un punto de entrada que acepte ese `POST`.
