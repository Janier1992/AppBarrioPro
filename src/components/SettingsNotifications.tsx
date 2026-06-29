import React from "react";
import { Bell, AlertTriangle, CheckSquare } from "lucide-react";
import { NotificationPreference } from "../lib/notifications";

interface SettingsNotificationsProps {
  permissionState: NotificationPermission;
  notifPrefs: NotificationPreference;
  handleSolicitarPermisoNotificaciones: () => void;
  handleAlternarPreferenciaNotificaciones: (key: keyof NotificationPreference) => void;
  handleEnviarNotificacionDePrueba: () => void;
}

export default function SettingsNotifications({
  permissionState,
  notifPrefs,
  handleSolicitarPermisoNotificaciones,
  handleAlternarPreferenciaNotificaciones,
  handleEnviarNotificacionDePrueba
}: SettingsNotificationsProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-6">
      <div className="border-b border-brand-border pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
            <Bell size={18} className="text-brand-primary" />
            Notificaciones de Sistema y Alertas
          </h3>
          <p className="text-xs text-brand-muted mt-0.5">Controla las alertas automáticas de inventario crítico y checklists pendientes en segundo plano.</p>
        </div>
      </div>

      {/* Status Alert Badge */}
      <div className="p-4 rounded-xl bg-brand-bg flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-brand-text">Estado de Permisos del Navegador</p>
          <p className="text-[11px] text-brand-muted leading-relaxed">
            {permissionState === "granted" 
              ? "✅ Las notificaciones están autorizadas en este dispositivo. Las alertas se emitirán incluso si la pestaña está inactiva o en segundo plano." 
              : permissionState === "denied" 
              ? "❌ Permiso Denegado. Las notificaciones están bloqueadas. Debes restaurarlas manualmente desde la barra de direcciones de tu navegador." 
              : "⚠️ El permiso de notificaciones aún no ha sido solicitado. Actívalas para recibir recordatorios en tiempo real."}
          </p>
        </div>
        {permissionState !== "granted" && (
          <button
            onClick={handleSolicitarPermisoNotificaciones}
            className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer shrink-0"
          >
            Permitir Notificaciones
          </button>
        )}
      </div>

      {/* Preferences Toggles */}
      <div className="space-y-4">
        <h4 className="font-bold text-brand-text text-xs tracking-wider uppercase">Triggers de Alerta Personalizables</h4>
        
        {/* 1. Low stock toggle */}
        <div className="flex items-start justify-between p-4 border border-brand-border rounded-xl">
          <div className="space-y-1 max-w-md">
            <p className="text-xs font-bold text-brand-text flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Alertas de Stock Mínimo y Crítico
            </p>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Envía una notificación emergente instantánea cuando la cantidad de algún producto caiga a su nivel mínimo de seguridad o quede en cero.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAlternarPreferenciaNotificaciones("enableStockAlerts")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${notifPrefs.enableStockAlerts ? "bg-brand-primary" : "bg-gray-200"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.enableStockAlerts ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* 2. Checklist pending tasks toggle */}
        <div className="flex items-start justify-between p-4 border border-brand-border rounded-xl">
          <div className="space-y-1 max-w-md">
            <p className="text-xs font-bold text-brand-text flex items-center gap-1.5">
              <CheckSquare size={14} className="text-brand-primary" />
              Recordatorios de Checklist Diario
            </p>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Recibe recordatorios inteligentes de manera periódica si dejas tareas sin finalizar durante tus jornadas laborales del día.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAlternarPreferenciaNotificaciones("enableChecklistAlerts")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${notifPrefs.enableChecklistAlerts ? "bg-brand-primary" : "bg-gray-200"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.enableChecklistAlerts ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
      </div>

      {/* Testing suite */}
      <div className="p-5 border border-dashed border-brand-border rounded-xl space-y-3 bg-brand-bg/40">
        <p className="text-xs font-bold text-brand-text">🛠️ Diagnóstico de Notificaciones</p>
        <p className="text-[11px] text-brand-muted leading-relaxed">
          Utiliza este panel para enviar un mensaje simulado. Minimiza la aplicación o cambia de pestaña inmediatamente después de presionar el botón de prueba para experimentar cómo se recibe en segundo plano en tu sistema operativo.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEnviarNotificacionDePrueba}
            className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Bell size={14} />
            Enviar Notificación de Prueba
          </button>
        </div>
      </div>
    </div>
  );
}
