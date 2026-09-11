#!/usr/bin/env node
/**
 * Pull the map frame straight from Figma into design/basemap.svg.
 *
 *   FIGMA_TOKEN=... node scripts/pull-figma.mjs
 *
 * Replaces exporting by hand. Figma stays the one place the map is designed;
 * design/basemap.svg becomes a generated snapshot (never edit it by hand), and
 * scripts/extract-blobs.py turns it into src/assets/basemapBlobs.js.
 *
 * Runs in the "Sync from Figma" GitHub Action (.github/workflows/sync-figma.yml),
 * which reads FIGMA_TOKEN from the repo's Actions secrets. The token needs the
 * "File content: Read" scope.
 *
 * The frame is found by NODE ID, not name, so renaming it in Figma is fine but
 * duplicating or replacing it breaks the link -- update FIGMA_NODE_ID if you do.
 * Hidden layers (e.g. UI-elements) are not rendered by the API, same as a manual
 * export.
 */
import { writeFileSync } from 'node:fs';

const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY || 'M2KRqYx41eI258Wme7PkOc'; // "eeLee"
const NODE_ID = process.env.FIGMA_NODE_ID || '5906:4939';               // fall-fest-desktop-map-trace-090526
const OUT = 'design/basemap.svg';

if (!TOKEN) {
  console.error('FIGMA_TOKEN is not set. Add it under repo Settings -> Secrets and variables -> Actions.');
  process.exit(1);
}

const api = new URL(`https://api.figma.com/v1/images/${FILE_KEY}`);
api.search = new URLSearchParams({
  ids: NODE_ID,
  format: 'svg',
  svg_include_id: 'true',      // layer names become ids -- extract-blobs.py needs blob-* ids
  svg_outline_text: 'false',   // keep labels as editable text
  svg_simplify_stroke: 'true',
}).toString();

const res = await fetch(api, { headers: { 'X-Figma-Token': TOKEN } });
if (res.status === 403) {
  console.error('Figma refused the token (403). It may have expired or lack "File content: Read". Generate a new one and update the FIGMA_TOKEN secret.');
  process.exit(1);
}
if (!res.ok) {
  console.error(`Figma API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const body = await res.json();
if (body.err) { console.error(`Figma API error: ${body.err}`); process.exit(1); }
const url = body.images?.[NODE_ID];
if (!url) {
  console.error(`Figma returned no image for node ${NODE_ID}. Was the frame deleted, duplicated, or replaced? Find its new id (right-click -> Copy link, the node-id param) and set FIGMA_NODE_ID.`);
  process.exit(1);
}

const svgRes = await fetch(url);
if (!svgRes.ok) { console.error(`Could not download the rendered SVG (${svgRes.status}).`); process.exit(1); }
let svg = await svgRes.text();

// Layer names become ids verbatim. Spaces and names that start with a digit or
// symbol are not valid XML names and made strict uploaders reject the file, so
// normalise them here rather than relying on every layer being named perfectly.
const fixed = [];
svg = svg.replace(/\bid="([^"]*)"/g, (m, id) => {
  let clean = id.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9_.-]/g, '');
  if (!/^[A-Za-z_]/.test(clean)) clean = `x-${clean}`;
  if (clean !== id) fixed.push(`${id} -> ${clean}`);
  return `id="${clean}"`;
});

writeFileSync(OUT, svg);
const blobs = (svg.match(/\bid="blob-[^"]*"/g) || []).length;
console.log(`wrote ${OUT} (${svg.length} bytes, ${blobs} blob layer(s)) from Figma ${FILE_KEY} node ${NODE_ID}`);
if (fixed.length) console.log(`normalised ${fixed.length} id(s):\n  ${fixed.slice(0, 20).join('\n  ')}`);
