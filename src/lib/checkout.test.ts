import { describe, it, expect } from "vitest";
import { findLikelyLinkedDebt } from "./checkout";
import { Debt } from "../types";

function makeDebt(overrides: Partial<Debt>): Debt {
  return {
    id: "d1",
    clientName: "Don Pedro",
    amount: 5000,
    dueDate: "2026-01-01",
    paid: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("findLikelyLinkedDebt", () => {
  it("devuelve undefined si no hay ninguna coincidencia", () => {
    expect(findLikelyLinkedDebt([], "Don Pedro", 5000)).toBeUndefined();
  });

  it("ignora las deudas ya pagadas", () => {
    const debts = [makeDebt({ id: "d1", paid: true })];
    expect(findLikelyLinkedDebt(debts, "Don Pedro", 5000)).toBeUndefined();
  });

  it("ignora coincidencias de otro cliente o monto", () => {
    const debts = [
      makeDebt({ id: "d1", clientName: "Doña Carmen" }),
      makeDebt({ id: "d2", amount: 9999 }),
    ];
    expect(findLikelyLinkedDebt(debts, "Don Pedro", 5000)).toBeUndefined();
  });

  it("cuando hay una sola coincidencia, la devuelve", () => {
    const debts = [makeDebt({ id: "d1" })];
    expect(findLikelyLinkedDebt(debts, "Don Pedro", 5000)?.id).toBe("d1");
  });

  it("cuando hay varias coincidencias (mismo cliente y monto), elige la más reciente", () => {
    const debts = [
      makeDebt({ id: "older", createdAt: "2026-01-01T00:00:00Z" }),
      makeDebt({ id: "newer", createdAt: "2026-01-05T00:00:00Z" }),
      makeDebt({ id: "middle", createdAt: "2026-01-03T00:00:00Z" }),
    ];
    expect(findLikelyLinkedDebt(debts, "Don Pedro", 5000)?.id).toBe("newer");
  });
});
