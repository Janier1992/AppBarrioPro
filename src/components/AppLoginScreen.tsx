import React, { useState } from "react";
import { motion } from "motion/react";
import { Store, Download } from "lucide-react";
import { APP_NAME } from "../lib/brand";
import PasswordInput from "./PasswordInput";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { readResetTokenFromUrl } from "../lib/passwordReset";

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
  // Vista "Olvidé mi contraseña" (formulario independiente del login/registro).
  // Si el usuario llega desde el enlace del correo (token en la URL) se abre directamente.
  const [showForgot, setShowForgot] = useState(
    () => typeof window !== "undefined" && readResetTokenFromUrl(window.location.search) !== null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4" id="login-container">
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 border border-brand-border flex flex-col space-y-7"
      >
        {/* Logo illustration */}
        <div className="h-12 w-12 rounded-[14px] bg-brand-primary text-white flex justify-center items-center">
          <Store size={26} strokeWidth={1.8} />
        </div>

        <div className="space-y-2">
          <h1 className="text-[30px] font-semibold text-brand-text tracking-tight">Bienvenido a {APP_NAME}</h1>
          <p className="text-brand-muted text-[15px] leading-relaxed">
            Ventas, inventario y fiados de tu negocio, en un solo lugar.
          </p>
        </div>

        {showForgot ? (
          <ForgotPasswordForm
            initialEmail={authEmail}
            onBack={(successMessage) => {
              setShowForgot(false);
              setAuthError("");
              setAuthSuccess(successMessage ?? "");
              setAuthPassword("");
            }}
          />
        ) : (
          <>
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
                className="w-full h-[52px] rounded-[14px] border border-[#E2E1DB] px-4 text-[15px] bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
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
              className="w-full h-[52px] rounded-[14px] border border-[#E2E1DB] px-4 text-[15px] bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Contraseña</label>
            <PasswordInput
              value={authPassword}
              onChange={setAuthPassword}
              placeholder="Mínimo 6 caracteres"
              autoComplete={loginMode === "signin" ? "current-password" : "new-password"}
            />
            {loginMode === "signin" && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError("");
                    setAuthSuccess("");
                    setShowForgot(true);
                  }}
                  className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loadingAuthSubmit}
            className="w-full h-[52px] rounded-[14px] bg-brand-primary hover:bg-brand-primary-dark text-[15px] font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

          </>
        )}

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
                className="w-full rounded-[14px] border border-[#E2E1DB] bg-white hover:bg-brand-bg h-12 px-5 text-sm font-medium text-brand-text transition-colors flex items-center justify-center gap-3 cursor-pointer"
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
      <a href="/admin" className="fixed bottom-4 right-4 text-[11px] text-brand-muted hover:text-brand-text underline-offset-2 hover:underline" id="support-access-link">
        Acceso de soporte
      </a>
    </div>
  );
}
