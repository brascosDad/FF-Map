import { ICONS } from '../assets/icons';

/**
 * Renders a Phosphor path (from the locked prototype's icon set) as inline SVG.
 * Used both for map pin glyphs (nested inside the map SVG) and small UI icons.
 */
export default function Icon({ name, size = 20, color = 'currentColor', className }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill={color}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

/** Same icon, but positioned/sized to sit centered at (x, y) inside a parent <svg>. */
export function IconAt({ name, x, y, size = 14, color = 'var(--icon-on-color)' }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill={color}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
