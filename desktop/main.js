const { app, BrowserWindow, Menu, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const API_PORT = 4311;
const WEB_PORT = 4310;
const API_HOST = '127.0.0.1';
const API_URL = `http://${API_HOST}:${API_PORT}/api`;
const WEB_URL = `http://${API_HOST}:${WEB_PORT}`;

let mainWindow = null;
let backendProc = null;
let frontendProc = null;

function resourceRoot() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
}

function nodeExe() {
  const name = process.platform === 'win32' ? 'node.exe' : 'node';
  const bundled = path.join(resourceRoot(), 'node', name);
  return fs.existsSync(bundled) ? bundled : process.execPath;
}

function backendDir() {
  return path.join(resourceRoot(), 'backend');
}

function frontendDir() {
  return path.join(resourceRoot(), 'frontend');
}

function userConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(userConfigPath(), 'utf-8')) || {};
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(userConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}

function isValidMongo(uri) {
  return typeof uri === 'string' && /^mongodb(\+srv)?:\/\/\S+/.test(uri.trim());
}

function ensureJwtSecret(cfg) {
  if (!cfg.jwtSecret) cfg.jwtSecret = crypto.randomBytes(32).toString('hex');
  return cfg;
}

function stopServers() {
  if (backendProc) {
    backendProc.removeAllListeners('exit');
    backendProc.kill();
    backendProc = null;
  }
  if (frontendProc) {
    frontendProc.removeAllListeners('exit');
    frontendProc.kill();
    frontendProc = null;
  }
}

function startBackend(cfg) {
  const env = {
    ...process.env,
    PORT: String(API_PORT),
    MONGODB_URI: cfg.mongodbUri,
    JWT_SECRET: cfg.jwtSecret,
    COMPANY_PROFIT_RATE: String(cfg.companyProfitRate != null ? cfg.companyProfitRate : 0.2),
    CORS_ORIGIN: `http://${API_HOST}:${WEB_PORT}`,
    ASSETS_DIR: path.join(backendDir(), 'assets'),
    NODE_ENV: 'production',
  };
  backendProc = spawn(nodeExe(), [path.join(backendDir(), 'dist', 'index.js')], {
    cwd: backendDir(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backendProc.stdout.on('data', (d) => console.log('[api]', d.toString().trim()));
  backendProc.stderr.on('data', (d) => console.error('[api]', d.toString().trim()));
  backendProc.on('exit', (code) => console.log('[api] exited with code', code));
}

function startFrontend() {
  const env = {
    ...process.env,
    PORT: String(WEB_PORT),
    HOSTNAME: API_HOST,
    NODE_ENV: 'production',
  };
  frontendProc = spawn(nodeExe(), [path.join(frontendDir(), 'server.js')], {
    cwd: frontendDir(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  frontendProc.stdout.on('data', (d) => console.log('[web]', d.toString().trim()));
  frontendProc.stderr.on('data', (d) => console.error('[web]', d.toString().trim()));
  frontendProc.on('exit', (code) => console.log('[web] exited with code', code));
}

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function getJson(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function waitFor(url, attempts, delay) {
  for (let i = 0; i < attempts; i++) {
    if (await ping(url)) return true;
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

async function waitForHealth(attempts, delay) {
  for (let i = 0; i < attempts; i++) {
    const h = await getJson(`http://${API_HOST}:${API_PORT}/api/health`);
    if (h && h.status === 'ok') return h;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

async function waitForDbUp(attempts, delay) {
  for (let i = 0; i < attempts; i++) {
    const h = await getJson(`http://${API_HOST}:${API_PORT}/api/health`);
    if (h && h.status === 'ok' && h.db === 'up') return true;
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

function loadSetup(message) {
  const query = message ? { msg: message } : undefined;
  mainWindow.loadFile(path.join(__dirname, 'setup.html'), query ? { query } : undefined);
}

function loadReconnect(message) {
  mainWindow.loadFile(path.join(__dirname, 'reconnect.html'), message ? { query: { msg: message } } : undefined);
}

function loadLoading(msg) {
  mainWindow.loadFile(path.join(__dirname, 'loading.html'), msg ? { query: { msg } } : undefined);
}

async function startAppFlow() {
  loadLoading('Cargando interfaz…');
  if (!frontendProc) startFrontend();
  const webOk = await waitFor(WEB_URL, 80, 500);
  if (!webOk) {
    stopServers();
    loadReconnect('No se pudo iniciar la interfaz del programa.');
    return;
  }
  mainWindow.loadURL(WEB_URL);
}

async function boot() {
  const cfg = readConfig();
  if (!isValidMongo(cfg.mongodbUri)) {
    loadSetup();
    return;
  }
  ensureJwtSecret(cfg);
  saveConfig(cfg);

  loadLoading('Iniciando servidor local…');
  stopServers();
  startBackend(cfg);

  const health = await waitForHealth(60, 500);
  if (!health) {
    stopServers();
    loadReconnect('No se pudo iniciar el servidor local. Verifica tu conexión a internet.');
    return;
  }

  if (health.db !== 'up') {
    loadReconnect('La base de datos no responde. Reintentando automáticamente…');
    waitForDbUp(60, 2000).then((ok) => {
      if (ok && mainWindow) startAppFlow();
    });
    return;
  }

  await startAppFlow();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0f172a',
    title: 'Tinting-JD',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (/\/pdf(\?|$)/.test(url) || url.includes('/api/')) {
        return { action: 'allow' };
      }
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Configurar conexión…', click: () => loadSetup() },
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('config:get', () => {
  const cfg = readConfig();
  return { mongodbUri: cfg.mongodbUri || '' };
});

ipcMain.handle('config:save', (_event, payload) => {
  const uri = typeof payload?.mongodbUri === 'string' ? payload.mongodbUri.trim() : '';
  if (!isValidMongo(uri)) {
    return { ok: false, error: 'Cadena de conexión inválida. Debe empezar con mongodb:// o mongodb+srv://' };
  }
  const cfg = ensureJwtSecret({ ...readConfig(), mongodbUri: uri });
  saveConfig(cfg);
  boot();
  return { ok: true };
});

ipcMain.handle('app:retry', () => {
  boot();
  return { ok: true };
});

ipcMain.handle('app:configure', () => {
  loadSetup();
  return { ok: true };
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    callback(false);
  });

  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: 'Guardar archivo' });
  });

  buildMenu();
  createMainWindow();
  boot();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  stopServers();
});

app.on('window-all-closed', () => {
  stopServers();
  if (process.platform !== 'darwin') app.quit();
});
