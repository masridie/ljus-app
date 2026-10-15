import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { fechaBA, sumarDias } from '@shared/disponibilidad.ts';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { partesFecha, textoDuracion } from '@/lib/fechas';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Chip, FixedFooter, SectionLabel, Spinner } from '@/components/ui/primitives';

const { Provider, Service } = base44.entities;

// Elegir horario. Pública: también se abre desde el link de reservas del fotógrafo.
export default function ElegirHorario() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loginWithGoogle } = useAuth();

  const [provider, setProvider] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [elegidos, setElegidos] = useState([]);
  const [desde, setDesde] = useState(() => fechaBA(new Date()));
  const [dias, setDias] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const pedido = useRef(0);

  // Proveedor y servicios activos
  useEffect(() => {
    (async () => {
      const [p] = await Provider.filter({ slug }, undefined, 1);
      if (!p) return setError('No encontramos este fotógrafo. Revisá el link.');
      const lista = (await Service.filter({ provider_id: p.id }))
        .filter((s) => s.activo !== false)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setProvider(p);
      setServicios(lista);
      if (lista.length) setElegidos([lista[0].id]);
    })().catch((e) => setError(e.message));
  }, [slug]);

  // Horarios libres de la semana para los servicios elegidos
  useEffect(() => {
    if (!provider || !elegidos.length) {
      setDias(null);
      return;
    }
    const id = ++pedido.current;
    setCargando(true);
    base44.functions
      .invoke('horarios-libres', { provider_id: provider.id, service_ids: elegidos, desde, dias: 7 })
      .then(({ data }) => {
        if (id !== pedido.current) return;
        setDias(data.dias);
        setError(null);
      })
      .catch((e) => id === pedido.current && setError(e.response?.data?.error || 'No pudimos cargar los horarios'))
      .finally(() => id === pedido.current && setCargando(false));
  }, [provider, elegidos, desde]);

  // Al cambiar la semana o los servicios: mantener el día si sigue teniendo horarios,
  // si no, pasar al primero disponible. La hora se borra si cambió el día o dejó de estar libre.
  useEffect(() => {
    if (!dias) return;
    const actual = dias.find((d) => d.fecha === fecha);
    const dia = actual?.slots.length ? actual : dias.find((d) => d.slots.length);
    setFecha(dia?.fecha || null);
    if (!dia || dia.fecha !== fecha || !dia.slots.includes(hora)) setHora(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  const duracion = useMemo(
    () => servicios.filter((s) => elegidos.includes(s.id)).reduce((t, s) => t + s.duracion_min, 0),
    [servicios, elegidos],
  );
  const diaSel = dias?.find((d) => d.fecha === fecha);
  const hoy = fechaBA(new Date());

  const alternarServicio = (id) =>
    setElegidos((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const continuar = () => {
    const params = new URLSearchParams({ s: elegidos.join(','), fecha, hora });
    const destino = `/f/${slug}/propiedad?${params}`;
    if (isAuthenticated) navigate(destino);
    else loginWithGoogle('agente', destino);
  };

  if (error && !provider) {
    return <p className="mx-auto max-w-md px-5 pt-16 text-[16px] text-ink-2">{error}</p>;
  }
  if (!provider) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const etiquetaBoton =
    fecha && hora
      ? `Continuar · ${partesFecha(fecha).corto} ${partesFecha(fecha).numero}, ${hora}`
      : 'Elegí un horario';

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-32 pt-8">
      <header className="flex items-center gap-3">
        <Avatar nombre={provider.nombre_comercial} foto={provider.foto_url} size={52} />
        <div>
          <p className="text-[13px] text-ink-2">Reservá una sesión con</p>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{provider.nombre_comercial}</h1>
          {provider.zona_cobertura && <p className="text-[14px] text-ink-2">{provider.zona_cobertura}</p>}
        </div>
      </header>

      <SectionLabel className="mb-3 mt-8">Servicios</SectionLabel>
      {servicios.length ? (
        <>
          <div className="flex flex-wrap gap-2">
            {servicios.map((s) => {
              const sel = elegidos.includes(s.id);
              return (
                <Chip key={s.id} selected={sel} aria-pressed={sel} onClick={() => alternarServicio(s.id)}>
                  {sel && <Check size={16} strokeWidth={2} />}
                  {s.nombre}
                </Chip>
              );
            })}
          </div>
          <p className="mt-3 text-[15px] text-ink-2 tabular">
            {duracion ? `Duración total: ${textoDuracion(duracion)}` : 'Elegí al menos un servicio'}
          </p>
        </>
      ) : (
        <p className="text-[15px] text-ink-2">Este fotógrafo todavía no cargó servicios.</p>
      )}

      {elegidos.length > 0 && (
        <>
          <div className="mb-3 mt-8 flex items-center justify-between">
            <SectionLabel>Día</SectionLabel>
            <div className="-mr-2 flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Semana anterior"
                disabled={desde <= hoy}
                onClick={() => setDesde((d) => (sumarDias(d, -7) < hoy ? hoy : sumarDias(d, -7)))}
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Semana siguiente" onClick={() => setDesde((d) => sumarDias(d, 7))}>
                <ChevronRight size={20} strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          <div className={`grid grid-cols-7 gap-1.5 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
            {(dias || Array.from({ length: 7 }, (_, i) => ({ fecha: sumarDias(desde, i), slots: [] }))).map((d) => {
              const { corto, numero } = partesFecha(d.fecha);
              const disponible = d.slots.length > 0;
              const sel = d.fecha === fecha;
              return (
                <button
                  key={d.fecha}
                  type="button"
                  disabled={!disponible}
                  aria-pressed={sel}
                  aria-label={`${corto} ${numero}${disponible ? '' : ', sin horarios'}`}
                  onClick={() => {
                    setFecha(d.fecha);
                    setHora(null);
                  }}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-input border text-center ${
                    sel
                      ? 'border-ink bg-ink text-white'
                      : disponible
                        ? 'border-line bg-surface hover:border-ink-2'
                        : 'border-transparent bg-transparent text-ink-2/50'
                  }`}
                >
                  <span className="text-[12px] font-medium">{corto}</span>
                  <span className="text-[18px] font-semibold tabular">{numero}</span>
                </button>
              );
            })}
          </div>

          <SectionLabel className="mb-3 mt-8">Horario</SectionLabel>
          {cargando && !dias ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : diaSel?.slots.length ? (
            <div className={`grid grid-cols-3 gap-2 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
              {diaSel.slots.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={h === hora}
                  onClick={() => setHora(h)}
                  className={`min-h-touch rounded-input border text-[16px] font-medium tabular ${
                    h === hora ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink-2'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-ink-2">No hay horarios libres esta semana. Probá con la siguiente.</p>
          )}

          <p className="mt-5 flex items-start gap-2 text-[14px] text-ink-2">
            <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            Ya descontamos los turnos y el tiempo de traslado.
          </p>
        </>
      )}

      {error && <p className="mt-4 text-[14px] text-pending-ink">{error}</p>}

      <FixedFooter>
        <Button size="lg" className="w-full" disabled={!fecha || !hora || !elegidos.length} onClick={continuar}>
          {etiquetaBoton}
        </Button>
      </FixedFooter>
    </div>
  );
}
