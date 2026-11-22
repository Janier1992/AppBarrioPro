# Portal de soporte y control de suscripciones

Cada negocio tiene una **prueba gratis de 7 días**; después paga **mes a mes**. Si la prueba termina o el mes se cumple sin pago, **el acceso se bloquea solo**. Soporte administra las cuentas desde un portal propio.

## Cómo funciona (arquitectura)

```
Cliente (app)  ──►  InsForge (Postgres + RLS)  ◄──  Portal de soporte (/admin)
   │  pantalla de                │                         │ solo cuentas en la
   │  "activa tu suscripción"    │  BLOQUEO REAL           │ tabla `admins`
   └─ muestra el estado          │  (política RLS restrictiva)
```

- **El bloqueo está en la base de datos, no en la pantalla.** Si la cuenta no tiene acceso vigente, Postgres rechaza leer o escribir productos, ventas, tareas y fiados (también el stock atómico), aunque alguien manipule el navegador. La app solo muestra la pantalla adecuada.
- **Es automático, sin tareas programadas.** El estado se calcula con las fechas cada vez que se consulta: no hay nada que "vencer" a mano.
- **El asistente de IA también se bloquea** (`/api/chat` verifica la suscripción), para que una cuenta vencida no gaste tu cuota de Gemini.
- **Los datos no se borran.** Al renovar, el cliente recupera todo.

### Estados de una cuenta

| Estado | Acceso | Cuándo ocurre |
|---|---|---|
| `trial` En prueba | ✅ | Primeros 7 días desde el primer ingreso |
| `trial_expired` Prueba vencida | ❌ | Pasaron los 7 días sin suscribirse |
| `active` Activa | ✅ | Tiene un pago vigente (hasta `currentPeriodEnd`) |
| `past_due` Mes vencido | ❌ | Se cumplió el mes sin registrar un nuevo pago |
| `suspended` Suspendida | ❌ | Soporte la suspendió (inmediato) |
| `cancelled` Cancelada | ❌ | Soporte canceló la suscripción |

Soporte (cuentas en `admins`) nunca queda bloqueado.

## Puesta en marcha (una sola vez)

1. **Aplica la migración.** En el editor SQL de InsForge ejecuta `insforge-migration-suscripciones.sql` completo (es seguro repetirlo). Además corrige una columna del esquema: el PIN se guarda como hash de 60 caracteres y la columna original era de 10, lo que impedía sincronizar el perfil de quien configuraba un PIN.
2. **Crea tu administrador (cuenta de soporte).** El portal no permite registrarse a sí mismo: una cuenta de soporte es una cuenta normal a la que tú le das permiso en la base de datos. Dos pasos:
   1. **Crea la cuenta** en la app como cualquier cliente: en la pantalla de inicio toca *Crear Cuenta*, usa el correo de soporte (por ejemplo `soporte@tudominio.com`) y una contraseña larga y única, confirma el correo y **inicia sesión una vez** (así se crea su perfil). Si prefieres, también puedes crearla desde InsForge (Authentication → Users).
   2. **Dale permiso de soporte** ejecutando esto en el editor SQL de InsForge (cambia el correo por el de esa cuenta):
      ```sql
      INSERT INTO admins ("userId", email)
      SELECT "userId", email FROM profile WHERE email = 'soporte@tudominio.com'
      ON CONFLICT ("userId") DO NOTHING;
      ```
      Debe responder "1 fila insertada". Si responde 0 filas, esa cuenta aún no inició sesión en la app o el correo está escrito distinto.
   Para **agregar a otra persona de soporte**, repite los dos pasos con su correo. Para **quitar a alguien**: `DELETE FROM admins WHERE email = 'correo@x.com';`.
   **Si el correo de la cuenta de soporte aparece "sin verificar"** y no te deja entrar ("Debes confirmar tu correo electrónico"): en la pantalla de inicio de sesión de la app, tras ese mensaje, toca **Reenviar correo de confirmación** y abre el enlace del correo que llegue (revisa también el spam).
3. **Entra al portal:** `https://TU-DOMINIO/admin` (también hay un enlace "Acceso de soporte" en la pantalla de inicio de sesión) con el correo y la contraseña de esa cuenta. Si entras con una cuenta que no está en `admins`, verás "Sin permisos de soporte".
4. **Cerrar sesión:** al salir del portal te lleva directo a la pantalla de inicio de sesión principal de la app. (El enlace "Volver a la app" del acceso de soporte se mantiene.)
5. **Cuentas existentes:** al aplicar la migración, cada negocio que ya existía recibe una prueba de 7 días a partir de ese momento. Si algún cliente ya paga, ábrelo en el portal y registra su pago.

## Tickets de soporte

Los negocios tienen una sección **Soporte** (menú lateral en el computador; **Más → Soporte** en el celular) para reportar un problema, una duda sobre pagos o una sugerencia. Cada solicitud es una **conversación**: el cliente escribe, tú respondes desde el portal y el cliente ve la respuesta en la misma pantalla (con un punto de "respuesta nueva" en el menú).

**Activarlo (una sola vez):** ejecuta `insforge-migration-soporte.sql` completo en el editor SQL de InsForge (requiere haber aplicado antes la migración de suscripciones; es seguro repetirlo). Mientras no lo hagas, la sección muestra un aviso para escribir por WhatsApp.

**En el portal `/admin` → pestaña Tickets:**
- El número rojo/verde de la pestaña (y el título del navegador, por ejemplo `(2) Soporte · Tiendly`) cuenta las solicitudes **sin atender**. La lista se actualiza sola cada 20 segundos; no hay notificaciones push ni por correo.
- Cada solicitud muestra el negocio, el asunto, la categoría y el estado de su suscripción (útil para solicitudes de pago).
- **Responder** deja la solicitud "En proceso"; **Responder y resolver** la cierra; **Marcar resuelta** / **Reabrir** cambian el estado sin mensaje. Si el cliente escribe de nuevo en una solicitud resuelta, se reabre sola.
- Todo lo que respondes queda en la **Bitácora**.

**Límites:** máximo 5 solicitudes abiertas y 10 mensajes por hora por cliente (evita el abuso); asunto hasta 120 y mensaje hasta 2000 caracteres. Un cliente con la prueba vencida o suspendido **sí puede** escribir a soporte desde su cuenta si logra entrar a la app; la pantalla de suscripción vencida mantiene el botón de WhatsApp.

**Seguridad:** cada cliente solo ve sus solicitudes (RLS), no puede escribir las tablas directamente y las funciones de soporte verifican `is_admin()` en el servidor. La auditoría `insforge-auditoria-rls.sql` (versión actualizada) ya cubre estas tablas.

## Uso diario del portal

- **Tablero:** cuentas, en prueba, activas, por vencer (≤5 días), bloqueadas e ingreso mensual (activas × precio). Tocar una cifra filtra la lista; también se busca por negocio, correo o teléfono.
- **Registrar pago** (cuando el cliente te paga por Nequi, transferencia, efectivo…): elige meses y medio de pago, y la cuenta queda activa. Si aún le quedaba tiempo vigente, los meses se suman **al final**: no pierde nada. Pagar durante la prueba conserva los días de prueba que faltaban.
- **Suspender / Reactivar / Cancelar:** la suspensión bloquea de inmediato. Reactivar solo funciona si queda un periodo vigente (si no, registra un pago o extiende la prueba).
- **Extender prueba** (+3, +7, +14 días) para quien no alcanzó a probarla.
- **Restablecer PIN** si el cliente olvidó su PIN de bloqueo.
- **Resumen del negocio** (solo lectura): productos, ventas de 30 días, fiados abiertos, última venta, pagos. Sirve para diagnosticar fallas sin ver filas sueltas ni el PIN.
- **Bitácora:** quién hizo qué y cuándo (pagos, suspensiones…). Solo se agrega, nunca se edita.

### Pago por Nequi (mientras no haya pasarela de pagos)
Se configura **una sola variable**: `VITE_NEQUI_NUMBER` con el número de Nequi que recibe los pagos (10 dígitos, ej. `3001234567`). En Vercel: *Settings → Environment Variables → `VITE_NEQUI_NUMBER`* y **vuelve a desplegar** (las variables `VITE_` se incorporan al compilar). Es un dato público (el cliente lo ve), no un secreto. Sin esa variable la sección de Nequi no aparece y queda solo el botón de WhatsApp.

Lo que ve el cliente cuando su prueba o mes vencen:
1. **Envía $29.900 al Nequi** `300 123 4567` (con botón "Copiar").
2. **Escribe en el mensaje del pago su referencia única** (por ejemplo `TDLY-A1B2C3`, con botón "Copiar"): es lo que te permite saber de qué negocio es cada pago.
3. Toca **"Ya pagué: enviar comprobante"**: se abre tu WhatsApp con un mensaje listo (negocio, valor, referencia).

Lo que haces tú:
1. Recibes el pago en Nequi y el comprobante por WhatsApp.
2. En `/admin` buscas por la **referencia** (`TDLY-…`), el nombre o el correo, y abres la cuenta. La referencia también aparece en el encabezado de cada cuenta.
3. **Registrar pago y activar** (medio: Nequi; referencia: el código o el número de aprobación de Nequi).
4. El cliente toca "Verificar si ya estoy activo" y entra (o entra solo al volver a la app).

**Antes de recibir pagos de clientes:** revisa con tu contador cómo declarar estos ingresos mientras la empresa no esté constituida, y los límites de tu cuenta Nequi. Cuando tengas la empresa y el RUT, el paso natural es una pasarela (Wompi, ePayco…): la base ya guarda pagos y fechas, así que solo habría que automatizar el registro del pago.

## Seguridad

- Cada función del portal verifica **en el servidor** que quien llama esté en `admins`; un cliente que intente llamarlas recibe "Acceso solo para soporte".
- Los clientes **no pueden** modificar su propia suscripción, ni crearse una, ni hacerse administradores (las tablas solo se leen; se escriben únicamente con las funciones del portal).
- Los clientes no pueden consultar el estado de otras cuentas.
- Las pruebas contra un Postgres real (`db-tests/suscripciones.test.ts` y `db-tests/soporte.test.ts`) cubren estos puntos.

## Límites conocidos

- **Pago manual.** No hay pasarela: el cliente transfiere por Nequi y tú confirmas y registras el pago. No se verifica el pago automáticamente.
- **Sin doble factor** en el portal: usa contraseñas largas y únicas, y limita quién está en `admins`.
- **Nueva prueba con otro correo:** quien borre su cuenta y se registre con otro correo obtiene otra prueba. Es un riesgo comercial aceptado en esta etapa.
- **Sin conexión:** la app deja trabajar según la última fecha conocida; si esa fecha ya pasó, bloquea. El servidor igual rechaza los datos sin acceso.
- **Gracia:** el bloqueo es al vencer (0 días de gracia). Se cambia en la función `subscription_grace_days()` de la migración.
- **Edición de datos de clientes:** el portal es de solo lectura sobre el negocio (más el PIN); no edita productos ni ventas.
- Los términos y condiciones deben actualizarse para una suscripción de pago (revisión legal).
