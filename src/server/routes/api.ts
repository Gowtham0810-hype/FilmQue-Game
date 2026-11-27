import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  BarcodeResponse,
} from '../../shared/api';

// ── Barcode proxy helpers ────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a path that works in BOTH dev and prod:
 *   - Dev:  src/server/routes/api.ts → CWD is filmque/, barcodes at public/barcodes/
 *   - Prod: dist/server/routes/api.js → go up two levels to dist/client/barcodes/
 */
function resolveBarcodesDir(): string {
  // prod path: dist/server/routes → ../../client/barcodes = dist/client/barcodes
  const prodPath = path.resolve(__dirname, '../../client/barcodes');
  if (fs.existsSync(prodPath)) return prodPath;
  // dev path: public/barcodes relative to CWD (filmque/)
  return path.resolve(process.cwd(), 'public', 'barcodes');
}

function resolveManifestPath(): string {
  const prodPath = path.resolve(__dirname, '../../client/barcode-manifest.json');
  if (fs.existsSync(prodPath)) return prodPath;
  return path.resolve(process.cwd(), 'public', 'barcode-manifest.json');
}

const CLIENT_BARCODES_DIR = resolveBarcodesDir();
const MANIFEST_PATH = resolveManifestPath();

/** Load manifest once at module initialisation (file is small, ~4 KB) */
let _manifest: Record<string, string> | null = null;
function getManifest(): Record<string, string> {
  if (!_manifest) {
    try {
      _manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      _manifest = {};
    }
  }
  return _manifest!;
}

/** Deterministic daily movie index – mirrors getDailyMovie() in client storage.ts */
function getTodayMovieId(movieIds: string[]): string {
  const now = new Date();
  const epoch = new Date('2026-01-01T00:00:00').getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.max(0, Math.floor((today - epoch) / (1000 * 60 * 60 * 24)));
  const hash = (diffDays * 9301 + 49297) % 233280;
  const index = hash % movieIds.length;
  return movieIds[index] ?? movieIds[0] ?? '';
}

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

// ── Barcode proxy routes ─────────────────────────────────────────────────────

/**
 * GET /api/barcode/today
 * Returns { type: 'barcode', hash: '<16-char hex>' } for today's movie.
 * Client builds the actual image URL as /api/barcode/<hash>/image
 */
api.get('/barcode/today', async (c) => {
  const manifest = getManifest();
  const movieIds = Object.keys(manifest);
  const todayId = getTodayMovieId(movieIds);
  const hash = manifest[todayId];

  if (!hash) {
    return c.json<ErrorResponse>({ status: 'error', message: 'No barcode for today' }, 404);
  }

  return c.json<BarcodeResponse>({ type: 'barcode', hash });
});

/**
 * GET /api/barcode/:movieId
 * Returns { type: 'barcode', hash: '<16-char hex>' } for a specific movie.
 * Used during dev cycling through movies.
 */
api.get('/barcode/:movieId', async (c) => {
  const movieId = c.req.param('movieId');
  const manifest = getManifest();
  const hash = manifest[movieId];

  if (!hash) {
    return c.json<ErrorResponse>({ status: 'error', message: `No barcode for movie: ${movieId}` }, 404);
  }

  return c.json<BarcodeResponse>({ type: 'barcode', hash });
});

/**
 * GET /api/barcode/:hash/image
 * Streams the actual PNG bytes. The hash is opaque — reveals nothing about the film.
 * Cache-Control: immutable since hash → file content is a 1:1 relationship.
 */
api.get('/barcode/:hash/image', async (c) => {
  const hash = c.req.param('hash');

  // Basic validation: 16 lowercase hex chars
  if (!/^[0-9a-f]{16}$/.test(hash)) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid hash' }, 400);
  }

  const filePath = path.join(CLIENT_BARCODES_DIR, `${hash}.png`);

  if (!fs.existsSync(filePath)) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Barcode not found' }, 404);
  }

  const data = fs.readFileSync(filePath);
  return new Response(data, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
});
