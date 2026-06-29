import React from "react";
import { Trash2, ShoppingBag, Plus, Sparkles, Sun, Moon, RefreshCw } from "lucide-react";
import { BusinessProfile } from "../types";

interface SettingsProfileProps {
  businessName: string;
  setBusinessName: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  hours: string;
  setHours: (val: string) => void;
  lowStockThreshold: number;
  setLowStockThreshold: (val: number) => void;
  theme: "light" | "dark";
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
  loadingProfile: boolean;
  handleToggleTheme: () => void;
  handleGuardarConfiguracionPerfil: (e: React.FormEvent) => void;
}

export default function SettingsProfile({
  businessName,
  setBusinessName,
  address,
  setAddress,
  phone,
  setPhone,
  email,
  setEmail,
  hours,
  setHours,
  lowStockThreshold,
  setLowStockThreshold,
  theme,
  logoUrl,
  setLogoUrl,
  geminiApiKey,
  setGeminiApiKey,
  loadingProfile,
  handleToggleTheme,
  handleGuardarConfiguracionPerfil
}: SettingsProfileProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-6">
      <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3">Editar Información de la Tienda</h3>
      <form onSubmit={handleGuardarConfiguracionPerfil} className="space-y-4">
        {/* Logo del Negocio */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-brand-muted">Logo del Negocio</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group">
                <img 
                  src={logoUrl} 
                  alt="Logo del negocio" 
                  className="h-20 w-20 rounded-2xl object-cover border border-brand-border bg-brand-bg shadow-xs" 
                />
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                  title="Eliminar logo"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-brand-border flex items-center justify-center text-brand-muted bg-brand-bg shrink-0">
                <ShoppingBag size={24} />
              </div>
            )}
            <div className="space-y-1">
              <input
                type="file"
                accept="image/*"
                id="logo-file-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLogoUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label
                htmlFor="logo-file-input"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-text hover:bg-brand-bg transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={12} />
                Cargar Imagen
              </label>
              <p className="text-[10px] text-brand-muted leading-relaxed">
                Recomendado: Formatos JPG, PNG. Tamaño máximo 2MB.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">Nombre Comercial del Negocio</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">Horario de Atención</label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Ej: 08:00 - 20:00"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Dirección Física del Local</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle Principal 123, Barrio El Prado"
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">Teléfono de Contacto</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +57 300 123 4567"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: negocio@correo.com"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Umbral de Stock Bajo General (Alerta)</label>
          <input
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
            min="1"
          />
        </div>

        <div className="border-t border-brand-border pt-4 space-y-4">
          <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="text-brand-primary animate-pulse" size={14} />
            Configuración de Inteligencia Artificial (Gemini)
          </h4>
          <div className="p-4 border border-brand-border rounded-xl bg-slate-50/50 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-brand-text mb-1">Clave API de Gemini (API Key)</label>
              <input
                type="password"
                placeholder="Ingresa tu clave de Google AI Studio (AI_KEY)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted font-mono"
              />
            </div>
            <p className="text-[10px] text-brand-muted leading-relaxed">
              BarrioPro utiliza la Inteligencia Artificial de Gemini en modalidad multitenant. Cada comerciante puede ingresar su propia clave API obtenida gratuitamente desde Google AI Studio para que el asesor reciba las sugerencias e interactúe con el inventario de su negocio en tiempo real.
            </p>
          </div>
        </div>

        <div className="border-t border-brand-border pt-4">
          <div className="flex items-center justify-between p-4 border border-brand-border rounded-xl bg-slate-50/50">
            <div className="space-y-1">
              <p className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                {theme === "light" ? (
                  <Sun size={14} className="text-amber-500 animate-pulse" />
                ) : (
                  <Moon size={14} className="text-indigo-400" />
                )}
                <span>Tema de la Aplicación</span>
              </p>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                Elige entre el modo claro y el modo oscuro para BarrioPro. La preferencia se guardará en tu perfil.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-brand-muted">
                {theme === "light" ? "Modo Claro" : "Modo Oscuro"}
              </span>
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${theme === "dark" ? "bg-brand-primary" : "bg-gray-200"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loadingProfile}
          className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loadingProfile ? <RefreshCw size={16} className="animate-spin" /> : "Guardar Perfil de Tienda"}
        </button>
      </form>
    </div>
  );
}
