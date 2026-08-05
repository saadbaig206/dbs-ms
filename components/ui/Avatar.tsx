import React from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  statusDot?: 'online' | 'busy' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  statusDot,
  className
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative inline-block shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx('rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm', sizeMap[size], className)}
        />
      ) : (
        <div className={clsx(
          'rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center border border-white dark:border-slate-900 shadow-sm',
          sizeMap[size],
          className
        )}>
          {getInitials(name)}
        </div>
      )}

      {statusDot && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900 w-3 h-3',
            statusDot === 'online' && 'bg-emerald-500',
            statusDot === 'busy' && 'bg-amber-500',
            statusDot === 'offline' && 'bg-slate-400'
          )}
        />
      )}
    </div>
  );
};
