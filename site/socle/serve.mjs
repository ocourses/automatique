// Serveur de développement : sert le dossier courant sans mise en cache. Le
// navigateur garde sinon d'anciens modules JavaScript, et une page qui importe
// un nom ajouté depuis reste bloquée sur « Chargement… ».
//   npm run serve [port]      (8000 par défaut)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const port = Number(process.argv[2] ?? 8000);

createServer(async (req, res) => {
  const chemin = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const fichier = join(process.cwd(), chemin.endsWith('/') ? `${chemin}index.html` : chemin);
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(contenu);
  } catch {
    res.writeHead(404, { 'Cache-Control': 'no-store' });
    res.end('Introuvable');
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
