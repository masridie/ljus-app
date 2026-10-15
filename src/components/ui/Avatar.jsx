// Foto del proveedor o sus iniciales sobre el verde suave.
export default function Avatar({ nombre = '', foto, size = 48 }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  const style = { width: size, height: size };
  if (foto) return <img src={foto} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-[16px] font-semibold text-accent"
    >
      {iniciales || '·'}
    </span>
  );
}
