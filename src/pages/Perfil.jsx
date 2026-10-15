import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel, Title } from '@/components/ui/primitives';

const ROL_LABEL = { fotografo: 'Fotógrafo', agente: 'Agente' };

export default function Perfil() {
  const { user, tipo, isAdmin, logout } = useAuth();

  return (
    <div>
      <Title>Perfil</Title>
      <Card className="mt-6 divide-y divide-line-soft">
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
