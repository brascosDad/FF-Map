# Design system changelog

The version is `version` in `design-system/manifest.json`. What bumps it is in
`design-system.html`, section 7. Newest first. A change lands here in the same
PR as the manifest, the Names table and the docs.

## 1.0.0 — 2026-10-09

The system, written down as data an agent can ask questions of. Nothing the
visitor sees changes; this is a description of what already ships.

- **Tokens: 148**, generated from `src/styles/tokens.css` and
  `src/styles/components.css`: 43 primitive, 74 semantic, 31 component. Each has
  its value, its tier, what it points at, and the comment that explains it.
- **Components: 13**, one per row of the Names table (FilterChip, IconButton,
  ZoomControl, MapPin, Panel, ItemPager, BoothRow, ArtistLine, ScheduleRow,
  DayHeading, ListRow, PoiRow, Legend). IconButton is defined in CSS but not used
  in the app.
- **Rules: 8**, from CLAUDE.md: `no-overlap`, `tap-floor`, `token-first`,
  `one-name`, `close-top-right`, `step-in-step-out`, `paper-number-row`,
  `coral-is-now`.
- **Query layer**: `npm run ds -- components | component | tokens | rules | check`
  and the same five answers as an MCP server, `ff-design-system` (`.mcp.json`).
- **Governance**: propose → review → adopt, semantic versioning, one-version
  deprecation (design-system.html §7). CI fails if the committed manifest is not
  what a fresh generation produces (`manifest is current`).
- **Known gaps carried into 1.0.0**: four `.ffc-` classes exist in
  `components.css` that the Names table does not name (`.ffc-brand`,
  `.ffc-scale`, `.ffc-dimmed`, `.ffc-boothlist`; listed under `unlistedClasses`),
  and four components' CSS class is not `.ffc-<name>` (FilterChip is `.ffc-chip`,
  IconButton `.ffc-iconbtn`, ZoomControl `.ffc-zoom`, MapPin `.ffc-pin`).
