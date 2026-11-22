// ======================================================
// Archivo: src/components/ForgotPasswordForm.tsx
// Responsabilidad: Flujo "Olvidé mi contraseña" en dos pasos: pedir el código por correo y crear la contraseña
//   nueva.
// ======================================================

import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { auth } from "../lib/insforge";
import { translateAuthError } from "../lib/authErrors";
import { readResetTokenFromUrl, validateResetForm } from "../lib/passwordReset";
import PasswordInput from "./PasswordInput";
import { mensajeDeError } from "../lib/errors";

interface ForgotPasswordFormProps {
  initialEmail: string;
  /** Vuelve al inicio de sesión; recibe un mensaje de éxito opcional para mostrarlo allí. */
  onBack: (successMessage?: string) => void;
}

type Step = "request" | "confirm";

const inputClass =
  "w-full h-[52px] rounded-[14px] border border-[#E2E1DB] px-4 text-[15px] bg-white text-brand-text focus:border-brand-primary focus:outline-hidden";
const primaryButtonClass =
  "w-full h-[52px] rounded-[14px] bg-brand-primary hover:bg-brand-primary-dark text-[15px] font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50";

/**
 * Flujo "Olvidé mi contraseña" en dos pasos:
 *  1) El usuario escribe su correo y InsForge le envía un código (o enlace).
 *  2) El usuario escribe el código y la nueva contraseña (con confirmación).
 * Si el usuario llega desde el enlace del correo (token en la URL), salta directo al paso 2.
 */
export default function ForgotPasswordForm({ initialEmail, onBack }: ForgotPasswordFormProps) {
  const urlToken = typeof window !== "undefined" ? readResetTokenFromUrl(window.location.search) : null;

  const [step, setStep] = useState<Step>(urlToken ? "confirm" : "request");
  const [email, setEmail] = useState(initialEmail);
  const [codeOrToken, setCodeOrToken] = useState(urlToken ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Limpia el token de la barra de direcciones para que no quede visible ni en el historial.
  useEffect(() => {
    if (urlToken) window.history.replaceState({}, "", window.location.pathname);
  }, [urlToken]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await auth.sendPasswordReset(email.trim());
      setInfo("Si el correo está registrado, te enviamos un código para cambiar tu contraseña. Revisa también la carpeta de spam.");
      setStep("confirm");
    } catch (err) {
      console.error("Error al pedir el código de recuperación:", err);
      setError(translateAuthError(mensajeDeError(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const validationError = validateResetForm({ codeOrToken, newPassword, confirmPassword });
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      await auth.confirmPasswordReset(email.trim(), codeOrToken, newPassword);
      onBack("¡Listo! Tu contraseña fue actualizada. Ya puedes iniciar sesión con la nueva clave.");
    } catch (err) {
      console.error("Error al confirmar la contraseña nueva:", err);
      setError(translateAuthError(mensajeDeError(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <button
        type="button"
        onClick={() => onBack()}
        className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text cursor-pointer"
      >
        <ArrowLeft size={14} /> Volver a iniciar sesión
      </button>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-brand-text">Recuperar contraseña</h2>
        <p className="text-xs text-brand-muted leading-relaxed">
          {step === "request"
            ? "Escribe el correo de tu cuenta y te enviaremos un código para crear una nueva contraseña."
            : "Escribe el código que recibiste por correo y elige tu nueva contraseña."}
        </p>
      </div>

      {info && (
        <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium leading-relaxed">
          {info}
        </div>
      )}
      {error && (
        <div role="alert" className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-medium leading-relaxed">
          {error}
        </div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Correo Electrónico</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Enviar código"}
          </button>
          <button
            type="button"
            onClick={() => { setError(""); setInfo(""); setStep("confirm"); }}
            className="w-full text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
          >
            Ya tengo un código
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          {!email && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-text block">Correo Electrónico</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Código de verificación</label>
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Código de 6 dígitos"
              value={codeOrToken}
              onChange={(e) => setCodeOrToken(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Nueva contraseña</label>
            <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-text block">Confirmar nueva contraseña</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Repite la contraseña" />
          </div>
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Cambiar contraseña"}
          </button>
          <button
            type="button"
            onClick={() => { setError(""); setInfo(""); setStep("request"); }}
            className="w-full text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
          >
            Reenviar código
          </button>
        </form>
      )}
    </div>
  );
}
