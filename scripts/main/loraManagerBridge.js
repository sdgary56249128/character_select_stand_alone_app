// Receives LoRAs from ComfyUI-Lora-Manager ("傳送到 SAA") and forwards them to the LoRA slots
import http from 'node:http';

const CAT = '[LoraManagerBridge]';
const PORT = 51029;
const ALLOWED_ORIGINS = new Set(['http://127.0.0.1:8188', 'http://localhost:8188']);

export function setupLoraManagerBridge(mainWindow) {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    if (req.method !== 'POST' || req.url !== '/add-lora' || (origin && !ALLOWED_ORIGINS.has(origin))) {
      res.writeHead(404).end();
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400).end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        return;
      }
      if (typeof data.name !== 'string' || !data.name || mainWindow.isDestroyed()) {
        res.writeHead(400).end(JSON.stringify({ success: false, error: 'Missing LoRA name' }));
        return;
      }
      mainWindow.webContents.send('lora-manager-add-lora', data.name, Number(data.strength) || 1, Number(data.clipStrength) || 1);
      res.end(JSON.stringify({ success: true }));
    });
  });

  server.on('error', (err) => console.error(CAT, `Failed to listen on 127.0.0.1:${PORT}`, err.message));
  server.listen(PORT, '127.0.0.1', () => console.log(CAT, `Listening on 127.0.0.1:${PORT}`));
  mainWindow.on('closed', () => server.close());
}
