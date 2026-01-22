/**
 * Cloudflare Pages Functions - OpenAI API Handler
 *
 * This file handles all /v1/* routes when deployed to Cloudflare Pages.
 */

import { handle } from 'hono/cloudflare-pages'
import { createApp } from '../../apps/api/src/app'

export interface Env {
  CORS_ORIGINS?: string
}

export const onRequest: PagesFunction<Env> = (context) => {
  const corsOrigins = context.env.CORS_ORIGINS
    ? context.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000']

  const app = createApp({ corsOrigins })
  return handle(app)(context)
}
