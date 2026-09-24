// One place to launch Chromium for every script that renders the map: the
// e2e suite, the visual checks, the print run, the screenshot helpers.
//
// The remote Claude Code container ships a Chromium at /opt/pw-browsers and
// asks us not to download another; GitHub Actions and a laptop install one
// with `npx playwright install chromium`. PLAYWRIGHT_CHROMIUM overrides both.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const PRESET = '/opt/pw-browsers/chromium';

// No script run ever reaches the analytics service: the map's own Umami
// tracker (src/analytics.js) would otherwise be fetched by every render, from
// CI and from laptops. The host resolves nowhere, so the script fails to load
// the way it does behind a content blocker. The analytics checks in e2e.mjs
// answer it with page.route, which is served before any lookup.
const NO_ANALYTICS = '--host-resolver-rules=MAP cloud.umami.is ~NOTFOUND';

export function launch(options = {}) {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync(PRESET) ? PRESET : undefined);
  return chromium.launch({ executablePath, ...options, args: [NO_ANALYTICS, ...(options.args || [])] });
}

/** Where the built app is being served for a script run. */
export const BASE = process.env.E2E_BASE || 'http://localhost:4310';
