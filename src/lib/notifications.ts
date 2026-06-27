/**
 * @file notifications.ts
 * @description Centralized manager for handling web push notification operations, tracking notified items in localStorage, 
 * and requesting permissions safely under sandboxed iframe environments.
 * @design Part of the Core Data and Utility layer. Prevents redundant notifications and provides safe fallbacks.
 */

/**
 * @interface NotificationPreference
 * @description Configuration for various types of local alerts.
 */
export interface NotificationPreference {
  enableStockAlerts: boolean;
  enableChecklistAlerts: boolean;
}

// Keys used for local storage tracking to prevent spamming notifications
const STORAGE_NOTIFIED_PRODUCTS = "barriopro_notified_products_v1";
const STORAGE_LAST_CHECKLIST_ALERT = "barriopro_last_checklist_alert_v1";
const STORAGE_PREFS = "barriopro_notification_prefs_v1";

/**
 * @function retrieveStoredPreferences
 * @description Retrieves user notification settings from LocalStorage or returns default configuration.
 * @returns {NotificationPreference} User notification preferences
 */
export function retrieveStoredPreferences(): NotificationPreference {
  try {
    const data = localStorage.getItem(STORAGE_PREFS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn("Unable to access localStorage for notification preferences", error);
  }
  return {
    enableStockAlerts: true,
    enableChecklistAlerts: true,
  };
}

/**
 * @function persistPreferences
 * @description Saves updated user notification settings to LocalStorage.
 * @param {NotificationPreference} prefs - Updated notification preferences
 */
export function persistPreferences(prefs: NotificationPreference): void {
  try {
    localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs));
  } catch (error) {
    console.warn("Unable to write notification preferences to localStorage", error);
  }
}

/**
 * @function verifyNotificationSupport
 * @description Checks if the Notification API is supported by the current browser environment and context.
 * Step 1: Confirm 'Notification' exists on the window scope.
 * Step 2: Ensure we are not in a locked environment that throws errors on property access.
 * @returns {boolean} True if Web Notifications are supported.
 */
export function verifyNotificationSupport(): boolean {
  try {
    return "Notification" in window && typeof window.Notification !== "undefined";
  } catch (error) {
    return false;
  }
}

/**
 * @function requestNotificationPermission
 * @description Triggers browser permission dialog for system notifications.
 * Step 1: Assess support.
 * Step 2: Request permission and handle standard promise resolution.
 * @returns {Promise<NotificationPermission>} The permission state: "granted", "denied", or "default".
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!verifyNotificationSupport()) {
    return "denied";
  }
  try {
    const permission = await window.Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Failed to request Web Notification permission", error);
    return "default";
  }
}

/**
 * @function triggerSystemNotification
 * @description Spawns a native OS notification if permissions are granted.
 * Step 1: Ensure permission is granted.
 * Step 2: Build parameters with title, body, and customizable branding logo.
 * Step 3: Instantiate native Notification with safety wrap.
 * @param {string} title - The notification title line.
 * @param {string} body - Detail line or text of the notification.
 */
export function triggerSystemNotification(title: string, body: string): void {
  if (!verifyNotificationSupport()) return;
  
  try {
    if (window.Notification.permission === "granted") {
      new window.Notification(title, {
        body,
        icon: "/assets/logo.png", // Fallback to root asset path
        tag: "barriopro-alert",
      });
    } else {
      console.log(`[Notification Fallback] Title: "${title}" - Body: "${body}"`);
    }
  } catch (error) {
    console.warn("Failed to trigger local system notification directly.", error);
  }
}

/**
 * @function auditAndAlertLowStock
 * @description Analyzes current product list to find items below minimum stock.
 * Step 1: Retrieve currently stored list of notified items.
 * Step 2: Filter products that are in critical low-stock condition.
 * Step 3: For each critical product, if it hasn't been alerted yet, emit a push alert.
 * Step 4: Sync the notified item registry to local persistence.
 * @param {any[]} products - Current array of products loaded from Firestore.
 */
export function auditAndAlertLowStock(products: any[]): void {
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
        // Remove from notified list if stock has been replenished
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
    console.error("Error auditing low stock products", error);
  }
}

/**
 * @function auditAndAlertUnfinishedTasks
 * @description Scans checklist tasks and sends an alert if there are pending items.
 * Step 1: Determine if task alerts are enabled.
 * Step 2: Check if at least 1 hour has elapsed since the last checklist reminder.
 * Step 3: Count active, unfinished checklist items.
 * Step 4: Emit notification and update timestamp tracker.
 * @param {any[]} tasks - Array of checklist tasks.
 * @param {boolean} forceImmediate - If true, bypasses the 1-hour interval throttle.
 */
export function auditAndAlertUnfinishedTasks(tasks: any[], forceImmediate: boolean = false): void {
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
    console.error("Error auditing pending tasks", error);
  }
}
