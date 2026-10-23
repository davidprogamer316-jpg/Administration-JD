import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopDir, '..');
const backendDirSrc = path.join(repoRoot, 'backend');
const frontendDirSrc = path.join(repoRoot, 'frontend');
const resourcesDir = path.join(desktopDir, 'resources');

const API_PORT = 4311;
const API_URL = `http://127.0.0.1:${API_PORT}/api`;

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (res.status !== 0) {
    console.error(`Command failed (${res.status}): ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Missing source directory: ${src}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Building Tinting-JD desktop resources…');

rmrf(resourcesDir);
fs.mkdirSync(resourcesDir, { recursive: true });

// ── Backend ──────────────────────────────────────────────
run('npm', ['run', 'build'], { cwd: backendDirSrc });

const backendOut = path.join(resourcesDir, 'backend');
fs.mkdirSync(backendOut, { recursive: true });
copyDir(path.join(backendDirSrc, 'dist'), path.join(backendOut, 'dist'));
copyDir(path.join(backendDirSrc, 'assets'), path.join(backendOut, 'assets'));
fs.copyFileSync(path.join(backendDirSrc, 'package.json'), path.join(backendOut, 'package.json'));
const backendLock = path.join(backendDirSrc, 'package-lock.json');
if (fs.existsSync(backendLock)) {
  fs.copyFileSync(backendLock, path.join(backendOut, 'package-lock.json'));
}
const backendHasLock = fs.existsSync(path.join(backendOut, 'package-lock.json'));
run(
  'npm',
  backendHasLock
    ? ['ci', '--omit=dev', '--no-audit', '--no-fund']
    : ['install', '--omit=dev', '--no-audit', '--no-fund'],
  { cwd: backendOut }
);

// ── Frontend ─────────────────────────────────────────────
run('npm', ['run', 'build'], {
  cwd: frontendDirSrc,
  env: { ...process.env, DESKTOP_BUILD: 'true', NEXT_PUBLIC_API_URL: API_URL },
});

const standalone = path.join(frontendDirSrc, '.next', 'standalone');
const frontendOut = path.join(resourcesDir, 'frontend');
copyDir(standalone, frontendOut);
copyDir(path.join(frontendDirSrc, '.next', 'static'), path.join(frontendOut, '.next', 'static'));
const publicSrc = path.join(frontendDirSrc, 'public');
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(frontendOut, 'public'));
}

// ── Node runtime ─────────────────────────────────────────
const nodeOut = path.join(resourcesDir, 'node');
fs.mkdirSync(nodeOut, { recursive: true });
const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
fs.copyFileSync(process.execPath, path.join(nodeOut, nodeName));

console.log('\nResources ready at:', resourcesDir);
