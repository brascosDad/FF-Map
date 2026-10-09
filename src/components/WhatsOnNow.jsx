import { useEffect, useState } from 'react';
import { FESTIVAL } from '../data/festival';
import { whatsOnNow } from '../whatsOnNow';

/**
 * WhatsOnNow: the act on one stage right now and the one after it, at the top
 * of the stage sheet. Coral (--current) marks "now"; it is the only thing in
 * the app that does. Renders nothing outside the festival's music hours.
 * Behind FESTIVAL.showNow -- the caller checks the flag.
 */
export default function WhatsOnNow({ stage }) {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setDate(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const on = whatsOnNow(stage, date, FESTIVAL);
  if (!on) return null;
  return (
    <section className={`ffc-whatsonnow ffc-whatsonnow--${on.state}`} aria-label={`What's on now at the ${stage.name}`}>
      {on.state !== 'before' && (
        <div className="ffc-whatsonnow__row ffc-whatsonnow__row--now">
          <span className="ffc-whatsonnow__label">{on.now ? 'Now' : 'Between sets'}</span>
          {on.now && <>
            <span className="ffc-whatsonnow__act">{on.now.act || 'To be confirmed'}</span>
            <span className="ffc-whatsonnow__time">{on.now.time}</span>
          </>}
        </div>
      )}
      {on.next && (
        <div className="ffc-whatsonnow__row">
          <span className="ffc-whatsonnow__label">{on.state === 'before' ? 'First up' : 'Up next'}</span>
          <span className="ffc-whatsonnow__act">{on.next.act || 'To be confirmed'}</span>
          <span className="ffc-whatsonnow__time">{on.next.time}</span>
        </div>
      )}
    </section>
  );
}
