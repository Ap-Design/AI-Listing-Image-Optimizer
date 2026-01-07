
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProcessingModel } from "../types";

export class GeminiService {
  /**
   * Analyzes an image to suggest a high-quality product prompt
   */
  async suggestPrompt(base64Image: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
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
              text: "Analyze the product in this image. Suggest a professional Etsy-style environment prompt. CRITICAL RULES: 1. Use the instruction: 'PRESERVE THE PRODUCT AS A LOCKED ASSET'. 2. Explicitly forbid modifying the product's shape, color, branding, or texture. 3. Focus the prompt purely on the environment, lighting, and camera settings. Output ONLY the suggested prompt string."
            }
          ]
        }
      });

      return response.text?.trim() || "Clean studio setting, soft natural lighting, high resolution, preserve product exactly.";
    } catch (err) {
      console.error("Analysis suggestion failed:", err);
      return "Clean studio setting, soft natural lighting, high resolution, preserve product exactly.";
    }
  }

  /**
   * Processes an image. 
   * 'draft' mode uses Flash (1K)
   * 'finalize' mode uses Pro (4K) with quality injection
   */
  async processImage(base64Image: string, prompt: string, mode: 'draft' | 'finalize'): Promise<string | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isFinal = mode === 'finalize';
    const model = isFinal ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    // Quality injection for Etsy Finalization
    const finalPrompt = isFinal 
      ? `ETSY MASTERPIECE FINALIZATION: ${prompt}. High-resolution 4K professional product photography, hyper-realistic textures, sharp focus, cinematic studio lighting, commercial grade quality.`
      : prompt;

    // SDK Rules: 
    // - imageSize is ONLY available for gemini-3-pro-image-preview
    // - Let's use defaults for flash model to be safe and avoid 400 errors
    const config: any = {};
    
    if (isFinal) {
      config.imageConfig = {
        aspectRatio: "1:1",
        imageSize: "4K"
      };
    } else {
      // Draft mode - use minimal config to avoid potential picky argument validation
      config.imageConfig = {
        aspectRatio: "1:1"
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: `STRICT PRODUCT PRESERVATION: The product is a LOCKED ASSET. Do not change its shape or design. 
                     ENVIRONMENT: ${finalPrompt}. 
                     RENDER: ${isFinal ? '4K Ultra High Definition' : 'Standard Quality Draft'}.`
            }
          ]
        },
        config: config
      });

      if (!response.candidates?.[0]?.content?.parts) {
        console.warn(`No content parts returned for ${mode} processing.`);
        return null;
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      return null;
    } catch (error: any) {
      console.error(`Gemini Image ${mode} processing error:`, error);
      // Log more detailed error if possible
      if (error && typeof error === 'object') {
        try {
          console.error("Error Details:", JSON.stringify(error));
        } catch (e) {}
      }
      throw error;
    }
  }
}

export const gemini = new GeminiService();
