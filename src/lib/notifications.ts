// ======================================================
// Archivo: src/lib/notifications.ts
// Responsabilidad: Notificaciones del navegador (stock bajo y tareas pendientes): preferencias del usuario,
//   permiso del navegador y control para no repetir avisos. Todo se guarda en localStorage del dispositivo.
// ======================================================

import type { Product, Task } from "../types";

/** Qué avisos quiere recibir el usuario. */
export interface NotificationPreference {
  enableStockAlerts: boolean;
  enableChecklistAlerts: boolean;
}

// Claves de localStorage. Llevan versión (_v1) por si cambia el formato guardado.
const STORAGE_NOTIFIED_PRODUCTS = "barriopro_notified_products_v1"; // productos ya avisados (para no repetir)
const STORAGE_LAST_CHECKLIST_ALERT = "barriopro_last_checklist_alert_v1"; // momento del último aviso de tareas
const STORAGE_PREFS = "barriopro_notification_prefs_v1";

/** Lee las preferencias guardadas; si no hay (o no se puede leer), activa ambos avisos. */
export function retrieveStoredPreferences(): NotificationPreference {
  try {
    const data = localStorage.getItem(STORAGE_PREFS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn("No se pudieron leer las preferencias de notificaciones", error);
  }
  return {
    enableStockAlerts: true,
    enableChecklistAlerts: true,
  };
}

/** Guarda las preferencias de notificaciones en el dispositivo. */
export function persistPreferences(prefs: NotificationPreference): void {
  try {
    localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs));
  } catch (error) {
    console.warn("No se pudieron guardar las preferencias de notificaciones", error);
  }
}

/**
 * ¿Este navegador permite notificaciones? Se protege con try/catch porque en algunos entornos
 * restringidos (por ejemplo, iframes con sandbox) solo consultar la propiedad lanza un error.
 */
export function verifyNotificationSupport(): boolean {
  try {
    return "Notification" in window && typeof window.Notification !== "undefined";
  } catch {
    return false;
  }
}

/** Pide permiso al navegador. Devuelve "granted", "denied" o "default" (sin decidir). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!verifyNotificationSupport()) {
    return "denied";
  }
  try {
    return await window.Notification.requestPermission();
  } catch (error) {
    console.error("No se pudo pedir el permiso de notificaciones", error);
    return "default";
  }
}

/** Muestra una notificación del sistema si el usuario ya dio permiso; si no, no hace nada. */
export function triggerSystemNotification(title: string, body: string): void {
  if (!verifyNotificationSupport() || window.Notification.permission !== "granted") return;

  try {
    new window.Notification(title, {
      body,
      icon: "/assets/logo.png",
      tag: "tiendly-alert", // misma etiqueta: un aviso nuevo reemplaza al anterior en lugar de apilarse
    });
  } catch (error) {
    console.warn("No se pudo mostrar la notificación del sistema", error);
  }
}

/**
 * Avisa de los productos que quedaron por debajo de su stock mínimo, una sola vez por producto.
 * Cuando un producto se repone, sale de la lista de "ya avisados" para poder avisar de nuevo si vuelve a bajar.
 */
export function auditAndAlertLowStock(products: Product[]): void {
  if (!verifyNotificationSupport() || window.Notification.permission !== "granted") return;
  
  const prefs = retrieveStoredPreferences();
  if (!prefs.enableStockAlerts) return;

  try {
    const notifiedRaw = localStorage.getItem(STORAGE_NOTIFIED_PRODUCTS);
    const notifiedIds: string[] = notifiedRaw ? JSON.parse(notifiedRaw) : [];
    const updatedNotifiedIds: string[] = [...notifiedIds];
    
    let alertTriggered = false;

    for (const product of products) {
      if (!product.id) continue;

      const isLowStock = product.minStock > 0 && product.stock < product.minStock;
      const alreadyNotified = notifiedIds.includes(product.id);

      if (isLowStock && !alreadyNotified) {
        triggerSystemNotification(
          "⚠️ Alerta de Stock Bajo",
          `El producto "${product.name}" tiene ${product.stock} unidades (Mínimo: ${product.minStock}). ¡Reponer pronto!`
        );
        updatedNotifiedIds.push(product.id);
        alertTriggered = true;
      } else if (!isLowStock && alreadyNotified) {
        // El stock se repuso: se quita de los "ya avisados" para poder avisar si vuelve a bajar.
        const index = updatedNotifiedIds.indexOf(product.id);
        if (index > -1) {
          updatedNotifiedIds.splice(index, 1);
          alertTriggered = true;
        }
      }
    }

    if (alertTriggered) {
      localStorage.setItem(STORAGE_NOTIFIED_PRODUCTS, JSON.stringify(updatedNotifiedIds));
    }
  } catch (error) {
    console.error("Error al revisar el stock bajo", error);
  }
}

/**
 * Recuerda las tareas pendientes. Para no molestar, avisa como máximo una vez por hora;
 * con `forceImmediate` se salta esa espera (por ejemplo, al activar las notificaciones).
 */
export function auditAndAlertUnfinishedTasks(tasks: Task[], forceImmediate: boolean = false): void {
  if (!verifyNotificationSupport() || window.Notification.permission !== "granted") return;

  const prefs = retrieveStoredPreferences();
  if (!prefs.enableChecklistAlerts) return;

  try {
    const pendingTasks = tasks.filter(t => !t.completed);
    if (pendingTasks.length === 0) return;

    const now = Date.now();
    const lastAlertRaw = localStorage.getItem(STORAGE_LAST_CHECKLIST_ALERT);
    const lastAlertTime = lastAlertRaw ? parseInt(lastAlertRaw) : 0;
    const oneHourMs = 60 * 60 * 1000;

    if (forceImmediate || (now - lastAlertTime > oneHourMs)) {
      const taskNames = pendingTasks.slice(0, 2).map(t => t.text).join(", ");
      const extraCount = pendingTasks.length > 2 ? ` y ${pendingTasks.length - 2} más` : "";
      
      triggerSystemNotification(
        "📝 Tareas Diarias Pendientes",
        `Tienes ${pendingTasks.length} tareas pendientes por completar: ${taskNames}${extraCount}.`
      );
      
      localStorage.setItem(STORAGE_LAST_CHECKLIST_ALERT, now.toString());
    }
  } catch (error) {
    console.error("Error al revisar las tareas pendientes", error);
  }
}
