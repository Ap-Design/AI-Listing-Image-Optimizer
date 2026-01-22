
import { fal } from "@fal-ai/client";

/**
 * Pure AI Asset Service using Fal.ai
 * Optimized for high-fidelity super-resolution upscaling.
 */
export const upscaleService = {
  /**
   * Enhances a product image using super-resolution (ESRGAN).
   * Targets Etsy's 2048px standard.
   */
  enhanceImage: async (
    base64: string, 
    mimeType: string, 
    originalWidth: number
  ): Promise<{ url: string, scale: number }> => {
    // Determine required upscale factor to hit at least 2048px (Etsy Standard)
    let upscaleFactor = 2;
    if (originalWidth * 2 < 2048) {
      upscaleFactor = 4;
    }

    // Ensure we have a valid data URI
    const dataUri = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
    const FAL_KEY = "bb38832c-9b32-43ea-8523-5f10db6de935:2efe2bc2838b51e937dc1304a5b611fc";
    
    try {
      if (typeof (fal as any).config === 'function') {
        (fal as any).config({ credentials: FAL_KEY });
      }
    } catch (e) {
      console.warn("Fal config failed, attempting to proceed", e);
    }

    try {
      let currentImageUrl = dataUri;

      // Pre-upload large images to Fal storage for stability
      if (base64.length > 512 * 1024) { // > 0.5MB
        console.log("Image is large, pre-uploading to Fal storage...");
        try {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          currentImageUrl = await fal.storage.upload(blob);
        } catch (uploadError) {
          console.error("Fal Storage Upload Error:", uploadError);
        }
      }

      // Super-Resolution Upscaling (ESRGAN)
      // Using .subscribe() instead of .run() for better handling of async jobs
      console.log(`Upscaling ${upscaleFactor}x via ESRGAN...`);
      const result: any = await fal.subscribe("fal-ai/esrgan", {
        input: {
          image_url: currentImageUrl,
          upscale_factor: upscaleFactor
        },
        onQueueUpdate: (update) => {
          console.log("Queue Update:", update.status);
        }
      });

      // Aggressive Result Extraction
      // Fal models can return results in several different formats depending on deployment.
      // Now including the 'data' wrapper observed in user errors.
      const finalUrl = 
        result?.data?.image?.url || 
        result?.image?.url || 
        (Array.isArray(result?.data?.images) && result.data.images[0]?.url) ||
        (Array.isArray(result?.images) && result.images[0]?.url) ||
        result?.data?.url ||
        result?.url || 
        result?.output_url ||
        result?.image_url ||
        (typeof result === 'string' && result.startsWith('http') ? result : null);

      if (!finalUrl) {
        console.error("Unexpected Fal.ai Response Structure:", JSON.stringify(result, null, 2));
        throw new Error("The AI service completed but the result format was unrecognized. See console for details.");
      }

      return {
        url: finalUrl,
        scale: upscaleFactor
      };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Internal processing error";
      console.error("Detailed Processing Error:", error);
      throw new Error(`AI processing failed: ${errorMessage}`);
    }
  }
};
