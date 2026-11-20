// Leonida Trophy Guide — packaging entrypoint (Node 22, standard library only).
//
// The guide itself is the app/ folder beside this file: plain static files
// (index.html, style.css, app.js, data/trophies.json) with no build step,
// opened straight in a browser and fetching nothing at run time beyond its
// own data file. It is a checklist and platinum roadmap for the 55
// PlayStation 5 trophies of Grand Theft Auto VI: progress ticks, per-trophy
// counters and personal notes in localStorage, kind/grade/spoiler filtering,
// a per-trophy guide with unlock timing, pitfalls and cited sources, a
// roadmap with per-stage progress, a platinum plan, a next-up planner view,
// and an export/import of the reader's progress (notes included).
//
// This program's job is only to hand that folder in. It copies app/ and
// screenshots/ into the output directory and writes dossier.json there with
// buildDossier from vendor/makefun-frontend.ts — a file that must stay
// byte-identical to the kit's, because the scorer accepts the dossier only
// if it matches, byte for byte, what its own copy of the library writes.
//
// Try the guide locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps below are the competition's own limits. text_max_bytes is the one
// that shapes the dossier's bytes; the rest make this program refuse, up
// front, anything the scorer would refuse anyway: over 4 screenshots or one
// screenshot past 256 KiB, or an app/ tree past 993 files and directories or
// 48 MiB — app/ also shares the output directory's own 1000-entry budget
// with screenshots/ and dossier.json.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
