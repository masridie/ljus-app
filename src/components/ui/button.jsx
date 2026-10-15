import { forwardRef } from 'react';

const VARIANTS = {
  // Acción principal: negro con texto blanco
  primary: 'bg-ink text-white hover:bg-black disabled:bg-line disabled:text-ink-2',
  accent: 'bg-accent text-white hover:bg-accent-hover disabled:bg-line disabled:text-ink-2',
  outline: 'bg-surface text-ink border border-line hover:bg-bg disabled:text-ink-2',
  ghost: 'bg-transparent text-ink hover:bg-line-soft disabled:text-ink-2',
};

const SIZES = {
  // Botón principal: 54px, radio 14px
  lg: 'h-cta px-6 rounded-btn text-[16px]',
  // Botón chico: área táctil mínima 44px, radio 12px
  md: 'min-h-touch px-4 rounded-input text-[15px]',
  icon: 'h-11 w-11 rounded-input',
};

const Button = forwardRef(({ className = '', variant = 'primary', size = 'md', ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...props}
  />
));

Button.displayName = 'Button';

export { Button };
