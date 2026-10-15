import { Card, SectionLabel, Title } from '@/components/ui/primitives';

// Pantalla provisoria para las secciones que se construyen en las próximas partes.
export default function Pendiente({ titulo, detalle }) {
  return (
    <div>
      <Title>{titulo}</Title>
      <Card className="mt-6 p-5">
        <SectionLabel>En construcción</SectionLabel>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{detalle}</p>
      </Card>
    </div>
  );
}
