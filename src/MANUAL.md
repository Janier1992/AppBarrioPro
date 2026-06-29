# Manual de Usuario - BarrioPro

Bienvenido a **BarrioPro**, el sistema de gestión inteligente diseñado específicamente para tiendas de barrio, abastos y comercios locales. 

Este manual te guiará paso a paso para que puedas configurar tu negocio, registrar productos, realizar ventas y llevar el control de tus finanzas (deudas y créditos) de forma sencilla.

---

## 1. Inicio de Sesión y Registro

Al abrir la aplicación, te encontrarás con la pantalla de acceso.

*   **Ingresar**: Si ya tienes cuenta, escribe tu correo y contraseña.
*   **Crear Cuenta**: Si eres nuevo, haz clic en "Crear Cuenta". Ingresa el **Nombre de tu Negocio**, un **Correo Electrónico** y una **Contraseña**. Al registrarte, se creará tu base de datos privada automáticamente.

> **Nota:** Para que el inicio de sesión funcione correctamente en producción, el sistema debe estar conectado correctamente a tu base de datos de InsForge.

---

## 2. Panel de Control (Dashboard)

Una vez ingreses, verás el **Panel de Control**, que es el corazón de tu negocio.

Aquí podrás observar de un vistazo:
*   **Ventas de Hoy**: El total de dinero ingresado en el día.
*   **Deudas Pendientes**: El dinero que te deben los clientes.
*   **Inventario Crítico**: Cuántos productos están a punto de agotarse.

### Venta Rápida
En la parte superior, encontrarás la opción de **Venta Rápida**.
1. Busca un producto por nombre o escanea su código de barras.
2. Selecciona la cantidad que el cliente está llevando.
3. Haz clic en **Cobrar**. El sistema descontará automáticamente el producto del inventario y sumará el valor a las ventas del día.

---

## 3. Inventario y Catálogo

En la sección **Inventario** (menú izquierdo), podrás gestionar todo lo que vendes.

*   **Agregar Producto**: Haz clic en el botón `+ Nuevo Producto`. Ingresa el nombre, categoría, precio de compra (costo), precio de venta y la cantidad que tienes en stock (existencias).
*   **Alertas de Stock**: Si un producto llega a 0 o a la cantidad mínima que configuraste, aparecerá resaltado en rojo como "Stock Crítico" para que recuerdes pedirle a tu proveedor.
*   **Carga Masiva**: Si tienes un archivo Excel con tus productos, puedes usar el botón de **Carga Masiva** para importarlos todos al mismo tiempo.

---

## 4. Caja y Ventas

En **Caja y Ventas** podrás ver el historial completo de todas las transacciones realizadas.

*   **Historial**: Muestra la fecha, hora, productos vendidos y el total de cada venta.
*   **Filtros**: Puedes filtrar por día, semana o mes para ver cuánto vendiste en un periodo específico.
*   **Anulación**: Si te equivocaste en una venta, puedes anularla. Esto devolverá el producto al inventario automáticamente.

---

## 5. Gestión de Deudas (Fiado)

Sabemos que en las tiendas de barrio el "fiado" es común. La sección **Deudas** te ayuda a no perder dinero.

*   **Registrar Deuda**: Haz clic en `+ Nueva Deuda`. Ingresa el nombre del cliente, su teléfono (opcional) y el monto que debe.
*   **Abonos**: Cuando el cliente pague una parte, haz clic en la deuda y registra un "Abono". El saldo se actualizará automáticamente.
*   **Saldar**: Cuando el cliente pague todo, marca la deuda como "Pagada". Pasará al historial y ya no sumará al total de deudas pendientes.

---

## 6. Ajustes de Negocio

En la pestaña **Ajustes de Negocio** puedes personalizar la aplicación:

*   **Perfil**: Cambia el nombre de tu tienda, dirección y horarios de atención.
*   **Alertas**: Define a partir de cuántas unidades un producto debe marcarse como "Stock Crítico" (por ejemplo, avisarme cuando queden solo 5 leches).
*   **Seguridad**: Configura un PIN de seguridad para que nadie pueda borrar productos o deudas sin tu autorización.
*   **Tema**: Cambia entre modo claro (blanco) y modo oscuro (negro) según tu preferencia visual.

---

## 7. Instalación en tu Celular (PWA)

BarrioPro está diseñado para funcionar como una aplicación en tu teléfono sin necesidad de descargarla de una tienda de apps.

**En Android (Chrome):**
1. Abre la página de la aplicación.
2. En la pantalla de inicio de sesión verás un botón azul que dice **"Instalar App en este Dispositivo"**.
3. Haz clic en él y confirma. El icono de tu negocio aparecerá en la pantalla de tu celular.

**En iPhone (Safari):**
1. Abre la página en Safari.
2. Toca el botón de "Compartir" (el cuadrado con la flecha hacia arriba).
3. Selecciona **"Agregar a inicio"**. 

---
*Fin del Manual. Si tienes dudas adicionales, puedes utilizar el Asistente Inteligente ubicado en la esquina superior derecha de la aplicación.*
