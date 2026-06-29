import React from "react";
import { Edit2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Product } from "../types";

interface EditProductModalProps {
  editingProduct: Product | null;
  setEditingProduct: (val: Product | null) => void;
  editName: string;
  setEditName: (val: string) => void;
  editSku: string;
  setEditSku: (val: string) => void;
  editCategory: string;
  setEditCategory: (val: string) => void;
  editStock: number;
  setEditStock: (val: number) => void;
  editMinStock: number;
  setEditMinStock: (val: number) => void;
  editPrice: number;
  setEditPrice: (val: number) => void;
  editCost: number;
  setEditCost: (val: number) => void;
  savingEdit: boolean;
  formCategories: string[];
  handleGuardarEdicionProducto: (e: React.FormEvent) => void;
}

export default function EditProductModal({
  editingProduct,
  setEditingProduct,
  editName,
  setEditName,
  editSku,
  setEditSku,
  editCategory,
  setEditCategory,
  editStock,
  setEditStock,
  editMinStock,
  setEditMinStock,
  editPrice,
  setEditPrice,
  editCost,
  setEditCost,
  savingEdit,
  formCategories,
  handleGuardarEdicionProducto
}: EditProductModalProps) {
  if (!editingProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-brand-border bg-brand-bg/30 px-6 py-4">
          <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
            <Edit2 size={16} className="text-brand-primary" />
            Editar Producto: <span className="text-brand-primary">{editingProduct.name}</span>
          </h3>
          <button
            onClick={() => setEditingProduct(null)}
            className="text-brand-muted hover:text-brand-text rounded-lg p-1 transition-colors cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>

        {/* Formulario de Edición */}
        <form onSubmit={handleGuardarEdicionProducto} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-muted mb-1">Nombre del Producto</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Categoría</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
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
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Stock Actual</label>
              <input
                type="number"
                value={editStock}
                onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                value={editMinStock}
                onChange={(e) => setEditMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Precio de Venta ($)</label>
              <input
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                value={editCost}
                onChange={(e) => setEditCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>
          </div>

          {/* Botonera del Modal */}
          <div className="flex justify-end gap-2 border-t border-brand-border pt-4 mt-6">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark px-5 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
