// Colour measurement for the design system: a hex value to OKLCH, the
// perceptual distance between two (ΔE in OKLab), and WCAG contrast against
// white. No dependency; the maths is Björn Ottosson's OKLab
// (https://bottosson.github.io/posts/oklab/) and WCAG 2.2's relative
// luminance.
//
// OKLCH lightness is how bright a colour looks, which HSL's lightness is not:
// HSL calls a yellow and a blue of the same "L" equal when the eye sees the
// yellow far brighter. L is reported 0–100, C as OKLab chroma (0–~0.4), H in
// degrees.

/** "#9E3F94" or "#93f" → [r, g, b] in 0–1, or null if it is not a hex colour. */
export function parseHex(hex) {
  const m = String(hex).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** A hex colour → OKLab { l, a, b }, with l on the same 0–100 scale as oklch(). */
export function oklab(hex) {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`oklab: "${hex}" is not a hex colour`);
  const [r, g, b] = rgb.map(toLinear);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: (0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_) * 100,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/** A hex colour → { l, c, h }: OKLCH lightness 0–100, chroma, hue in degrees. */
export function oklch(hex) {
  const { l, a, b } = oklab(hex);
  const C = Math.hypot(a, b);
  const H = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: C, h: C < 1e-4 ? 0 : (H + 360) % 360 };
}

/**
 * Perceptual distance between two hex colours: Euclidean distance in OKLab
 * (ΔEok), scaled ×100 so it reads on the same scale as lightness (a ΔE of 1 is
 * one point of OKLCH L; about 2 is the smallest difference most people notice
 * side by side).
 */
export function deltaE(x, y) {
  const p = oklab(x), q = oklab(y);
  return Math.hypot((p.l - q.l) / 100, p.a - q.a, p.b - q.b) * 100;
}

/** The plain angle between two hex colours' OKLCH hues, 0–180 degrees. */
export function hueGap(x, y) {
  const d = Math.abs(oklch(x).h - oklch(y).h) % 360;
  return d > 180 ? 360 - d : d;
}

/** WCAG relative luminance, 0–1. */
export function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`luminance: "${hex}" is not a hex colour`);
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1–21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Contrast of a fill under a white glyph. */
export const contrastOnWhite = (hex) => contrast(hex, '#FFFFFF');
