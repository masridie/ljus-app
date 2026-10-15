import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

// Rol elegido en la pantalla de ingreso, guardado mientras el usuario pasa por Google.
const PENDING_ROLE_KEY = 'ljus_rol_pendiente';
export const ROLES = ['fotografo', 'agente'];

export function rememberPendingRole(tipo) {
  try {
    localStorage.setItem(PENDING_ROLE_KEY, tipo);
  } catch {
    // Sin storage: el usuario elige el rol de nuevo después del ingreso.
  }
}

function takePendingRole() {
  try {
    const tipo = localStorage.getItem(PENDING_ROLE_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
    return ROLES.includes(tipo) ? tipo : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      let me = await base44.auth.me();
      // Primer ingreso: aplicar el rol que eligió antes de ir a Google.
      if (me && !me.tipo) {
        const pending = takePendingRole();
        if (pending) me = await base44.auth.updateMe({ tipo: pending });
      }
      setUser(me || null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const setTipo = async (tipo) => {
    const updated = await base44.auth.updateMe({ tipo });
    setUser(updated);
    return updated;
  };

  // volverA: ruta a la que vuelve después de Google (ej. la reserva en curso).
  const loginWithGoogle = (tipo, volverA = '/') => {
    if (tipo) rememberPendingRole(tipo);
    base44.auth.loginWithProvider('google', `${window.location.origin}${volverA}`);
  };

  const logout = () => base44.auth.logout(`${window.location.origin}/ingreso`);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    tipo: user?.tipo || null,
    setTipo,
    loginWithGoogle,
    logout,
    reload: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de AuthProvider');
  return ctx;
}
