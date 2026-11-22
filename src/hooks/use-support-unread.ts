import { useCallback, useEffect, useState } from "react";
import { getSupportApi } from "../lib/support";

/** Cuántas respuestas de soporte no ha leído el cliente (punto en el menú). Se actualiza al volver a la app y cada minuto. */
export function useSupportUnread(enabled: boolean): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setCount(await (await getSupportApi()).unreadCount());
    } catch {
      /* sin soporte disponible (migración sin aplicar o sin conexión): no se muestra nada */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [enabled, refresh]);

  return { count, refresh };
}
