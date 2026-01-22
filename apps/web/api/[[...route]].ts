/**
 * Vercel Edge Functions - API Handler
 *
 * This file handles all /api/* routes when deployed to Vercel.
 * Uses Vercel's Edge Runtime for optimal performance.
 */

import { handle } from 'hono/vercel'
import { createApp } from '../../api/src/app'

// Use Edge Runtime for better performance
export const config = {
  runtime: 'edge',
}

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

const app = createApp({ corsOrigins })

const handler = handle(app)

function stripApiPrefix(req: Request): Request {
  const url = new URL(req.url)
  if (url.pathname === '/api') url.pathname = '/'
  if (url.pathname.startsWith('/api/')) {
    url.pathname = url.pathname.slice('/api'.length)
    if (!url.pathname) url.pathname = '/'
  }
  return new Request(url.toString(), req)
}

export default (req: Request) => handler(stripApiPrefix(req))
