import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { Toast, subscribeToToasts, dismissToast } from "../lib/toast";

const STYLES: Record<Toast["type"], { bg: string; icon: React.ReactNode }> = {
  success: { bg: "bg-emerald-600", icon: <CheckCircle2 size={16} /> },
  error: { bg: "bg-rose-600", icon: <AlertCircle size={16} /> },
  info: { bg: "bg-brand-primary", icon: <Info size={16} /> },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[90vw] max-w-sm" id="toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.15 }}
            className={`${STYLES[t.type].bg} text-white rounded-2xl shadow-lg px-4 py-3 flex items-start gap-2.5 text-xs font-semibold`}
          >
            <span className="shrink-0 mt-0.5">{STYLES[t.type].icon}</span>
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 text-white/80 hover:text-white cursor-pointer"
              title="Cerrar"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
