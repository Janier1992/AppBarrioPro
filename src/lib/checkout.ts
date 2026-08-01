// ======================================================
// Archivo: checkout.ts
// Responsabilidad: Lógica única de registro de venta (POS de Ventas y la
//                   "Venta Rápida" del Panel de Control compartían antes
//                   dos implementaciones separadas que ya habían divergido:
//                   una redondeaba el total y la otra no, y ninguna
//                   actualizaba el stock de los productos en paralelo).
// ======================================================

import { Debt, Product, Sale } from "../types";
import { db } from "./insforge";

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface RegisterSaleParams {
  userId: string;
  cart: CartLine[];
  clientName?: string;
  paymentMethod?: Sale["paymentMethod"];
  dueDate?: string; // Requerido si paymentMethod === "Fiado"
}

/**
 * Registra una venta: crea el registro de venta, la deuda asociada si es
 * Fiado, y descuenta el stock vendido. El stock se actualiza en paralelo
 * (antes se hacía uno por uno, con una espera de red por producto).
 */
export async function registerSale({
  userId,
  cart,
  clientName,
  paymentMethod = "Efectivo",
  dueDate,
}: RegisterSaleParams): Promise<Sale> {
  const rawTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const saleTotal = Number(rawTotal.toFixed(2));

  const saleItems = cart.map((item) => ({
    productId: item.product.id || "",
    name: item.product.name,
    quantity: item.quantity,
    price: item.product.price,
  }));

  const newSale: Omit<Sale, "id"> = {
    items: saleItems,
    total: saleTotal,
    timestamp: new Date().toISOString(),
    clientName: clientName?.trim() || "Consumidor Final",
    paymentMethod,
  };

  const saleId = await db.addSale(userId, newSale);

  if (paymentMethod === "Fiado" && dueDate) {
    try {
      await db.addDebt(userId, {
        clientName: clientName?.trim() || "Cliente Sin Nombre",
        amount: saleTotal,
        dueDate,
        paid: false,
        createdAt: new Date().toISOString(),
      });
    } catch (debtError) {
      console.error("Error al registrar la deuda automáticamente:", debtError);
    }
  }

  await Promise.all(
    cart.map((item) => {
      const finalStock = Math.max(0, item.product.stock - item.quantity);
      return db.updateProduct(userId, item.product.id!, {
        stock: finalStock,
        updatedAt: new Date().toISOString(),
      });
    })
  );

  return { ...newSale, id: saleId };
}

/**
 * Busca la deuda que probablemente corresponde a una venta Fiado, para
 * editarla/eliminarla al cambiar o borrar la venta original.
 *
 * Limitación conocida: las deudas no guardan el id de la venta que las
 * originó (requeriría un cambio de esquema en la base de datos), así que
 * esto sigue siendo una coincidencia por nombre + monto — pero ahora, si
 * hay más de una deuda que coincide (p. ej. el mismo cliente fiando el
 * mismo monto dos veces), se elige la más reciente, que es la que casi
 * siempre corresponde a la venta que se acaba de editar o eliminar.
 */
export function findLikelyLinkedDebt(debts: Debt[], clientName: string | undefined, amount: number): Debt | undefined {
  const candidates = debts.filter(
    (d) => d.clientName === clientName && Math.abs(d.amount - amount) < 0.01 && !d.paid
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, current) =>
    new Date(current.createdAt).getTime() > new Date(latest.createdAt).getTime() ? current : latest
  );
}
