import { describe, expect, it } from "vitest";
import { buildPendientes } from "./pendientes";
import { Debt, Product, Task } from "../types";

const today = new Date("2026-11-19T12:00:00");

const product = (over: Partial<Product>): Product => ({
  id: "p1", name: "Arroz", sku: "A", category: "Abarrotes", stock: 20, minStock: 10, price: 1, cost: 1, updatedAt: "", ...over,
});
const debt = (over: Partial<Debt>): Debt => ({
  id: "d1", clientName: "Marta", amount: 42000, dueDate: "2026-11-25", paid: false, createdAt: "", ...over,
});
const task = (over: Partial<Task>): Task => ({ id: "t1", text: "Cuadrar caja", completed: false, createdAt: "", ...over });

describe("buildPendientes", () => {
  it("devuelve lista vacía cuando no hay nada pendiente", () => {
    expect(buildPendientes({ products: [product({})], debts: [], tasks: [], today })).toEqual([]);
  });

  it("ordena: fiado vencido, stock crítico, fiado por vencer, tarea", () => {
    const result = buildPendientes({
      products: [product({ id: "p1", name: "Arroz", stock: 2, minStock: 10 })],
      debts: [
        debt({ id: "d-futuro", clientName: "Luis", dueDate: "2026-12-01" }),
        debt({ id: "d-vencido", clientName: "Ana", dueDate: "2026-11-10" }),
      ],
      tasks: [task({})],
      today,
    });
    expect(result.map((p) => p.id)).toEqual(["debt:d-vencido", "stock:p1", "debt:d-futuro", "task:t1"]);
    expect(result[0].urgent).toBe(true);
    expect(result[0].detail).toContain("vencido");
    expect(result[2].urgent).toBe(false);
  });

  it("ignora fiados pagados y tareas completadas", () => {
    const result = buildPendientes({
      products: [],
      debts: [debt({ paid: true })],
      tasks: [task({ completed: true })],
      today,
    });
    expect(result).toHaveLength(0);
  });

  it("pone primero el producto más agotado (menor stock/mínimo)", () => {
    const result = buildPendientes({
      products: [
        product({ id: "a", name: "A", stock: 3, minStock: 10 }),
        product({ id: "b", name: "B", stock: 0, minStock: 10 }),
      ],
      debts: [],
      tasks: [],
      today,
    });
    expect(result.map((p) => p.id)).toEqual(["stock:b", "stock:a"]);
  });

  it("respeta el límite", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task({ id: `t${i}`, text: `Tarea ${i}` }));
    expect(buildPendientes({ products: [], debts: [], tasks, limit: 3, today })).toHaveLength(3);
  });

  it("muestra el monto sin decimales", () => {
    const [first] = buildPendientes({ products: [], debts: [debt({ amount: 42000 })], tasks: [], today });
    expect(first.detail).toBe("Te debe $ 42.000");
  });
});
