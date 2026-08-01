# Política de Privacidad de BarrioPro

> **Estado: BORRADOR.** Este documento fue redactado como punto de partida
> técnico y NO ha sido revisado por un abogado. No lo publiques ni lo
> presentes a usuarios finales como política vigente sin que un profesional
> legal lo valide contra la normativa de protección de datos del país (o
> países) donde operen tus tiendas usuarias (por ejemplo, Habeas Data en
> Colombia, LGPD en Brasil, LFPDPPP en México, etc.).

**Última actualización:** (completar al aprobar)

## 1. Qué datos recopila BarrioPro
- Datos de cuenta: correo electrónico, nombre del negocio.
- Datos operativos de la tienda: inventario, ventas, tareas de checklist,
  deudas/fiados de clientes (incluye nombres de terceros ingresados por el
  tendero).
- PIN de acceso local (almacenado de forma hasheada, no reversible).
- Si el tendero configura su propia clave de API de Gemini: esa clave.

## 2. Para qué se usan
- Operar las funciones propias de la aplicación (inventario, ventas, checklist).
- Generar recomendaciones y respuestas del asistente de IA (BarrioPro AI),
  para lo cual se envían a Google Gemini datos del inventario y ventas
  recientes de la tienda como contexto de la conversación.

## 3. Con quién se comparte
- **InsForge** (proveedor de base de datos y autenticación): almacena todos
  los datos operativos y de cuenta.
- **Google Gemini API**: recibe el contenido de los mensajes del chat y un
  resumen del inventario/ventas para generar respuestas. Ver la política de
  privacidad de Google Cloud/Gemini para su tratamiento de datos.
- **Vercel**: aloja la aplicación y procesa las peticiones HTTP (logs de
  acceso estándar de infraestructura).
- No se venden datos a terceros con fines publicitarios.

## 4. Datos de terceros (clientes de la tienda)
El tendero puede registrar nombres de clientes en el módulo de "Fiados"
(deudas). Es responsabilidad del tendero, como responsable del tratamiento
de esos datos, informar a sus propios clientes según la normativa local
aplicable.

## 5. Retención y eliminación
- Los datos se conservan mientras la cuenta esté activa.
- (Pendiente de definir con el equipo: plazo de retención tras cierre de
  cuenta, y procedimiento de solicitud de eliminación total de datos.)

## 6. Seguridad
- Acceso a los datos restringido por autenticación y (una vez aplicadas,
  ver `insforge-rls-policies.sql`) políticas de aislamiento por tienda a
  nivel de base de datos.
- El PIN de acceso local se almacena hasheado, nunca en texto plano.

## 7. Derechos del usuario
(Pendiente de definir: cómo un tendero solicita acceso, corrección o
eliminación de sus datos y los de sus clientes registrados.)

## 8. Contacto
(Completar con un correo de contacto real antes de publicar.)
