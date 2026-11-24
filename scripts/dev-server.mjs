// Local demo server. Serves the repo so demo/ can load dist/, and accepts
// POST /__save?name=x.pdf so a test run can drop the PDF it made into .tmp/
// for inspection. Development only; nothing here ships.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, basename } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const port = Number(process.env.PORT) || 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'POST' && url.pathname === '/__save') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const name = basename(url.searchParams.get('name') || 'out.pdf');
      await mkdir(join(root, '.tmp'), { recursive: true });
      await writeFile(join(root, '.tmp', name), Buffer.concat(chunks));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ saved: `.tmp/${name}` }));
      return;
    }
    let path = normalize(decodeURIComponent(url.pathname));
    // Same shape as the GitHub Pages site: demos at /demo/, library at /dist/.
    if (path === '/' || path === '/demo') {
      res.writeHead(302, { location: '/demo/' });
      res.end();
      return;
    }
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, () => console.log(`pdfbot demo on http://localhost:${port}`));
