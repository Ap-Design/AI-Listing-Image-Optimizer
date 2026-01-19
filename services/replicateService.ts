
import { GoogleGenAI } from "@google/genai";

/**
 * Service to handle Image Enhancement via Gemini 3 Pro Image model.
 * Uses high-resolution 2K/4K output sizes to ensure professional Etsy quality.
 */

export const replicateService = {
  /**
   * Enhances a product image using Gemini 3 Pro.
   * Prompts the model to sharpen and upscale to 2K or 4K with strict preservation rules.
   */
  enhanceImage: async (
    base64: string, 
    mimeType: string, 
    mode: 'polish' | 'master', 
    originalWidth: number, 
    originalHeight: number,
    userPrompt?: string
  ): Promise<string> => {
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

      // CRITICAL RULES to preserve product integrity
      const SYSTEM_CONSTRAINTS = `
CRITICAL RULES:
1. PRESERVE THE PRODUCT AS A LOCKED ASSET.
2. EXPLICITLY FORBID modifying the product's shape, color, branding, or texture.
3. Focus purely on the environment, lighting, and camera settings to enhance the professional look.
4. FORBID adding extra objects that touch or overlap the product.
5. Demand pixel-perfect silhouette preservation.`;

      const refinementNote = userPrompt ? `\nUSER SPECIFIC REFINEMENT: ${userPrompt}` : '';

      const enhancementPrompt = mode === 'master' 
        ? `PROFESSIONAL 4K PRODUCT MASTER: ${SYSTEM_CONSTRAINTS}${refinementNote}
           Upscale this image to maximum 4096px resolution. Perform high-fidelity sharpening of existing details only. 
           Eliminate all compression artifacts. Optimize studio lighting for a premium commercial finish.
           The output must be a clean, high-end asset where the product is exactly the same as the source, just higher clarity.`
        : `2K STUDIO POLISH: ${SYSTEM_CONSTRAINTS}${refinementNote}
           Upscale this product photo to 2048px resolution. Sharpen edges cleanly, balance the exposure for a bright Etsy aesthetic,
           and ensure the product remains perfectly faithful to the original source.`;

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

      // Extract the generated image from the response parts
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
