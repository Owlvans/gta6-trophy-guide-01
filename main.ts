// Leonida Trophy Guide — hand-in program for gta6-trophy-guide-01.
// Written for this entry (Node 22, standard library only). It assembles the
// submission: the static guide in app/ and the maker's screenshots in
// screenshots/ are copied to the output directory, and dossier.json is
// written there with the vendored make.fun library, exactly as the scorer
// will rebuild it. Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the gate: the text cap shapes the dossier bytes; the rest make
// this program refuse anything the scorer would refuse anyway (over 4
// screenshots, a screenshot over 256 KiB, or an oversized app/ tree).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
