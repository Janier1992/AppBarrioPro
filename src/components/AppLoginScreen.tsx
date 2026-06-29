import React from "react";
import { motion } from "motion/react";
import { LayoutDashboard, Download } from "lucide-react";

interface AppLoginScreenProps {
  loginMode: "signin" | "signup";
  setLoginMode: (val: "signin" | "signup") => void;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authName: string;
  setAuthName: (val: string) => void;
  authError: string;
  setAuthError: (val: string) => void;
  authSuccess: string;
  setAuthSuccess: (val: string) => void;
  loadingAuthSubmit: boolean;
  isPwaInstalled: boolean;
  deferredInstallPrompt: any;
  setDeferredInstallPrompt: (val: any) => void;
  setIsPwaInstalled: (val: boolean) => void;
  handleAuthSubmit: (e: React.FormEvent) => void;
}

export default function AppLoginScreen({
  loginMode,
  setLoginMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authError,
  setAuthError,
  authSuccess,
  setAuthSuccess,
  loadingAuthSubmit,
  isPwaInstalled,
  deferredInstallPrompt,
  setDeferredInstallPrompt,
  setIsPwaInstalled,
  handleAuthSubmit
}: AppLoginScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4" id="login-container">
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-brand-border flex flex-col items-center space-y-6"
      >
        {/* Logo illustration */}
        <div className="rounded-2xl bg-brand-primary p-4 shadow-sm text-white flex justify-center items-center">
          <LayoutDashboard size={40} />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-text tracking-tight">BarrioPro</h1>
          <p className="text-brand-muted text-sm max-w-xs leading-relaxed mx-auto">
            Gestión inteligente de inventario, finanzas y recomendaciones para comercios tradicionales de barrio.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="w-full grid grid-cols-2 p-1 bg-brand-bg rounded-2xl border border-brand-border">
          <button
            onClick={() => {
              setLoginMode("signin");
              setAuthError("");
              setAuthSuccess("");
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              loginMode === "signin" 
                ? "bg-white text-brand-primary shadow-sm" 
                : "text-brand-muted hover:text-brand-text"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setLoginMode("signup");
              setAuthError("");
              setAuthSuccess("");
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              loginMode === "signup" 
                ? "bg-white text-brand-primary shadow-sm" 
                : "text-brand-muted hover:text-brand-text"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Success / Error Messages */}
        {authSuccess && (
          <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium leading-relaxed">
            {authSuccess}
          </div>
        )}
        {authError && (
          <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-medium leading-relaxed">
            {authError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
          {loginMode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-text block">Nombre Comercial</label>
              <input
                type="text"
                required
                placeholder="Ej. Abasto San José"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="w-full rounded-2xl border border-brand-border px-4 py-3 text-sm bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="ejemplo@correo.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full rounded-2xl border border-brand-border px-4 py-3 text-sm bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Contraseña</label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full rounded-2xl border border-brand-border px-4 py-3 text-sm bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={loadingAuthSubmit}
            className="w-full rounded-2xl bg-brand-primary hover:bg-brand-primary-dark active:scale-98 py-3.5 text-sm font-bold text-white transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loadingAuthSubmit ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : loginMode === "signin" ? (
              "Ingresar"
            ) : (
              "Crear Cuenta"
            )}
          </button>
        </form>

        {/* PWA Install Button */}
        {!isPwaInstalled && (
          <div className="w-full space-y-3">
            {deferredInstallPrompt ? (
              <button
                id="pwa-install-btn"
                onClick={async () => {
                  deferredInstallPrompt.prompt();
                  const { outcome } = await deferredInstallPrompt.userChoice;
                  if (outcome === "accepted") {
                    setDeferredInstallPrompt(null);
                    setIsPwaInstalled(true);
                  }
                }}
                className="w-full rounded-2xl border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 active:scale-98 px-5 py-3.5 text-sm font-bold text-brand-primary transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Download size={18} />
                Instalar App en este Dispositivo
              </button>
            ) : (
              <div className="w-full rounded-2xl border border-brand-border bg-brand-bg px-5 py-3.5 text-xs text-brand-muted text-center leading-relaxed">
                <Download size={14} className="inline mr-1.5 mb-0.5" />
                Para instalar: en tu navegador usa <strong>"Agregar a pantalla de inicio"</strong> o el ícono de instalación en la barra de dirección.
              </div>
            )}
            <p className="text-[10px] text-brand-muted text-center">
              Tus datos son almacenados de forma segura en la nube de InsForge.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
