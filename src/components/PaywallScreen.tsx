import React from "react";
import { LogOut, MessageCircle, RefreshCw, Store } from "lucide-react";
import { APP_NAME } from "../lib/brand";
import { PLAN, priceLabel, subscriptionUrl } from "../lib/pricing";
import { paywallCopy, type SubscriptionInfo } from "../lib/subscription";

interface PaywallScreenProps {
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
export default function PaywallScreen({ info, businessName, email, onRefresh, onSignOut }: PaywallScreenProps) {
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

        <div className="space-y-3">
          {whatsapp && (
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
            <RefreshCw size={16} className={checking ? "animate-spin" : ""} aria-hidden="true" /> Ya pagué, verificar
          </button>
          <button onClick={onSignOut} className="text-sm text-brand-muted hover:text-brand-text inline-flex items-center gap-1.5 cursor-pointer" id="paywall-signout">
            <LogOut size={14} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
