import { useEffect } from 'react';
import { X } from 'lucide-react';

// Panel que sube desde abajo (mobile-first). footer = acciones fijas al pie del panel.
export default function Sheet({ open, title, subtitle, onClose, footer, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Cerrar" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-card bg-bg"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
            {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-input text-ink-2 hover:bg-line-soft"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">{children}</div>
        {footer && <div className="border-t border-line-soft px-5 pb-safe pt-3 [&>*]:mb-3">{footer}</div>}
      </div>
    </div>
  );
}
