import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * El menú lateral (escritorio) y el menú "Más" (celular) viven a la vez en el DOM; si repiten
 * un id, las herramientas (y los lectores de pantalla) apuntan al elemento oculto.
 */
describe("ids de navegación únicos", () => {
  const read = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
  const idsOf = (src: string) => [...src.matchAll(/\bid=(?:"([^"]+)"|\{`([^`]+)`\})/g)].map((m) => m[1] ?? m[2]);

  it("AppSidebar y MoreMenuList no comparten ningún id", () => {
    const side = idsOf(read("AppSidebar.tsx")).map((i) => i.replace("${id}", "*"));
    const more = idsOf(read("MoreMenuList.tsx")).map((i) => i.replace("${id}", "*"));
    const sideExpanded = side.flatMap((i) => (i.includes("*") ? ["checklist", "settings", "dashboard", "inventory", "sales", "debts"].map((t) => i.replace("*", t)) : [i]));
    const moreExpanded = more.flatMap((i) => (i.includes("*") ? ["checklist", "settings"].map((t) => i.replace("*", t)) : [i]));
    const shared = sideExpanded.filter((i) => moreExpanded.includes(i));
    expect(shared).toEqual([]);
  });
});
