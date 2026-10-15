import { ChevronDown } from 'lucide-react';

// Horas cada 30 minutos, de 00:00 a 24:00.
export const HORAS = Array.from({ length: 49 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 ? '30' : '00'}`;
});

export default function TimeSelect({ value, onChange, options = HORAS, label }) {
  return (
    <span className="relative inline-flex flex-1">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block min-h-touch w-full appearance-none rounded-input border border-line bg-surface py-2.5 pl-4 pr-9 text-[16px] tabular focus:border-accent focus:outline-none"
      >
        {options.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={1.5}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2"
      />
    </span>
  );
}
