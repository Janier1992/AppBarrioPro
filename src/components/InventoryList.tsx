// ======================================================
// Archivo: src/components/InventoryList.tsx
// Responsabilidad: Lista de productos para celular (ver el detalle en el comentario del componente).
// ======================================================

import { Product } from "../types";
import { isCriticalStock } from "../lib/stock";
import { formatMoney } from "../lib/format";

interface InventoryListProps {
  products: Product[];
  /** Abre la edición del producto (ahí se ajusta el stock). */
  onRestock: (product: Product) => void;
}

/**
 * Lista de productos para móvil: una fila por producto, con "Quedan N" en naranja
 * cuando se acaba y un solo botón de acción. La tabla completa queda para pantallas grandes.
 */
export default function InventoryList({ products, onRestock }: InventoryListProps) {
  if (products.length === 0) {
    return (
      <div className="py-14 text-center space-y-1">
        <p className="text-base font-medium text-brand-text">No hay productos</p>
        <p className="text-sm text-brand-muted">Prueba otro filtro o agrega un producto nuevo.</p>
      </div>
    );
  }

  return (
    <ul>
      {products.map((p) => {
        const low = isCriticalStock(p);
        return (
          <li key={p.id} className="flex items-center justify-between gap-3 min-h-[72px] border-b border-brand-border">
            <div className="min-w-0 space-y-1.5">
              <p className="text-base font-medium truncate">{p.name}</p>
              <p className="flex items-center gap-2">
                {low ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF1E8] text-[#A24A16]">Quedan {p.stock}</span>
                ) : (
                  <span className="text-xs text-brand-muted">{p.stock} en stock</span>
                )}
                <span className="text-[13px] text-brand-muted">{formatMoney(p.price)}</span>
              </p>
            </div>
            <button
              onClick={() => onRestock(p)}
              aria-label={`Reponer ${p.name}`}
              className="shrink-0 h-11 px-4 rounded-full border border-[#E2E1DB] bg-white text-sm font-medium hover:bg-brand-bg cursor-pointer"
            >
              + Reponer
            </button>
          </li>
        );
      })}
    </ul>
  );
}
