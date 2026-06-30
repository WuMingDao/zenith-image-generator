import * as v from "valibot";

const envSchema = v.object({
  IMAGE_BASE_URL: v.pipe(
    v.string(),
    v.url(),
    v.nonEmpty("IMAGE_BASE_URL is required"),
  ),
  IMAGE_API_KEY: v.pipe(v.string(), v.nonEmpty("IMAGE_API_KEY is required")),
  IMAGE_MODEL_ID: v.pipe(v.string(), v.nonEmpty("IMAGE_MODEL_ID is required")),
});

export const env = v.parse(envSchema, process.env);
