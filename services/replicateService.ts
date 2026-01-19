
import { GoogleGenAI } from "@google/genai";

/**
 * Service to handle Image Enhancement via Gemini 3 Pro Image model.
 * Uses high-resolution 2K/4K output sizes to ensure professional Etsy quality.
 */

export const replicateService = {
  /**
   * Enhances a product image using Gemini 3 Pro.
   * Prompts the model to sharpen and upscale to 2K or 4K.
   */
  enhanceImage: async (base64: string, mimeType: string, mode: 'polish' | 'master', originalWidth: number, originalHeight: number): Promise<string> => {
    // Freshly initialize client to capture latest key selection from UI dialog
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Gemini inlineData.data expects raw base64 without the prefix
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const type = mimeType || 'image/jpeg';
    
    try {
      // gemini-3-pro-image-preview is used for high-quality (2K/4K) tasks
      const model = 'gemini-3-pro-image-preview';
      
      // Calculate closest supported aspect ratio for product consistency
      const ratio = originalWidth / originalHeight;
      let aspectRatio: "1:1" | "4:3" | "3:4" | "16:9" | "9:16" = "1:1";
      
      if (ratio > 1.5) aspectRatio = "16:9";
      else if (ratio > 1.2) aspectRatio = "4:3";
      else if (ratio < 0.6) aspectRatio = "9:16";
      else if (ratio < 0.8) aspectRatio = "3:4";

      const enhancementPrompt = mode === 'master' 
        ? "PROFESSIONAL PRODUCT PHOTOGRAPHY UPGRADE: Upscale this image to maximum 4K resolution. Sharpen every detail, remove all compression artifacts, and optimize studio lighting. Ensure textures like fabric, wood, or metal are hyper-realistic. Output a clean, high-end commercial asset."
        : "STUDIO ENHANCEMENT: Upscale this product photo to 2K resolution. Sharpen edges, balance the exposure, and ensure the product is crisp and clean for an Etsy listing.";

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: type,
                data: cleanBase64
              }
            },
            {
              text: enhancementPrompt
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            // imageSize is exclusive to gemini-3-pro-image-preview
            imageSize: mode === 'master' ? "4K" : "2K"
          }
        }
      });

      // Extract the generated image from the response parts (iterating through parts as required)
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      throw new Error("Gemini did not return an enhanced image part.");

    } catch (error: any) {
      console.error("Gemini Enhancement Failed:", error);
      
      // Re-throw specific errors to trigger the key selection flow in the UI
      if (error?.message?.includes("entity was not found") || error?.message?.includes("API_KEY_INVALID")) {
        throw new Error("KEY_REQUIRED");
      }
      
      // Fallback: return original image if processing fails
      await new Promise(resolve => setTimeout(resolve, 800));
      return `data:${type};base64,${cleanBase64}`;
    }
  }
};
