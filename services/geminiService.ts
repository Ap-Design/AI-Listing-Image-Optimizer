
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductImage } from "../types";

// Utility for retrying API calls with exponential backoff.
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2500): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = 
        err.status === 503 || 
        err.status === 429 || 
        err.message?.toLowerCase().includes("overloaded") ||
        err.message?.toLowerCase().includes("unavailable");

      if (isRetryable && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini Vision busy (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const gemini = {
  /**
   * Analyzes a product image to generate Etsy-optimized SEO metadata.
   */
  analyzeProduct: async (base64Image: string): Promise<ProductImage['seo']> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const model = 'gemini-3-flash-preview';
      
      const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model,
        config: {
          responseMimeType: "application/json",
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
          ],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "SEO optimized product title for Etsy (max 140 chars)" },
              tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5-7 relevant search tags" },
              category: { type: Type.STRING, description: "Best fit Etsy category" },
              visualDescription: { type: Type.STRING, description: "Brief visual description of textures and materials" }
            },
            required: ["title", "tags", "category", "visualDescription"]
          }
        },
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: "Analyze this product image for an Etsy listing. Identify the object, materials, and style. Provide JSON metadata."
            }
          ]
        }
      }));

      const text = response.text;
      
      if (!text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
          throw new Error("Vision Analysis blocked: Image triggered safety filters.");
        }
        throw new Error(`Vision AI returned empty response (Reason: ${finishReason || 'Unknown'})`);
      }
      
      try {
        return JSON.parse(text) as ProductImage['seo'];
      } catch (parseErr) {
        console.error("Failed to parse Gemini JSON:", text);
        throw new Error("Vision AI returned invalid data format.");
      }
    } catch (error) {
      console.error("Gemini Vision Analysis Failed:", error);
      throw error;
    }
  }
};
