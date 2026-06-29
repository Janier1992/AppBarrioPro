import React from "react";
import { Download, Plus, RefreshCw, Layers, ShoppingBag, Trash2 } from "lucide-react";
import { Product } from "../types";

interface SettingsCatalogProps {
  products: Product[];
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
  handleExportarExcel: () => void;
  handleRegistrarNuevoProducto: (e: React.FormEvent) => void;
  handleEliminarProductoDeInventario: (id: string) => void;
}

export default function SettingsCatalog({
  products,
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
  handleExportarExcel,
  handleRegistrarNuevoProducto,
  handleEliminarProductoDeInventario
}: SettingsCatalogProps) {
  return (
    <div className="space-y-6">
      {/* Export to Excel banner */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-brand-text">Exportar Inventario a Excel</h4>
          <p className="text-xs text-brand-muted">Descarga una copia completa de tu catálogo de productos en formato CSV compatible con Microsoft Excel.</p>
        </div>
        <button
          type="button"
          onClick={handleExportarExcel}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
        >
          <Download size={14} />
          Exportar a Excel
        </button>
      </div>

      {/* Add product */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3 flex items-center gap-2">
          <Plus size={18} className="text-brand-primary" />
          Agregar Nuevo Producto al Catálogo
        </h3>

        <form onSubmit={handleRegistrarNuevoProducto} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <option value="Abarrotes">Abarrotes</option>
              <option value="Ferretería">Ferretería</option>
              <option value="Droguería">Droguería</option>
              <option value="Carnicería">Carnicería</option>
              <option value="Legumbrería">Legumbrería</option>
              <option value="Tienda Digital (Accesorios)">Tienda Digital (Accesorios)</option>
              <option value="Papelería">Papelería</option>
              <option value="Otros Comercios">Otros Comercios</option>
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
              onChange={(e) => setStock(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
              min="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">Stock Mínimo</label>
            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
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
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
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
              onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
              min="0"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loadingProduct}
              className="w-full rounded-xl bg-brand-primary py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingProduct ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Registrar
            </button>
          </div>
        </form>
      </div>

      {/* List products */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3 flex items-center gap-2">
          <Layers size={18} className="text-brand-primary" />
          Inventario Registrado ({products.length})
        </h3>

        {products.length === 0 ? (
          <div className="text-center py-8 text-brand-muted">
            <ShoppingBag className="mx-auto mb-2 text-brand-border" size={32} />
            <p className="text-xs">No hay productos registrados en tu base de datos todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-brand-muted">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Producto</th>
                  <th className="py-3 px-2">Categoría</th>
                  <th className="py-3 px-2">SKU</th>
                  <th className="py-3 px-2 text-right">Stock</th>
                  <th className="py-3 px-2 text-right">Precio</th>
                  <th className="py-3 px-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-bg">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-bg">
                    <td className="py-3 px-2 font-semibold text-brand-text">{p.name}</td>
                    <td className="py-3 px-2">{p.category}</td>
                    <td className="py-3 px-2 font-mono text-brand-muted">{p.sku}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-semibold ${p.minStock > 0 && p.stock < p.minStock ? 'text-brand-accent font-bold' : 'text-brand-text'}`}>
                        {p.stock}
                      </span>{" "}
                      / <span className="text-brand-muted">{p.minStock}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-brand-text">${p.price.toFixed(2)}</td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleEliminarProductoDeInventario(p.id!)}
                        className="text-brand-muted hover:text-rose-600 p-1 rounded-lg hover:bg-brand-bg cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
