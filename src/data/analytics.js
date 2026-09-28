// Analytics settings, in one place. CLAUDE.md, "Analytics", explains what is
// counted and why; src/analytics.js is the only code that reads this.
//
// Umami Cloud, free Hobby plan (decided 9/24): no cookies, no personal data, no
// banner. `websiteId` is Umami's public site ID, from the tracker snippet in
// the Umami dashboard -- public by design, fine to commit.
//
// TO TURN ANALYTICS OFF: set `websiteId: ''`. Nothing loads, no request leaves
// the page, and every track() call does nothing. The map works the same.
//
// `domains` is where visits count: Umami ignores the script everywhere else,
// so Vercel previews and a laptop running `npm run dev` never add to the
// numbers. It is the host of the locked map URL, not a second copy of it.
import { FESTIVAL } from './festival.js';

export const ANALYTICS = {
  websiteId: 'd1661229-5250-4887-929e-b34715a44b4e',
  src: 'https://cloud.umami.is/script.js',
  domains: new URL(FESTIVAL.mapUrl).hostname,
};
