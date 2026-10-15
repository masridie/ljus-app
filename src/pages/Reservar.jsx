import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from '@/components/ui/Avatar';
import { Card, SectionLabel, Spinner, Title } from '@/components/ui/primitives';

const { Provider } = base44.entities;

// Inicio del agente: elegir con qué fotógrafo reservar.
export default function Reservar() {
  const [proveedores, setProveedores] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Provider.list('nombre_comercial', 200)
      .then(setProveedores)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <Title>Reservar sesión</Title>
      <p className="mt-2 text-[15px] text-ink-2">Elegí el fotógrafo y después el horario.</p>

      <SectionLabel className="mb-3 mt-8">Fotógrafos</SectionLabel>
      {error && <p className="text-[15px] text-pending-ink">{error}</p>}
      {!proveedores && !error && <Spinner />}
      {proveedores?.length === 0 && <p className="text-[15px] text-ink-2">Todavía no hay fotógrafos cargados.</p>}
      {proveedores?.length > 0 && (
        <Card className="divide-y divide-line-soft">
          {proveedores.map((p) => (
            <Link key={p.id} to={`/f/${p.slug}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 hover:bg-bg/60">
              <Avatar nombre={p.nombre_comercial} foto={p.foto_url} size={44} />
              <span className="flex-1">
                <span className="block text-[16px] font-medium">{p.nombre_comercial}</span>
                {p.zona_cobertura && <span className="block text-[14px] text-ink-2">{p.zona_cobertura}</span>}
              </span>
              <ChevronRight size={18} strokeWidth={1.5} className="text-ink-2" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
