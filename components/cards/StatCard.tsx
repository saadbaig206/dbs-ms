'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  sparklineColor?: string;
  colorVariant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'up',
  icon,
  subtitle,
  colorVariant = 'blue'
}) => {
  const iconBgMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40',
    emerald: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40',
    amber: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40',
    rose: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40',
    indigo: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40',
    purple: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="luxury-card p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs', iconBgMap[colorVariant])}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-3 min-w-0">
        {trend && (
          <div className="flex items-center gap-1 text-xs font-bold shrink-0">
            {trendDirection === 'up' && (
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                <TrendingUp className="w-3 h-3 shrink-0" /> <span>{trend}</span>
              </span>
            )}
            {trendDirection === 'down' && (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                <TrendingDown className="w-3 h-3 shrink-0" /> <span>{trend}</span>
              </span>
            )}
            {trendDirection === 'neutral' && (
              <span className="inline-flex items-center text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                {trend}
              </span>
            )}
          </div>
        )}

        {subtitle && (
          <span
            className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate text-right ml-auto min-w-0"
            title={typeof subtitle === 'string' ? subtitle : undefined}
          >
            {subtitle}
          </span>
        )}
      </div>
    </motion.div>
  );
};
