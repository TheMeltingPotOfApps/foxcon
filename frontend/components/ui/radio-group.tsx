'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, disabled, ...props }, ref) => {
    const contextValue = React.useMemo(
      () => ({ value, onValueChange, disabled }),
      [value, onValueChange, disabled]
    );

    return (
      <RadioGroupContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn('grid gap-2', className)}
          role="radiogroup"
          aria-disabled={disabled}
          {...props}
        />
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked'> {
  value: string;
  id?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, onChange, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context.value === value;
    const isDisabled = props.disabled || context.disabled;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDisabled && context.onValueChange) {
        context.onValueChange(value);
      }
      onChange?.(e);
    };

    return (
      <input
        type="radio"
        ref={ref}
        id={id}
        value={value}
        checked={isChecked}
        disabled={isDisabled}
        onChange={handleChange}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          isChecked && 'border-slate-900 bg-slate-900',
          className
        )}
        {...props}
      />
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };

