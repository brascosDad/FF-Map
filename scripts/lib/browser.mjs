// One place to launch Chromium for every script that renders the map: the
// e2e suite, the visual checks, the print run, the screenshot helpers.
//
// The remote Claude Code container ships a Chromium at /opt/pw-browsers and
// asks us not to download another; GitHub Actions and a laptop install one
// with `npx playwright install chromium`. PLAYWRIGHT_CHROMIUM overrides both.
import { existsSync } from 'node:fs';
import { chromium, webkit } from 'playwright';

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

/**
 * Launch one engine for the device matrix (scripts/lib/devices.mjs).
 * 'chromium' is launch() above. 'webkit' is Playwright's own WebKit (iPhone
 * Safari, and iPhone Chrome, which is WebKit underneath): CI installs it
 * (ci.yml); where it is not installed -- the remote Claude Code container,
 * which ships Chromium only -- this returns null off CI, so the caller can
 * say it skipped, and throws on CI, where a missing engine is a failure.
 */
export async function launchEngine(name) {
  if (name === 'chromium') return launch();
  if (name !== 'webkit') throw new Error(`unknown engine ${name}`);
  if (!existsSync(webkit.executablePath())) {
    if (process.env.CI) throw new Error('WebKit is not installed: npx playwright install --with-deps webkit');
    return null;
  }
  return webkit.launch();
}

/** A page for a device-matrix profile. WebKit takes no Chromium host rules, so
 *  the analytics service is blocked here per page, for both engines alike. */
export async function newDevicePage(browser, contextOptions) {
  const p = await browser.newPage(contextOptions);
  await p.route('**/cloud.umami.is/**', (r) => r.abort());
  return p;
}
