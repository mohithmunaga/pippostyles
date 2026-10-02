// ==========================================================================
// K95 GALLERY LOCAL DEV & IPHONE SYNC SERVER
// Serves static files on 0.0.0.0:3000 (accessible on PC and iPhone on local Wi-Fi)
// Provides /api/upload for direct iPhone photos upload, SSE for live sync, and IP discovery.
// ==========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const UPLOAD_DIR = path.join(ROOT_DIR, 'assets', 'images');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Connected SSE clients for live gallery updates
const sseClients = new Set();

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function broadcastEvent(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // ============================================================
  // STRICT SECURITY: Only the owner (localhost) can remove or manage anything.
  // All public tunnel visitors and external visitors are strictly view-only.
  // ============================================================
  const clientIp = req.socket.remoteAddress || '';
  const host = (req.headers.host || '').toLowerCase();
  const isTunnel = Boolean(
    req.headers['cf-connecting-ip'] ||
    req.headers['cf-ray'] ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-localtunnel-host'] ||
    host.includes('trycloudflare.com') ||
    host.includes('loca.lt')
  );
  const isOwner = !isTunnel && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1');

  const deletePaths = ['/api/cards/delete', '/api/cards/clear'];
  const isDeletePath = deletePaths.includes(pathname);
  const isUploadPath = pathname === '/api/upload' || pathname === '/upload' || pathname === '/upload/' || pathname === '/upload.html';

  if ((isDeletePath || isUploadPath) && !isOwner) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Access denied: Only the site owner can remove or modify items.' }));
    return;
  }

  if (pathname === '/favicon.ico') {
    const favPath = path.join(ROOT_DIR, 'assets', 'r2', 'Logo_MM.svg');
    if (fs.existsSync(favPath)) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(fs.readFileSync(favPath));
      return;
    }
    res.writeHead(204);
    res.end();
    return;
  }

const CARDS_FILE = path.join(ROOT_DIR, 'cards.json');

function loadCardsFromDisk() {
  try {
    if (fs.existsSync(CARDS_FILE)) {
      return JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveCardsToDisk(cards) {
  try {
    fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), 'utf8');
  } catch (e) {}
}

  // 1. API: Get Local IP and Network Info
  if (pathname === '/api/ip') {
    const ip = getLocalIp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ip: ip,
      port: PORT,
      uploadUrl: `http://${ip}:${PORT}/upload`,
      homeUrl: `http://${ip}:${PORT}/`
    }));
    return;
  }

  // 2. API: Server-Sent Events (SSE) for Real-Time Sync
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 3. API: Get All Uploaded Cards
  if (pathname === '/api/cards' && req.method === 'GET') {
    const cards = loadCardsFromDisk();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: cards.length, cards }));
    return;
  }

  // 4. API: Update / Rename a Card
  if (pathname === '/api/cards/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id, title, category, note } = JSON.parse(body);
        const cards = loadCardsFromDisk();
        const card = cards.find(c => c.id === id || c.slug === id);
        if (card) {
          if (title !== undefined) card.title = title;
          if (category !== undefined) {
            card.category = category;
            card.categories = [category];
          }
          if (note !== undefined) card.note = note;
          saveCardsToDisk(cards);
          broadcastEvent('cards-updated', { cards });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, card, cards }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Card not found' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 5. API: Delete a Card
  if (pathname === '/api/cards/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        let cards = loadCardsFromDisk();
        cards = cards.filter(c => c.id !== id && c.slug !== id);
        saveCardsToDisk(cards);
        broadcastEvent('cards-updated', { cards });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, cards }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 6. API: Clear All Cards
  if (pathname === '/api/cards/clear' && req.method === 'POST') {
    saveCardsToDisk([]);
    broadcastEvent('cards-cleared', { cards: [] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: 0, cards: [] }));
    return;
  }

  // 7. API: Direct iPhone / Mobile Photo Upload Endpoint
  if (pathname === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Max 200MB limit per request
      if (body.length > 200 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { images, title, note, year } = payload;
        const imageList = images || (payload.dataUrl ? [{ dataUrl: payload.dataUrl, name: payload.name, title: payload.title }] : []);
        const currentCards = loadCardsFromDisk();
        const results = [];

        for (let i = 0; i < imageList.length; i++) {
          const item = imageList[i];
          const dataUrl = item.dataUrl || item;
          if (!dataUrl || !dataUrl.includes('base64,')) continue;

          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) continue;

          const ext = matches[1].split('/')[1] || 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const cleanExt = ext === 'jpeg' ? 'jpg' : ext.replace('+xml', '');
          const filename = `pic_${Date.now()}_${i + 1}.${cleanExt}`;
          const filePath = path.join(UPLOAD_DIR, filename);

          fs.writeFileSync(filePath, buffer);

          const relativeUrl = `/assets/images/${filename}`;
          const cardNum = currentCards.length + results.length + 1;
          const cardTitle = item.title || title || `pic${cardNum}`;
          const cardNote = item.note || note || 'just another moment.';
          const cardYear = item.year || year || String(new Date().getFullYear());

          const newCard = {
            id: `card-${Date.now()}-${cardNum}`,
            slug: `pic-${cardNum}-${Date.now()}`,
            title: cardTitle,
            client: 'Palak Silawat',
            note: cardNote,
            year: cardYear,
            image: relativeUrl,
            imageSmall: relativeUrl,
            cover: relativeUrl,
            category: 'Moments',
            categories: ['Moments'],
            aspectRatio: '3:4'
          };

          results.push(newCard);
        }

        if (results.length > 0) {
          const updatedCards = [...currentCards, ...results];
          saveCardsToDisk(updatedCards);
          broadcastEvent('new-cards', { cards: results, allCards: updatedCards });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: results.length, cards: results, allCards: loadCardsFromDisk() }));
      } catch (err) {
        console.error('[Upload Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. Mobile Upload Web Page Routing: /upload or /upload.html
  if (pathname === '/upload' || pathname === '/upload/') {
    pathname = '/upload.html';
  }

  // 5. Standalone Intro & Logo Animation Showcase: /intro or /logo-animation
  if (pathname === '/intro' || pathname === '/intro/' || pathname === '/logo-animation') {
    pathname = '/intro.html';
  }

  // 6. Interactive 3D Gallery: /gallery
  if (pathname === '/gallery' || pathname === '/gallery/') {
    pathname = '/gallery.html';
  }

  let filePath;
  if (pathname === '/intro.html') {
    filePath = path.join(ROOT_DIR, 'intro.html');
  } else if (pathname === '/gallery.html' || pathname === '/' || pathname === '') {
    filePath = path.join(ROOT_DIR, 'gallery.html');
  } else if (pathname === '/upload.html') {
    filePath = path.join(ROOT_DIR, 'upload.html');
  } else if (
    pathname.startsWith('/works') ||
    pathname.startsWith('/studio') ||
    pathname.startsWith('/contacts') ||
    pathname.startsWith('/projects') ||
    !path.extname(pathname)
  ) {
    filePath = path.join(ROOT_DIR, 'gallery.html');
  } else {
    filePath = path.join(ROOT_DIR, pathname.startsWith('/') ? pathname.slice(1) : pathname);
  }

  // Serve static file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
  });
});

// Dedicated Server for Pippostyles Intro Animation on Port 3001
const INTRO_PORT = 3001;
const introServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (pathname === '/' || pathname === '' || pathname === '/intro' || !path.extname(pathname)) {
    pathname = '/intro.html';
  }
  const filePath = path.join(ROOT_DIR, pathname.startsWith('/') ? pathname.slice(1) : pathname);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
  });
});

server.on('error', (e) => {
  console.error('[Gallery Server Error]', e);
});

introServer.on('error', (e) => {
  console.error('[Intro Server Error]', e);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🚀 MM Gallery & 3D Archive Server Running!`);
  console.log(`💻 Gallery (PC):     http://localhost:${PORT}`);
  console.log(`📱 Gallery (Mobile): http://${localIp}:${PORT}`);
  console.log(`📱 Upload (Mobile):  http://${localIp}:${PORT}/upload`);
  console.log(`======================================================\n`);
});

if (!process.env.PORT) {
  introServer.listen(INTRO_PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`======================================================`);
    console.log(`🎬 Pippostyles Intro Animation Server Running!`);
    console.log(`💻 Intro (PC):     http://localhost:${INTRO_PORT}`);
    console.log(`📱 Intro (Mobile): http://${localIp}:${INTRO_PORT}`);
    console.log(`======================================================\n`);
  });
}

