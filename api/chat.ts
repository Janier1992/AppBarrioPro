import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, generateContentWithRetry } from './_lib/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, products, sales, geminiApiKey } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Debe proveer el historial de mensajes." });
    }

    const ai = getGeminiClient(geminiApiKey);

    const mappedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || m.text || "" }]
    }));

    let contents = mappedContents;
    while (contents.length > 0 && contents[0].role !== "user") {
      contents = contents.slice(1);
    }

    if (contents.length === 0) {
      contents = [{ role: "user", parts: [{ text: "Hola" }] }];
    }

    let storeContext = "";
    if (products && Array.isArray(products) && products.length > 0) {
      storeContext += "\n--- INVENTARIO DE LA TIENDA ---\n";
      products.forEach((p: any) => {
        const minStk = p.minStock !== undefined ? p.minStock : 5;
        storeContext += `- ${p.name}: Stock actual: ${p.stock}, Stock mínimo sugerido: ${minStk}, Precio de venta: $${p.price}, Categoría: ${p.category || 'General'}\n`;
      });
    } else {
      storeContext += "\nNo hay productos registrados en el inventario de esta tienda actualmente.\n";
    }

    if (sales && Array.isArray(sales) && sales.length > 0) {
      storeContext += "\n--- HISTORIAL DE VENTAS RECIENTES ---\n";
      sales.slice(-15).forEach((s: any, idx: number) => {
        const itemsStr = s.items?.map((it: any) => `${it.name} (Cant: ${it.quantity}, Precio: $${it.price})`).join(", ") || "";
        const formattedDate = s.timestamp ? s.timestamp.substring(0, 10) : 'N/A';
        storeContext += `- Venta #${idx + 1} (${formattedDate}): Total: $${s.total}, Cliente: ${s.clientName || 'Consumidor Final'}, Productos: [${itemsStr}], Método de pago: ${s.paymentMethod || 'Efectivo'}\n`;
      });
    } else {
      storeContext += "\nNo hay transacciones ni ventas registradas todavía.\n";
    }

    const systemInstruction = 
      "Actúa como BarrioPro AI, asesor de tiendas de barrio en Latinoamérica. " +
      "Responde en español, de forma MUY BREVE y directa (máximo 3-5 líneas o 3 viñetas). " +
      "Sé amigable pero conciso. Usa viñetas solo cuando sea estrictamente necesario para listar pasos o ítems. " +
      "Nunca escribas párrafos largos. Si la respuesta es simple, responde en 1-2 oraciones. " +
      "Tienes acceso a los datos reales de inventario y ventas de la tienda del usuario. " +
      "Si el usuario pregunta algo sobre sus datos, usa la información provista. " +
      "Si la tienda no tiene datos aún, indícalo en una sola frase.\n\n" +
      "Datos actuales de la tienda:\n" +
      storeContext;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    }, geminiApiKey);

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Error in chat endpoint:", error);
    return res.status(500).json({ error: error.message || "Error al procesar el chat con el asistente de IA." });
  }
}
