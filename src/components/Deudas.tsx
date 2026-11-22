// ======================================================
// Archivo: src/components/Deudas.tsx
// Responsabilidad: Pantalla "Fiados": lo que los clientes le deben al negocio, ordenado para cobrar primero lo vencido; registrar, cobrar y reabrir cuentas.
// ======================================================

import React, { useState, useMemo } from "react";
import { Debt } from "../types";
import { Plus, Trash2, RefreshCw, ChevronDown } from "lucide-react";
import { db } from "../lib/insforge";
import { useDialogs } from "../hooks/use-dialogs";
import Dialogs from "./Dialogs";
import { showErrorToast } from "../lib/toast";
import { formatMoney, formatDueLabel } from "../lib/format";

interface DeudasProps {
  debts: Debt[];
  userId: string;
  searchQueryParam?: string;
  onClearSearchParam?: () => void;
}

export default function Deudas({ 
  debts, 
  userId,
  searchQueryParam = "",
  onClearSearchParam
}: DeudasProps) {
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, confirm } = useDialogs();

  React.useEffect(() => {
    if (searchQueryParam) {
      setLocalSearchQuery(searchQueryParam);
      if (onClearSearchParam) {
        onClearSearchParam();
      }
    }
  }, [searchQueryParam]);

  // Filtros y cifras de la pantalla
  const pendingDebts = useMemo(() => debts.filter(d => !d.paid), [debts]);
  const paidDebts = useMemo(() => debts.filter(d => d.paid), [debts]);

  const pendingClientsCount = useMemo(
    () => new Set(pendingDebts.map(d => d.clientName.trim().toLowerCase())).size,
    [pendingDebts]
  );

  const filteredPendingDebts = useMemo(() => {
    return pendingDebts
      .filter(d => d.clientName.toLowerCase().includes(localSearchQuery.toLowerCase()))
      // Vencidas y próximas a vencer primero: es lo más útil para saber a quién cobrarle.
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [pendingDebts, localSearchQuery]);

  const filteredPaidDebts = useMemo(() => {
    return paidDebts
      .filter(d => d.clientName.toLowerCase().includes(localSearchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime());
  }, [paidDebts, localSearchQuery]);

  const totalPendingAmount = useMemo(() => {
    return pendingDebts.reduce((sum, d) => sum + d.amount, 0);
  }, [pendingDebts]);

  /**
   * @function handleRegistrarNuevaDeuda
   * @description Registra una cuenta "fiada" nueva.
   */
  const handleRegistrarNuevaDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !amount || !dueDate) return;

    setLoading(true);
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        showErrorToast("Por favor ingresa un monto válido mayor a 0.");
        setLoading(false);
        return;
      }

      const newDebt: Omit<Debt, "id"> = {
        clientName: clientName.trim(),
        amount: parsedAmount,
        dueDate: dueDate,
        paid: false,
        createdAt: new Date().toISOString()
      };

      await db.addDebt(userId, newDebt);

      // Reset fields
      setClientName("");
      setAmount("");
      setDueDate("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al registrar el fiado:", error);
      showErrorToast("No se pudo registrar la cuenta fiada. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @function handleAlternarPagoDeuda
   * @description Marca una cuenta de deuda como Pagada (con confirmación) o la reactiva (acción corregible, sin confirmación).
   */
  const handleAlternarPagoDeuda = (debt: Debt) => {
    if (!debt.id) return;
    const applyToggle = async () => {
      try {
        await db.updateDebt(userId, debt.id!, {
          paid: !debt.paid,
          paidAt: !debt.paid ? new Date().toISOString() : undefined
        });
      } catch (error) {
        console.error("Error al cambiar el estado de pago del fiado:", error);
        showErrorToast("No se pudo actualizar el estado de la deuda. Verifica tu conexión e inténtalo de nuevo.");
      }
    };

    if (!debt.paid) {
      confirm(
        "Marcar Cuenta como Pagada",
        `¿Confirmas que ${debt.clientName} ya pagó ${formatMoney(debt.amount)}? Podrás reabrir la cuenta después si te equivocas.`,
        applyToggle
      );
    } else {
      applyToggle();
    }
  };

  /**
   * @function handleEliminarDeuda
   * @description Pide confirmación (mostrando a quién y cuánto) y borra el registro de la deuda definitivamente.
   */
  const handleEliminarDeuda = (debt: Debt) => {
    if (!debt.id) return;
    confirm(
      "Eliminar Registro de Deuda",
      `¿Seguro que deseas eliminar la cuenta fiada de ${debt.clientName} por ${formatMoney(debt.amount)}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await db.deleteDebt(userId, debt.id!);
        } catch (error) {
          console.error("Error al eliminar el fiado:", error);
          showErrorToast("No se pudo eliminar la deuda. Verifica tu conexión e inténtalo de nuevo.");
        }
      }
    );
  };

  return (
    <div className="space-y-6" id="deudas-container">
      {/* Cifra principal */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <section aria-label="Total por cobrar" className="space-y-1.5">
          <h2 className="text-[15px] text-brand-muted">Te deben</h2>
          <p className="text-5xl sm:text-6xl font-semibold tracking-[-0.04em] tabular-nums leading-none">{formatMoney(totalPendingAmount)}</p>
          <p className="text-sm text-brand-muted">
            {pendingClientsCount} {pendingClientsCount === 1 ? "cliente" : "clientes"}
          </p>
        </section>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="hidden sm:flex items-center gap-2 h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-5 text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus size={16} />
          {showAddForm ? "Cerrar" : "Nuevo fiado"}
        </button>
      </div>

      {/* Form block */}
      {showAddForm && (
        <form onSubmit={handleRegistrarNuevaDeuda} className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-2">Registrar Nueva Cuenta Fiada</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Nombre del Cliente</label>
              <input
                type="text"
                required
                placeholder="Ej: Doña Carmen, Don Pedro..."
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-xs focus:border-brand-primary focus:outline-hidden bg-brand-bg text-brand-text"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Monto Fiado ($)</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-xs focus:border-brand-primary focus:outline-hidden bg-brand-bg text-brand-text font-mono"
                disabled={loading}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Fecha de Vencimiento / Compromiso</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-xs focus:border-brand-primary focus:outline-hidden bg-brand-bg text-brand-text"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-brand-muted cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary-dark text-white flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Guardar Registro
            </button>
          </div>
        </form>
      )}

      {localSearchQuery && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-brand-primary mb-6">
          <span>Filtrado por deudor: <strong>"{localSearchQuery}"</strong></span>
          <button 
            onClick={() => setLocalSearchQuery("")}
            className="font-bold underline hover:text-brand-primary-dark cursor-pointer text-[11px]"
          >
            Mostrar todo
          </button>
        </div>
      )}

      {/* Por cobrar */}
      {filteredPendingDebts.length === 0 ? (
        <div className="py-14 text-center space-y-1">
          <p className="text-base font-medium text-brand-text">Nadie te debe nada</p>
          <p className="text-sm text-brand-muted">Cuando fíes una venta, aparecerá aquí.</p>
        </div>
      ) : (
        <ul>
          {filteredPendingDebts.map(debt => {
            const overdue = new Date(debt.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <li key={debt.id} className="flex items-center gap-3.5 min-h-[84px] border-b border-brand-border">
                <span className="h-11 w-11 shrink-0 rounded-full bg-[#EAF2ED] text-brand-primary text-[13px] font-semibold flex items-center justify-center" aria-hidden="true">
                  {debt.clientName.trim().slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base font-medium truncate">{debt.clientName}</p>
                  <p className={`text-[13px] ${overdue ? "text-[#A24A16] font-medium" : "text-brand-muted"}`}>{formatDueLabel(debt.dueDate)}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="text-base font-semibold tabular-nums">{formatMoney(debt.amount)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEliminarDeuda(debt)}
                      aria-label={`Eliminar la deuda de ${debt.clientName}`}
                      className="h-9 w-9 rounded-full text-brand-muted hover:text-rose-700 hover:bg-brand-bg flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => handleAlternarPagoDeuda(debt)}
                      className="h-9 px-4 rounded-full bg-[#EAF2ED] text-[#1F3D2E] text-sm font-semibold cursor-pointer hover:bg-[#DCEBE2]"
                    >
                      Cobrar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Historial de cobros (plegado) */}
      {filteredPaidDebts.length > 0 && (
        <details className="group rounded-2xl border border-brand-border bg-white">
          <summary className="flex items-center justify-between gap-3 px-6 min-h-[56px] cursor-pointer list-none text-[15px] font-medium [&::-webkit-details-marker]:hidden">
            Ya cobrados ({filteredPaidDebts.length})
            <ChevronDown size={18} className="text-brand-muted transition-transform group-open:rotate-180" />
          </summary>
          <ul className="px-6 pb-4">
            {filteredPaidDebts.map(debt => (
              <li key={debt.id} className="flex items-center justify-between gap-3 min-h-[60px] border-b border-brand-border last:border-0">
                <div className="min-w-0">
                  <p className="text-[15px] text-brand-muted line-through truncate">{debt.clientName}</p>
                  <p className="text-xs text-brand-muted">
                    Cobrado {debt.paidAt ? new Date(debt.paidAt).toLocaleDateString("es-CO") : "recientemente"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-brand-muted tabular-nums">{formatMoney(debt.amount)}</span>
                  <button
                    onClick={() => handleAlternarPagoDeuda(debt)}
                    className="h-9 px-3 rounded-full border border-[#E2E1DB] text-xs font-medium text-brand-muted hover:bg-brand-bg cursor-pointer"
                    title="Reabrir cuenta fiada"
                  >
                    Reabrir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Botón flotante: nuevo fiado (móvil) */}
      <button
        onClick={() => {
          setShowAddForm(prev => !prev);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="sm:hidden fixed right-5 bottom-24 z-30 h-[52px] px-[22px] rounded-full bg-brand-primary text-white text-[15px] font-semibold flex items-center gap-2 shadow-[0_6px_16px_rgba(47,107,79,0.28)] cursor-pointer"
      >
        <Plus size={18} strokeWidth={2.2} />
        {showAddForm ? "Cerrar" : "Nuevo fiado"}
      </button>

      <Dialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog}
        setAlertDialog={setAlertDialog}
        confirmLabel="Confirmar"
      />
    </div>
  );
}
