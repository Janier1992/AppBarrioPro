import React from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { BusinessProfile } from "../types";

interface AppLockScreenProps {
  profile: BusinessProfile | null;
  pinInput: string;
  setPinInput: (val: string) => void;
  pinError: string;
  setPinError: (val: string) => void;
  setIsLocked: (val: boolean) => void;
  handleDesbloquearConPin: (e: React.FormEvent) => void;
}

export default function AppLockScreen({
  profile,
  pinInput,
  setPinInput,
  pinError,
  setPinError,
  setIsLocked,
  handleDesbloquearConPin
}: AppLockScreenProps) {
  if (!profile || !profile.securityPin) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4" id="pin-lock-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-brand-border text-center space-y-6"
      >
        <div className="mx-auto rounded-full bg-amber-50/50 p-4 text-brand-accent w-16 h-16 flex items-center justify-center">
          <Lock size={32} />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-brand-text">Aplicación Bloqueada</h2>
          <p className="text-xs text-brand-muted">Ingresa el PIN de seguridad de {profile.businessName} para continuar.</p>
        </div>

        <form onSubmit={handleDesbloquearConPin} className="space-y-4">
          <input
            type="password"
            maxLength={4}
            pattern="\d{4}"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
              setPinError("");
            }}
            placeholder="••••"
            className="w-full rounded-2xl border border-brand-border px-4 py-3.5 text-center text-2xl font-mono tracking-widest bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
            autoFocus
            required
          />
          {pinError && <p className="text-[11px] font-semibold text-rose-500">{pinError}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand-primary hover:bg-brand-primary-dark font-bold text-sm text-white py-3.5 shadow-sm transition-colors"
          >
            Desbloquear
          </button>
        </form>
      </motion.div>
    </div>
  );
}
