import React from "react";
import { ShoppingCart, Trash2, Minus, Plus, User, DollarSign, CreditCard, ClipboardList, RefreshCw, Check } from "lucide-react";
import { Product } from "../types";

interface POSCartProps {
  cart: { product: Product; quantity: number }[];
  clientName: string;
  setClientName: (val: string) => void;
  paymentMethod: "Efectivo" | "Tarjeta" | "Transferencia" | "Fiado";
  setPaymentMethod: (val: "Efectivo" | "Tarjeta" | "Transferencia" | "Fiado") => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  loading: boolean;
  handleUpdateQuantity: (productId: string, qty: number) => void;
  handleRemoveFromCart: (productId: string) => void;
  handleClearCart: () => void;
  handleRegistrarVenta: () => void;
}

export default function POSCart({
  cart,
  clientName,
  setClientName,
  paymentMethod,
  setPaymentMethod,
  dueDate,
  setDueDate,
  loading,
  handleUpdateQuantity,
  handleRemoveFromCart,
  handleClearCart,
  handleRegistrarVenta
}: POSCartProps) {
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-5 flex flex-col justify-between h-full bg-slate-50/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold text-brand-text uppercase tracking-wider">2. Detalle de Compra</h4>
            <p className="text-[10px] text-brand-muted">Los productos elegidos aparecerán aquí.</p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 size={11} />
              Vaciar
            </button>
          )}
        </div>

        {/* Cart List */}
        <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-brand-muted space-y-2">
              <div className="p-3 bg-brand-bg rounded-full text-brand-muted/70">
                <ShoppingCart size={18} />
              </div>
              <p className="text-[10px] font-bold">El carrito está vacío</p>
              <p className="text-[9px] text-brand-muted/70 max-w-[150px]">Elige productos de la izquierda para agregarlos.</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-brand-border shadow-3xs"
              >
                <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                  <p className="text-xs font-bold text-brand-text truncate">{item.product.name}</p>
                  <p className="text-[9px] text-brand-primary font-mono font-bold">
                    ${item.product.price.toLocaleString("es-CO")} c/u
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-brand-border rounded-lg bg-brand-bg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.product.id!, item.quantity - 1)}
                      className="p-1 px-1.5 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="px-1.5 text-[11px] font-mono font-black text-brand-text bg-white border-x border-brand-border min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.product.id!, item.quantity + 1)}
                      className="p-1 px-1.5 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(item.product.id!)}
                    className="text-brand-muted hover:text-rose-600 p-1 rounded-md transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Checkout Summary & Submission */}
      <div className="pt-4 border-t border-brand-border space-y-3 mt-4">
        {/* Client Name Input */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-brand-muted uppercase tracking-wider">
            Cliente {paymentMethod === "Fiado" ? "(Obligatorio)" : "(Opcional)"}
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 text-brand-muted">
              <User size={12} />
            </span>
            <input
              type="text"
              placeholder={paymentMethod === "Fiado" ? "Nombre del deudor (ej: Don Juan)" : "Ej: Consumidor Final, Juan..."}
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full rounded-lg border border-brand-border pl-8 pr-3 py-1.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
              disabled={loading || cart.length === 0}
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-brand-muted uppercase tracking-wider">Método de Pago</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["Efectivo", "Tarjeta", "Transferencia", "Fiado"] as const).map(method => {
              const isActive = paymentMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                    if (method !== "Fiado") setDueDate("");
                  }}
                  className={`py-2 rounded-lg border text-[9px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand-primary/15 border-brand-primary text-brand-primary font-black shadow-2xs"
                      : "bg-white border-brand-border text-brand-muted hover:bg-slate-50"
                  }`}
                  disabled={loading || cart.length === 0}
                >
                  {method === "Efectivo" && <DollarSign size={10} />}
                  {method === "Tarjeta" && <CreditCard size={10} />}
                  {method === "Transferencia" && <RefreshCw size={10} />}
                  {method === "Fiado" && <ClipboardList size={10} />}
                  <span className="text-[8px]">{method}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Due Date Selector (Only shown if Fiado is selected) */}
        {paymentMethod === "Fiado" && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-[9px] font-bold text-brand-muted uppercase tracking-wider text-rose-700">Fecha de Pago (Vencimiento)</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-brand-border px-3 py-1.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden font-mono"
              disabled={loading || cart.length === 0}
            />
          </div>
        )}

        {/* Total summary */}
        <div className="bg-slate-100 rounded-xl p-3 border border-brand-border/60 flex justify-between items-center text-xs font-bold text-brand-text font-mono">
          <span>TOTAL COMPRA:</span>
          <span className="text-emerald-700 text-sm font-black">
            ${cartTotal.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={() => handleRegistrarVenta()}
          disabled={loading || cart.length === 0}
          className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-dark font-extrabold text-xs text-white py-3 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
          Registrar Venta ({cartItemsCount} u.)
        </button>
      </div>
    </div>
  );
}
