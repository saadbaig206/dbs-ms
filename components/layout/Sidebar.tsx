'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  CreditCard,
  Sparkles,
  Package,
  DollarSign,
  Receipt,
  UserCheck,
  Users2,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Lock,
  Menu,
  X,
  ShieldCheck,
  MapPin,
  MessageSquare,
  Bell
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Badge } from '../ui/Badge';
import { authClient } from '../../lib/api/client';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { role, toggleRole, clinicInfo } = useClinic();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const menuItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
    { title: 'Appointments', href: '/appointments', icon: Calendar, adminOnly: false },
    { title: 'Clients', href: '/clients', icon: Users, adminOnly: false },
    { title: 'Billing', href: '/pos', icon: CreditCard, adminOnly: false },
    { title: 'Services', href: '/services', icon: Sparkles, adminOnly: false },
    { title: 'Inventory', href: '/inventory', icon: Package, adminOnly: false },
    { title: 'Branches', href: '/branches', icon: MapPin, adminOnly: true },
    { title: 'Finance & Reports', href: '/finance-reports', icon: DollarSign, adminOnly: true },
    {title: 'Staff', href: '/staff', icon: Users2, adminOnly: true },
    { title: 'Reminders', href: '/reminders', icon: Bell, adminOnly: false },
  ];

  const shortName = clinicInfo.name.split(' ')[0] || 'Clinic';
  const tagline = clinicInfo.name.split(' ').slice(1).join(' ') || 'Management System';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-3">
          
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-base font-extrabold text-white tracking-wider uppercase font-sans">
                {shortName}
              </h1>
              <p className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase">
                {tagline}
              </p>
            </motion.div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems
          .filter((item) => {
            if (role === 'partner') {
              return item.href === '/dashboard' || item.href === '/finance-reports';
            }
            if (role === 'staff') {
              return !item.adminOnly;
            }
            return true;
          })
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isRestricted = false; // Admin-only items are filtered out, so no items are restricted now

          return (
            <Link
              key={item.href}
              href={isRestricted ? '#' : item.href}
              onClick={(e) => {
                if (isRestricted) {
                  e.preventDefault();
                } else {
                  setIsMobileOpen(false);
                }
              }}
              className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all group ${
                isRestricted
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                  : 'hover:bg-slate-800/60 hover:text-white text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />

              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{item.title}</span>
                  {isRestricted ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  ) : item.adminOnly && role === 'admin' ? (
                    <span className="text-[10px] bg-slate-800 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                      ADM
                    </span>
                  ) : null}
                </div>
              )}

              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-slate-800">
                  {item.title} {isRestricted ? '(Admin Only)' : ''}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">

        <Link
          href="/login"
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-40 p-3.5 rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-700 transition-transform active:scale-95"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-xs h-full z-10"
            >
              <button
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block h-screen sticky top-0 transition-all duration-300 z-30 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {sidebarContent}
      </aside>
    </>
  );
};
