import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

function getGeminiClient(customKey?: string): GoogleGenAI {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is missing. AI Recommendations will fail.");
  }
  return new GoogleGenAI({
    apiKey: key || "DUMMY_KEY",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: {
    model: string;
    contents: any;
    config?: any;
  },
  customKey?: string
): Promise<any> {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key || key === "DUMMY_KEY") {
    throw new Error("La clave API de Gemini no está configurada. Por favor, asegúrese de que GEMINI_API_KEY esté en las variables de entorno de Vercel.");
  }

  const maxRetries = 3;
  let delay = 1000;
  let lastErrorMsg = "";
  
  const fallbackModels = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
  const modelsToTry = Array.from(new Set([options.model, ...fallbackModels]));

  for (const currentModel of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting content using model ${currentModel} (Attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: options.contents,
          config: options.config
        });
        return response;
      } catch (error: any) {
        const errorMsg = error?.message || (typeof error === "string" ? error : JSON.stringify(error)) || "";
        lastErrorMsg = errorMsg;
        console.warn(`[Gemini API] Attempt ${attempt} with model ${currentModel} failed:`, errorMsg);
        
        const isAuthError = error?.status === 400 || error?.status === 401 || error?.status === 403 || 
                            errorMsg.includes("API key not valid") || 
                            errorMsg.includes("API_KEY_INVALID") || 
                            errorMsg.includes("PERMISSION_DENIED") ||
                            errorMsg.includes("API key");
        if (isAuthError) {
          throw new Error("La clave API de Gemini configurada no es válida o tiene permisos insuficientes.");
        }

        const isNotFound = error?.status === 404 || errorMsg.includes("NOT_FOUND") || errorMsg.includes("not found");
        if (isNotFound) break;

        const isQuotaExhausted = error?.status === 429 && (
          errorMsg.includes("Quota") || errorMsg.includes("quota") ||
          errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("limit")
        );
        if (isQuotaExhausted) break;

        const isTransient = error?.status === 503 || error?.status === 429 ||
                            errorMsg.includes("503") || errorMsg.includes("high demand") ||
                            errorMsg.includes("UNAVAILABLE") || errorMsg.includes("Resource has been exhausted");
        
        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; 
        } else {
          break;
        }
      }
    }
  }
  
  throw new Error(`El servicio de IA no está disponible: ${lastErrorMsg || "Alta demanda"}.`);
}

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
