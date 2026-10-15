import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMiProveedor } from '@/hooks/useMiProveedor';
import MisServicios from '@/components/perfil/MisServicios';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel, Spinner, Title } from '@/components/ui/primitives';

const ROL_LABEL = { fotografo: 'Fotógrafo', agente: 'Agente' };

function ServiciosDelFotografo() {
  const { provider, loading, error } = useMiProveedor();
  if (error) return <p className="text-[15px] text-pending-ink">{error}</p>;
  if (loading || !provider) return <Spinner />;
  return <MisServicios provider={provider} />;
}

export default function Perfil() {
  const { user, tipo, isAdmin, logout } = useAuth();

  return (
    <div>
      <Title>Perfil</Title>

      {tipo === 'fotografo' && (
        <section className="mt-6">
          <SectionLabel className="mb-3">Mis servicios</SectionLabel>
          <ServiciosDelFotografo />
        </section>
      )}

      <SectionLabel className="mb-3 mt-8">Cuenta</SectionLabel>
      <Card className="divide-y divide-line-soft">
        <div className="p-5">
          <SectionLabel>Nombre</SectionLabel>
          <p className="mt-1 text-[16px]">{user?.full_name || '—'}</p>
        </div>
        <div className="p-5">
          <SectionLabel>Email</SectionLabel>
          <p className="mt-1 text-[16px]">{user?.email}</p>
        </div>
        <div className="p-5">
          <SectionLabel>Rol</SectionLabel>
          <p className="mt-1 text-[16px]">
            {[ROL_LABEL[tipo], isAdmin && 'Admin'].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      </Card>
      <Button variant="outline" className="mt-6 w-full" onClick={logout}>
        <LogOut size={18} strokeWidth={1.5} />
        Cerrar sesión
      </Button>
    </div>
  );
}
