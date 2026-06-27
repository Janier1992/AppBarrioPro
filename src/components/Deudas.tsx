/**
 * @file Deudas.tsx
 * @description Operational Debts management component for neighbor customers.
 * @design Part of the User Interface and Business Logic layers. Leverages real-time data binding
 * with Firestore collections for robust persistence. Uses defensive try-catch statements to prevent crashes.
 */

import React, { useState, useMemo } from "react";
import { Debt } from "../types";
import { Plus, Check, Trash2, Calendar, User, DollarSign, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { db } from "../lib/insforge";

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

  React.useEffect(() => {
    if (searchQueryParam) {
      setLocalSearchQuery(searchQueryParam);
      if (onClearSearchParam) {
        onClearSearchParam();
      }
    }
  }, [searchQueryParam]);

  // Filter and metrics computations
  const pendingDebts = useMemo(() => debts.filter(d => !d.paid), [debts]);
  const paidDebts = useMemo(() => debts.filter(d => d.paid), [debts]);

  const filteredPendingDebts = useMemo(() => {
    return pendingDebts.filter(d => d.clientName.toLowerCase().includes(localSearchQuery.toLowerCase()));
  }, [pendingDebts, localSearchQuery]);

  const filteredPaidDebts = useMemo(() => {
    return paidDebts.filter(d => d.clientName.toLowerCase().includes(localSearchQuery.toLowerCase()));
  }, [paidDebts, localSearchQuery]);

  const totalPendingAmount = useMemo(() => {
    return pendingDebts.reduce((sum, d) => sum + d.amount, 0);
  }, [pendingDebts]);

  const totalPaidAmount = useMemo(() => {
    return paidDebts.reduce((sum, d) => sum + d.amount, 0);
  }, [paidDebts]);

  /**
   * @function handleRegistrarNuevaDeuda
   * @description Registra un nuevo compromiso de crédito o cuenta "fiada" en Firestore.
   */
  const handleRegistrarNuevaDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !amount || !dueDate) return;

    setLoading(true);
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        alert("Por favor ingresa un monto válido mayor a 0.");
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
      console.error("Error registering debt:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * @function handleAlternarPagoDeuda
   * @description Marca una cuenta de deuda como Pagada o reactiva el estado de cobro.
   */
  const handleAlternarPagoDeuda = async (debt: Debt) => {
    if (!debt.id) return;
    try {
      await db.updateDebt(userId, debt.id, {
        paid: !debt.paid,
        paidAt: !debt.paid ? new Date().toISOString() : undefined
      });
    } catch (error) {
      console.error("Error updating debt payment status:", error);
    }
  };

  /**
   * @function handleEliminarDeuda
   * @description Borra el registro de la deuda definitivamente.
   */
  const handleEliminarDeuda = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro de deuda?")) return;
    try {
      await db.deleteDebt(userId, id);
    } catch (error) {
      console.error("Error deleting debt:", error);
    }
  };

  return (
    <div className="space-y-6" id="deudas-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-brand-text">Registro de Deudas / Clientes Fiados</h2>
          <p className="text-xs text-brand-muted">Lleva el control de las cuentas fiadas para mantener tus finanzas sanas.</p>
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <Plus size={16} />
          {showAddForm ? "Cancelar Registro" : "Nueva Cuenta Fiada"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="deudas-kpis">
        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-rose-50 text-rose-600 p-3">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Total Pendiente</p>
            <p className="text-xl font-black text-rose-600">
              ${totalPendingAmount.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-brand-muted">{pendingDebts.length} cuentas por cobrar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-emerald-50 text-emerald-600 p-3">
            <Check size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Total Cobrado</p>
            <p className="text-xl font-black text-emerald-600">
              ${totalPaidAmount.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-brand-muted">{paidDebts.length} cuentas pagadas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-slate-50 text-brand-primary p-3">
            <User size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Total Clientes</p>
            <p className="text-xl font-black text-brand-text">
              {Array.from(new Set(debts.map(d => d.clientName.toLowerCase()))).length}
            </p>
            <p className="text-[10px] text-brand-muted">Historial acumulado</p>
          </div>
        </div>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Debts List */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h3 className="font-bold text-brand-text text-sm">Cuentas Pendientes por Cobrar</h3>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-100">
              {filteredPendingDebts.length} activas
            </span>
          </div>

          {filteredPendingDebts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-brand-muted space-y-2">
              <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                <Check size={24} />
              </div>
              <p className="text-xs font-semibold">No se encontraron deudas pendientes.</p>
              <p className="text-[10px] text-brand-muted">Prueba cambiando tu búsqueda o registra una nueva cuenta fiada.</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-bg max-h-[400px] overflow-y-auto pr-1">
              {filteredPendingDebts.map(debt => {
                const isOverdue = new Date(debt.dueDate) < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div key={debt.id} className="py-3.5 flex items-center justify-between gap-4 group">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-text text-xs truncate block max-w-[180px] sm:max-w-xs">{debt.clientName}</span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                            <AlertCircle size={10} />
                            Vencido
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-brand-muted">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Límite: {debt.dueDate}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-rose-600 text-sm font-mono">${debt.amount.toFixed(2)}</span>
                      <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAlternarPagoDeuda(debt)}
                          className="text-emerald-600 hover:bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Marcar como pagado"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => handleEliminarDeuda(debt.id!)}
                          className="text-rose-600 hover:bg-rose-50 border border-rose-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paid Debts List */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h3 className="font-bold text-brand-text text-sm">Historial de Cobros Recientes (Pagado)</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
              {filteredPaidDebts.length} cobradas
            </span>
          </div>

          {filteredPaidDebts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-brand-muted space-y-2">
              <p className="text-xs font-semibold">No se encontraron cobros registrados.</p>
              <p className="text-[10px] text-brand-muted">Cuando tus clientes paguen lo fiado, se verán aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-bg max-h-[400px] overflow-y-auto pr-1">
              {filteredPaidDebts.map(debt => (
                <div key={debt.id} className="py-3.5 flex items-center justify-between gap-4 group">
                  <div className="space-y-1 min-w-0">
                    <span className="font-bold text-brand-muted line-through text-xs truncate block max-w-[180px] sm:max-w-xs">{debt.clientName}</span>
                    <div className="flex items-center gap-3 text-[10px] text-brand-muted">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check size={11} />
                        Pagado el {debt.paidAt ? new Date(debt.paidAt).toLocaleDateString("es-CO") : "Recientemente"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600 text-xs font-mono line-through">${debt.amount.toFixed(2)}</span>
                    <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAlternarPagoDeuda(debt)}
                        className="text-brand-muted hover:bg-slate-100 border border-brand-border p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Reabrir cuenta fiada"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        onClick={() => handleEliminarDeuda(debt.id!)}
                        className="text-rose-600 hover:bg-rose-50 border border-rose-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
