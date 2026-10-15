import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import { PLANTILLAS, renderMensaje, textoAcceso } from '@shared/mensajes.ts';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { fechaLarga, hora } from '@/lib/fechas';
import { Button } from '@/components/ui/button';
import { Card, FixedFooter, SectionLabel, Spinner, StatusPill, Title } from '@/components/ui/primitives';

const MENSAJES = [
  { value: 'confirmacion', label: 'Confirmación' },
  { value: 'recordatorio', label: '1 h antes' },
];

function Fila({ label, children }) {
  return (
    <div className="px-5 py-4">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 text-[16px] leading-snug">{children}</div>
    </div>
  );
}

// Resumen del turno. También es el link público que llega por WhatsApp.
export default function SesionConfirmada() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState('confirmacion');

  useEffect(() => {
    base44.functions
      .invoke('ver-turno', { codigo })
      .then(({ data }) => setData(data))
      .catch((e) => setError(e.response?.data?.error || 'No pudimos cargar el turno'));
  }, [codigo]);

  if (error) return <p className="mx-auto max-w-md px-5 pt-16 text-[16px] text-ink-2">{error}</p>;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { turno: t, rol } = data;
  const pendiente = t.estado === 'solicitado';
  const activo = ['solicitado', 'confirmado'].includes(t.estado);
  const futuro = new Date(t.inicio).getTime() > Date.now();
  // Sin sesión se ofrece igual: al confirmar se pide ingresar y la función valida que sea su turno.
  const puedeReprogramar = (rol || !isAuthenticated) && activo && futuro && t.provider_slug;

  const titulo = pendiente ? 'Solicitud enviada' : t.estado === 'confirmado' ? 'Sesión confirmada' : 'Tu sesión';
  const bajada = pendiente
    ? `Te avisamos cuando ${t.provider_nombre} la apruebe.`
    : t.estado === 'confirmado'
      ? t.en_calendario
        ? 'Ya está en tu Google Calendar y en el del fotógrafo.'
        : `${t.provider_nombre} ya tiene el turno en su agenda.`
      : null;

  const destinatario = t.avisar_contacto && t.contacto_nombre ? t.contacto_nombre : t.client_nombre;
  const link = `${window.location.origin}/turno/${t.codigo}`;
  const texto = renderMensaje(PLANTILLAS[mensaje], t, destinatario?.split(' ')[0] || '', link);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-32 pt-12">
      <div className="flex flex-col items-center text-center">
        {activo && (
          <span
            className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
              pendiente ? 'bg-pending text-pending-ink' : 'bg-accent text-white'
            }`}
          >
            {pendiente ? <Clock size={30} strokeWidth={1.5} /> : <Check size={32} strokeWidth={1.75} />}
          </span>
        )}
        <Title>{titulo}</Title>
        {!activo && (
          <div className="mt-3">
            <StatusPill status={t.estado} />
          </div>
        )}
        {activo && bajada && <p className="mt-2 max-w-xs text-[16px] text-ink-2">{bajada}</p>}
      </div>

      {t.nuevo_codigo && (
        <Button variant="outline" className="mt-6 w-full" onClick={() => navigate(`/turno/${t.nuevo_codigo}`)}>
          Ver el turno nuevo
        </Button>
      )}

      <Card className="mt-8 divide-y divide-line-soft">
        <Fila label="Cuándo">
          <p className="font-medium">{fechaLarga(t.inicio)}</p>
          <p className="text-ink-2 tabular">
            {hora(t.inicio)} – {hora(t.fin)} · {t.servicios.map((s) => s.nombre).join(', ')}
          </p>
        </Fila>
        <Fila label="Dónde">
          <p className="font-medium">{t.direccion}</p>
          {(t.piso_unidad || t.m2) && (
            <p className="text-ink-2 tabular">{[t.piso_unidad, t.m2 && `${t.m2} m²`].filter(Boolean).join(' · ')}</p>
          )}
        </Fila>
        <Fila label="Acceso">
          <p>{textoAcceso(t)}</p>
          {t.contacto_nombre && <p className="text-ink-2">Contacto: {t.contacto_nombre}</p>}
        </Fila>
        <Fila label="Fotógrafo">
          <p>{t.provider_nombre}</p>
        </Fila>
        {t.notas && (
          <Fila label="Notas">
            <p className="text-ink-2">{t.notas}</p>
          </Fila>
        )}
      </Card>

      {activo && rol && (
        <section className="mt-8">
          <SectionLabel className="mb-3">Mensajes por WhatsApp</SectionLabel>
          <div role="tablist" className="mb-3 grid grid-cols-2 rounded-full border border-line bg-surface p-1">
            {MENSAJES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={mensaje === m.value}
                onClick={() => setMensaje(m.value)}
                className={`min-h-[40px] rounded-full text-[14px] font-medium ${
                  mensaje === m.value ? 'bg-ink text-white' : 'text-ink-2'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="rounded-card bg-line-soft p-4">
            <p className="mb-2 text-[13px] text-ink-2">Para {destinatario}</p>
            <p className="whitespace-pre-line rounded-card rounded-tl-sm bg-surface px-4 py-3 text-[15px] leading-relaxed">
              {texto}
            </p>
          </div>
        </section>
      )}

      {(isAuthenticated || puedeReprogramar) && (
        <FixedFooter>
          <div className={`grid gap-2 ${puedeReprogramar && isAuthenticated ? 'grid-cols-2' : ''}`}>
            {puedeReprogramar && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(`/f/${t.provider_slug}?reprogramar=${t.codigo}`)}
              >
                Reprogramar
              </Button>
            )}
            {isAuthenticated && (
              <Button size="lg" onClick={() => navigate('/')}>
                Listo
              </Button>
            )}
          </div>
        </FixedFooter>
      )}
    </div>
  );
}
