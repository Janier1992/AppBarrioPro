// ======================================================
// Archivo: api/_lib/validation.ts
// Responsabilidad: Esquemas de validación de entrada (zod) para los
//                  endpoints de IA, evitando payloads arbitrariamente
//                  grandes o mal formados llegando a Gemini.
// ======================================================

import { z } from "zod";

const productSchema = z
  .object({
    name: z.string().max(200).optional(),
    stock: z.union([z.number(), z.string()]).optional(),
    minStock: z.union([z.number(), z.string()]).optional(),
    price: z.union([z.number(), z.string()]).optional(),
    category: z.string().max(100).optional(),
  })
  .passthrough();

const saleSchema = z
  .object({
    total: z.union([z.number(), z.string()]).optional(),
    timestamp: z.string().optional(),
    clientName: z.string().max(200).optional(),
    paymentMethod: z.string().max(100).optional(),
    items: z
      .array(z.object({ name: z.string().optional(), quantity: z.union([z.number(), z.string()]).optional(), price: z.union([z.number(), z.string()]).optional() }).passthrough())
      .max(100)
      .optional(),
  })
  .passthrough();

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string().max(4000).optional(),
        text: z.string().max(4000).optional(),
      })
    )
    .min(1)
    .max(60),
  products: z.array(productSchema).max(2000).optional(),
  sales: z.array(saleSchema).max(2000).optional(),
  /** Tipo de negocio elegido por el tendero (texto corto, solo para dar contexto al asistente). */
  businessType: z.string().max(60).optional(),
});
