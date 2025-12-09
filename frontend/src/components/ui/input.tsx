import React from 'react';
import { cn } from '@/lib/utils';
import styles from './input.module.css';

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, type, ...props }, ref) => {
  // Don't apply animated styles to file inputs, date inputs, or hidden inputs
  const isSpecialInput = type === 'file' || type === 'date' || type === 'hidden';

  if (isSpecialInput) {
    return (
      <input
        type={type}
        className={cn(
          'flex h-auto w-full rounded-lg border-2 border-black bg-background px-4 py-3.5 text-base font-medium shadow-[2.5px_3px_0_#000] outline-none transition-all duration-250 ease-in-out placeholder:text-muted-foreground focus:shadow-[5.5px_7px_0_#000] disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  }

  return (
    <div className={styles.inputContainer}>
      <input
        type={type}
        className={cn(styles.input, className)}
        ref={ref}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
