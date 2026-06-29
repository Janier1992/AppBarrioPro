import React from "react";
import { Shield, RefreshCw } from "lucide-react";

interface SettingsSecurityProps {
  securityPin: string;
  setSecurityPin: (val: string) => void;
  loadingSecurity: boolean;
  loadingDemo: boolean;
  handleGuardarPinDeSeguridad: (e: React.FormEvent) => void;
  handleCargarDatosDeDemostracion: () => void;
}

export default function SettingsSecurity({
  securityPin,
  setSecurityPin,
  loadingSecurity,
  loadingDemo,
  handleGuardarPinDeSeguridad,
  handleCargarDatosDeDemostracion
}: SettingsSecurityProps) {
  return (
    <div className="space-y-6">
      {/* Security PIN code config */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3 flex items-center gap-2">
          <Shield size={18} className="text-brand-primary" />
          PIN de Acceso Local
        </h3>
        <p className="text-xs text-brand-muted">Configura un PIN numérico básico de 4 dígitos para proteger la privacidad de tu panel en caso de compartir el dispositivo con clientes.</p>

        <form onSubmit={handleGuardarPinDeSeguridad} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">PIN de Seguridad (4 dígitos)</label>
            <input
              type="password"
              maxLength={4}
              pattern="\d{4}"
              value={securityPin}
              onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Ej: 1234"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden font-mono tracking-widest text-center text-lg bg-white text-brand-text placeholder-brand-muted"
            />
          </div>

          <button
            type="submit"
            disabled={loadingSecurity}
            className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loadingSecurity ? <RefreshCw size={16} className="animate-spin" /> : "Guardar PIN"}
          </button>
        </form>
      </div>

      {/* Demo initial seeding */}
      <div className="rounded-2xl border border-brand-border bg-brand-bg p-6 shadow-xs space-y-3">
        <h3 className="font-bold text-brand-text text-sm">Cargar Datos de Demostración</h3>
        <p className="text-xs text-brand-muted leading-relaxed">
          ¿Es tu primera vez usando BarrioPro? Carga al instante un catálogo completo de abarrotes de barrio, checklists preconfigurados, preparaciones del Modo Maleta, historial financiero del mes y un perfil comercial ficticio para ver cómo cobra vida el panel de control.
        </p>

        <button
          type="button"
          onClick={handleCargarDatosDeDemostracion}
          disabled={loadingDemo}
          className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold text-xs px-5 py-3 transition-all flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {loadingDemo ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            "¡Cargar Datos de Demostración Ahora!"
          )}
        </button>
      </div>
    </div>
  );
}
