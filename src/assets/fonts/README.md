# Brice font files go here

`Brice` is the proprietary display font used for the map's title lockup (per
`typography-and-icons.md` in the project). I don't have the actual `.otf` files in this
session — only the project's text docs, which reference a `fonts/` folder without the
binaries in it.

To finish the type system:

1. Drop the Brice `.otf` weights you have (Black, Bold, SemiBold, Regular, Light,
   ExtraLight) into this folder.
2. Add matching `@font-face` declarations in `src/styles/fonts.css` (a starter file is
   already there with Manrope wired up — copy the pattern for Brice).
3. Until then, `--font-display` falls back to Manrope/system sans, so the app runs and
   looks correct, just without the branded display face on the title.
