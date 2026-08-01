import React from "react";
import { Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { ConfirmDialogState, AlertDialogState } from "../hooks/use-dialogs";

interface DialogsProps {
  confirmDialog: ConfirmDialogState | null;
  setConfirmDialog: (val: ConfirmDialogState | null) => void;
  alertDialog: AlertDialogState | null;
  setAlertDialog: (val: AlertDialogState | null) => void;
  confirmLabel?: string;
}

/** Renderiza el par de diálogos de confirmación/alerta propios de la app. Ver src/hooks/use-dialogs.ts. */
export default function Dialogs({ confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, confirmLabel = "Confirmar" }: DialogsProps) {
  return (
    <>
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-brand-text text-base">{confirmDialog.title}</h4>
                <p className="text-xs text-brand-muted leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                  alertDialog.type === "success"
                    ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
                    : alertDialog.type === "warning"
                      ? "bg-amber-50 border border-amber-100 text-amber-600"
                      : "bg-brand-primary/10 border border-brand-primary/20 text-brand-primary"
                }`}
              >
                {alertDialog.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-brand-text text-base">{alertDialog.title}</h4>
                <p className="text-xs text-brand-muted leading-relaxed">{alertDialog.message}</p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setAlertDialog(null)}
                  className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark px-6 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
