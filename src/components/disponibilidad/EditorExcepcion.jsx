import { useEffect, useState } from 'react';
import { fechaBA, validarRangos } from '@shared/disponibilidad.ts';
import Sheet from '@/components/ui/Sheet';
import TimeSelect from '@/components/ui/TimeSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionLabel, Switch } from '@/components/ui/primitives';
import AvisoFueraDeHorario from './AvisoFueraDeHorario';

const TIPOS = [
  { value: 'bloqueo', label: 'Bloqueo', hint: 'No tomás sesiones' },
  { value: 'apertura', label: 'Apertura extra', hint: 'Sumás horario' },
];

const vacio = () => ({ fecha: '', tipo: 'bloqueo', dia_completo: true, inicio: '09:00', fin: '13:00', motivo: '' });

// verificar(excepcion) devuelve los turnos que quedarían fuera de horario.
export default function EditorExcepcion({ open, onClose, onSave, verificar }) {
  const [ex, setEx] = useState(vacio);
  const [conflictos, setConflictos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setEx(vacio());
      setConflictos([]);
      setError(null);
    }
  }, [open]);

  const set = (campo, valor) => {
    setEx((e) => ({ ...e, [campo]: valor }));
    setConflictos([]);
  };

  const hoy = fechaBA(new Date());
  const errorRango = !ex.dia_completo ? validarRangos([{ inicio: ex.inicio, fin: ex.fin }]) : null;
  const valido = ex.fecha && ex.fecha >= hoy && !errorRango;

  const guardar = async () => {
    const data = {
      fecha: ex.fecha,
      tipo: ex.tipo,
      dia_completo: ex.dia_completo,
      ...(ex.dia_completo ? {} : { inicio: ex.inicio, fin: ex.fin }),
      ...(ex.motivo.trim() && { motivo: ex.motivo.trim() }),
    };
    // Primer intento: si deja turnos afuera, mostrar el aviso y pedir confirmación.
    if (!conflictos.length) {
      const afuera = verificar(data);
      if (afuera.length) {
        setConflictos(afuera);
        return;
      }
    }
    setGuardando(true);
    setError(null);
    try {
      await onSave(data);
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      open={open}
      title="Nueva excepción"
      subtitle="Un día puntual distinto a tu semana habitual"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" disabled={!valido || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : conflictos.length ? 'Guardar igual' : 'Guardar excepción'}
        </Button>
      }
    >
      <SectionLabel className="mb-2">Fecha</SectionLabel>
      <Input type="date" min={hoy} value={ex.fecha} onChange={(e) => set('fecha', e.target.value)} />

      <SectionLabel className="mb-2 mt-6">Tipo</SectionLabel>
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={ex.tipo === t.value}
            onClick={() => set('tipo', t.value)}
            className={`rounded-input border p-3 text-left ${
              ex.tipo === t.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
            }`}
          >
            <span className="block text-[15px] font-medium">{t.label}</span>
            <span className="block text-[13px] text-ink-2">{t.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-card border border-line bg-surface pl-4 pr-2">
        <span className="text-[16px]">Día completo</span>
        <Switch label="Día completo" checked={ex.dia_completo} onChange={(v) => set('dia_completo', v)} />
      </div>

      {!ex.dia_completo && (
        <div className="mt-3 flex items-center gap-2">
          <TimeSelect label="Desde" value={ex.inicio} onChange={(v) => set('inicio', v)} />
          <span className="text-ink-2">–</span>
          <TimeSelect label="Hasta" value={ex.fin} onChange={(v) => set('fin', v)} />
        </div>
      )}
      {errorRango && <p className="mt-2 text-[14px] text-pending-ink">{errorRango}</p>}

      <SectionLabel className="mb-2 mt-6">Motivo (opcional)</SectionLabel>
      <Input
        placeholder="Ej. Vacaciones, turno médico"
        value={ex.motivo}
        onChange={(e) => set('motivo', e.target.value)}
      />

      {conflictos.length > 0 && (
        <div className="mt-6">
          <AvisoFueraDeHorario turnos={conflictos} />
        </div>
      )}
      {error && <p className="mt-3 text-[14px] text-pending-ink">{error}</p>}
    </Sheet>
  );
}
