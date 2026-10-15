import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { fechaBA, turnosFueraDeHorario } from '@shared/disponibilidad.ts';
import { base44 } from '@/api/base44Client';
import { useMiProveedor, SEMANA_DEFAULT } from '@/hooks/useMiProveedor';
import { DIAS, fechaCorta } from '@/lib/fechas';
import EditorDia from '@/components/disponibilidad/EditorDia';
import EditorExcepcion from '@/components/disponibilidad/EditorExcepcion';
import AvisoFueraDeHorario from '@/components/disponibilidad/AvisoFueraDeHorario';
import Sheet from '@/components/ui/Sheet';
import { Button } from '@/components/ui/button';
import { Card, Chip, FixedFooter, SectionLabel, Spinner, Switch, Title } from '@/components/ui/primitives';

const { Availability, AvailabilityException, Booking } = base44.entities;

// Una fila por día (1..7). Si falta alguna en la base, se completa con el default.
function normalizar(filas) {
  return SEMANA_DEFAULT.map((def) => {
    const f = filas.find((x) => x.dia_semana === def.dia_semana);
    return f
      ? { id: f.id, dia_semana: f.dia_semana, activo: f.activo !== false, rangos: f.rangos || [] }
      : { ...def, rangos: def.rangos.map((r) => ({ ...r })) };
  });
}

const firma = (semana) => JSON.stringify(semana?.map(({ dia_semana, activo, rangos }) => ({ dia_semana, activo, rangos })));

export default function MiDisponibilidad() {
  const { provider, loading: cargandoPerfil, error: errorPerfil } = useMiProveedor();
  const [guardada, setGuardada] = useState(null);
  const [semana, setSemana] = useState(null);
  const [excepciones, setExcepciones] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [nuevaExcepcion, setNuevaExcepcion] = useState(false);
  const [conflictos, setConflictos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    if (!provider) return;
    const [filas, exs, ts] = await Promise.all([
      Availability.filter({ provider_id: provider.id }),
      AvailabilityException.filter({ provider_id: provider.id }),
      Booking.filter({ provider_id: provider.id }, '-inicio', 500),
    ]);
    const s = normalizar(filas);
    setGuardada(s);
    setSemana(s);
    setExcepciones(exs);
    setTurnos(ts);
  }, [provider]);

  useEffect(() => {
    cargar().catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, [cargar]);

  const hayCambios = semana && firma(semana) !== firma(guardada);
  const hoy = fechaBA(new Date());
  const proximas = useMemo(
    () => excepciones.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [excepciones, hoy],
  );

  const actualizarDia = (dia) => {
    setSemana((s) => s.map((d) => (d.dia_semana === dia.dia_semana ? dia : d)));
    setMensaje(null);
  };

  const alternar = (dia, activo) =>
    actualizarDia({ ...dia, activo, rangos: activo && !dia.rangos.length ? [{ inicio: '09:00', fin: '18:00' }] : dia.rangos });

  const copiarLunes = () => {
    const lunes = semana[0];
    setSemana((s) =>
      s.map((d) =>
        d.dia_semana >= 2 && d.dia_semana <= 5
          ? { ...d, activo: lunes.activo, rangos: lunes.rangos.map((r) => ({ ...r })) }
          : d,
      ),
    );
    setMensaje(null);
  };

  const guardar = async (confirmado = false) => {
    const afuera = turnosFueraDeHorario(turnos, semana, excepciones, new Date());
    if (afuera.length && !confirmado) {
      setConflictos(afuera);
      return;
    }
    setConflictos([]);
    setGuardando(true);
    try {
      await Promise.all(
        semana
          .filter((d) => firma([d]) !== firma([guardada.find((g) => g.dia_semana === d.dia_semana)]) || !d.id)
          .map((d) =>
            d.id
              ? Availability.update(d.id, { activo: d.activo, rangos: d.rangos })
              : Availability.create({
                  provider_id: provider.id,
                  provider_email: provider.user_email,
                  dia_semana: d.dia_semana,
                  activo: d.activo,
                  rangos: d.rangos,
                }),
          ),
      );
      await cargar();
      setMensaje({ tipo: 'ok', texto: 'Disponibilidad guardada. Aplica a las reservas nuevas.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message || 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  };

  const verificarExcepcion = (ex) => turnosFueraDeHorario(turnos, guardada, [...excepciones, ex], new Date());

  const crearExcepcion = async (ex) => {
    const creada = await AvailabilityException.create({
      ...ex,
      provider_id: provider.id,
      provider_email: provider.user_email,
    });
    setExcepciones((xs) => [...xs, creada]);
    setNuevaExcepcion(false);
  };

  const borrarExcepcion = async (id) => {
    await AvailabilityException.delete(id);
    setExcepciones((xs) => xs.filter((x) => x.id !== id));
  };

  if (errorPerfil || (mensaje?.tipo === 'error' && !semana)) {
    return <p className="text-[15px] text-pending-ink">{errorPerfil || mensaje.texto}</p>;
  }
  if (cargandoPerfil || !semana) {
    return (
      <div className="flex justify-center pt-24">
        <Spinner />
      </div>
    );
  }

  const diaEditando = semana.find((d) => d.dia_semana === editando) || null;

  return (
    <div>
      <Title>Mi disponibilidad</Title>
      <p className="mt-2 text-[15px] text-ink-2">Los cambios aplican solo a las reservas nuevas.</p>

      <Card className="mt-6 divide-y divide-line-soft">
        {semana.map((d) => (
          <div
            key={d.dia_semana}
            role="button"
            tabIndex={0}
            onClick={() => setEditando(d.dia_semana)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditando(d.dia_semana)}
            className="flex min-h-[64px] cursor-pointer items-center gap-3 py-2 pl-4 pr-2 hover:bg-bg/60"
          >
            <span className="w-[88px] shrink-0 text-[16px] font-medium">{DIAS[d.dia_semana - 1]}</span>
            <span className="flex flex-1 flex-wrap gap-1.5">
              {d.activo && d.rangos.length ? (
                d.rangos.map((r) => (
                  <Chip key={`${r.inicio}-${r.fin}`} tone="soft">
                    {r.inicio} – {r.fin}
                  </Chip>
                ))
              ) : (
                <span className="text-[15px] text-ink-2">No disponible</span>
              )}
            </span>
            <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-ink-2" />
            <Switch label={`${DIAS[d.dia_semana - 1]} activo`} checked={d.activo} onChange={(v) => alternar(d, v)} />
          </div>
        ))}
      </Card>

      <div className="mt-4 grid gap-2">
        <Button variant="outline" onClick={copiarLunes}>
          <Copy size={18} strokeWidth={1.5} />
          Copiar lunes a días hábiles
        </Button>
        <Button variant="outline" onClick={() => setNuevaExcepcion(true)}>
          <Plus size={18} strokeWidth={1.5} />
          Excepción
        </Button>
      </div>

      <SectionLabel className="mb-3 mt-8">Próximas excepciones</SectionLabel>
      {proximas.length ? (
        <Card className="divide-y divide-line-soft">
          {proximas.map((x) => (
            <div key={x.id} className="flex items-center gap-3 py-2 pl-4 pr-2">
              <div className="flex-1">
                <p className="text-[16px] font-medium tabular">{fechaCorta(x.fecha)}</p>
                <p className="text-[14px] text-ink-2 tabular">
                  {x.tipo === 'bloqueo' ? 'Bloqueo' : 'Apertura extra'} ·{' '}
                  {x.dia_completo || !x.inicio ? 'Todo el día' : `${x.inicio} – ${x.fin}`}
                  {x.motivo ? ` · ${x.motivo}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Eliminar excepción" onClick={() => borrarExcepcion(x.id)}>
                <Trash2 size={18} strokeWidth={1.5} />
              </Button>
            </div>
          ))}
        </Card>
      ) : (
        <p className="text-[15px] text-ink-2">No tenés excepciones cargadas.</p>
      )}

      {mensaje && (
        <p className={`mt-6 text-[14px] ${mensaje.tipo === 'ok' ? 'text-accent' : 'text-pending-ink'}`}>{mensaje.texto}</p>
      )}

      <FixedFooter withNav>
        <Button size="lg" className="w-full" disabled={!hayCambios || guardando} onClick={() => guardar()}>
          {guardando ? 'Guardando…' : 'Guardar disponibilidad'}
        </Button>
      </FixedFooter>

      <EditorDia
        dia={diaEditando}
        nombre={diaEditando ? DIAS[diaEditando.dia_semana - 1] : ''}
        onClose={() => setEditando(null)}
        onApply={(dia) => {
          actualizarDia(dia);
          setEditando(null);
        }}
      />

      <EditorExcepcion
        open={nuevaExcepcion}
        onClose={() => setNuevaExcepcion(false)}
        onSave={crearExcepcion}
        verificar={verificarExcepcion}
      />

      <Sheet
        open={conflictos.length > 0}
        title="Revisá antes de guardar"
        onClose={() => setConflictos([])}
        footer={
          <>
            <Button size="lg" className="w-full" onClick={() => guardar(true)}>
              Guardar igual
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setConflictos([])}>
              Seguir editando
            </Button>
          </>
        }
      >
        <AvisoFueraDeHorario turnos={conflictos} />
      </Sheet>
    </div>
  );
}
