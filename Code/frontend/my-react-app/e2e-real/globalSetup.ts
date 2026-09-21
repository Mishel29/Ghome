import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = resolve(fileURLToPath(new URL('..', import.meta.url)), '../../backend');
const composeArgs = ['compose', '-p', 'harborstone_e2e', '-f', 'docker-compose.test.yml'];

function docker(args: string[]) {
  return execFileSync('docker', [...composeArgs, ...args], { cwd: backendDir, encoding: 'utf8', stdio: 'pipe' });
}

async function waitForBackend() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4100/readyz');
      if (response.ok) return;
    } catch {
      // The container is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Disposable E2E backend did not become ready.');
}

export default async function globalSetup() {
  try {
    docker(['down', '--volumes', '--remove-orphans']);
    docker(['up', '--build', '--detach']);
    await waitForBackend();
    docker(['exec', '-T', '-e', 'E2E_TEST_MODE=true', 'backend', 'node', 'dist/scripts/seedE2e.js']);
  } catch (error) {
    try { docker(['down', '--volumes', '--remove-orphans']); } catch { /* Preserve the startup error. */ }
    throw error;
  }
}
