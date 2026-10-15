import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { fechaCorta } from '@/lib/fechas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, FixedFooter, SectionLabel, Spinner, Switch, Title } from '@/components/ui/primitives';

const { Provider, Service } = base44.entities;

export const ACCESOS = [
  { value: 'llaves_inmobiliaria', label: 'Llaves en la inmobiliaria' },
  { value: 'llaves_porteria', label: 'Llaves en portería' },
  { value: 'propietario_presente', label: 'Propietario presente' },
  { value: 'otro', label: 'Otro' },
];

function Campo({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <SectionLabel className="mb-2">{label}</SectionLabel>
      {children}
    </label>
  );
}

// Paso 2 de la reserva: datos de la propiedad, acceso y contacto en el lugar.
export default function LaPropiedad() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { tipo, isAdmin } = useAuth();

  const serviceIds = (params.get('s') || '').split(',').filter(Boolean);
  const fecha = params.get('fecha');
  const hora = params.get('hora');
  const volver = `/f/${slug}`;

  const [provider, setProvider] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [form, setForm] = useState({
    direccion: '',
    piso_unidad: '',
    m2: '',
    acceso_tipo: '',
    acceso_detalle: '',
    contacto_nombre: '',
    contacto_whatsapp: '',
    avisar_contacto: true,
    notas: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      const [p] = await Provider.filter({ slug }, undefined, 1);
      if (!p) return setError('No encontramos este fotógrafo.');
      const lista = await Service.filter({ provider_id: p.id });
      setProvider(p);
      setServicios(lista.filter((s) => serviceIds.includes(s.id)).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    })().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e?.target ? e.target.value : e }));

  const whatsappValido = form.contacto_whatsapp.replace(/\D/g, '').length >= 8;
  const faltaContacto = form.avisar_contacto && (!form.contacto_nombre.trim() || !whatsappValido);
  const valido =
    form.direccion.trim() &&
    form.acceso_tipo &&
    (form.acceso_tipo !== 'otro' || form.acceso_detalle.trim()) &&
    !faltaContacto;

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const { data } = await base44.functions.invoke('crear-reserva', {
        provider_id: provider.id,
        service_ids: serviceIds,
        fecha,
        hora,
        ...form,
      });
      navigate(`/turno/${data.booking.codigo_corto}`, { replace: true, state: { recien: true } });
    } catch (e) {
      setOcupado(e.response?.status === 409);
      setError(e.response?.data?.error || 'No pudimos confirmar la reserva. Probá de nuevo.');
      setEnviando(false);
    }
  };

  if (!fecha || !hora || !serviceIds.length) {
    return (
      <div className="mx-auto max-w-md px-5 pt-16">
        <p className="text-[16px] text-ink-2">Falta elegir el horario.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(volver)}>
          Elegir horario
        </Button>
      </div>
    );
  }
  if (tipo !== 'agente' && !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 pt-16">
        <Title>Reservas para agentes</Title>
        <p className="mt-3 text-[16px] text-ink-2">
          Estás con una cuenta de fotógrafo. Para reservar, ingresá con la cuenta de Google del agente.
        </p>
      </div>
    );
  }
  if (!provider) {
    return error ? (
      <p className="mx-auto max-w-md px-5 pt-16 text-[16px] text-ink-2">{error}</p>
    ) : (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-32 pt-4">
      <Link to={volver} className="-ml-3 inline-flex min-h-touch items-center gap-1 px-3 text-[15px] text-ink-2">
        <ChevronLeft size={18} strokeWidth={1.5} />
        Cambiar horario
      </Link>
      <Title className="mt-2">La propiedad</Title>
      <p className="mt-2 text-[15px] text-ink-2 tabular">
        {fechaCorta(fecha)} · {hora} · {servicios.map((s) => s.nombre).join(', ')}
      </p>

      <div className="mt-8 grid gap-6">
        <Campo label="Dirección">
          <Input
            value={form.direccion}
            onChange={set('direccion')}
            placeholder="Calle, altura y barrio"
            autoComplete="street-address"
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Piso / unidad">
            <Input value={form.piso_unidad} onChange={set('piso_unidad')} placeholder="Ej. 4° B" />
          </Campo>
          <Campo label="m²">
            <Input value={form.m2} onChange={set('m2')} inputMode="numeric" placeholder="Ej. 75" className="tabular" />
          </Campo>
        </div>

        <div>
          <SectionLabel className="mb-2">¿Cómo se accede?</SectionLabel>
          <Card role="radiogroup" aria-label="Cómo se accede" className="divide-y divide-line-soft">
            {ACCESOS.map((a) => {
              const sel = form.acceso_tipo === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setForm((f) => ({ ...f, acceso_tipo: a.value }))}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left text-[16px]"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      sel ? 'border-accent' : 'border-line'
                    }`}
                  >
                    {sel && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                  </span>
                  {a.label}
                </button>
              );
            })}
          </Card>
          {form.acceso_tipo === 'otro' && (
            <Input
              className="mt-3"
              value={form.acceso_detalle}
              onChange={set('acceso_detalle')}
              placeholder="Contanos cómo se accede"
              autoFocus
            />
          )}
        </div>

        <div>
          <SectionLabel className="mb-2">Contacto en el lugar</SectionLabel>
          <div className="grid gap-3">
            <Input value={form.contacto_nombre} onChange={set('contacto_nombre')} placeholder="Nombre" autoComplete="off" />
            <Input
              value={form.contacto_whatsapp}
              onChange={set('contacto_whatsapp')}
              placeholder="WhatsApp, ej. 11 2233 4455"
              inputMode="tel"
              className="tabular"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-card border border-line bg-surface py-2 pl-4 pr-2">
            <span>
              <span className="block text-[16px]">Avisarle por WhatsApp</span>
              <span className="block text-[14px] text-ink-2">Confirmación y recordatorio 1 h antes</span>
            </span>
            <Switch label="Avisarle por WhatsApp" checked={form.avisar_contacto} onChange={set('avisar_contacto')} />
          </div>
          {faltaContacto && (form.contacto_nombre || form.contacto_whatsapp) && (
            <p className="mt-2 text-[14px] text-pending-ink">Para avisarle necesitamos su nombre y un WhatsApp válido.</p>
          )}
        </div>

        <Campo label="Notas para el fotógrafo">
          <textarea
            value={form.notas}
            onChange={set('notas')}
            rows={3}
            placeholder="Ej. Priorizar living y balcón"
            className="block w-full rounded-input border border-line bg-surface px-4 py-3 text-[16px] placeholder:text-ink-2/70 focus:border-accent focus:outline-none"
          />
        </Campo>
      </div>

      {error && (
        <div className="mt-6 rounded-card bg-pending p-4 text-[15px] text-pending-ink">
          {error}
          {ocupado && (
            <Button variant="outline" className="mt-3 w-full" onClick={() => navigate(volver)}>
              Elegir otro horario
            </Button>
          )}
        </div>
      )}

      <FixedFooter>
        <Button size="lg" className="w-full" disabled={!valido || enviando} onClick={confirmar}>
          {enviando ? 'Confirmando…' : 'Confirmar reserva'}
        </Button>
      </FixedFooter>
    </div>
  );
}
