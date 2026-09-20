// One place to launch Chromium for every script that renders the map: the
// e2e suite, the visual checks, the print run, the screenshot helpers.
//
// The remote Claude Code container ships a Chromium at /opt/pw-browsers and
// asks us not to download another; GitHub Actions and a laptop install one
// with `npx playwright install chromium`. PLAYWRIGHT_CHROMIUM overrides both.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const PRESET = '/opt/pw-browsers/chromium';

export function launch(options = {}) {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync(PRESET) ? PRESET : undefined);
  return chromium.launch({ executablePath, ...options });
}

/** Where the built app is being served for a script run. */
export const BASE = process.env.E2E_BASE || 'http://localhost:4310';
