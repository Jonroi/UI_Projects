'use client';

import React from 'react';
import toast, { Toaster, Toast as HotToast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

const toastTypes = {
  success: {
    icon: CheckCircle,
    className: 'border-green-500/50 bg-dark-800/95 text-green-400',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircle,
    className: 'border-red-500/50 bg-dark-800/95 text-red-400',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-yellow-500/50 bg-dark-800/95 text-yellow-400',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    className: 'border-accent-500/50 bg-dark-800/95 text-accent-400',
    iconColor: 'text-accent-400',
  },
};

interface CustomToastProps {
  t: HotToast;
  type: keyof typeof toastTypes;
  message: string;
}

const CustomToast = ({ t, type, message }: CustomToastProps) => {
  const config = toastTypes[type];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl backdrop-blur-md border shadow-2xl shadow-dark-950/50 min-w-[280px] max-w-[420px]',
        config.className,
        t.visible ? 'animate-slide-up' : 'opacity-0',
      )}>
      <Icon
        className={clsx('w-5 h-5 mt-0.5 flex-shrink-0', config.iconColor)}
      />
      <p className='text-sm font-medium leading-relaxed text-dark-100 flex-1 pr-2'>
        {message}
      </p>
      <button
        onClick={() => toast.dismiss(t.id)}
        className='flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors duration-200 group'
        aria-label='Close notification'>
        <X className='w-4 h-4 text-dark-400 group-hover:text-dark-200' />
      </button>
    </div>
  );
};

// Toast functions
export const showToast = {
  success: (message: string) =>
    toast.custom(
      (t) => <CustomToast t={t} type='success' message={message} />,
      {
        duration: 4000,
        position: 'top-center',
      },
    ),

  error: (message: string) =>
    toast.custom((t) => <CustomToast t={t} type='error' message={message} />, {
      duration: 4000,
      position: 'top-center',
    }),

  warning: (message: string) =>
    toast.custom(
      (t) => <CustomToast t={t} type='warning' message={message} />,
      {
        duration: 4000,
        position: 'top-center',
      },
    ),

  info: (message: string) =>
    toast.custom((t) => <CustomToast t={t} type='info' message={message} />, {
      duration: 4000,
      position: 'top-center',
    }),
};

// Toaster provider component
export const ToastProvider = () => (
  <Toaster
    position='top-center'
    gutter={12}
    containerStyle={{
      top: 20,
    }}
    toastOptions={{
      duration: 4000,
      style: {
        background: 'transparent',
        boxShadow: 'none',
        padding: 0,
        margin: 0,
      },
    }}
  />
);

export default showToast;
