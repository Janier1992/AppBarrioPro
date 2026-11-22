import React from "react";
import { Check, MessageCircle, Play, Store } from "lucide-react";
import { APP_NAME } from "../lib/brand";
import { PLAN, parseLead, priceLabel, subscriptionUrl, trialLabel, whatsappDisplay } from "../lib/pricing";

/** Video de demostración alojado en la propia app (public/video/tiendly-demo.mp4). */
const DEMO_VIDEO = "/video/tiendly-demo.mp4";

/**
 * Página pública de planes (/planes): la ve un comerciante que llega desde un mensaje (p. ej. Radar Clientes)
 * sin tener cuenta. Se personaliza con ?n=Nombre&negocio=Tienda&fuente=radar.
 */
export default function PlansPage() {
  const lead = React.useMemo(() => parseLead(window.location.search), []);
  const whatsapp = subscriptionUrl(lead);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans" id="plans-page">
      <header className="max-w-xl mx-auto px-5 pt-6 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
          <Store size={17} strokeWidth={2} />
        </div>
        <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
      </header>

      <main className="max-w-xl mx-auto px-5 py-8 space-y-8">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            {lead.name ? `Hola, ${lead.name}.` : "Hola."} {lead.business ? `Lleva ${lead.business} sin cuaderno.` : "Lleva tu negocio sin cuaderno."}
          </h1>
          <p className="text-[17px] text-brand-muted leading-relaxed">
            {APP_NAME} es el sistema más simple para vender, controlar el inventario y anotar los fiados de tu negocio de barrio, desde el celular o el computador.
          </p>
        </section>

        <section aria-label="Video de demostración" className="space-y-2">
          <video
            src={DEMO_VIDEO}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[70vh] rounded-2xl border border-brand-border bg-black mx-auto"
            aria-label={`Video: así funciona ${APP_NAME}`}
          />
          <p className="text-[13px] text-brand-muted flex items-center gap-1.5">
            <Play size={13} aria-hidden="true" /> Mira cómo funciona, paso a paso.
          </p>
        </section>

        <section aria-label="Plan y precio" className="rounded-3xl border border-brand-border bg-white p-6 space-y-5" id="plan-card">
          <div className="space-y-1">
            <p className="inline-block rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-semibold text-brand-primary" id="plans-trial">
              Prueba gratis {PLAN.trialDays} días
            </p>
            <p className="pt-2 text-sm font-semibold uppercase tracking-wider text-brand-primary">{PLAN.name}</p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-tight tabular-nums">{priceLabel()}</span>
              <span className="text-lg text-brand-muted">al {PLAN.period}</span>
            </p>
            <p className="text-[15px] text-brand-muted">
              Después de la prueba, pagas mes a mes. {PLAN.tagline}
            </p>
          </div>

          <ul className="space-y-2.5">
            {PLAN.includes.map((item) => (
              <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
                <Check size={18} className="text-brand-primary shrink-0 mt-0.5" strokeWidth={2.4} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-brand-muted">No incluye: {PLAN.notIncluded.join(", ")}.</p>

          <a
            href="/?registro=1"
            className="w-full h-[54px] rounded-[14px] bg-brand-primary text-white text-[16px] font-semibold flex items-center justify-center hover:bg-brand-primary-dark transition-colors"
            id="plans-try"
          >
            Empezar mi prueba gratis ({trialLabel()})
          </a>

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[50px] rounded-[14px] border border-brand-border bg-white text-brand-text text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-brand-bg transition-colors"
              id="plans-cta"
            >
              <MessageCircle size={19} aria-hidden="true" /> Hablar con ventas · {whatsappDisplay()}
            </a>
          )}

          <a href="/" className="block text-center text-[14px] font-medium text-brand-primary hover:underline" id="plans-login">
            Ya tengo cuenta
          </a>
        </section>

        <footer className="text-center text-[12px] text-brand-muted pb-6">
          {APP_NAME} · Hecho para tiendas, panaderías, fruver, ferreterías, papelerías y droguerías.
        </footer>
      </main>
    </div>
  );
}
