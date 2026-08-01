import { Product } from "../types";

/** Fracción del stock mínimo por debajo de la cual un producto se considera en stock crítico ("regla del 30%"). */
export const CRITICAL_STOCK_RATIO = 0.3;

export function criticalStockThreshold(minStock: number): number {
  return minStock * CRITICAL_STOCK_RATIO;
}

export function isCriticalStock(product: Pick<Product, "stock" | "minStock">): boolean {
  return Number(product.stock) <= criticalStockThreshold(product.minStock);
}

export function filterCriticalStock<T extends Pick<Product, "stock" | "minStock">>(products: T[]): T[] {
  return products.filter(isCriticalStock);
}
