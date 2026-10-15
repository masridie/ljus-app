import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { validarRangos, aMinutos, aHora } from '@shared/disponibilidad.ts';
import Sheet from '@/components/ui/Sheet';
import TimeSelect from '@/components/ui/TimeSelect';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/primitives';

// Propone un rango nuevo a continuación del último (1 h después, 4 h de largo).
function siguienteRango(rangos) {
  if (!rangos.length) return { inicio: '09:00', fin: '13:00' };
  const ultimoFin = Math.max(...rangos.map((r) => aMinutos(r.fin)));
  const inicio = Math.min(ultimoFin + 60, 23 * 60);
  return { inicio: aHora(inicio), fin: aHora(Math.min(inicio + 240, 24 * 60)) };
}

export default function EditorDia({ dia, nombre, onClose, onApply }) {
  const [rangos, setRangos] = useState([]);

  useEffect(() => {
    if (dia) setRangos(dia.rangos?.length ? dia.rangos.map((r) => ({ ...r })) : [{ inicio: '09:00', fin: '18:00' }]);
  }, [dia]);

  const error = rangos.length ? validarRangos(rangos) : null;

  const cambiar = (i, campo, valor) =>
    setRangos((rs) => rs.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));

  const aplicar = () => {
    const ordenados = [...rangos].sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));
    onApply({ ...dia, rangos: ordenados, activo: ordenados.length > 0 });
  };

  return (
    <Sheet
      open={!!dia}
      title={nombre}
      subtitle="Horarios en los que tomás sesiones"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" disabled={!!error} onClick={aplicar}>
          Listo
        </Button>
      }
    >
      <SectionLabel className="mb-3">Rangos</SectionLabel>
      <div className="grid gap-3">
        {rangos.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <TimeSelect label={`Inicio del rango ${i + 1}`} value={r.inicio} onChange={(v) => cambiar(i, 'inicio', v)} />
            <span className="text-ink-2">–</span>
            <TimeSelect label={`Fin del rango ${i + 1}`} value={r.fin} onChange={(v) => cambiar(i, 'fin', v)} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar rango ${i + 1}`}
              onClick={() => setRangos((rs) => rs.filter((_, j) => j !== i))}
            >
              <Trash2 size={18} strokeWidth={1.5} />
            </Button>
          </div>
        ))}
        {!rangos.length && (
          <p className="rounded-card border border-dashed border-line p-4 text-[15px] text-ink-2">
            Sin rangos: este día queda como no disponible.
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-[14px] text-pending-ink">{error}</p>}

      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={() => setRangos((rs) => [...rs, siguienteRango(rs)])}
      >
        <Plus size={18} strokeWidth={1.5} />
        Agregar rango
      </Button>
    </Sheet>
  );
}
