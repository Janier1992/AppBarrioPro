import { ShoppingCart, Trash2, Minus, Plus, RefreshCw } from "lucide-react";
import { Product } from "../types";
import { formatMoney } from "../lib/format";

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
    <div className="rounded-2xl border border-brand-border bg-white p-6 flex flex-col gap-5 lg:sticky lg:top-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-brand-text">Carrito</h3>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-brand-muted">{cartItemsCount} {cartItemsCount === 1 ? "unidad" : "unidades"}</span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="text-[13px] text-rose-700 font-medium hover:underline cursor-pointer"
            >
              Vaciar
            </button>
          )}
        </div>
      </div>

      {/* Líneas del carrito */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-brand-muted gap-2">
          <ShoppingCart size={22} strokeWidth={1.6} />
          <p className="text-sm font-medium text-brand-text">El carrito está vacío</p>
          <p className="text-[13px]">Toca un producto para agregarlo.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4 max-h-[280px] overflow-y-auto pr-1">
          {cart.map(item => (
            <li key={item.product.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1.5">
                <p className="text-sm font-medium text-brand-text truncate">{item.product.name}</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Quitar una unidad"
                    onClick={() => handleUpdateQuantity(item.product.id!, item.quantity - 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E2E1DB] bg-white text-brand-text hover:bg-brand-bg cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[28px] text-center text-sm tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Agregar una unidad"
                    onClick={() => handleUpdateQuantity(item.product.id!, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E2E1DB] bg-white text-brand-text hover:bg-brand-bg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${item.product.name}`}
                    onClick={() => handleRemoveFromCart(item.product.id!)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {formatMoney((item.product.price * item.quantity))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="h-px bg-brand-border" />

      {/* Cliente */}
      <div className="space-y-2">
        <label htmlFor="pos-client" className="block text-[13px] text-brand-muted">
          Cliente {paymentMethod === "Fiado" ? "(obligatorio)" : "(opcional)"}
        </label>
        <input
          id="pos-client"
          type="text"
          placeholder={paymentMethod === "Fiado" ? "Nombre del deudor" : "Consumidor final"}
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          className="w-full h-11 rounded-xl border border-[#E2E1DB] px-4 text-sm bg-white text-brand-text focus:border-brand-primary focus:outline-hidden disabled:opacity-50"
          disabled={loading || cart.length === 0}
        />
      </div>

      {/* Forma de pago */}
      <fieldset className="space-y-2 border-0 p-0 m-0">
        <legend className="text-[13px] text-brand-muted mb-2 p-0">Forma de pago</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["Efectivo", "Tarjeta", "Transferencia", "Fiado"] as const).map(method => {
            const isActive = paymentMethod === method;
            return (
              <button
                key={method}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setPaymentMethod(method);
                  if (method !== "Fiado") setDueDate("");
                }}
                className={`h-11 rounded-xl border text-[13px] transition-colors cursor-pointer disabled:opacity-50 ${
                  isActive
                    ? "border-brand-primary bg-[#EAF2ED] text-[#1F3D2E] font-semibold"
                    : "border-[#E2E1DB] bg-white text-brand-text hover:bg-brand-bg"
                }`}
                disabled={loading || cart.length === 0}
              >
                {method}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Fecha de vencimiento (solo Fiado) */}
      {paymentMethod === "Fiado" && (
        <div className="space-y-2">
          <label htmlFor="pos-due" className="block text-[13px] text-brand-muted">Fecha de pago acordada</label>
          <input
            id="pos-due"
            type="date"
            required
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#E2E1DB] px-4 text-sm bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
            disabled={loading || cart.length === 0}
          />
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-brand-muted">Total</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-brand-text">
          {formatMoney(cartTotal)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => handleRegistrarVenta()}
        disabled={loading || cart.length === 0}
        className="w-full h-[52px] rounded-[14px] bg-brand-primary hover:bg-brand-primary-dark text-[15px] font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
        Cobrar {formatMoney(cartTotal)}
      </button>
    </div>
  );
}
