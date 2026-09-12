# Brice font files go here

`Brice` (Atipo Foundry) is the display face for the map's title lockup — the
same one the Fall Fest site and its favicon use.

## Current state

`--font-display` is declared as `'Brice', 'Manrope', system-ui`. **Brice's files
are not in this repo**, so anyone without Brice installed locally — which is
every visitor to the live site — sees the Manrope fallback. If the masthead
looks like Brice on your own machine, that is your system copy, not the site's.

## Dropping them in

1. Copy the `.otf` (or `.woff2`, better) weights into this folder, named exactly:

   | file | weight | used for |
   |------|--------|----------|
   | `Brice-Black.otf` | 900 | the masthead — the only weight the app needs today |
   | `Brice-Bold.otf` | 700 | optional, if the lockup ever needs a lighter cut |
   | `Brice-SemiBold.otf` | 600 | optional |

   `.woff2` is a fraction of the size and every target browser supports it; if
   you only have `.otf`, that works and I can convert them.

2. Tell me, and I will:
   - add the `@font-face` blocks to `src/styles/fonts.css` (the pattern is
     stubbed there),
   - regenerate the favicon from the real Brice — `scripts/build-icon.py` already
     prefers these files over Manrope and handles `.otf` outlines,
   - re-run the suite and check the masthead at every width.

## Licence

Confirmed with Ernest (2026-09-12): Brice is already in use on the Fall Fest
site and its favicon, so web use is covered. Worth re-checking the licence
allows self-hosting the file rather than only a foundry-hosted kit.
