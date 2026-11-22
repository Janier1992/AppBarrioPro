# Captación de negocios con Radar Clientes

Objetivo: que desde **Radar Clientes** puedas enviarle a cada negocio un mensaje personalizado con un enlace propio donde vea el video, el precio y pueda **solicitar su suscripción** por WhatsApp.

> **Alcance honesto.** Tiendly no conoce Radar Clientes ni se conecta a esa plataforma: la unión es **por enlace**. Radar Clientes envía el mensaje con el enlace; la página `/planes` de Tiendly lo recibe y se personaliza. Cómo escribe Radar Clientes las variables (`{{nombre}}`, `[NOMBRE]`, etc.) lo defines tú según esa herramienta: abajo uso `{{nombre}}` y `{{negocio}}` como ejemplo.

---

## 1. El enlace personalizado

Tiendly tiene una página pública (sin cuenta ni contraseña): `https://TU-DOMINIO/planes`. Acepta tres datos opcionales en el enlace:

| Parámetro | Qué muestra | Ejemplo |
|---|---|---|
| `n` | Nombre de la persona | `n=Marta` |
| `negocio` | Nombre del negocio | `negocio=Tienda%20La%20Esquina` |
| `fuente` | De dónde viene (aparece en el mensaje de WhatsApp para que sepas quién llegó por aquí) | `fuente=radar` |

Enlace completo de ejemplo:

```
https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar
```

Lo que ve el cliente: "**Hola, Marta. Lleva Tienda La Esquina sin cuaderno.**", el video, el plan con su precio y dos botones: **Empezar mi prueba gratis (7 días gratis)**, que lleva directo a "Crear Cuenta", y **Hablar con ventas · +57 304 476 9592**, que abre WhatsApp contigo con el mensaje ya escrito: *"Hola, Soy Marta de Tienda La Esquina. Quiero suscribirme a Tiendly ($ 29.900 al mes, después de la prueba gratis). (Vengo de: radar)"*.

**Pruébalo antes de enviar:** abre el enlace con un nombre real en tu celular y confirma que (1) saluda bien, (2) el video carga, (3) el botón de ventas abre WhatsApp contigo y (4) "Empezar mi prueba gratis" abre el registro. Si el nombre trae espacios o tildes y Radar Clientes no los codifica, prueba con un contacto real: la página limpia los caracteres raros, pero un enlace roto no llega.

Si no tienes nombre o negocio, usa solo `https://TU-DOMINIO/planes?fuente=radar`: saluda de forma genérica.

---

## 2. Precio propuesto: $29.900 COP al mes

Un solo plan, **Tiendly Barrio**, con **7 días de prueba gratis** y luego pagado mes a mes. Está configurado en un único lugar (`src/lib/pricing.ts`) y de ahí sale al video, al manual y a la página `/planes`; para cambiarlo, edita ese número y vuelve a generarlos.

**Por qué ese valor (referencias de mercado en Colombia, consultadas en noviembre de 2026; confírmalas antes de usarlas en una presentación):**

| Alternativa | Precio mensual aproximado | Nota |
|---|---|---|
| Tin Pos | desde $39.900 (sin factura electrónica) · $69.900 (con ella) | [GetApp](https://www.getapp.com/all-software/a/tin-pos/) |
| Scrampi (Starter) | desde $46.000 | [Capterra](https://www.capterra.es/software/1104967/Scrampi) |
| Alegra (plan de entrada) | ≈ $74.900 – $89.000 | Cifras de su propio blog, que no coinciden entre sí: [Alegra](https://blog.alegra.com/colombia/alegra-vs-siigo-colombia/) |
| Treinta | núcleo gratis; planes de pago sin precio en COP verificable | No pude confirmarlo |

- $29.900 queda **~25 % por debajo** del plan pago más barato comparable (Tin Pos, $39.900) y equivale a **≈ $1.000 al día** (menos de $1.000), menos que un tinto.
- Tiendly **no incluye facturación electrónica DIAN**; por eso no se compara con los planes de $70.000 o más, y la página lo dice claramente.
- Otras opciones: **$34.900** (más margen; sigue por debajo de Tin Pos, $39.900) o **$24.900** (más agresivo para captar volumen). Cambia solo el número en `src/lib/pricing.ts`.
- Aún no calculé tu costo por cliente (servidor, base de datos y el uso del asistente de IA). El asistente tiene un límite de 20 mensajes por minuto por usuario; vigila el consumo de Gemini cuando tengas varios clientes.
- Si eres responsable de IVA, define si el precio lo incluye y dilo en el mensaje.

---

## 3. Mensajes para Radar Clientes (WhatsApp)

Reglas: cortos, por su nombre, una sola idea y **un solo enlace**. No promete nada que Tiendly no haga. Cambia lo que esté entre `{{ }}` por las variables de Radar Clientes.

**Primer contacto (general)**
> Hola {{nombre}} 👋 Soy [TU NOMBRE]. Vi que {{negocio}} atiende a su barrio y quería mostrarte algo: Tiendly, una app muy sencilla para llevar ventas, inventario y fiados desde el celular, sin cuaderno. Puedes probarlo gratis 7 días; te dejo un video corto y el precio: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Tienda / abarrotes**
> Hola {{nombre}}, ¿sigues anotando los fiados en el cuaderno? Con Tiendly ves cuánto te deben y a quién cobrarle primero, y el inventario te avisa lo que se está acabando. Pruébalo 7 días gratis; mira cómo funciona y cuánto cuesta: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Panadería / pastelería**
> Hola {{nombre}}, para {{negocio}} armé este video: cómo vender rápido en el mostrador, saber qué se acabó y apuntar los pedidos del día. Cuesta $29.900 al mes. Míralo aquí: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Fruver**
> Hola {{nombre}}, en el fruver todo se mueve rápido. Tiendly te deja cobrar con pocos toques, controlar lo que queda y no perder de vista lo fiado. Video y precio: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Ferretería**
> Hola {{nombre}}, con tantos productos distintos es fácil perder el control del inventario. Tiendly te alerta cuando algo se acaba y deja cargar todo tu catálogo desde Excel. Mira cómo funciona: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Papelería**
> Hola {{nombre}}, ¿quieres saber en segundos cuánto vendiste hoy y qué útiles se están acabando? Tiendly lo muestra al abrir la app. Video y precio: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Droguería**
> Hola {{nombre}}, Tiendly te ayuda a tener a la mano el inventario, las ventas del día y lo que te deben, desde el celular. Te dejo el video y el valor mensual: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Seguimiento a los 2 días (si no respondió)**
> Hola {{nombre}}, ¿pudiste ver el video de Tiendly? Si quieres, te lo explico en 5 minutos por aquí y lo pruebas con datos de ejemplo antes de decidir.

**Seguimiento a los 5 días (último)**
> {{nombre}}, no te molesto más 🙂 Si más adelante quieres dejar el cuaderno, aquí queda el enlace: https://TU-DOMINIO/planes?n={{nombre}}&negocio={{negocio}}&fuente=radar

**Si responde "¿cuánto cuesta?" o "es muy caro"**
> Pruébalo 7 días gratis; después son $29.900 al mes, mes a mes, menos de $1.000 al día. Incluye ventas, inventario, fiados, tareas y el asistente de IA. Si quieres, lo probamos juntos con tus productos y decides.

---

## 4. Buenas prácticas y cumplimiento

- **Contacto con permiso.** Escribe solo a negocios que tengan WhatsApp comercial público o te hayan dado su consentimiento. En Colombia aplica la Ley 1581 de 2012 (tratamiento de datos personales): di quién eres, para qué escribes y ofrece dejar de recibir mensajes ("responde BAJA").
- **No envíes en masa de golpe.** WhatsApp bloquea números que mandan muchos mensajes iguales; reparte los envíos en el día y personaliza.
- **Medición simple:** cada solicitud llega a tu WhatsApp con *(Vengo de: radar)*; cuenta cuántos llegan frente a cuántos enviaste.

## 5. Lista de puesta en marcha (una sola vez)

1. El WhatsApp de ventas (**+57 304 476 9592**) ya está configurado en el código (`src/lib/pricing.ts`). Si algún día cambia, puedes sobrescribirlo con la variable `VITE_WHATSAPP_NUMBER` en Vercel (solo dígitos con indicativo) sin tocar el código.
2. Cambia `TU-DOMINIO` por tu dirección real en todos los mensajes.
3. Reemplaza `[TU NOMBRE]` y revisa el tono para que suene a ti.
4. Si cambias el precio o el número, genera de nuevo el manual (`npx tsx scripts/generate-user-manual.ts`) y la escena de precio del video (`marketing/escena-precio.ts`).
5. Actualiza los términos y condiciones para la **suscripción de pago** (cobro mensual, cancelación, qué pasa si no se paga). Hoy los términos del repositorio no lo cubren y necesitan revisión legal.
6. Decide cómo cobrarás (transferencia, Nequi, enlace de pago de Wompi/ePayco…). Hoy el cobro y la activación son **manuales** por WhatsApp.

## 6. Lo que todavía NO hace el sistema

- **No cobra solo.** No hay pasarela de pagos: el cliente solicita por WhatsApp y tú cobras y activas.
- **La prueba de 7 días no se controla sola.** Hoy cualquiera puede crear una cuenta y seguir usando Tiendly gratis para siempre: no hay fecha de vencimiento de la prueba ni bloqueo por falta de pago. Por ahora el seguimiento al día 7 es manual (puedes anotar la fecha de cada alta). Automatizarlo (vencimiento de la prueba, estado de suscripción por cuenta y pasarela de pagos) es el siguiente desarrollo.
- **No mide visitas a `/planes`.** Solo ves las solicitudes que llegan por WhatsApp.
