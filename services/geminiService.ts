
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
            text: "Analyze the product in this image. Suggest a professional Etsy-style environment prompt. CRITICAL RULES: 1. Use the instruction: 'PRESERVE THE PRODUCT AS A LOCKED ASSET'. 2. Explicitly forbid modifying the product's shape, color, branding, or texture. 3. Focus the prompt purely on the environment, lighting, and camera settings. 4. Forbid adding extra objects that touch or overlap the product. 5. Demand 'Pixel-perfect silhouette preservation'. Output ONLY the suggested prompt string."
          }
        ]
      }
    });

    return response.text?.trim() || "Clean studio setting, soft natural lighting, high resolution, preserve product exactly.";
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
                ? `TASK: ADVANCED PRODUCT IMAGE EDITING. 
                   SUBJECT PRESERVATION: The product in the input image is a LOCKED ASSET. Do not change its shape, scale, texture, labels, or geometry. 
                   ZERO HALLUCINATION POLICY: Do not add extra limbs, parts, or random objects overlapping the product. 
                   ENVIRONMENT MODIFICATION: ${prompt}. 
                   RENDER: 2K ultra-high-fidelity, realistic studio lighting, sharp focus on the product, clean background.`
                : `STRICT PRODUCT PRESERVATION: Keep the central subject exactly as it appears in the original photo. 
                   DO NOT ALTER: Shape, texture, colors, or fine details of the product.
                   MODIFICATION: Only update the background and lighting according to: ${prompt}.
                   STYLE: Photorealistic, no CGI artifacts.`
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
