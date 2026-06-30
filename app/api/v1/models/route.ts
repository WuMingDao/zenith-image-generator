import { generateImage } from "ai";
import { ImageProvider } from "@/lib/provider";
import { env } from "@/lib/env";

export async function GET() {
  //   const { image } = await generateImage({
  //     model: ImageProvider.imageModel(env.IMAGE_MODEL_ID),
  //     prompt: "A cat wearing sunglasses",
  //   });

  //   return Response.json({ message: "Hello World", data: image });

  const res = await fetch(`${env.IMAGE_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${env.IMAGE_API_KEY}`,
    },
  });
  const data = await res.json();
  return Response.json(data);
}
