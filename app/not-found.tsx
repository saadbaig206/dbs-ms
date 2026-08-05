'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xl shadow-blue-500/10 border border-blue-100 dark:border-blue-900/40"
      >
        <Sparkles className="w-10 h-10" />
      </motion.div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-6xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight">
          404
        </h1>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Page Not Found
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          The clinic portal page you are looking for does not exist or has been relocated.
        </p>
      </div>

      <Link href="/dashboard">
        <Button variant="primary" icon={<Home className="w-4 h-4" />}>
          Return to Executive Dashboard
        </Button>
      </Link>
    </div>
  );
}
