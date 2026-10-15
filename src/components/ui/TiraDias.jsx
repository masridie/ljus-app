import { partesFecha } from '@/lib/fechas';

// Tira de días (normalmente 7). deshabilitado(fecha) apaga un día; marcado(fecha) le pone
// un punto verde (ej. días con turnos).
export default function TiraDias({ fechas, seleccion, onSelect, deshabilitado = () => false, marcado = () => false, className = '' }) {
  return (
    <div className={`grid grid-cols-7 gap-1.5 ${className}`}>
      {fechas.map((fecha) => {
        const { corto, numero } = partesFecha(fecha);
        const off = deshabilitado(fecha);
        const sel = fecha === seleccion;
        const punto = marcado(fecha);
        return (
          <button
            key={fecha}
            type="button"
            disabled={off}
            aria-pressed={sel}
            aria-label={`${corto} ${numero}${off ? ', sin horarios' : ''}${punto ? ', con turnos' : ''}`}
            onClick={() => onSelect(fecha)}
            className={`relative flex min-h-[64px] flex-col items-center justify-center rounded-input border text-center ${
              sel
                ? 'border-ink bg-ink text-white'
                : off
                  ? 'border-transparent bg-transparent text-ink-2/50'
                  : 'border-line bg-surface hover:border-ink-2'
            }`}
          >
            <span className="text-[12px] font-medium">{corto}</span>
            <span className="text-[18px] font-semibold tabular">{numero}</span>
            {punto && (
              <span
                aria-hidden="true"
                className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${sel ? 'bg-white' : 'bg-accent'}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
