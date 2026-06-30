import * as v from "valibot";
import { env } from "@/lib/env";

const responseFormats = ["url", "b64_json"] as const;
const controlModes = ["HED", "CANNY", "DEPTH", "MLSD", "POSE"] as const;

/*
  eg: const arr = ["A", "B"] => string[]
      const arr = ["A", "B"] as const => readonly ["A", "B"] => "A" | "B"
*/

const ZImageTurboSchema = v.object({
  model: v.optional(v.string(), "z-image-turbo"),
  prompt: v.string(),
  negative_prompt: v.optional(v.string(), "blurry ugly bad"),
  num_images_per_prompt: v.optional(v.number(), 1),
  num_inference_steps: v.optional(v.number(), 9),
  seed: v.optional(v.number(), 0),
  guidance_scale: v.optional(v.number(), 1),
  control_image: v.optional(v.string()),
  control_mode: v.optional(v.picklist(controlModes)),
  control_context_scale: v.optional(v.number(), 0.75),
  image_scale: v.optional(v.number(), 1),
  response_format: v.optional(v.picklist(responseFormats), "url"),
});

export async function POST(request: Request) {
  const result = v.safeParse(ZImageTurboSchema, await request.json());

  if (!result.success) {
    return Response.json(
      { error: "Invalid request body", issues: result.issues },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${env.IMAGE_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.IMAGE_API_KEY}`,
      },
      body: JSON.stringify(result.output),
    });

    const data = await res.json();

    // this can provide error
    return Response.json(data, { status: res.status });
  } catch {
    // this network error
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }
}
