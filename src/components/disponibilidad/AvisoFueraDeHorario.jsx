import { AlertCircle } from 'lucide-react';
import { fechaHora } from '@/lib/fechas';

// Lista de turnos que quedan fuera del horario nuevo. No se cancelan: solo se avisa.
export default function AvisoFueraDeHorario({ turnos }) {
  if (!turnos?.length) return null;
  return (
    <div className="rounded-card bg-pending p-4 text-pending-ink">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <AlertCircle size={18} strokeWidth={1.5} />
        {turnos.length === 1 ? 'Un turno queda fuera de horario' : `${turnos.length} turnos quedan fuera de horario`}
      </p>
      <p className="mt-1 text-[14px]">Se mantienen como están. Si hace falta, reprogramalos desde tu agenda.</p>
      <ul className="mt-3 grid gap-1.5 text-[14px] tabular">
        {turnos.map((t) => (
          <li key={t.id}>
            <span className="font-medium">{fechaHora(t.inicio)}</span>
            {t.direccion ? ` · ${t.direccion}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
