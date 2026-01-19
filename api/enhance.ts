
/**
 * BACKEND API ROUTE (e.g., Next.js Pages Router or Node.js Express handler)
 * Path: /api/enhance
 */
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, target_scale = 2 } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Image is required" });
  }

  try {
    // Determine scale based on logic if not strictly provided, 
    // though the frontend service sends explicit scale.
    // Logic: If user wants "Master", we assume scale 4. 
    
    // Real-ESRGAN Model
    // nightmare-ai/real-esrgan:f121d640fb3810163010c578d97402857a79654d
    const output = await replicate.run(
      "nightmare-ai/real-esrgan:f121d640fb3810163010c578d97402857a79654d",
      {
        input: {
          image: image, // Accepts URL or Base64 Data URI
          scale: target_scale,
          face_enhance: false, // Critical for products to avoid "human skin" smoothing on textures
        },
      }
    );

    // Replicate returns the output URL
    return res.status(200).json({ outputUrl: output });

  } catch (error) {
    console.error("Replicate API Error:", error);
    return res.status(500).json({ error: "Enhancement failed", details: error.message });
  }
}
