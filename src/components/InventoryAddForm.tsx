import React from "react";
import { Plus, RefreshCw } from "lucide-react";

interface InventoryAddFormProps {
  prodName: string;
  setProdName: (val: string) => void;
  sku: string;
  setSku: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  stock: number;
  setStock: (val: number) => void;
  minStock: number;
  setMinStock: (val: number) => void;
  price: number;
  setPrice: (val: number) => void;
  cost: number;
  setCost: (val: number) => void;
  loadingProduct: boolean;
  formCategories: string[];
  handleRegistrarNuevoProducto: (e: React.FormEvent) => void;
  setShowAddForm: (val: boolean) => void;
}

export default function InventoryAddForm({
  prodName,
  setProdName,
  sku,
  setSku,
  category,
  setCategory,
  stock,
  setStock,
  minStock,
  setMinStock,
  price,
  setPrice,
  cost,
  setCost,
  loadingProduct,
  formCategories,
  handleRegistrarNuevoProducto,
  setShowAddForm
}: InventoryAddFormProps) {
  return (
    <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-6 shadow-xs space-y-4 animate-in slide-in-from-top duration-300">
      <h3 className="font-bold text-brand-primary text-sm flex items-center gap-2">
        <Plus size={18} />
        Agregar Nuevo Producto al Catálogo
      </h3>

      <form onSubmit={handleRegistrarNuevoProducto} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-brand-muted mb-1">Nombre del Producto</label>
          <input
            type="text"
            value={prodName}
            onChange={(e) => setProdName(e.target.value)}
            placeholder="Ej: Pan Tajado Grande"
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden"
          >
            {formCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">SKU / Código</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Autogenerado"
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Stock Actual</label>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
            min="0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Stock Mínimo (Alerta)</label>
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
            min="0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Precio de Venta ($)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
            min="0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1">Costo Unitario ($)</label>
          <input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
            min="0"
          />
        </div>

        <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-brand-bg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loadingProduct}
            className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark px-5 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer"
          >
            {loadingProduct ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Registrar Producto
          </button>
        </div>
      </form>
    </div>
  );
}
