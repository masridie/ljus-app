import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Copy, KeyRound, MapPin, User } from 'lucide-react';
import { fechaBA, sumarDias } from '@shared/disponibilidad.ts';
import { textoAcceso } from '@shared/mensajes.ts';
import { base44 } from '@/api/base44Client';
import { useMiProveedor } from '@/hooks/useMiProveedor';
import { fechaLarga, hora, textoDuracion } from '@/lib/fechas';
import Sheet from '@/components/ui/Sheet';
import TiraDias from '@/components/ui/TiraDias';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel, Spinner, StatusPill, Title } from '@/components/ui/primitives';

const { Booking } = base44.entities;

// Estados que se muestran en la agenda (los rechazados, cancelados y reprogramados no).
const VISIBLES = ['solicitado', 'confirmado', 'realizado', 'material_entregado'];

function TarjetaTurno({ t, onAbrir, onAprobar, onRechazar, procesando }) {
  const porAprobar = t.estado === 'solicitado';
  return (
    <Card className={`p-4 ${porAprobar ? 'border-pending' : ''}`}>
      <div role="button" tabIndex={0} onClick={onAbrir} onKeyDown={(e) => e.key === 'Enter' && onAbrir()} className="cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <p className="tabular">
            <span className="text-[28px] font-semibold leading-none tracking-[-0.02em]">{hora(t.inicio)}</span>
            <span className="ml-1.5 text-[15px] text-ink-2">– {hora(t.fin)}</span>
          </p>
          <StatusPill status={t.estado} />
        </div>
        <p className="mt-3 flex items-start gap-2 text-[16px] font-medium">
          <MapPin size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-2" />
          <span>
            {t.direccion}
            {t.piso_unidad && <span className="font-normal text-ink-2"> · {t.piso_unidad}</span>}
          </span>
        </p>
        <p className="mt-1.5 pl-[26px] text-[15px] text-ink-2 tabular">
          {(t.servicios || []).map((s) => `${s.nombre} ${textoDuracion(s.duracion_min)}`).join(' · ')}
        </p>
        <p className="mt-2 flex items-center gap-2 text-[15px]">
          <User size={18} strokeWidth={1.5} className="shrink-0 text-ink-2" />
          {t.client_nombre}
          {t.client_inmobiliaria && <span className="text-ink-2">· {t.client_inmobiliaria}</span>}
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[15px]">
          <KeyRound size={18} strokeWidth={1.5} className="shrink-0 text-ink-2" />
          {textoAcceso(t)}
        </p>
      </div>
      {porAprobar && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={procesando} onClick={onRechazar}>
            Rechazar
          </Button>
          <Button disabled={procesando} onClick={onAprobar}>
            Aprobar
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function TuAgenda() {
  const navigate = useNavigate();
  const { provider, loading, error: errorPerfil } = useMiProveedor();
  const hoy = fechaBA(new Date());
  const [desde, setDesde] = useState(hoy);
  const [dia, setDia] = useState(hoy);
  const [turnos, setTurnos] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [aRechazar, setARechazar] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!provider) return;
    const lista = await Booking.filter({ provider_id: provider.id }, '-inicio', 500);
    setTurnos(lista.filter((t) => VISIBLES.includes(t.estado)));
  }, [provider]);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  const porDia = useMemo(() => {
    const m = {};
    for (const t of turnos || []) (m[fechaBA(new Date(t.inicio))] ||= []).push(t);
    for (const k in m) m[k].sort((a, b) => a.inicio.localeCompare(b.inicio));
    return m;
  }, [turnos]);

  const cambiar = async (t, accion) => {
    setProcesando(t.id);
    setError(null);
    try {
      const { data } = await base44.functions.invoke('cambiar-estado', { codigo: t.codigo_corto, accion });
      setTurnos((ts) => ts.map((x) => (x.id === t.id ? data.booking : x)).filter((x) => VISIBLES.includes(x.estado)));
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo actualizar el turno');
      await cargar();
    } finally {
      setProcesando(null);
      setARechazar(null);
    }
  };

  const link = provider ? `${window.location.origin}/f/${provider.slug}` : '';
  const copiar = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      // Navegadores sin permiso de portapapeles: método clásico con un campo temporal.
      const campo = document.createElement('textarea');
      campo.value = link;
      campo.setAttribute('readonly', '');
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      campo.remove();
    }
    setCopiado(ok ? 'ok' : 'manual');
    setTimeout(() => setCopiado(false), ok ? 2000 : 4000);
  };

  if (errorPerfil) return <p className="text-[15px] text-pending-ink">{errorPerfil}</p>;
  if (loading || !provider || !turnos) {
    return (
      <div className="flex justify-center pt-24">
        <Spinner />
      </div>
    );
  }

  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
  const delDia = porDia[dia] || [];
  const moverSemana = (n) => {
    const nuevo = sumarDias(desde, n) < hoy ? hoy : sumarDias(desde, n);
    setDesde(nuevo);
    setDia(nuevo);
  };

  return (
    <div>
      <p className="text-[15px] text-ink-2">{fechaLarga(`${hoy}T12:00:00-03:00`)}</p>
      <Title className="mt-1">Tu agenda</Title>

      <div className="mb-3 mt-6 flex items-center justify-end">
        <div className="-mr-2 flex">
          <Button variant="ghost" size="icon" aria-label="Semana anterior" disabled={desde <= hoy} onClick={() => moverSemana(-7)}>
            <ChevronLeft size={20} strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Semana siguiente" onClick={() => moverSemana(7)}>
            <ChevronRight size={20} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
      <TiraDias fechas={fechas} seleccion={dia} onSelect={setDia} marcado={(f) => !!porDia[f]?.length} />

      <SectionLabel className="mb-3 mt-8">{fechaLarga(`${dia}T12:00:00-03:00`)}</SectionLabel>
      {error && <p className="mb-3 text-[14px] text-pending-ink">{error}</p>}
      {delDia.length ? (
        <div className="grid gap-3">
          {delDia.map((t) => (
            <TarjetaTurno
              key={t.id}
              t={t}
              procesando={procesando === t.id}
              onAbrir={() => navigate(`/turno/${t.codigo_corto}`)}
              onAprobar={() => cambiar(t, 'aprobar')}
              onRechazar={() => setARechazar(t)}
            />
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-ink-2">Sin turnos este día.</p>
      )}

      <div className="mt-8 rounded-card border border-dashed border-line p-4">
        <SectionLabel>Tu link de reservas</SectionLabel>
        <div className="mt-2 flex items-center gap-3">
          <p className="min-w-0 flex-1 select-all truncate text-[15px] tabular">{link.replace(/^https?:\/\//, '')}</p>
          <Button variant="outline" onClick={copiar}>
            {copiado === 'ok' ? <Check size={18} strokeWidth={1.5} /> : <Copy size={18} strokeWidth={1.5} />}
            {copiado === 'ok' ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        {copiado === 'manual' && (
          <p className="mt-2 text-[14px] text-pending-ink">No pudimos copiarlo solo. Tocá el link para seleccionarlo y copialo.</p>
        )}
      </div>

      <Sheet
        open={!!aRechazar}
        title="¿Rechazar la solicitud?"
        subtitle={aRechazar ? `${hora(aRechazar.inicio)} · ${aRechazar.direccion}` : ''}
        onClose={() => setARechazar(null)}
        footer={
          <>
            <Button size="lg" className="w-full" disabled={!!procesando} onClick={() => cambiar(aRechazar, 'rechazar')}>
              Rechazar
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setARechazar(null)}>
              Volver
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink-2">El agente va a ver la solicitud como rechazada y el horario queda libre.</p>
      </Sheet>
    </div>
  );
}
