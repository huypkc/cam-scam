#!/usr/bin/env node
// THE COMPOUND — local static server for the browser interface. Zero dependencies, binds 127.0.0.1 only (never a
// public deploy). Serves /src (engine + web) and /content (JSON) from the project root; nothing else.
//   node src/server.mjs            → http://127.0.0.1:8787/
//   PORT=9000 node src/server.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const ALLOWED = ['/src/', '/content/'];

export function startServer(port = PORT, host = '127.0.0.1') {
  const server = createServer(async (req, res) => {
    try {
      let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      // the page lives at /src/web/ so that its relative imports (./app.mjs → ../engine/…, ../../content/) resolve inside the allowed roots
      if (url === '/' || url === '/index.html') { res.writeHead(302, { location: '/src/web/index.html' }); return res.end(); }
      if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (!ALLOWED.some((p) => url.startsWith(p)) || url.includes('..')) { res.writeHead(404); return res.end('not found'); }
      const file = normalize(join(ROOT, url));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      if (!s.isFile()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(file));
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500); res.end(e.code === 'ENOENT' ? 'not found' : 'error');
    }
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer().then((s) => { const a = s.address(); console.log(`THE COMPOUND — http://${a.address}:${a.port}/   (Ctrl+C to stop)`); });
}
