# Guion de voz — Tiendly (≈ 2 minutos)

Léelo con calma y tono amable, como si se lo explicaras a un vecino. **Un archivo de audio por línea**, nombrado con el código de la izquierda. Si cometes un error, repite solo esa línea.

## Cómo grabar (con el celular, sin equipo especial)
1. Busca un lugar silencioso (un cuarto con cortinas o ropa suena mejor que uno vacío).
2. Usa la grabadora de voz del celular (m4a o wav sirven). Sostén el teléfono a un palmo de la boca.
3. Haz una pausa de un segundo antes y después de cada línea (el video se ajusta solo).
4. Guarda cada archivo con el nombre indicado (por ejemplo `01-intro.m4a`) y ponlos todos en `marketing/voz/`.
5. Vuelve a componer el video: `node marketing/componer-video.cjs --escenas marketing/escenas --voz marketing/voz --salida marketing/out`

No hace falta grabar todo: si falta una línea, el video muestra su subtítulo y sigue.

## Líneas

| Archivo | Texto |
|---|---|
| `01-intro` | Hola, te presento Tiendly: el sistema más simple para llevar tu negocio de barrio desde el celular o el computador. Vamos a recorrerlo paso a paso. |
| `02-hoy` | Esta es la pantalla Hoy. Apenas entras, ves cuánto has vendido en el día, cuántas ventas llevas y cómo vas frente a ayer. |
| `03-para-hoy` | Más abajo está la lista Para hoy. Ahí Tiendly junta lo que no debes olvidar: los fiados por cobrar, los productos que se están acabando y tus tareas pendientes. |
| `04-vender` | Para vender, toca el botón verde del centro. Tus productos aparecen en fichas grandes: toca cada uno para sumarlo a la venta. |
| `05-cobrar` | Abajo ves el total y el botón Cobrar. Elige cómo paga el cliente: efectivo, tarjeta, transferencia o fiado, y confirma. El inventario se descuenta solo. |
| `06-se-acaban` | Ahora, el inventario. En Productos, el filtro Se acaban te muestra en naranja lo que casi se termina, con cuántas unidades quedan. |
| `07-reponer` | Toca Reponer en el producto, escribe la nueva cantidad de stock y guarda. Así siempre sabes qué tienes. |
| `08-fiado` | ¿Un cliente quiere fiado? Haz la venta normal, elige Fiado, escribe su nombre y la fecha en que te pagará. |
| `09-fiados` | La deuda queda registrada sola en la pantalla Fiados, donde ves cuánto te deben en total y a quién cobrarle primero. Cuando paguen, tocas Cobrar. |
| `10-tarea` | Para no olvidar nada, usa Tareas, dentro del menú Más. Escribe un pendiente, por ejemplo pedir pan para mañana, y añádelo. |
| `11-tachar` | Cuando lo hagas, tócalo para tacharlo. Los pendientes también aparecen en Para hoy. |
| `12-asistente` | Y si tienes dudas, pregúntale al asistente de inteligencia artificial. Está en el menú Más, o en la caja de preguntas de la pantalla Hoy. |
| `13-pregunta` | Por ejemplo, pregúntale qué productos debes reponer. Te responde con los datos de tu negocio y te propone qué pedir. |
| `14-soporte` | ¿Algo no funciona? En Soporte, dentro del menú Más, escribes tu solicitud y la respuesta del equipo te llega a la misma pantalla. |
| `15-cierre` | Tiendly funciona para tiendas, panaderías, ferreterías, papelerías, droguerías y más. Vende, repón y cobra sin complicarte. |
| `16-planes` | Pruébalo gratis durante una semana. Después cuesta veintinueve mil novecientos pesos al mes, y lo pagas mes a mes por Nequi. Escríbenos por WhatsApp y empieza hoy. |

> El texto está en `marketing/narracion.json`. Si quieres cambiar una frase, edítala ahí y los subtítulos se actualizan solos al volver a componer.
