import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const uiRoot = path.join(repoRoot, 'packages', 'ui');
const srcRoot = path.join(uiRoot, 'src');
const distRoot = path.join(uiRoot, 'dist');

function listFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function getMtime(filePath) {
  return statSync(filePath).mtimeMs;
}

function shouldBuild() {
  if (process.env.FORCE_UI_BUILD === '1') {
    return { build: true, reason: 'FORCE_UI_BUILD=1' };
  }

  const sourceFiles = [
    path.join(uiRoot, 'package.json'),
    path.join(uiRoot, 'tsconfig.json'),
    path.join(uiRoot, 'tsup.config.ts'),
    ...listFiles(srcRoot),
  ].filter(existsSync);

  const outputFiles = listFiles(distRoot);

  if (outputFiles.length === 0) {
    return { build: true, reason: 'dist ausente' };
  }

  const newestSource = Math.max(...sourceFiles.map(getMtime));
  const oldestOutput = Math.min(...outputFiles.map(getMtime));

  if (newestSource > oldestOutput) {
    return { build: true, reason: 'fontes mais novas que dist' };
  }

  return { build: false, reason: 'dist atualizada' };
}

const decision = shouldBuild();

if (!decision.build) {
  console.log(`[predev] Pulando build de @gladpros/ui: ${decision.reason}`);
  process.exit(0);
}

console.log(`[predev] Buildando @gladpros/ui: ${decision.reason}`);
execSync('npm run build -w @gladpros/ui', {
  cwd: repoRoot,
  stdio: 'inherit',
});
