/**
 * Custom Next.js server that adds WebSocket support for Twilio Media Streams.
 *
 * Run in development:  pnpm dev
 * Run in production:   NODE_ENV=production pnpm start
 *
 * All normal HTTP requests are handled by Next.js as usual.
 * WebSocket upgrades to /api/voice/stream are routed to handleVoiceStream().
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import { handleVoiceStream } from './lib/voice-stream'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME ?? 'localhost'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? '/', true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Next.js request error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws, req) => {
    handleVoiceStream(ws, req).catch((err) => {
      console.error('[voice] unhandled stream error:', err)
    })
  })

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url ?? '/')
    if (pathname === '/api/voice/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    } else {
      socket.destroy()
    }
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket voice stream: ws://${hostname}:${port}/api/voice/stream`)
  })
})
