import React from "react";
import { Search, Plus } from "lucide-react";
import { Product } from "../types";

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
    <div className="p-5 space-y-4">
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-brand-text uppercase tracking-wider">1. Buscar Productos</h4>
        <p className="text-[10px] text-brand-muted">Filtra por categoría o busca por nombre. Usa las flechas ↑↓ y presiona Enter para agregar.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-brand-muted">
          <Search size={14} />
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
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
                  alert(`No hay más stock disponible para ${selectedProd.name}.`);
                }
              }
            }
          }}
          className="w-full rounded-xl border border-brand-border pl-9 pr-3.5 py-2 text-xs bg-brand-bg text-brand-text focus:bg-white focus:border-brand-primary focus:outline-hidden"
        />
      </div>

      {/* Categories Scrollable Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {catalogCategories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer border ${
              selectedCatalogCategory === cat
                ? "bg-brand-primary/15 border-brand-primary/30 text-brand-primary font-black"
                : "bg-slate-50 border-brand-border/60 text-brand-muted hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Catalog Products List */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredCatalogProducts.length === 0 ? (
          <div className="text-center py-12 text-xs text-brand-muted space-y-1">
            <p className="font-semibold">No se encontraron productos</p>
            <p className="text-[10px] text-brand-muted/70">Asegúrate de registrar stock en Inventario.</p>
          </div>
        ) : (
          filteredCatalogProducts.map((p, idx) => {
            const inCart = cart.find(item => item.product.id === p.id);
            const currentQty = inCart ? inCart.quantity : 0;
            const remainingStock = p.stock - currentQty;
            const isOutOfStock = remainingStock <= 0;
            const isActive = idx === activeCatalogIndex;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!isOutOfStock) {
                    handleAddToCart(p);
                    setActiveCatalogIndex(idx);
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group ${
                  isOutOfStock
                    ? "opacity-50 bg-slate-50/50 border-dashed border-brand-border/40 cursor-not-allowed"
                    : isActive
                      ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary/10"
                      : "bg-brand-bg hover:bg-brand-primary/5 hover:border-brand-primary/30 border-transparent"
                }`}
              >
                <div className="space-y-0.5 pr-2 min-w-0 flex-1">
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
                  <div className="flex items-center gap-1.5 text-[9px] text-brand-muted">
                    <span className="bg-white border border-brand-border/40 px-1.5 py-0.5 rounded-md font-bold">
                      {p.category}
                    </span>
                    <span>SKU: {p.sku || "N/A"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-brand-text">
                      ${p.price.toLocaleString("es-CO")}
                    </p>
                    <p className="text-[9px] text-brand-muted font-semibold">
                      {isOutOfStock ? "Agotado" : `${remainingStock} disp.`}
                    </p>
                  </div>

                  <div className={`p-1.5 rounded-lg border transition-all ${
                    isOutOfStock 
                      ? "bg-slate-100 text-slate-400 border-slate-200" 
                      : isActive
                        ? "bg-brand-primary text-white border-brand-primary shadow-2xs"
                        : "bg-white text-brand-primary border-brand-border shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary"
                  }`}>
                    <Plus size={12} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
