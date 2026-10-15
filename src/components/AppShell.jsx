import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, Clock, User, CalendarPlus, ListChecks, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const NAV = {
  fotografo: [
    { to: '/agenda', label: 'Agenda', Icon: CalendarDays },
    { to: '/horarios', label: 'Horarios', Icon: Clock },
    { to: '/perfil', label: 'Perfil', Icon: User },
  ],
  agente: [
    { to: '/reservar', label: 'Reservar', Icon: CalendarPlus },
    { to: '/mis-turnos', label: 'Mis turnos', Icon: ListChecks },
    { to: '/perfil', label: 'Perfil', Icon: User },
  ],
  admin: [
    { to: '/admin', label: 'Admin', Icon: LayoutGrid },
    { to: '/perfil', label: 'Perfil', Icon: User },
  ],
};

// Marco de las pantallas logueadas: contenido centrado + barra inferior según el rol.
export default function AppShell() {
  const { tipo, isAdmin } = useAuth();
  const items = NAV[tipo] || (isAdmin ? NAV.admin : []);

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-md px-5 pb-40 pt-8">
        <Outlet />
      </main>
      {items.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-safe">
          <ul className="mx-auto flex h-16 w-full max-w-md">
            {items.map(({ to, label, Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex h-full flex-col items-center justify-center gap-1 text-[12px] font-medium ${
                      isActive ? 'text-ink' : 'text-ink-2'
                    }`
                  }
                >
                  <Icon size={22} strokeWidth={1.5} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
