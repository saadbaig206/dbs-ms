'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Button } from '../../components/ui/Button';

import { authClient } from '../../lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const { setRole, refreshData, clinicInfo } = useClinic();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authClient.login(email, password);
      setRole(data.role);
      
      // Force refreshing the context data now that we are logged in
      await refreshData();

      setTimeout(() => {
        setIsLoading(false);
        if (data.role === 'staff') {
          router.push('/pos');
        } else {
          router.push('/dashboard');
        }
      }, 600);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F17] text-slate-100 p-4 sm:p-6 overflow-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-[32px] p-8 shadow-2xl relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-sans leading-tight">
            {clinicInfo.name}
          </h1>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mt-1">
            POS & Management System
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            variant="primary"
            size="lg"
            className="w-full mt-2"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Clinic Portal
          </Button>
        </form>

        {/* Credentials Helper */}
        <div className="mt-6 pt-4 border-t border-slate-800/50">
          <div className="text-center space-y-1">
            <p className="text-[10px] text-slate-500 font-medium">Demo Credentials (Click to Autofill)</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-[10px] text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@gmail.com');
                  setPassword('admin');
                  setError('');
                }}
                className="hover:text-blue-300 transition-colors cursor-pointer text-left sm:text-center focus:outline-none"
              >
                Admin: <span className="text-blue-400 font-bold underline">admin@gmail.com</span> / <span className="text-blue-400 font-bold underline">admin</span>
              </button>
              <span className="hidden sm:inline text-slate-600">|</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('staff@gmail.com');
                  setPassword('staff');
                  setError('');
                }}
                className="hover:text-indigo-300 transition-colors cursor-pointer text-left sm:text-center focus:outline-none"
              >
                Staff: <span className="text-indigo-400 font-bold underline">staff@gmail.com</span> / <span className="text-indigo-400 font-bold underline">staff</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}