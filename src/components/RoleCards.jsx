import { Camera, CalendarCheck, Check } from 'lucide-react';

const OPTIONS = [
  { value: 'fotografo', title: 'Fotógrafo', subtitle: 'Manejo mi agenda', Icon: Camera },
  { value: 'agente', title: 'Agente', subtitle: 'Reservo sesiones', Icon: CalendarCheck },
];

export default function RoleCards({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Elegí tu rol" className="grid gap-3">
      {OPTIONS.map(({ value: v, title, subtitle, Icon }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={`flex w-full items-center gap-4 rounded-card border bg-surface p-5 text-left transition-colors ${
              selected ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink-2'
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-input ${
                selected ? 'bg-accent text-white' : 'bg-bg text-ink'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1">
              <span className="block text-[17px] font-semibold">{title}</span>
              <span className="block text-[15px] text-ink-2">{subtitle}</span>
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                selected ? 'border-accent bg-accent text-white' : 'border-line'
              }`}
            >
              {selected && <Check size={14} strokeWidth={2} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
