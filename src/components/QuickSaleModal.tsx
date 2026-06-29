import React from "react";
import { PlusCircle, Search, Trash2, Minus, Plus, RefreshCw } from "lucide-react";
import { Product } from "../types";

interface QuickSaleModalProps {
  showAddSaleModal: boolean;
  setShowAddSaleModal: (val: boolean) => void;
  products: Product[];
  quickCart: { product: Product; quantity: number }[];
  setQuickCart: (val: { product: Product; quantity: number }[]) => void;
  quickSearch: string;
  setQuickSearch: (val: string) => void;
  handleQuickSearchChange: (val: string) => void;
  activeQuickIndex: number;
  setActiveQuickIndex: React.Dispatch<React.SetStateAction<number>>;
  loadingSale: boolean;
  handleAddToQuickCart: (product: Product) => void;
  handleUpdateQuickQuantity: (productId: string, qty: number) => void;
  handleRemoveFromQuickCart: (productId: string) => void;
  handleRegistrarVentaRapida: (e: React.FormEvent) => void;
  filteredModalProducts: Product[];
}

export default function QuickSaleModal({
  showAddSaleModal,
  setShowAddSaleModal,
  products,
  quickCart,
  setQuickCart,
  quickSearch,
  setQuickSearch,
  handleQuickSearchChange,
  activeQuickIndex,
  setActiveQuickIndex,
  loadingSale,
  handleAddToQuickCart,
  handleUpdateQuickQuantity,
  handleRemoveFromQuickCart,
  handleRegistrarVentaRapida,
  filteredModalProducts
}: QuickSaleModalProps) {
  if (!showAddSaleModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-brand-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
          <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
            <PlusCircle size={18} className="text-brand-primary" />
            Registrar Nueva Venta (Rápida)
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowAddSaleModal(false);
              setQuickCart([]);
              setQuickSearch("");
            }}
            className="text-brand-muted hover:text-brand-text font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-brand-muted">No hay productos en el inventario para vender.</p>
            <p className="text-xs text-brand-muted mt-1">Por favor, agrega productos primero en Ajustes o carga datos demo.</p>
            <button
              type="button"
              onClick={() => setShowAddSaleModal(false)}
              className="mt-4 rounded-xl bg-brand-bg px-4 py-2 text-xs font-semibold text-brand-text hover:bg-brand-border border border-transparent hover:border-brand-border cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegistrarVentaRapida} className="flex-1 flex flex-col overflow-hidden space-y-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden min-h-0">
              {/* Left Column: Product Selection Catalog */}
              <div className="flex flex-col space-y-3 overflow-hidden">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">1. Buscar y Agregar (Usa ↑↓ y Enter)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-brand-muted">
                      <Search size={13} />
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, SKU, categoría..."
                      value={quickSearch}
                      onChange={(e) => handleQuickSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveQuickIndex(prev => Math.min(filteredModalProducts.length - 1, prev + 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveQuickIndex(prev => Math.max(0, prev - 1));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const selectedProd = filteredModalProducts[activeQuickIndex];
                          if (selectedProd) {
                            const inCart = quickCart.find(item => item.product.id === selectedProd.id);
                            const currentQty = inCart ? inCart.quantity : 0;
                            if (selectedProd.stock - currentQty > 0) {
                              handleAddToQuickCart(selectedProd);
                              setQuickSearch("");
                              setActiveQuickIndex(0);
                            } else {
                              alert(`No hay más stock disponible para ${selectedProd.name}.`);
                            }
                          }
                        }
                      }}
                      className="w-full rounded-xl border border-brand-border pl-8 pr-3 py-1.5 text-xs bg-brand-bg text-brand-text focus:bg-white focus:border-brand-primary focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[280px]">
                  {filteredModalProducts.length === 0 ? (
                    <p className="text-xs text-brand-muted py-8 text-center bg-slate-50 rounded-xl border border-dashed border-brand-border">
                      No se encontraron productos disponibles con stock.
                    </p>
                  ) : (
                    filteredModalProducts.map((p, idx) => {
                      const inCart = quickCart.find(item => item.product.id === p.id);
                      const currentQty = inCart ? inCart.quantity : 0;
                      const remainingStock = p.stock - currentQty;
                      const isOutOfStock = remainingStock <= 0;
                      const isActive = idx === activeQuickIndex;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!isOutOfStock) {
                              handleAddToQuickCart(p);
                              setActiveQuickIndex(idx);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group ${
                            isOutOfStock
                              ? "opacity-40 bg-slate-50/50 border-dashed border-brand-border/40 cursor-not-allowed"
                              : isActive
                                ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary/10"
                                : "bg-brand-bg hover:bg-brand-primary/5 hover:border-brand-primary/30 border-transparent"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-brand-text truncate group-hover:text-brand-primary transition-colors">
                                {p.name}
                              </p>
                              {isActive && !isOutOfStock && (
                                <span className="text-[8px] bg-brand-primary text-white px-1 py-0.5 rounded font-black font-mono shrink-0 animate-pulse">
                                  ↵ ENTER
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-brand-muted">
                              {p.category || "General"} • Stock: {remainingStock} disp.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold text-brand-text">
                              ${p.price.toLocaleString("es-CO")}
                            </span>
                            <div className={`p-1 rounded-lg border bg-white ${isOutOfStock ? "text-slate-300 border-slate-100" : "text-brand-primary border-brand-border group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary"}`}>
                              <Plus size={10} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Selected Items (Cart) */}
              <div className="flex flex-col space-y-3 overflow-hidden bg-slate-55/20 border border-brand-border/30 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">2. Lista de Compra</label>
                  {quickCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuickCart([])}
                      className="text-[10px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 size={10} /> Vaciar
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[240px]">
                  {quickCart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-brand-muted space-y-1">
                      <p className="text-xs font-bold">Carrito vacío</p>
                      <p className="text-[10px] text-brand-muted/70 max-w-[150px]">Presiona productos de la izquierda para agregarlos.</p>
                    </div>
                  ) : (
                    quickCart.map(item => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-brand-border shadow-3xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-brand-text truncate">{item.product.name}</p>
                          <p className="text-[9px] text-brand-muted font-mono">
                            ${item.product.price.toLocaleString("es-CO")} c/u
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center border border-brand-border rounded-lg bg-slate-50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuickQuantity(item.product.id!, item.quantity - 1)}
                              className="p-1 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                            >
                              <Minus size={9} />
                            </button>
                            <span className="px-1.5 text-xs font-mono font-bold text-brand-text bg-white border-x border-brand-border min-w-[18px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuickQuantity(item.product.id!, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus size={9} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromQuickCart(item.product.id!)}
                            className="text-brand-muted hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 border border-brand-border flex justify-between items-center text-xs font-bold text-brand-text font-mono shrink-0">
                  <span>TOTAL:</span>
                  <span className="text-emerald-700 font-extrabold text-sm">
                    ${quickCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-brand-border shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddSaleModal(false);
                  setQuickCart([]);
                  setQuickSearch("");
                }}
                className="flex-1 rounded-xl border border-brand-border px-4 py-2.5 text-xs font-semibold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingSale || quickCart.length === 0}
                className="flex-1 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-primary-dark transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingSale ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : `Confirmar Venta (${quickCart.reduce((sum, item) => sum + item.quantity, 0)} u.)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
