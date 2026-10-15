import { useEffect, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import Sheet from '@/components/ui/Sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/primitives';
import { textoDuracion } from '@/lib/fechas';

// Duraciones de 15 minutos a 4 horas.
const DURACIONES = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

// servicio = null cerrado; {} nuevo; con id = edición.
export default function EditorServicio({ servicio, onClose, onSave, onDelete }) {
  const [nombre, setNombre] = useState('');
  const [duracion, setDuracion] = useState(60);
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!servicio) return;
    setNombre(servicio.nombre || '');
    setDuracion(servicio.duracion_min || 60);
    setPrecio(servicio.precio ? String(servicio.precio) : '');
    setError(null);
  }, [servicio]);

  const precioNum = precio.trim() === '' ? null : Number(precio.replace(/\./g, '').replace(',', '.'));
  const precioInvalido = precioNum != null && (!Number.isFinite(precioNum) || precioNum < 0);
  const valido = nombre.trim() && !precioInvalido;

  const correr = async (fn) => {
    setGuardando(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      open={!!servicio}
      title={servicio?.id ? 'Editar servicio' : 'Nuevo servicio'}
      onClose={onClose}
      footer={
        <>
          <Button
            size="lg"
            className="w-full"
            disabled={!valido || guardando}
            onClick={() =>
              correr(() =>
                onSave({
                  nombre: nombre.trim(),
                  duracion_min: duracion,
                  // Sin precio: no se manda; si tenía uno y lo borraron, queda en 0 (= sin precio)
                  ...(precioNum != null ? { precio: precioNum } : servicio?.precio ? { precio: 0 } : {}),
                }),
              )
            }
          >
            {guardando ? 'Guardando…' : 'Guardar servicio'}
          </Button>
          {servicio?.id && (
            <Button variant="ghost" className="w-full" disabled={guardando} onClick={() => correr(onDelete)}>
              <Trash2 size={18} strokeWidth={1.5} />
              Eliminar servicio
            </Button>
          )}
        </>
      }
    >
      <SectionLabel className="mb-2">Nombre</SectionLabel>
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Fotos" maxLength={40} />

      <SectionLabel className="mb-2 mt-6">Duración</SectionLabel>
      <span className="relative block">
        <select
          aria-label="Duración"
          value={duracion}
          onChange={(e) => setDuracion(Number(e.target.value))}
          className="block min-h-touch w-full appearance-none rounded-input border border-line bg-surface py-2.5 pl-4 pr-9 text-[16px] tabular focus:border-accent focus:outline-none"
        >
          {DURACIONES.map((d) => (
            <option key={d} value={d}>
              {textoDuracion(d)}
            </option>
          ))}
        </select>
        <ChevronDown size={18} strokeWidth={1.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" />
      </span>

      <SectionLabel className="mb-2 mt-6">Precio (opcional)</SectionLabel>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-ink-2">$</span>
        <Input
          inputMode="numeric"
          className="pl-8 tabular"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Sin precio publicado"
        />
      </div>
      {precioInvalido && <p className="mt-2 text-[14px] text-pending-ink">Revisá el precio.</p>}
      {error && <p className="mt-3 text-[14px] text-pending-ink">{error}</p>}
    </Sheet>
  );
}
