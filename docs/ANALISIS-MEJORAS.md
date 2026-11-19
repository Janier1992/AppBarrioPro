# Análisis de mejoras de Tiendly

Lo que sigue sale de leer el código (no de suposiciones). Se ordena por impacto para un negocio de barrio. Lo marcado ✅ ya está corregido en esta entrega.

## Corregido en esta entrega

| Hallazgo | Detalle | Estado |
|---|---|---|
| **Cambio de tema necesitaba dos clics** | Causa 1: las 13 operaciones de guardado (`db.ts`) avisaban "recarga" *antes* de terminar de escribir en el servidor; la recarga leía el valor viejo y pisaba el cambio. Causa 2: un perfil sin tema guardado se trataba como oscuro, y el primer clic "cambiaba" a claro sin que se notara. | ✅ (`db.ts`, `lib/theme.ts`, con pruebas) |
| **Nicho limitado a "tienda de abarrotes"** | Categorías fijas y la importación de Excel mandaba cualquier categoría desconocida a "Otros Comercios". | ✅ Categorías libres + sugerencias por tipo de negocio (7 tipos), tareas sugeridas, asistente con contexto |

## Riesgos que conviene atender (por prioridad)

1. **Pérdida de ventas si falla la red (alto).** Cada guardado se escribe primero en el dispositivo y después en el servidor; si el servidor falla solo se registra en consola y **no se reintenta**. Al cargar de nuevo, la app prefiere los datos del servidor y la venta hecha sin conexión desaparece. *Propuesta:* cola de envíos pendientes (outbox) que reintente al volver la conexión y avise "N cambios sin sincronizar". Es la mejora más valiosa para un negocio con internet inestable.
2. **Stock inconsistente con dos dispositivos (alto).** `registerSale` calcula el stock nuevo desde el valor que tiene el celular (`stock - cantidad`) y lo escribe como valor absoluto. Si dos personas venden a la vez, una pisa a la otra. *Propuesta:* descontar en el servidor (`stock = stock - n`) con una función de base de datos.
3. **Políticas RLS sin aplicar (crítico, depende de ti).** Sin `insforge-rls-policies.sql` no hay aislamiento garantizado entre tiendas. Es lo primero antes de recibir clientes reales.
4. **Clave de Gemini guardada en el perfil (medio).** El perfil guarda `geminiApiKey` de la tienda en la base de datos. Es información sensible; con RLS correcto solo la ve su dueño, pero conviene no guardarla en claro o usar solo la clave del servidor.
5. **PIN solo en el dispositivo (medio).** Bloquea la pantalla pero no protege los datos del servidor. Está bien como candado de mostrador; no debe presentarse como seguridad de datos.
6. **Dinero con decimales flotantes (bajo/medio).** Los montos se redondean con `toFixed(2)`. Para pesos enteros funciona; para evitar errores de centavos, guardar enteros (centavos).
7. **Sin pruebas de extremo a extremo (medio).** Hay 75 pruebas unitarias, pero ninguna recorre "vender → cobrar → ver el stock". Un flujo automatizado en CI evitaría regresiones como las de esta semana.
8. **Monitoreo inactivo (bajo).** Sentry está preparado pero sin DSN: hoy un error en producción solo se entera quien lo sufre.
9. **Límite de uso del asistente en memoria (bajo).** En Vercel cada instancia lleva su propio contador; es un freno parcial.
10. **Dependencias con avisos sin arreglo (`xlsx`, `zod`) (bajo).** Mitigado en código; revisar cuando haya versiones corregidas.

## Mejoras de producto para ampliar el nicho sin complicarlo

- **Servicios sin stock** (peluquería, lavandería, reparaciones): hoy todo es producto con stock. Una opción "no controla stock" por producto cubriría servicios sin cambiar la pantalla de Vender.
- **Venta por peso/fracción** (fruver, carnicería): permitir cantidades decimales.
- **Vencimientos** (droguería, lácteos): una fecha opcional por producto y su aviso en "Para hoy".
- **Recordatorio de fiados por WhatsApp**: botón "Recordar" que abra un mensaje ya escrito (no requiere servidor).
- **Cierre de caja diario**: la tabla ya existe en el modelo (`CierreCaja`); falta una pantalla de un solo paso.
- **Tipo de negocio en la nube**: hoy se guarda en el dispositivo; pasarlo al perfil requiere una columna nueva en InsForge (migración).
