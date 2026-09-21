import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function globalTeardown() {
  execFileSync('docker', ['compose', '-p', 'harborstone_e2e', '-f', 'docker-compose.test.yml', 'down', '--volumes', '--remove-orphans'], {
    cwd: resolve(fileURLToPath(new URL('..', import.meta.url)), '../../backend'),
    stdio: 'inherit',
  });
}
