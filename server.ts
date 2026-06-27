import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI client lazy / safely
let aiClient: GoogleGenAI | null = null;
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

app.use(express.json());

// Robust wrapper with automatic retry & fallback strategy to handle high demand (503 / 429) errors gracefully
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
    throw new Error("La clave API de Gemini no está configurada. Por favor, agréguela en Ajustes > Ajustes de Negocio en BarrioPro para activar el asistente de IA.");
  }

  const maxRetries = 3;
  let delay = 1000;
  let lastErrorMsg = "";
  
  // Define fallback models in case the main one is fully unavailable
  const fallbackModels = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
  // Deduplicate models to try
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
        
        // Handle explicit auth/permission issues instantly without useless retries
        const isAuthError = error?.status === 400 || error?.status === 401 || error?.status === 403 || 
                            errorMsg.includes("API key not valid") || 
                            errorMsg.includes("API_KEY_INVALID") || 
                            errorMsg.includes("PERMISSION_DENIED") ||
                            errorMsg.includes("API key");
        if (isAuthError) {
          throw new Error("La clave API de Gemini configurada no es válida o tiene permisos insuficientes. Por favor, verifíquela en el panel Ajustes > Secretos de AI Studio.");
        }

        // Handle model not found (404) instantly to try fallback models
        const isNotFound = error?.status === 404 || errorMsg.includes("NOT_FOUND") || errorMsg.includes("not found");
        if (isNotFound) {
          console.warn(`[Gemini API] Model ${currentModel} not found (404). Trying next fallback model...`);
          break; // Break inner loop to try next model in modelsToTry
        }

        // Check specifically for Quota Exhausted / Resource Exhausted error to switch models instantly
        const isQuotaExhausted = error?.status === 429 && (
          errorMsg.includes("Quota") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("RESOURCE_EXHAUSTED") ||
          errorMsg.includes("limit")
        );

        if (isQuotaExhausted) {
          console.warn(`[Gemini API] Quota exhausted for model ${currentModel}. Breaking inner retry loop to try next fallback model immediately...`);
          break; // Exit the retry loop for this model and proceed to the next model in modelsToTry
        }

        const isTransient = error?.status === 503 || 
                            error?.status === 429 ||
                            errorMsg.includes("503") || 
                            errorMsg.includes("high demand") ||
                            errorMsg.includes("UNAVAILABLE") ||
                            errorMsg.includes("Resource has been exhausted");
        
        if (isTransient && attempt < maxRetries) {
          console.log(`[Gemini API] Waiting ${delay}ms before next retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          break;
        }
      }
    }
  }
  
  throw new Error(`El servicio de Inteligencia Artificial no está disponible actualmente. Detalle del error: ${lastErrorMsg || "Alta demanda en los servidores"}. Por favor, intente de nuevo en unos momentos.`);
}

// API endpoints
app.post("/api/recommendations/reposicion", async (req, res) => {
  try {
    const { products, geminiApiKey } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Debe proveer una lista de productos." });
    }

    const ai = getGeminiClient(geminiApiKey);
    const prompt = `Actúa como un asesor comercial experto para tiendas de barrio de Latinoamérica. 
Analiza este inventario actual y genera recomendaciones específicas de reposición de stock. 
Identifica qué productos urgentes necesitan ser reabastecidos (los que estén por debajo o cerca de su stock mínimo).
Proporciona el resultado en español, con un tono amigable, directo, profesional y humilde.

Inventario de productos:
${JSON.stringify(products, null, 2)}

Por favor, proporciona recomendaciones estructuradas explicando por qué es urgente reponer cada producto crítico y sugiere una cantidad aproximada de reposición basada en su stock mínimo y actual.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    }, geminiApiKey);

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in reposicion:", error);
    res.status(500).json({ error: error.message || "Error al generar recomendaciones de reposición." });
  }
});

app.post("/api/recommendations/promociones", async (req, res) => {
  try {
    const { sales, products, geminiApiKey } = req.body;
    const ai = getGeminiClient(geminiApiKey);

    const prompt = `Actúa como un especialista en marketing de barrio. 
Analiza los productos del inventario y las ventas registradas para sugerir promociones ingeniosas, combos irresistibles o descuentos basados en temporadas/fechas especiales.
Si no hay ventas suficientes registradas, utiliza patrones históricos y de temporadas generales de barrio (ej: combos de desayuno como café con pan, ofertas de fin de semana, o aumentos por épocas festivas como Navidad, Fiestas Patrias, etc.).

Productos disponibles:
${JSON.stringify(products || [], null, 2)}

Ventas recientes:
${JSON.stringify(sales || [], null, 2)}

Proporciona sugerencias prácticas de promociones aplicables para que el tendero las implemente hoy mismo. Escribe en español de forma motivadora y sencilla.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    }, geminiApiKey);

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in promociones:", error);
    res.status(500).json({ error: error.message || "Error al generar recomendaciones de promociones." });
  }
});

// Maps Grounding Endpoint
app.post("/api/grounding/maps", async (req, res) => {
  try {
    const { query, latitude, longitude } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Se requiere un término de búsqueda." });
    }

    const ai = getGeminiClient();
    
    // Construct maps retrieval parameters
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (latitude && longitude) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: Number(latitude),
            longitude: Number(longitude)
          }
        }
      };
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `Busca en Google Maps e infórmame sobre la ubicación, detalles y recomendaciones para: "${query}". 
Escribe una respuesta corta y profesional en español para el dueño de un negocio de barrio que necesita encontrar proveedores, tiendas de insumos o servicios cercanos.`,
      config,
    });

    // Extract grounding chunks as required by the instruction
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      text: response.text,
      groundingChunks: groundingChunks
    });
  } catch (error: any) {
    console.error("Error in maps grounding:", error);
    res.status(500).json({ error: error.message || "Error al buscar ubicaciones en Google Maps." });
  }
});

// Chat Multi-Turn Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, products, sales, geminiApiKey } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Debe proveer el historial de mensajes." });
    }

    const ai = getGeminiClient(geminiApiKey);

    // Map frontend messages format (role: 'user'|'assistant', content) to Gemini (role: 'user'|'model', parts: [{text}])
    const mappedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || m.text || "" }]
    }));

    // Gemini strictly requires that multi-turn chat contents start with a 'user' turn.
    // We filter out any leading model/assistant messages (like the greeting/welcome message).
    let contents = mappedContents;
    while (contents.length > 0 && contents[0].role !== "user") {
      contents = contents.slice(1);
    }

    // If no user messages are left, fallback or prevent empty contents
    if (contents.length === 0) {
      contents = [{ role: "user", parts: [{ text: "Hola" }] }];
    }

    // Construct detailed context of products and sales to guide agentic responses
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
      // We list the 15 most recent sales
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

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: error.message || "Error al procesar el chat con el asistente de IA." });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BarrioPro Server] running on http://localhost:${PORT}`);
  });
}

startServer();
