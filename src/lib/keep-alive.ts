// Keep-alive script for Render deployment
// This prevents the service from spinning down on free tier

const RENDER_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const PING_INTERVAL = 14 * 60 * 1000 // 14 minutes (before 15-minute timeout)

async function keepAlive() {
    try {
        const response = await fetch(`${RENDER_URL}/api/health`)
        const data = await response.json()
        console.log(`[Keep-Alive] Ping successful at ${data.timestamp}`)
    } catch (error) {
        console.error('[Keep-Alive] Ping failed:', error)
    }
}

// Only run in production
if (process.env.NODE_ENV === 'production') {
    console.log('[Keep-Alive] Starting keep-alive service...')
    setInterval(keepAlive, PING_INTERVAL)

    // Initial ping
    keepAlive()
}

export { }
