const { app, dialog, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OWNER = 'davidprogamer316-jpg';
const REPO = 'Administration-JD';
const RELEASES_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const USER_AGENT = 'Tinting-JD-Desktop';

function parseVersion(value) {
  return String(value || '')
    .replace(/^v/i, '')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
}

function isNewer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

function headerValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' } });
    let body = '';
    request.on('response', (response) => {
      if (response.statusCode === 404) {
        resolve(null);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => {
        body += chunk.toString();
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

function download(url, destination, onProgress) {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, headers: { 'User-Agent': USER_AGENT } });
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const total = parseInt(headerValue(response.headers['content-length']) || '0', 10);
      let received = 0;
      const file = fs.createWriteStream(destination);
      response.on('data', (chunk) => {
        received += chunk.length;
        file.write(chunk);
        if (onProgress) onProgress(total > 0 ? received / total : 0);
      });
      response.on('end', () => file.end());
      file.on('finish', () => resolve());
      file.on('error', reject);
    });
    request.on('error', reject);
    request.end();
  });
}

function findInstaller(release) {
  const assets = release.assets || [];
  return (
    assets.find((asset) => /\.exe$/i.test(asset.name) && /setup/i.test(asset.name)) ||
    assets.find((asset) => /\.exe$/i.test(asset.name)) ||
    null
  );
}

async function checkForUpdates(mainWindow) {
  if (!app.isPackaged) {
    await dialog.showMessageBox({
      type: 'info',
      message: 'Las actualizaciones solo están disponibles en la versión instalada.',
    });
    return;
  }

  const currentVersion = app.getVersion();

  let release;
  try {
    release = await fetchJson(RELEASES_URL);
  } catch {
    await dialog.showMessageBox({
      type: 'error',
      message: 'No se pudo comprobar si hay actualizaciones.',
      detail: 'Revisa tu conexión a internet e inténtalo de nuevo.',
    });
    return;
  }

  const latestVersion = release ? release.tag_name || release.name || '' : '';
  if (!latestVersion) {
    await dialog.showMessageBox({
      type: 'info',
      message: 'Aún no hay actualizaciones publicadas.',
    });
    return;
  }
  if (!isNewer(latestVersion, currentVersion)) {
    await dialog.showMessageBox({
      type: 'info',
      message: `Ya tienes la última versión (v${currentVersion}).`,
    });
    return;
  }

  const installer = findInstaller(release);
  if (!installer) {
    await dialog.showMessageBox({
      type: 'error',
      message: 'La nueva versión no incluye un instalador para Windows.',
    });
    return;
  }

  const sizeMb = installer.size ? Math.round(installer.size / 1024 / 1024) : null;
  const confirm = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Descargar e instalar', 'Cancelar'],
    defaultId: 0,
    cancelId: 1,
    message: `Hay una nueva versión disponible (${latestVersion}).`,
    detail: `Tienes la v${currentVersion}.${
      sizeMb ? ` La descarga es de aproximadamente ${sizeMb} MB.` : ''
    } El programa se cerrará para instalar la actualización.`,
  });
  if (confirm.response !== 0) return;

  const destination = path.join(app.getPath('temp'), installer.name);
  try {
    if (mainWindow) mainWindow.setProgressBar(0);
    await download(installer.browser_download_url, destination, (fraction) => {
      if (mainWindow) mainWindow.setProgressBar(fraction);
    });
    if (mainWindow) mainWindow.setProgressBar(-1);
  } catch (error) {
    if (mainWindow) mainWindow.setProgressBar(-1);
    await dialog.showMessageBox({
      type: 'error',
      message: 'No se pudo descargar la actualización.',
      detail: String(error && error.message ? error.message : error),
    });
    return;
  }

  const proceed = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Instalar ahora', 'Más tarde'],
    defaultId: 0,
    cancelId: 1,
    message: 'Actualización descargada.',
    detail: 'El programa se cerrará y se abrirá el instalador. Al terminar, se volverá a abrir automáticamente.',
  });
  if (proceed.response !== 0) return;

  try {
    spawn(destination, [], { detached: true, stdio: 'ignore' }).unref();
  } catch (error) {
    await dialog.showMessageBox({
      type: 'error',
      message: 'No se pudo ejecutar el instalador.',
      detail: String(error && error.message ? error.message : error),
    });
    return;
  }

  app.quit();
}

module.exports = { checkForUpdates, isNewer, parseVersion };
