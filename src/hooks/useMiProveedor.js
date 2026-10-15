import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const { Provider, Availability } = base44.entities;

// Horario por defecto: lunes a viernes de 9 a 18, fin de semana inactivo.
export const SEMANA_DEFAULT = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({
  dia_semana: dia,
  activo: dia <= 5,
  rangos: [{ inicio: '09:00', fin: '18:00' }],
}));

function slugBase(texto) {
  return (
    (texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'fotografo'
  );
}

async function slugLibre(texto) {
  const base = slugBase(texto);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [existe] = await Provider.filter({ slug }, undefined, 1);
    if (!existe) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Evita crear dos perfiles si el hook se monta dos veces a la vez.
let creando = null;

async function obtenerOCrear(user) {
  const [existente] = await Provider.filter({ user_email: user.email }, undefined, 1);
  if (existente) return existente;
  if (!creando) {
    creando = (async () => {
      const nombre = user.full_name || user.email.split('@')[0];
      const provider = await Provider.create({
        user_email: user.email,
        nombre_comercial: nombre,
        slug: await slugLibre(nombre),
      });
      await Availability.bulkCreate(
        SEMANA_DEFAULT.map((d) => ({ ...d, provider_id: provider.id, provider_email: user.email })),
      );
      return provider;
    })().finally(() => {
      creando = null;
    });
  }
  return creando;
}

// Perfil de proveedor del usuario logueado. Si es el primer ingreso, lo crea.
export function useMiProveedor() {
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setProvider(await obtenerOCrear(user));
    } catch (e) {
      setError(e.message || 'No pudimos cargar tu perfil');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { provider, loading, error, recargar: cargar };
}
