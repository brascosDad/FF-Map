import Icon from './Icon';

const QUICK_FILTERS = [
  { id: 'wc', label: 'Restrooms', icon: 'wc' },
  { id: 'firstaid', label: 'First aid', icon: 'firstaid' },
  { id: 'water', label: 'Water', icon: 'water' },
];

export default function FilterChips({ active, onToggle }) {
  return (
    <div className="chips">
      {QUICK_FILTERS.map((c) => {
        const cls = !active ? 'chip' : active === c.id ? 'chip on' : 'chip off';
        return (
          <button key={c.id} className={cls} onClick={() => onToggle(c.id)}>
            <Icon name={c.icon} size={15} className="ci" />
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
