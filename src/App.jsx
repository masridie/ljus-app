import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/AppShell';
import { Spinner } from '@/components/ui/primitives';
import Ingreso from '@/pages/Ingreso';
import Perfil from '@/pages/Perfil';
import Pendiente from '@/pages/Pendiente';

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

function IngresoRoute() {
  const { isLoading } = useAuth();
  return isLoading ? <FullScreenSpinner /> : <Ingreso />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/ingreso" element={<IngresoRoute />} />

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
              <Pendiente titulo="Mi disponibilidad" detalle="Acá vas a cargar tus horarios de lunes a domingo." />
            </RequireRole>
          }
        />

        {/* Agente */}
        <Route
          path="/reservar"
          element={
            <RequireRole allow={['agente']}>
              <Pendiente titulo="Reservar sesión" detalle="Acá vas a elegir fotógrafo, servicios y horario." />
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
