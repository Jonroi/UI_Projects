'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon: Icon,
      showPasswordToggle = false,
      className,
      type,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(
      !!props.value || !!props.defaultValue,
    );

    const inputType =
      showPasswordToggle && type === 'password'
        ? showPassword
          ? 'text'
          : 'password'
        : type;

    const togglePassword = () => setShowPassword(!showPassword);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className='input-group'>
        <div className='relative'>
          {/* Icon */}
          {Icon && (
            <div className='absolute left-4 top-1/2 -translate-y-1/2 z-10'>
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors duration-300',
                  focused ? 'text-accent-400' : 'text-dark-400',
                )}
              />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={clsx(
              'input-modern peer',
              Icon && 'pl-12',
              showPasswordToggle && 'pr-12',
              error && 'border-red-500/50 focus:border-red-500',
              className,
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />

          {/* Floating Label */}
          <label
            className={clsx(
              'floating-label',
              Icon && 'left-12',
              (focused || hasValue) && 'input-focused',
              focused && 'text-accent-400',
              error && 'text-red-400',
            )}>
            {label}
          </label>

          {/* Password Toggle */}
          {showPasswordToggle && (
            <button
              type='button'
              onClick={togglePassword}
              className='absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg 
                         hover:bg-dark-700/50 transition-colors duration-200 z-10'
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <EyeOff className='w-5 h-5 text-dark-400 hover:text-dark-200' />
              ) : (
                <Eye className='w-5 h-5 text-dark-400 hover:text-dark-200' />
              )}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className={clsx('error-message', error && 'show')}>{error}</div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
