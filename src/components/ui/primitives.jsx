// Piezas chicas del sistema de diseño Ljus.

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-card border border-line bg-surface ${className}`} {...props}>
      {children}
    </div>
  );
}

// Etiqueta de sección: mayúsculas 13px, tracking 0.08em, color secundario
export function SectionLabel({ className = '', children }) {
  return <p className={`text-label font-medium uppercase text-ink-2 ${className}`}>{children}</p>;
}

export function Title({ className = '', children }) {
  return <h1 className={`text-title font-semibold text-ink ${className}`}>{children}</h1>;
}

// Chip totalmente redondeado. "soft" = verde suave para rangos horarios.
export function Chip({ selected = false, tone = 'default', className = '', children, ...props }) {
  const Tag = props.onClick ? 'button' : 'span';
  const tones = {
    default: selected
      ? 'bg-ink text-white border-ink'
      : 'bg-surface text-ink border-line hover:border-ink-2',
    soft: 'bg-accent-soft text-accent border-transparent',
  };
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium tabular ${
        Tag === 'button' ? 'min-h-touch' : 'py-1'
      } ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// Interruptor on/off con área táctil de 44px
export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="inline-flex min-h-touch min-w-touch items-center justify-center disabled:opacity-50"
    >
      <span
        className={`relative inline-block h-[26px] w-[44px] rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
    </button>
  );
}

const STATUS = {
  solicitado: { label: 'Por aprobar', className: 'bg-pending text-pending-ink' },
  confirmado: { label: 'Confirmado', className: 'bg-accent-soft text-accent' },
  rechazado: { label: 'Rechazado', className: 'bg-line-soft text-ink-2' },
  realizado: { label: 'Realizado', className: 'bg-line-soft text-ink' },
  material_entregado: { label: 'Material entregado', className: 'bg-accent text-white' },
  cancelado: { label: 'Cancelado', className: 'bg-line-soft text-ink-2' },
  reprogramado: { label: 'Reprogramado', className: 'bg-line-soft text-ink' },
};

export function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, className: 'bg-line-soft text-ink-2' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

// Contenedor del botón principal, fijo al pie. Con withNav queda arriba de la barra inferior.
export function FixedFooter({ withNav = false, children }) {
  return (
    <div
      className={`fixed inset-x-0 z-20 border-t border-line-soft bg-bg/95 backdrop-blur ${
        withNav ? 'bottom-[64px]' : 'bottom-0 pb-safe'
      }`}
    >
      <div className="mx-auto w-full max-w-md px-5 py-3">{children}</div>
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
      aria-label="Cargando"
    />
  );
}
