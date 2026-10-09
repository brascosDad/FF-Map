#!/usr/bin/env node
// The design system as an MCP server (stdio), registered in .mcp.json as
// "ff-design-system". Same answers as `npm run ds -- <command> --json`: both
// doors call design-system/lib/query.mjs.
//
// Built on the low-level Server of the official SDK, with plain JSON Schema for
// each tool's input, so the SDK is the only dependency (no schema library to
// import ourselves).
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { checkCss, getComponent, getRules, getTokens, listComponents, loadManifest } from '../lib/query.mjs';

const str = (description) => ({ type: 'string', description });

export const TOOLS = [
  {
    name: 'list_components',
    description: 'Every component in the Fall Fest design system (the Names table): name, CSS class, React file, whether it ships, one-line description. Start here.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: (m) => listComponents(m),
  },
  {
    name: 'get_component',
    description: 'One component in full: description, CSS class and parts, file, the interaction states it appears in, the tokens it reads, the knobs it declares, what not to do, and the standing rules that apply to it. Accepts the name (ItemPager), the class (.ffc-itempager), or a name the docs say it is never called ("pager"), which answers with the right name.',
    inputSchema: { type: 'object', properties: { name: str('Component name, e.g. ItemPager, FilterChip, Panel') }, required: ['name'], additionalProperties: false },
    run: (m, a) => getComponent(m, a.name),
  },
  {
    name: 'get_tokens',
    description: 'Design tokens with tier (primitive / semantic / component), value, resolved value, what each points at, and the comment that explains it. With no filter, all of them. A filter matches name, tier, note or value; a component name returns the tokens that component reads and declares.',
    inputSchema: { type: 'object', properties: { filter: str('Optional: "space", "semantic", "#23385B", "tap", or a component name like ItemPager') }, additionalProperties: false },
    run: (m, a) => getTokens(m, a.filter),
  },
  {
    name: 'get_rules',
    description: 'The standing rules (no-overlap, tap-floor, token-first, one-name, close-top-right, step-in-step-out, paper-number-row, coral-is-now): statement, why, what enforces it, and where in CLAUDE.md it comes from. Optionally one rule by id.',
    inputSchema: { type: 'object', properties: { id: str('Optional rule id, e.g. no-overlap') }, additionalProperties: false },
    run: (m, a) => getRules(m, a.id),
  },
  {
    name: 'check_css',
    description: 'Check a CSS snippet against the design system before it is written to a file. Reports raw hex or px values where a token exists, tokens that do not exist, and class names not in the Names table. Each finding cites the rule id. ok is false if there is any error.',
    inputSchema: { type: 'object', properties: { css: str('The CSS to check: rules, or a bare list of declarations') }, required: ['css'], additionalProperties: false },
    run: (m, a) => checkCss(m, a.css),
  },
];

export function createServer() {
  const server = new Server({ name: 'ff-design-system', version: loadManifest().version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = TOOLS.find((t) => t.name === req.params.name);
    if (!tool) return { isError: true, content: [{ type: 'text', text: `unknown tool "${req.params.name}"` }] };
    const args = req.params.arguments || {};
    for (const key of tool.inputSchema.required || []) {
      if (typeof args[key] !== 'string') return { isError: true, content: [{ type: 'text', text: `${tool.name}: "${key}" is required (a string)` }] };
    }
    // The manifest is read on every call, so a regenerated one is picked up without a restart.
    const result = tool.run(loadManifest(), args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });
  return server;
}

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await createServer().connect(new StdioServerTransport());
}
