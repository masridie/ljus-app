import { forwardRef } from 'react';

const Input = forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`block w-full min-h-touch rounded-input border border-line bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-ink-2/70 transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };
