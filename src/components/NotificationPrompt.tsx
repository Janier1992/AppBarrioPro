import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { verifyNotificationSupport, requestNotificationPermission } from "../lib/notifications";
import { showErrorToast, showSuccessToast } from "../lib/toast";

const DISMISSED_KEY = "barriopro_notif_prompt_dismissed";

/**
 * Antes, activar las notificaciones de stock bajo (el beneficio estrella de
 * la app) requería entrar 3 clics adentro (Más > Ajustes > Notificaciones).
 * Este banner lo ofrece de forma visible y contextual la primera vez que
 * alguien usa la app, sin obligarlo a buscarlo.
 */
export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!verifyNotificationSupport()) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    if (!dismissed && window.Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const handleActivar = async () => {
    const permission = await requestNotificationPermission();
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
    if (permission === "granted") {
      showSuccessToast("¡Notificaciones activadas! Te avisaremos cuando algún producto esté por agotarse.");
    } else {
      showErrorToast("No se activaron las notificaciones. Puedes habilitarlas luego desde Ajustes > Notificaciones Locales.");
    }
  };

  return (
    <div className="bg-brand-primary/10 border-b border-brand-primary/20 px-6 py-2.5 text-brand-primary text-[11px] font-medium flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 shrink-0">
      <span className="flex items-center gap-1.5">
        <Bell size={14} className="flex-shrink-0" />
        Activa las notificaciones para enterarte al instante cuando un producto esté por agotarse.
      </span>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={handleActivar} className="rounded-lg bg-brand-primary text-white px-3 py-1.5 text-[11px] font-bold hover:bg-brand-primary-dark transition-colors cursor-pointer">
          Activar
        </button>
        <button onClick={dismiss} className="text-brand-primary/70 hover:text-brand-primary cursor-pointer" title="Ahora no">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
