'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ShieldCheck,
  CheckCheck,
  User,
  LogOut,
  Calendar,
  Sparkles,
  Command
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { authClient } from '../../lib/api/client';

export const Navbar: React.FC = () => {
  const {
    role,
    theme,
    toggleTheme,
    setIsCommandPaletteOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clinicInfo,
    appointments
  } = useClinic();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await authClient.logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      window.location.href = '/login';
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAptsCount = (appointments || []).filter(a => a.date === todayStr && a.status !== 'Cancelled').length;

  return (
    <header className="sticky top-0 z-20 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors">
      {/* Left Container: Live Clinic Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {clinicInfo.name}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {todayAptsCount} Active Treatments Today
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{currentDate}</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h4>
                    {unreadCount > 0 && (
                      <Badge variant="primary" size="sm">{unreadCount} new</Badge>
                    )}
                  </div>
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications available.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{notif.title}</h5>
                          <span className="text-[10px] text-slate-400 font-mono">{notif.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Avatar
              name={role === 'admin' ? 'Dr. Elena Rostova' : role === 'partner' ? 'Partner Account' : 'Staff Member'}
              size="sm"
              statusDot="online"
            />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {role === 'admin' ? 'Dr. Elena Rostova' : role === 'partner' ? 'Clinic Partner' : 'Staff Practitioner'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                    Role: {role} Mode
                  </p>
                </div>


                <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
                  <Link
                    href="/login"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};