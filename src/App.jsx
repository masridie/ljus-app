import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/AppShell';
import { Spinner } from '@/components/ui/primitives';
import ElegirHorario from '@/pages/ElegirHorario';
import Ingreso from '@/pages/Ingreso';
import LaPropiedad from '@/pages/LaPropiedad';
import MiDisponibilidad from '@/pages/MiDisponibilidad';
import Perfil from '@/pages/Perfil';
import Pendiente from '@/pages/Pendiente';
import Reservar from '@/pages/Reservar';

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

// Exige sesión y rol. allow = roles que pueden entrar ('fotografo', 'agente', 'admin').
function RequireRole({ allow, children }) {
  const { isLoading, isAuthenticated, tipo, isAdmin } = useAuth();
  if (isLoading) return <FullScreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/ingreso" replace />;
  if (!tipo && !isAdmin) return <Navigate to="/ingreso" replace />;
  // El admin ve todo.
  if (allow && !isAdmin && !allow.includes(tipo)) return <Navigate to="/" replace />;
  return children;
}

// "/" lleva a la pantalla de inicio de cada rol.
function HomeRedirect() {
  const { isLoading, isAuthenticated, tipo, isAdmin } = useAuth();
  if (isLoading) return <FullScreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/ingreso" replace />;
  if (tipo === 'fotografo') return <Navigate to="/agenda" replace />;
  if (tipo === 'agente') return <Navigate to="/reservar" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/ingreso" replace />;
}

// Pantallas que no exigen sesión, pero esperan a saber si hay una.
function Publica({ children }) {
  const { isLoading } = useAuth();
  return isLoading ? <FullScreenSpinner /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/ingreso" element={<Publica><Ingreso /></Publica>} />

      {/* Link público de reservas del fotógrafo */}
      <Route path="/f/:slug" element={<Publica><ElegirHorario /></Publica>} />
      <Route
        path="/f/:slug/propiedad"
        element={
          <RequireRole>
            <LaPropiedad />
          </RequireRole>
        }
      />
      <Route
        path="/turno/:codigo"
        element={
          <RequireRole>
            <div className="mx-auto max-w-md px-5 pt-8">
              <Pendiente titulo="Sesión confirmada" detalle="Acá vas a ver el resumen del turno." />
            </div>
          </RequireRole>
        }
      />

      <Route
        element={
          <RequireRole>
            <AppShell />
          </RequireRole>
        }
      >
        {/* Fotógrafo */}
        <Route
          path="/agenda"
          element={
            <RequireRole allow={['fotografo']}>
              <Pendiente titulo="Tu agenda" detalle="Acá vas a ver los turnos de cada día." />
            </RequireRole>
          }
        />
        <Route
          path="/horarios"
          element={
            <RequireRole allow={['fotografo']}>
              <MiDisponibilidad />
            </RequireRole>
          }
        />

        {/* Agente */}
        <Route
          path="/reservar"
          element={
            <RequireRole allow={['agente']}>
              <Reservar />
            </RequireRole>
          }
        />
        <Route
          path="/mis-turnos"
          element={
            <RequireRole allow={['agente']}>
              <Pendiente titulo="Mis turnos" detalle="Acá vas a ver tus sesiones próximas y pasadas." />
            </RequireRole>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireRole allow={[]}>
              <Pendiente titulo="Admin" detalle="Listados de fotógrafos, agentes y turnos." />
            </RequireRole>
          }
        />

        <Route path="/perfil" element={<Perfil />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
