import React from "react";
import { Package, ArrowUpDown, AlertCircle, MinusCircle, PlusCircle, Edit2, Trash2 } from "lucide-react";
import { Product } from "../types";
import { isCriticalStock, criticalStockThreshold } from "../lib/stock";

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
    <div className="rounded-2xl border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
        <h3 className="font-semibold text-brand-text text-[15px]">Productos ({sortedProducts.length})</h3>
        <span className="text-xs text-brand-muted">Toca una columna para ordenar</span>
      </div>

      {sortedProducts.length === 0 ? (
        <div className="text-center py-12 text-brand-muted">
          <Package className="mx-auto mb-3 text-brand-border" size={40} />
          <p className="text-sm font-medium text-brand-text">No se encontraron productos</p>
          <p className="text-xs mt-1">Prueba cambiando los filtros o agrega un nuevo producto para comenzar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-brand-muted">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-xs font-medium">
                <th onClick={() => handleAlternarOrdenamiento("name")} className="py-3.5 px-4 cursor-pointer hover:text-brand-text select-none">
                  <span className="flex items-center gap-1">
                    Producto
                    <ArrowUpDown size={12} className="text-brand-muted" />
                  </span>
                </th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Código</th>
                <th onClick={() => handleAlternarOrdenamiento("stock")} className="py-3.5 px-4 text-right cursor-pointer hover:text-brand-text select-none">
                  <span className="flex items-center justify-end gap-1">
                    Stock
                    <ArrowUpDown size={12} className="text-brand-muted" />
                  </span>
                </th>
                <th className="py-3.5 px-4 text-right">Costo</th>
                <th onClick={() => handleAlternarOrdenamiento("price")} className="py-3.5 px-4 text-right cursor-pointer hover:text-brand-text select-none">
                  <span className="flex items-center justify-end gap-1">
                    Precio
                    <ArrowUpDown size={12} className="text-brand-muted" />
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">Ajuste</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((p) => {
                const isStockBajo = isCriticalStock(p);
                return (
                  <tr 
                    key={p.id} 
                    className="transition-colors border-b border-[#F3F2EE] hover:bg-brand-bg"
                  >
                    <td className="py-4 px-4 font-medium text-brand-text">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        {isStockBajo && (
                          <span className="text-xs text-[#A24A16] font-medium flex items-center gap-1 mt-0.5">
                            <AlertCircle size={12} />
                            Stock crítico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-brand-muted">{p.category}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-brand-muted">{p.sku}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-semibold tabular-nums ${isStockBajo ? "text-[#A24A16]" : "text-brand-text"}`}>
                        {p.stock}
                      </span>{" "}
                      / <span className="text-brand-muted" title="Umbral de stock crítico">{Math.round(criticalStockThreshold(p.minStock))}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-brand-muted">
                      ${p.cost !== undefined ? p.cost.toFixed(2) : "0.00"}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-brand-text">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
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
                    <td className="py-4 px-4">
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
