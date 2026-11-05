# 0005 · Correo transaccional con Resend

- Estado: aceptada
- Fecha: 2026-11-05

## Contexto
La lista de espera envía un correo de bienvenida desde la Edge Function `join-waitlist`. Hacía falta un proveedor con API HTTP, envío desde la UE y una forma de probar en local sin dominio verificado.

## Decisión
Resend, llamado con `fetch` a `https://api.resend.com/emails`, sin SDK. El dominio de envío se da de alta en la región de Irlanda (`eu-west-1`): en Resend la región va con el dominio, no con la llamada a la API. En local, sin dominio verificado, el remitente es la dirección de pruebas `onboarding@resend.dev`, que Resend solo deja enviar al email de la cuenta.

## Consecuencias
- Sin dependencias nuevas en las funciones: una petición HTTP con `RESEND_API_KEY` y `EMAIL_FROM` como secretos.
- Si Resend falla, el alta se mantiene y `welcome_sent_at` queda vacío; la siguiente alta con ese email vuelve a intentarlo. No hay reintento automático.
- Los datos de la cuenta de Resend residen en EE. UU. aunque el envío salga de Irlanda.
