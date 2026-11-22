import { describe, expect, it } from "vitest";
import { DEFAULT_WHATSAPP, PLAN, parseLead, priceLabel, subscriptionMessage, subscriptionUrl, trialLabel, whatsappDisplay, whatsappNumber } from "./pricing";

describe("plan y precio", () => {
  it("el precio es un entero positivo en pesos y se muestra con separador de miles", () => {
    expect(Number.isInteger(PLAN.priceCop) && PLAN.priceCop > 0).toBe(true);
    expect(priceLabel()).toBe("$ 29.900");
  });
  it("ofrece 7 días de prueba gratis", () => {
    expect(PLAN.trialDays).toBe(7);
    expect(trialLabel()).toBe("7 días gratis");
  });
  it("el WhatsApp de ventas es +57 304 476 9592 por defecto", () => {
    expect(DEFAULT_WHATSAPP).toBe("573044769592");
    expect(whatsappNumber()).toBe("573044769592");
    expect(whatsappDisplay("573044769592")).toBe("+57 304 476 9592");
  });
});

describe("parseLead (datos que llegan en el enlace)", () => {
  it("lee nombre, negocio y fuente", () => {
    expect(parseLead("?n=Marta&negocio=Tienda%20La%20Esquina&fuente=radar")).toEqual({ name: "Marta", business: "Tienda La Esquina", source: "radar" });
  });
  it("conserva tildes y ñ", () => {
    expect(parseLead("?n=Mar%C3%ADa&negocio=Panader%C3%ADa%20Do%C3%B1a%20Pe%C3%B1a").business).toBe("Panadería Doña Peña");
  });
  it("elimina HTML, scripts y caracteres peligrosos y limita el largo", () => {
    const lead = parseLead("?n=" + encodeURIComponent('<img src=x onerror=alert(1)>Ana') + "&negocio=" + encodeURIComponent("a".repeat(500)));
    expect(lead.name).not.toMatch(/[<>=()]/);
    expect(lead.business.length).toBeLessThanOrEqual(60);
  });
  it("sin parámetros devuelve vacíos", () => {
    expect(parseLead("")).toEqual({ name: "", business: "", source: "" });
  });
});

describe("mensaje y enlace de WhatsApp", () => {
  it("personaliza el mensaje con nombre, negocio, precio y fuente", () => {
    const m = subscriptionMessage({ name: "Marta", business: "La Esquina", source: "radar" });
    expect(m).toContain("Soy Marta de La Esquina");
    expect(m).toContain("$ 29.900 al mes");
    expect(m).toContain("después de la prueba gratis");
    expect(m).toContain("radar");
  });
  it("mensaje genérico si no hay datos", () => {
    expect(subscriptionMessage({ name: "", business: "", source: "" })).toBe("Hola, Quiero suscribirme a Tiendly ($ 29.900 al mes, después de la prueba gratis).");
  });
  it("sin número no hay enlace; con número, se codifica el texto; por defecto usa el de ventas", () => {
    expect(subscriptionUrl({ name: "", business: "", source: "" }, "")).toBeNull();
    expect(subscriptionUrl({ name: "", business: "", source: "" })!.startsWith("https://wa.me/573044769592?text=")).toBe(true);
    const url = subscriptionUrl({ name: "Marta", business: "", source: "" }, "573001234567")!;
    expect(url.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("Soy Marta");
  });
});

import { nequiDisplay, nequiNumber, paidMessage, paidUrl, paymentReference } from "./pricing";

describe("pago por Nequi", () => {
  it("sin la variable de entorno no hay número de Nequi (la sección no aparece)", () => {
    expect(nequiNumber()).toBe("");
  });
  it("da formato legible al número", () => {
    expect(nequiDisplay("3001234567")).toBe("300 123 4567");
  });
  it("la referencia es corta, estable y única por cuenta", () => {
    const a = paymentReference("a1b2c3d4-0000-0000-0000-000000000001");
    expect(a).toBe("TDLY-A1B2C3");
    expect(paymentReference("a1b2c3d4-0000-0000-0000-000000000001")).toBe(a);
    expect(paymentReference("ffffffff-0000-0000-0000-000000000002")).not.toBe(a);
    expect(paymentReference("ab")).toBe("TDLY-AB0000");
  });
  it("el mensaje de 'ya pagué' lleva precio, negocio y referencia, y apunta al WhatsApp de ventas", () => {
    const m = paidMessage("a1b2c3d4-0000", "Tienda de Ana");
    expect(m).toContain("$ 29.900");
    expect(m).toContain("Tienda de Ana");
    expect(m).toContain("TDLY-A1B2C3");
    expect(paidUrl("a1b2c3d4-0000", "Tienda de Ana")!.startsWith("https://wa.me/573044769592?text=")).toBe(true);
  });
});
