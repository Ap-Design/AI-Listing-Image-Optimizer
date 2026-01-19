
import { GoogleGenAI, Type } from "@google/genai";
import { ProductImage } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const gemini = {
  /**
   * Analyzes a product image to generate Etsy-optimized SEO metadata.
   * Uses Gemini Flash Vision for speed and multimodal capabilities.
   */
  analyzeProduct: async (base64Image: string): Promise<ProductImage['seo']> => {
    try {
      const model = 'gemini-3-flash-preview';
      
      const response = await ai.models.generateContent({
        model,
        config: {
          responseMimeType: "application/json",
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
              text: "Analyze this product image for an Etsy listing. Identify the object, materials, texture, and style. Provide an SEO-friendly title and tags."
            }
          ]
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from Vision AI");
      
      return JSON.parse(text) as ProductImage['seo'];
    } catch (error) {
      console.error("Gemini Vision Analysis Failed:", error);
      throw error;
    }
  }
};
