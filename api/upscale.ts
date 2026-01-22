
import * as fal from "@fal-ai/client";

/**
 * BACKEND API ROUTE
 * Path: /api/upscale
 * Handles secure communication with Fal.ai using the FAL_KEY.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image_url, original_width } = req.body;

  if (!image_url) {
    return res.status(400).json({ error: "Image data is required" });
  }

  const apiKey = process.env.FAL_KEY || "bb38832c-9b32-43ea-8523-5f10db6de935:2efe2bc2838b51e937dc1304a5b611fc";

  try {
    const inputWidth = original_width || 1024;
    let upscaleFactor = 2;
    if (inputWidth * 2 < 2048) {
      upscaleFactor = 4;
    }

    const falClient = (fal as any).fal || fal;
    
    if (typeof falClient.config === 'function') {
      falClient.config({ credentials: apiKey });
    }

    // Use subscribe for consistency with frontend service improvements
    const result: any = await falClient.subscribe("fal-ai/esrgan", {
      input: {
        image_url: image_url,
        upscale_factor: upscaleFactor
      },
    });

    const finalUrl = 
      result?.data?.image?.url || 
      result?.image?.url || 
      (Array.isArray(result?.data?.images) && result.data.images[0]?.url) ||
      (Array.isArray(result?.images) && result.images[0]?.url) ||
      result?.data?.url ||
      result?.url || 
      result?.output_url ||
      result?.image_url;

    if (!finalUrl) {
      return res.status(500).json({ 
        error: "AI service returned invalid response format", 
        details: result 
      });
    }

    return res.status(200).json({ output_url: finalUrl });

  } catch (error: any) {
    console.error("Fal.ai Backend Error:", error);
    return res.status(500).json({ 
      error: "AI Sharpening failed", 
      details: error.message 
    });
  }
}
