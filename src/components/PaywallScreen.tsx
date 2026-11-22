// ======================================================
// Archivo: src/components/PaywallScreen.tsx
// Responsabilidad: Pantalla que reemplaza la app cuando la prueba terminó o la suscripción no está vigente: motivo,
//   precio, pago por Nequi con referencia, WhatsApp y verificación. Los datos del cliente no se
//   borran.
// ======================================================

import React from "react";
import { Check, Copy, LogOut, MessageCircle, RefreshCw, Store } from "lucide-react";
import { PLAN, nequiDisplay, nequiNumber, paidUrl, paymentReference, priceLabel, subscriptionUrl } from "../lib/pricing";
import { paywallCopy, type SubscriptionInfo } from "../lib/subscription";

interface PaywallScreenProps {
  userId: string;
  info: SubscriptionInfo | null;
  businessName?: string;
  email?: string;
  onRefresh: () => Promise<void> | void;
  onSignOut: () => void;
}

/**
 * Pantalla que reemplaza a la app cuando la prueba terminó o la suscripción no está vigente.
 * No borra nada: los datos del cliente siguen guardados y vuelven al activar la suscripción.
 */
/** Botón que copia un texto (número o referencia) para pegarlo en Nequi. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      /* sin portapapeles: el texto se puede copiar a mano */
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={label} className="h-8 px-2.5 rounded-lg border border-brand-border text-xs font-medium inline-flex items-center gap-1 hover:bg-brand-bg cursor-pointer">
      {done ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {done ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function PaywallScreen({ userId, info, businessName, email, onRefresh, onSignOut }: PaywallScreenProps) {
  const nequi = nequiNumber();
  const reference = paymentReference(userId);
  const sentProof = paidUrl(userId, businessName);
  const [checking, setChecking] = React.useState(false);
  const copy = paywallCopy(info?.state, info?.currentPeriodEnd ?? info?.trialEndsAt);
  const whatsapp = subscriptionUrl({ name: businessName ?? "", business: "", source: email ? `cuenta ${email}` : "app" });

  const verify = async () => {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans flex items-center justify-center p-5" id="paywall-screen">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-7 space-y-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-brand-primary text-white flex items-center justify-center">
          <Store size={24} strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-[15px] text-brand-muted leading-relaxed">{copy.body}</p>
        </div>

        <div className="rounded-2xl bg-brand-bg p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">{PLAN.name}</p>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {priceLabel()} <span className="text-base font-normal text-brand-muted">al {PLAN.period}</span>
          </p>
          <p className="text-[13px] text-brand-muted">Pagas mes a mes.</p>
        </div>

        {nequi && (
          <div className="rounded-2xl border border-brand-border p-4 text-left space-y-3" id="paywall-nequi">
            <p className="text-sm font-semibold">Paga por Nequi</p>
            <ol className="space-y-2.5 text-[14px] leading-snug">
              <li>
                <span className="block text-brand-muted text-xs">1. Envía {priceLabel()} al Nequi</span>
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-lg tabular-nums" id="paywall-nequi-number">{nequiDisplay(nequi)}</strong>
                  <CopyButton text={nequi} label="Copiar el número de Nequi" />
                </span>
              </li>
              <li>
                <span className="block text-brand-muted text-xs">2. En el mensaje del pago escribe esta referencia</span>
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-lg tracking-wider" id="paywall-reference">{reference}</strong>
                  <CopyButton text={reference} label="Copiar la referencia de pago" />
                </span>
              </li>
              <li><span className="block text-brand-muted text-xs">3. Toca “Ya pagué” y envíanos el comprobante por WhatsApp. Activamos tu cuenta en cuanto lo veamos.</span></li>
            </ol>
          </div>
        )}

        <div className="space-y-3">
          {nequi && sentProof && (
            <a
              href={sentProof}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[52px] rounded-[14px] bg-brand-primary text-white text-[16px] font-semibold flex items-center justify-center gap-2 hover:bg-brand-primary-dark transition-colors"
              id="paywall-paid"
            >
              <MessageCircle size={19} aria-hidden="true" /> Ya pagué: enviar comprobante
            </a>
          )}
          {!nequi && whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[52px] rounded-[14px] bg-brand-primary text-white text-[16px] font-semibold flex items-center justify-center gap-2 hover:bg-brand-primary-dark transition-colors"
              id="paywall-whatsapp"
            >
              <MessageCircle size={19} aria-hidden="true" /> Activar mi suscripción
            </a>
          )}
          <button
            onClick={verify}
            disabled={checking}
            className="w-full h-[48px] rounded-[14px] border border-brand-border text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-brand-bg cursor-pointer disabled:opacity-60"
            id="paywall-refresh"
          >
            <RefreshCw size={16} className={checking ? "animate-spin" : ""} aria-hidden="true" /> {nequi ? "Verificar si ya estoy activo" : "Ya pagué, verificar"}
          </button>
          <button onClick={onSignOut} className="text-sm text-brand-muted hover:text-brand-text inline-flex items-center gap-1.5 cursor-pointer" id="paywall-signout">
            <LogOut size={14} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
