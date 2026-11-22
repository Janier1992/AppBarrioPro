import { subscriptionUrl } from "../lib/pricing";
import { bannerFor, type SubscriptionInfo } from "../lib/subscription";

/** Aviso fino sobre el contenido: días de prueba que quedan o suscripción por vencer. */
export default function SubscriptionBanner({ info, businessName }: { info: SubscriptionInfo | null; businessName?: string }) {
  const banner = bannerFor(info);
  if (!banner) return null;
  const url = subscriptionUrl({ name: businessName ?? "", business: "", source: "aviso en la app" });
  const warn = banner.tone === "warn";
  return (
    <div
      role="status"
      id="subscription-banner"
      className={`mx-5 lg:mx-10 mt-4 rounded-xl px-4 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2 border ${
        warn ? "border-amber-200 bg-amber-50 text-amber-900" : "border-brand-border bg-white text-brand-text"
      }`}
    >
      <span>{banner.text}</span>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-primary hover:underline">
          {info?.state === "trial" ? "Suscribirme" : "Renovar"}
        </a>
      )}
    </div>
  );
}
