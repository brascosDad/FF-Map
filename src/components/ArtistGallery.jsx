import Icon from './Icon';
import photoData from '../data/artist-photos.json';
import { isDemo } from '../demo';

const PLACEHOLDER_TILES = 3;

/**
 * ArtistGallery: photos of an artist's work in a booth's sheet, a strip three
 * tiles wide that scrolls sideways when there are more. Photos come only from
 * src/data/artist-photos.json: ones the artist gave permission for.
 *
 * A booth with no photos draws NOTHING -- no empty frame, no "no photos" line --
 * so the sheet looks complete without it. The one exception is a `?demo` link
 * (src/demo.js), where a booth with no photos shows neutral placeholder tiles,
 * so the gallery can be shown before any artist has sent photos.
 */
export default function ArtistGallery({ booth }) {
  const photos = (booth.n != null && photoData.booths[String(booth.n)]) || [];
  if (photos.length) {
    return (
      <section className="ffc-artistgallery" aria-label="Photos of the artist's work">
        {photos.map((p) => (
          <img className="ffc-artistgallery__tile" key={p.src} src={p.src} alt={p.alt} loading="lazy" decoding="async" />
        ))}
      </section>
    );
  }
  if (!isDemo()) return null;
  return (
    <section className="ffc-artistgallery ffc-artistgallery--placeholder" aria-label="Photo placeholders: no artist photos yet">
      {Array.from({ length: PLACEHOLDER_TILES }, (_, i) => (
        <span className="ffc-artistgallery__tile" key={i} aria-hidden="true">
          <Icon name="art" size={20} color="var(--text-muted)" />
        </span>
      ))}
    </section>
  );
}
