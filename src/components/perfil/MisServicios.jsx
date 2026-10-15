import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EditorServicio, { textoDuracion } from './EditorServicio';
import { Button } from '@/components/ui/button';
import { Card, Chip, SectionLabel, Spinner, Switch } from '@/components/ui/primitives';

const { Service } = base44.entities;

// Servicios habituales del rubro, con una duración sugerida para arrancar.
const SUGERIDOS = [
  { nombre: 'Fotos', duracion_min: 60 },
  { nombre: 'Plano', duracion_min: 30 },
  { nombre: 'Video', duracion_min: 60 },
  { nombre: 'Drone', duracion_min: 30 },
  { nombre: 'Tour 360', duracion_min: 45 },
];

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function MisServicios({ provider }) {
  const [servicios, setServicios] = useState(null);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    const lista = await Service.filter({ provider_id: provider.id });
    setServicios(lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
  }, [provider.id]);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  const guardar = async (data) => {
    if (editando?.id) {
      await Service.update(editando.id, data);
    } else {
      await Service.create({
        ...data,
        provider_id: provider.id,
        provider_email: provider.user_email,
        activo: true,
        orden: servicios.length,
      });
    }
    await cargar();
    setEditando(null);
  };

  const eliminar = async () => {
    await Service.delete(editando.id);
    await cargar();
    setEditando(null);
  };

  const alternar = async (s, activo) => {
    setServicios((xs) => xs.map((x) => (x.id === s.id ? { ...x, activo } : x)));
    try {
      await Service.update(s.id, { activo });
    } catch (e) {
      setError(e.message);
      await cargar();
    }
  };

  if (error && !servicios) return <p className="text-[15px] text-pending-ink">{error}</p>;
  if (!servicios) return <Spinner />;

  const nombres = new Set(servicios.map((s) => s.nombre.trim().toLowerCase()));
  const faltan = SUGERIDOS.filter((s) => !nombres.has(s.nombre.toLowerCase()));

  return (
    <div>
      {servicios.length > 0 ? (
        <Card className="divide-y divide-line-soft">
          {servicios.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => setEditando(s)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditando(s)}
              className="flex min-h-[64px] cursor-pointer items-center gap-3 py-2 pl-4 pr-2 hover:bg-bg/60"
            >
              <div className="flex-1">
                <p className={`text-[16px] font-medium ${s.activo === false ? 'text-ink-2' : ''}`}>{s.nombre}</p>
                <p className="text-[14px] text-ink-2 tabular">
                  {textoDuracion(s.duracion_min)}
                  {s.precio ? ` · ${pesos.format(s.precio)}` : ''}
                  {s.activo === false ? ' · Pausado' : ''}
                </p>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-ink-2" />
              <Switch label={`${s.nombre} activo`} checked={s.activo !== false} onChange={(v) => alternar(s, v)} />
            </div>
          ))}
        </Card>
      ) : (
        <p className="text-[15px] text-ink-2">
          Todavía no cargaste servicios. Los agentes van a elegir entre estos al reservar.
        </p>
      )}

      {faltan.length > 0 && (
        <>
          <SectionLabel className="mb-2 mt-5">Agregar rápido</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {faltan.map((s) => (
              <Chip key={s.nombre} onClick={() => setEditando({ ...s })}>
                <Plus size={16} strokeWidth={1.5} />
                {s.nombre}
              </Chip>
            ))}
          </div>
        </>
      )}

      <Button variant="outline" className="mt-4 w-full" onClick={() => setEditando({})}>
        <Plus size={18} strokeWidth={1.5} />
        Otro servicio
      </Button>
      {error && <p className="mt-3 text-[14px] text-pending-ink">{error}</p>}

      <EditorServicio servicio={editando} onClose={() => setEditando(null)} onSave={guardar} onDelete={eliminar} />
    </div>
  );
}
