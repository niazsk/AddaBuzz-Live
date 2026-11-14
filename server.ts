import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createLiveKitJwt(params: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  roomId: string;
  canPublish: boolean;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: params.apiKey,
      sub: params.identity,
      name: params.name,
      nbf: now - 5,
      exp: now + 3600,
      jti: crypto.randomUUID(),
      video: {
        roomJoin: true,
        room: params.roomId,
        canPublish: params.canPublish,
        canSubscribe: true,
        canPublishData: true,
      },
    })
  );
  const signature = crypto
    .createHmac('sha256', params.apiSecret)
    .update(`${header}.${payload}`)
    .digest();
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    const sfuConfigured = Boolean(
      process.env.OPENVIDU_URL &&
        process.env.LIVEKIT_API_KEY &&
        process.env.LIVEKIT_API_SECRET
    );
    res.json({
      ok: true,
      service: 'addabuzz-live-api',
      sfuConfigured,
      maxGuestSeats: 8,
    });
  });

  app.get('/api/policy/wallet', (_req, res) => {
    res.json({
      currencies: ['COIN', 'DIAMOND'],
      noTopUp: true,
      noRealMoneyPayments: true,
      maxGuestSeats: 8,
    });
  });

  app.post('/api/media/session-token', (req, res) => {
    const { roomId, uid, displayName, role } = req.body ?? {};
    if (
      typeof roomId !== 'string' ||
      !/^[a-zA-Z0-9_-]{3,128}$/.test(roomId) ||
      typeof uid !== 'string' ||
      !/^[a-zA-Z0-9_-]{3,128}$/.test(uid)
    ) {
      res.status(400).json({ error: 'Invalid roomId or uid.' });
      return;
    }

    const safeName =
      typeof displayName === 'string' && displayName.trim().length > 0
        ? displayName.trim().slice(0, 64)
        : uid;
    const safeRole = role === 'host' || role === 'guest' ? role : 'viewer';

    const openviduUrl = process.env.OPENVIDU_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

    if (openviduUrl && apiKey && apiSecret) {
      const token = createLiveKitJwt({
        apiKey,
        apiSecret,
        identity: uid,
        name: safeName,
        roomId,
        canPublish: safeRole === 'host' || safeRole === 'guest',
      });
      res.json({
        mode: 'openvidu',
        url: openviduUrl,
        token,
        role: safeRole,
      });
      return;
    }

    res.json({
      mode: 'local-preview',
      url: null,
      token: null,
      role: safeRole,
      message:
        'OpenVidu 3.x SFU credentials are not configured on the server; using local WebRTC camera/microphone preview with Firestore room synchronization.',
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AddaBuzz Live server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AddaBuzz Live server:', err);
  process.exit(1);
});
