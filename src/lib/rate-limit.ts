import { NextResponse } from "next/server"

type RateLimitOptions = {
  key: string
  windowMs: number
  maxRequests: number
  message?: string
}

type Bucket = {
  count: number
  resetAt: number
}

const globalForRateLimit = globalThis as unknown as {
  __akRateLimitBuckets?: Map<string, Bucket>
}

const buckets = globalForRateLimit.__akRateLimitBuckets ?? new Map<string, Bucket>()
globalForRateLimit.__akRateLimitBuckets = buckets

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const hasRedisRateLimit = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

function tooManyRequestsResponse(message: string, retryAfterSec: number) {
  return NextResponse.json(
    { message },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  )
}

async function checkRedisRateLimit(options: RateLimitOptions) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  const redisKey = `ratelimit:${options.key}`
  const windowSec = Math.max(1, Math.ceil(options.windowMs / 1000))

  // Lua script for atomic increment + ttl set + remaining ttl fetch.
  const luaScript = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local maxReq = tonumber(ARGV[2])
local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, window)
end
local ttl = redis.call("TTL", key)
if ttl < 0 then
  ttl = window
end
if current > maxReq then
  return {0, ttl, current}
end
return {1, ttl, current}
`

  const response = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      "EVAL",
      luaScript,
      "1",
      redisKey,
      String(windowSec),
      String(options.maxRequests),
    ]),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Rate limit backend unavailable: ${response.status}`)
  }

  const data = (await response.json()) as { result?: [number, number, number] }
  const result = data.result
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error("Invalid rate limit backend response")
  }

  const allowed = Number(result[0]) === 1
  const ttlSec = Math.max(1, Number(result[1]) || 1)
  if (!allowed) {
    return {
      ok: false as const,
      response: tooManyRequestsResponse(
        options.message ?? "Too many requests. Please try again later.",
        ttlSec
      ),
    }
  }

  return { ok: true as const }
}

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    return xff.split(",")[0]?.trim() || "unknown"
  }
  const cfIp = req.headers.get("cf-connecting-ip")
  if (cfIp) {
    return cfIp.trim()
  }
  return "unknown"
}

export async function checkRateLimit(options: RateLimitOptions) {
  if (hasRedisRateLimit) {
    try {
      const redisResult = await checkRedisRateLimit(options)
      if (redisResult) {
        return redisResult
      }
    } catch {
      // Fail open to local limiter so auth/public routes stay available.
    }
  }

  const now = Date.now()
  const current = buckets.get(options.key)
  if (!current || current.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs })
    return { ok: true as const }
  }

  if (current.count >= options.maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return {
      ok: false as const,
      response: tooManyRequestsResponse(
        options.message ?? "Too many requests. Please try again later.",
        retryAfterSec
      ),
    }
  }

  current.count += 1
  buckets.set(options.key, current)
  return { ok: true as const }
}
