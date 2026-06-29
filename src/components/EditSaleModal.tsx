import React from "react";
import { Edit3, DollarSign, CreditCard, ClipboardList, RefreshCw } from "lucide-react";
import { Sale } from "../types";

interface EditSaleModalProps {
  editingSale: Sale | null;
  setEditingSale: (val: Sale | null) => void;
  editClientName: string;
  setEditClientName: (val: string) => void;
  editPaymentMethod: "Efectivo" | "Tarjeta" | "Transferencia" | "Fiado";
  setEditPaymentMethod: (val: "Efectivo" | "Tarjeta" | "Transferencia" | "Fiado") => void;
  editTotal: number;
  setEditTotal: (val: number) => void;
  handleSaveEditSale: (e: React.FormEvent) => void;
}

export default function EditSaleModal({
  editingSale,
  setEditingSale,
  editClientName,
  setEditClientName,
  editPaymentMethod,
  setEditPaymentMethod,
  editTotal,
  setEditTotal,
  handleSaveEditSale
}: EditSaleModalProps) {
  if (!editingSale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-brand-border shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-brand-bg pb-3">
          <h3 className="text-sm font-black text-brand-text flex items-center gap-1.5 uppercase">
            <Edit3 className="text-brand-primary" size={16} />
            Editar Detalle de Venta
          </h3>
          <button
            type="button"
            onClick={() => setEditingSale(null)}
            className="text-xs text-brand-muted hover:text-brand-text font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveEditSale} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Nombre del Cliente</label>
            <input
              type="text"
              required={editPaymentMethod === "Fiado"}
              value={editClientName}
              onChange={(e) => setEditClientName(e.target.value)}
              className="w-full rounded-xl border border-brand-border px-3.5 py-2.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
              placeholder="Ej: Consumidor Final, Juan..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Método de Pago</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["Efectivo", "Tarjeta", "Transferencia", "Fiado"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setEditPaymentMethod(method)}
                  className={`py-2.5 rounded-xl border text-[9px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    editPaymentMethod === method
                      ? "bg-brand-primary/15 border-brand-primary text-brand-primary shadow-2xs font-black"
                      : "bg-white border-brand-border text-brand-muted hover:bg-slate-50"
                  }`}
                >
                  {method === "Efectivo" && <DollarSign size={10} />}
                  {method === "Tarjeta" && <CreditCard size={10} />}
                  {method === "Transferencia" && <RefreshCw size={10} />}
                  {method === "Fiado" && <ClipboardList size={10} />}
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Total de la Venta ($)</label>
            <input
              type="number"
              required
              min="1"
              value={editTotal}
              onChange={(e) => setEditTotal(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-brand-border px-3.5 py-2.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden font-mono font-bold"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingSale(null)}
              className="flex-1 rounded-xl border border-brand-border text-brand-muted hover:bg-slate-50 font-bold text-xs py-3 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white font-extrabold text-xs py-3 shadow-xs transition-colors cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
