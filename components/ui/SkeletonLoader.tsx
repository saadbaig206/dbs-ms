import React from 'react';
import { clsx } from 'clsx';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('p-5 rounded-[20px] bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-800/80', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      </div>
      <div className="h-8 w-36 bg-slate-200 dark:bg-slate-700 rounded-md mb-2"></div>
      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
    </div>
  );
};

export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full max-w-[120px]"></div>
        </td>
      ))}
    </tr>
  );
};
