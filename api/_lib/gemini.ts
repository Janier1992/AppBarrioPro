import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(customKey?: string): GoogleGenAI {
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

export async function generateContentWithRetry(
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
          throw new Error("La clave API de Gemini configurada no es válida o tiene permisos insuficientes. Por favor, verifíquela en el panel Ajustes > Secretos de AI Studio.");
        }

        const isNotFound = error?.status === 404 || errorMsg.includes("NOT_FOUND") || errorMsg.includes("not found");
        if (isNotFound) {
          break; 
        }

        const isQuotaExhausted = error?.status === 429 && (
          errorMsg.includes("Quota") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("RESOURCE_EXHAUSTED") ||
          errorMsg.includes("limit")
        );

        if (isQuotaExhausted) {
          break; 
        }

        const isTransient = error?.status === 503 || 
                            error?.status === 429 ||
                            errorMsg.includes("503") || 
                            errorMsg.includes("high demand") ||
                            errorMsg.includes("UNAVAILABLE") ||
                            errorMsg.includes("Resource has been exhausted");
        
        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; 
        } else {
          break;
        }
      }
    }
  }
  
  throw new Error(`El servicio de Inteligencia Artificial no está disponible actualmente. Detalle del error: ${lastErrorMsg || "Alta demanda en los servidores"}. Por favor, intente de nuevo en unos momentos.`);
}
