// "What's on now" for one stage: the act playing at a given moment and the one
// after it, read from the stage's own lineup in stages.json. No second copy of
// the schedule: the times are parsed from the same strings the lineup prints.
//
// Plain JS, no React, so the e2e suite can call it with a fixed clock.
//
// Lineup times are written the way the committee writes them ("10:30–11:30",
// "Noon–1:00", "1:00–1:45") with no am/pm. The festival runs 10:30 AM to
// 7 PM, so 10 and 11 are morning, 12 is noon, and 1 through 9 are afternoon.
// A time outside that range would need this rule changed.

/** "Noon" | "h:mm" | "h" -> minutes after midnight, festival-local. */
export function clockMinutes(s) {
  const t = s.trim();
  if (/^noon$/i.test(t)) return 12 * 60;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  let h = Number(m[1]);
  if (h < 10) h += 12;
  return h * 60 + Number(m[2] || 0);
}

/** "1:30–2:30" -> { start, end } in minutes, or null if it does not parse. */
export function slotRange(time) {
  const [a, b] = time.split(/[–-]/);
  const start = a && clockMinutes(a), end = b && clockMinutes(b);
  return start != null && end != null && end > start ? { start, end } : null;
}

/** The festival-local day ("2026-10-03") and minute of a Date. */
export function festivalClock(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

/**
 * What one stage is doing at `date`.
 *
 *   { state: 'playing', now: slot, next: slot | null }   an act is on
 *   { state: 'between', now: null, next: slot }          between two sets
 *   { state: 'before',  now: null, next: slot }          the day's first act hasn't started
 *   null                                                 not a festival day, or the day's music is over
 *
 * `days` maps a lineup key to its date: { saturday: '2026-10-03', ... }.
 * A slot is the lineup's own record ({ time, act }); a slot whose time does
 * not parse is skipped, never guessed.
 */
export function whatsOnNow(stage, date, { days, timeZone }) {
  const { day, minute } = festivalClock(date, timeZone);
  const key = Object.keys(days).find((k) => days[k] === day);
  const lineup = key && stage.lineup[key];
  if (!lineup) return null;
  const slots = lineup.map((slot) => ({ slot, range: slotRange(slot.time) })).filter((s) => s.range);
  const at = slots.findIndex((s) => minute >= s.range.start && minute < s.range.end);
  if (at >= 0) return { state: 'playing', now: slots[at].slot, next: slots[at + 1]?.slot || null };
  const upcoming = slots.findIndex((s) => minute < s.range.start);
  if (upcoming < 0) return null;
  return { state: upcoming === 0 ? 'before' : 'between', now: null, next: slots[upcoming].slot };
}
