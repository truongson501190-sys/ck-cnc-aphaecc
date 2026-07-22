import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const frontendCommand = isWindows ? 'pnpm.cmd' : 'pnpm';
const frontendArgs = ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173'];

const pythonCandidates = isWindows
  ? [
      resolve(projectRoot, 'backend_ocr', 'venv', 'Scripts', 'python.exe'),
      resolve(projectRoot, 'backend_ocr', 'venv', 'Scripts', 'python'),
      'python.exe',
      'python',
    ]
  : [
      resolve(projectRoot, 'backend_ocr', 'venv', 'bin', 'python'),
      'python3',
      'python',
    ];

const pythonPath = pythonCandidates.find((candidate) => candidate && (typeof candidate === 'string' ? candidate : existsSync(candidate))) || 'python';
const backendCandidates = [
  resolve(projectRoot, 'backend_ocr', 'server_cors.py'),
  resolve(projectRoot, 'backend_ocr', 'server_cors_fixed.py'),
  resolve(projectRoot, 'backend_ocr', 'server_simple.py'),
  resolve(projectRoot, 'backend_ocr', 'server_final.py'),
];
const backendScript = backendCandidates.find((candidate) => existsSync(candidate));
const backendCwd = resolve(projectRoot, 'backend_ocr');

const frontend = spawn(frontendCommand, frontendArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: isWindows,
});

const backend = spawn(pythonPath, [backendScript], {
  cwd: backendCwd,
  stdio: 'inherit',
  shell: false,
});

const stopAll = (signal) => {
  if (!frontend.killed) frontend.kill(signal);
  if (!backend.killed) backend.kill(signal);
};

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));

frontend.on('exit', (code, signal) => {
  if (!backend.killed) backend.kill(signal || 'SIGTERM');
  process.exit(code ?? 0);
});

backend.on('exit', (code, signal) => {
  if (!frontend.killed) frontend.kill(signal || 'SIGTERM');
  process.exit(code ?? 0);
});
