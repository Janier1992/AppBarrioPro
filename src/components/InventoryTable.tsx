import React from "react";
import { Layers, Package, ArrowUpDown, Tag, AlertCircle, MinusCircle, PlusCircle, Edit2, Trash2 } from "lucide-react";
import { Product } from "../types";

interface InventoryTableProps {
  sortedProducts: Product[];
  umbralCritico: number;
  sortBy: "name" | "stock" | "price";
  sortOrder: "asc" | "desc";
  handleAlternarOrdenamiento: (field: "name" | "stock" | "price") => void;
  handleAjustarStockRapido: (p: Product, amount: number) => void;
  handleCargarDatosEdicion: (p: Product) => void;
  handleEliminarProductoDeInventario: (id: string) => void;
}

export default function InventoryTable({
  sortedProducts,
  umbralCritico,
  sortBy,
  sortOrder,
  handleAlternarOrdenamiento,
  handleAjustarStockRapido,
  handleCargarDatosEdicion,
  handleEliminarProductoDeInventario
}: InventoryTableProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
        <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
          <Layers size={18} className="text-brand-primary" />
          Productos Registrados ({sortedProducts.length})
        </h3>
        <span className="text-[11px] text-brand-muted font-medium">Click en columnas para ordenar</span>
      </div>

      {sortedProducts.length === 0 ? (
        <div className="text-center py-12 text-brand-muted">
          <Package className="mx-auto mb-3 text-brand-border" size={40} />
          <p className="text-sm font-medium text-brand-text">No se encontraron productos</p>
          <p className="text-xs mt-1">Prueba cambiando los filtros o agrega un nuevo producto para comenzar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-brand-muted">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted font-bold uppercase tracking-wider bg-brand-bg/40">
                <th onClick={() => handleAlternarOrdenamiento("name")} className="py-3 px-3 cursor-pointer hover:text-brand-text select-none rounded-l-xl">
                  <span className="flex items-center gap-1">
                    Producto
                    <ArrowUpDown size={12} className="text-brand-muted" />
                  </span>
                </th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 font-mono">SKU</th>
                <th onClick={() => handleAlternarOrdenamiento("stock")} className="py-3 px-3 text-right cursor-pointer hover:text-brand-text select-none">
                  <span className="flex items-center justify-end gap-1">
                    Stock / Alerta
                    <ArrowUpDown size={12} className="text-brand-muted" />
                  </span>
                </th>
                <th className="py-3 px-3 text-right">Costo Unit.</th>
                <th onClick={() => handleAlternarOrdenamiento("price")} className="py-3 px-3 text-right cursor-pointer hover:text-brand-text select-none">
                  <span className="flex items-center justify-end gap-1">
                    P. Venta
                    <ArrowUpDown size={12} className="text-brand-muted" />
                  </span>
                </th>
                <th className="py-3 px-3 text-center">Ajuste Rápido</th>
                <th className="py-3 px-3 text-center rounded-r-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-bg">
              {sortedProducts.map((p) => {
                const isStockBajo = p.stock <= (p.minStock * 0.15);
                return (
                  <tr 
                    key={p.id} 
                    className={`transition-colors border-b border-brand-border ${
                      isStockBajo 
                        ? "bg-amber-50/50 hover:bg-amber-100/40 border-l-4 border-l-amber-500" 
                        : "hover:bg-brand-bg"
                    }`}
                  >
                    <td className="py-3.5 px-3 font-semibold text-brand-text">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        {isStockBajo && (
                          <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 mt-0.5 animate-pulse">
                            <AlertCircle size={10} className="text-amber-600" />
                            Stock Crítico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-bg border border-brand-border text-brand-text">
                        <Tag size={10} className="text-brand-primary" />
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-brand-muted">{p.sku}</td>
                    <td className="py-3.5 px-3 text-right">
                      <span className={`font-bold text-sm ${isStockBajo ? "text-amber-700 font-extrabold" : "text-brand-text"}`}>
                        {p.stock}
                      </span>{" "}
                      / <span className="text-brand-muted" title="Umbral de stock crítico">{Math.round(p.minStock * 0.15)}</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium text-brand-muted">
                      ${p.cost !== undefined ? p.cost.toFixed(2) : "0.00"}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-brand-text">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          onClick={() => handleAjustarStockRapido(p, -1)}
                          className="text-brand-muted hover:text-rose-600 p-1 transition-transform active:scale-90 cursor-pointer"
                          title="Descontar 1 de stock"
                        >
                          <MinusCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleAjustarStockRapido(p, 1)}
                          className="text-brand-muted hover:text-brand-primary p-1 transition-transform active:scale-90 cursor-pointer"
                          title="Aumentar 1 de stock"
                        >
                          <PlusCircle size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCargarDatosEdicion(p)}
                          className="text-brand-muted hover:text-brand-primary p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
                          title="Editar producto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleEliminarProductoDeInventario(p.id!)}
                          className="text-brand-muted hover:text-rose-600 p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
                          title="Eliminar producto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
