import Icon from './Icon';

const QUICK_FILTERS = [
  { id: 'wc', label: 'Restrooms', icon: 'wc' },
  { id: 'firstaid', label: 'First aid', icon: 'firstaid' },
  { id: 'water', label: 'Water', icon: 'water' },
];

/**
 * FilterChip row. Selection is carried by aria-pressed and a navy fill.
 *
 * Unselected chips go MUTED (a colour change) rather than faded: the previous
 * `.chip.off` dropped to 45% opacity, which put the label under 4.5:1 and made
 * the row unreadable for anyone who needed the contrast most.
 */
export default function FilterChips({ active, onToggle }) {
  return (
    <div className="chips">
      {QUICK_FILTERS.map((c) => {
        const on = active === c.id;
        return (
          <button
            key={c.id}
            className={`ffc-chip${active && !on ? ' ffc-chip--muted' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(c.id)}
          >
            <Icon name={c.icon} size={16} className="ci" color="currentColor" />
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
