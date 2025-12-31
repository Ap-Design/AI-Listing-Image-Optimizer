
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProcessingModel } from "../types";

export class GeminiService {
  /**
   * Analyzes an image to suggest a high-quality product prompt
   */
  async suggestPrompt(base64Image: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Identify the product in this image and suggest a professional Etsy-style enhancement prompt. The prompt should focus on removing background clutter, placing the product in a clean studio environment (like white or soft marble), improving lighting, and making it look premium. Output ONLY the suggested prompt string."
          }
        ]
      }
    });

    return response.text?.trim() || "Professional studio product photography, clean white background, soft cinematic lighting, 8k resolution, high detail.";
  }

  /**
   * Processes a single image with a prompt to generate a new optimized version
   * In Pro mode, uses gemini-3-pro-image-preview at 2K resolution to meet Etsy's 2000px minimum.
   */
  async processImage(base64Image: string, prompt: string, model: ProcessingModel): Promise<string | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPro = model === ProcessingModel.PRO;
    
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            },
            {
              text: isPro 
                ? `ACT AS PRODUCT IMAGE OPTIMIZER. Transform this image using 2K high-fidelity rendering. Prompt: ${prompt}. Ensure zero background noise, 8k textures on the product, and professional Etsy-ready studio lighting.`
                : `Transform this product image based on this prompt: ${prompt}. Ensure the product itself remains recognizable but the background and quality are significantly improved.`
            }
          ]
        },
        config: {
          imageConfig: isPro ? {
            aspectRatio: "1:1",
            imageSize: "2K"
          } : {
            aspectRatio: "1:1"
          }
        }
      });

      if (!response.candidates?.[0]?.content?.parts) return null;

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      return null;
    } catch (error) {
      console.error("Image processing error:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
