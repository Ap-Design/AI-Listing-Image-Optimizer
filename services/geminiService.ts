
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
            text: "Identify the product in this image and suggest a professional Etsy-style enhancement prompt. IMPORTANT: 1. The suggested prompt MUST explicitly state to 'Keep the original product subject exactly as it is' and 'Do not alter the main subject\'s shape or design'. 2. Focus on PHOTOREALISM: demand natural textures, visible micro-details, and subtle imperfections. 3. Explicitly forbid plastic, waxy, glossy, CGI, or over-smoothed looks. 4. Request real-world studio lighting. Output ONLY the suggested prompt string."
          }
        ]
      }
    });

    return response.text?.trim() || "Photorealistic studio product photography. Keep the original product subject exactly as it is. Natural textures and subtle imperfections. No waxy or plastic look. Real-world lighting, sharp focus, 8k resolution.";
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
                ? `ACT AS PROFESSIONAL PHOTOGRAPHER. STRICT REQUIREMENT: Keep the original product subject exactly as it is. Do not alter the main subject's shape or design. 
                   GOAL: Photorealistic output with natural textures and visible micro-details. 
                   AVOID: Any plastic, waxy, glossy, CGI, or over-smoothed surfaces. 
                   LIGHTING: Real-world studio lighting with subtle imperfections.
                   PROMPT: ${prompt}. 
                   RENDER: 2K high-fidelity, zero background noise.`
                : `Transform this product image based on this prompt: ${prompt}. 
                   STRICT REQUIREMENT: Keep the original product subject exactly as it is. 
                   STYLE: Photorealistic, natural texture, micro-details. Avoid waxy or plastic looks. 
                   Only modify background and quality.`
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
