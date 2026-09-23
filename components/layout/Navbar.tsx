'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  ShieldCheck,
  CheckCheck,
  User,
  LogOut,
  Calendar,
  Sparkles,
  Command,
  Trash2
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { authClient } from '../../lib/api/client';

export const Navbar: React.FC = () => {
  const {
    role,
    userEmail,
    staff,
    theme,
    toggleTheme,
    setIsCommandPaletteOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clinicInfo,
    appointments
  } = useClinic();

  const userName = React.useMemo(() => {
    const effectiveEmail =
      userEmail ||
      (typeof window !== 'undefined' ? localStorage.getItem('user_email') : null);

    if (effectiveEmail) {
      const matchingStaff = (staff || []).find(
        s => s.email && s.email.toLowerCase().trim() === effectiveEmail.toLowerCase().trim()
      );
      if (matchingStaff?.name) {
        return matchingStaff.name;
      }

      const rawName = effectiveEmail.includes('@') ? effectiveEmail.split('@')[0] : effectiveEmail;
      const lower = rawName.toLowerCase().replace(/[\.\s_]/g, '');

      if (lower === 'admin' || lower === 'administrator') return 'Admin User';
      if (lower === 'drzaini' || lower === 'drzaini109' || lower === 'zaini') return 'Dr. Zaini';

      return rawName
        .split(/[\._\-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    const effectiveRole =
      role ||
      (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null);

    if (effectiveRole === 'admin') return 'Admin User';
    if (effectiveRole === 'partner') return 'Clinic Partner';
    return 'Staff Practitioner';
  }, [userEmail, staff, role]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when tapping outside anywhere on the screen
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const displayNotifications = React.useMemo(() => {
    if (role === 'partner') {
      return notifications.filter(n => {
        // Do not show inventory alerts on partner role
        if (n.type === 'inventory') return false;
        const titleLower = (n.title || '').toLowerCase();
        const msgLower = (n.message || '').toLowerCase();
        if (
          titleLower.includes('inventory') ||
          titleLower.includes('stock') ||
          msgLower.includes('inventory') ||
          msgLower.includes('stock')
        ) {
          return false;
        }

        const typeMatch = n.type === 'vendor_approval' || n.type === 'vendor';
        const textMatch = titleLower.includes('vendor') ||
                          titleLower.includes('delete') ||
                          titleLower.includes('approval') ||
                          msgLower.includes('vendor') ||
                          msgLower.includes('delete') ||
                          msgLower.includes('approval');
        return typeMatch || textMatch;
      });
    }
    return notifications;
  }, [notifications, role]);

  const unreadCount = displayNotifications.filter(n => !n.read).length;
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
    <header className="sticky top-0 z-20 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-8 py-3 flex items-center justify-between transition-colors">
      {/* Left Container: Live Clinic Status */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight truncate max-w-[150px] sm:max-w-xs">
              {clinicInfo.name}
            </span>
          </div>
          <div className="hidden sm:block h-4 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0" />
          <span className="hidden sm:inline-flex text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg shrink-0">
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

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h4>
                    {unreadCount > 0 && (
                      <Badge variant="primary" size="sm">{unreadCount} new</Badge>
                    )}
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await markAllNotificationsRead();
                      } catch (err) {
                        console.error("Failed to mark all read:", err);
                      }
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {displayNotifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications available.
                    </div>
                  ) : (
                    displayNotifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 flex justify-between items-start gap-3 group relative ${
                          !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{notif.title}</h5>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{notif.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-6">{notif.message}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 self-center">
                          {!notif.read && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await markNotificationRead(notif.id);
                                } catch (err) {
                                  console.error("Failed to mark read:", err);
                                }
                              }}
                              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Mark as read"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteNotification(notif.id);
                              } catch (err) {
                                console.error("Failed to delete notification:", err);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Avatar
              name={userName}
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
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {userName}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                    Role: {role} Mode
                  </p>
                </div>

                <div className="pt-1">
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