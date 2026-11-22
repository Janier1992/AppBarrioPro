// ======================================================
// Archivo: src/components/POSCatalog.tsx
// Responsabilidad: Catálogo del punto de venta: búsqueda, categorías y fichas de producto para agregar al carrito.
// ======================================================

import React from "react";
import { Search } from "lucide-react";
import { Product } from "../types";
import { showErrorToast } from "../lib/toast";
import { formatMoney } from "../lib/format";

interface POSCatalogProps {
  filteredCatalogProducts: Product[];
  catalogSearch: string;
  catalogCategories: string[];
  selectedCatalogCategory: string;
  activeCatalogIndex: number;
  cart: { product: Product; quantity: number }[];
  handleCatalogSearchChange: (val: string) => void;
  handleCategoryChange: (cat: string) => void;
  handleAddToCart: (p: Product) => void;
  setActiveCatalogIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function POSCatalog({
  filteredCatalogProducts,
  catalogSearch,
  catalogCategories,
  selectedCatalogCategory,
  activeCatalogIndex,
  cart,
  handleCatalogSearchChange,
  handleCategoryChange,
  handleAddToCart,
  setActiveCatalogIndex
}: POSCatalogProps) {
  return (
    <div className="space-y-5">
      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-4 top-3.5 text-brand-muted">
          <Search size={18} strokeWidth={1.8} />
        </span>
        <label htmlFor="pos-search" className="sr-only">Buscar producto</label>
        <input
          id="pos-search"
          type="search"
          placeholder="Buscar por nombre o código"
          value={catalogSearch}
          onChange={e => handleCatalogSearchChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveCatalogIndex(prev => Math.min(filteredCatalogProducts.length - 1, prev + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveCatalogIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const selectedProd = filteredCatalogProducts[activeCatalogIndex];
              if (selectedProd) {
                const inCart = cart.find(item => item.product.id === selectedProd.id);
                const currentQty = inCart ? inCart.quantity : 0;
                if (selectedProd.stock - currentQty > 0) {
                  handleAddToCart(selectedProd);
                  handleCatalogSearchChange("");
                  setActiveCatalogIndex(0);
                } else {
                  showErrorToast(`No hay más stock disponible para ${selectedProd.name}.`);
                }
              }
            }
          }}
          className="w-full h-11 rounded-xl border border-[#E2E1DB] pl-11 pr-4 text-sm bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
        />
      </div>

      {/* Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {catalogCategories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`h-9 px-4 rounded-full text-[13px] shrink-0 transition-colors cursor-pointer border ${
              selectedCatalogCategory === cat
                ? "bg-brand-text border-brand-text text-white font-medium"
                : "bg-white border-[#E2E1DB] text-brand-text hover:bg-brand-bg"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Productos en tarjetas grandes y fáciles de tocar */}
      {filteredCatalogProducts.length === 0 ? (
        <div className="text-center py-16 text-sm text-brand-muted space-y-1">
          <p className="font-medium text-brand-text">No se encontraron productos</p>
          <p className="text-[13px]">Registra stock en Inventario para empezar a vender.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
          {filteredCatalogProducts.map((p, idx) => {
            const inCart = cart.find(item => item.product.id === p.id);
            const currentQty = inCart ? inCart.quantity : 0;
            const remainingStock = p.stock - currentQty;
            const isOutOfStock = remainingStock <= 0;
            const isActive = idx === activeCatalogIndex;
            const isLow = !isOutOfStock && remainingStock <= Math.max(1, Math.round((p.minStock ?? 5) * 0.3));

            return (
              <button
                key={p.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  handleAddToCart(p);
                  setActiveCatalogIndex(idx);
                }}
                className={`text-left flex flex-col gap-3.5 min-h-[112px] rounded-2xl border bg-white p-4 transition-colors cursor-pointer ${
                  isOutOfStock
                    ? "opacity-50 cursor-not-allowed border-dashed border-brand-border"
                    : isActive
                      ? "border-brand-primary ring-2 ring-brand-primary/15"
                      : "border-brand-border hover:border-brand-primary/40"
                }`}
              >
                <span className="text-sm font-medium leading-snug text-brand-text">{p.name}</span>
                <span className="mt-auto flex items-baseline justify-between gap-2">
                  <span className="text-base font-semibold tabular-nums text-brand-text">
                    {formatMoney(p.price)}
                  </span>
                  <span className={`text-xs ${isLow || isOutOfStock ? "text-[#A24A16] font-semibold" : "text-brand-muted"}`}>
                    {isOutOfStock ? "Agotado" : isLow ? `Quedan ${remainingStock}` : `${remainingStock} en stock`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
