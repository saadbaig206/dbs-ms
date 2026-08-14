'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  Users, 
  CreditCard, 
  UserCheck, 
  Sparkles, 
  Package, 
  DollarSign, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  ShieldCheck,
  Plus,
  MapPin
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { CLINIC_INFO } from '../../lib/constants/clinic';

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, role, toggleRole } = useClinic();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Navigation', adminOnly: false },
    { title: 'Bookings & Schedule', href: '/bookings', icon: Calendar, category: 'Navigation', adminOnly: false },
    { title: 'Calendar Register', href: '/calendar', icon: Calendar, category: 'Navigation', adminOnly: false },
    { title: 'Billing', href: '/pos', icon: CreditCard, category: 'Navigation', adminOnly: false },
    { title: 'Client Directory', href: '/clients', icon: Users, category: 'Navigation', adminOnly: false },
    { title: 'Services Catalog', href: '/services', icon: Sparkles, category: 'Navigation', adminOnly: false },
    { title: 'Inventory Management', href: '/inventory', icon: Package, category: 'Navigation', adminOnly: false },
    { title: 'Branches Management', href: '/branches', icon: MapPin, category: 'Navigation', adminOnly: true },
    { title: 'Staff Directory', href: '/staff', icon: UserCheck, category: 'Navigation', adminOnly: true },
    { title: 'Attendance Matrix', href: '/attendance', icon: UserCheck, category: 'Navigation', adminOnly: false },
    { title: 'Financial Analytics', href: '/finance', icon: DollarSign, category: 'Navigation', adminOnly: true },
    { title: 'Expense Tracker', href: '/expenses', icon: Receipt, category: 'Navigation', adminOnly: true },
    { title: 'Reports Hub', href: '/reports', icon: BarChart3, category: 'Navigation', adminOnly: true },
    { title: 'Clinic Settings', href: '/settings', icon: SettingsIcon, category: 'Navigation', adminOnly: true },
  ];

  const filteredItems = navItems.filter(item => {
    if (role === 'staff' && item.adminOnly) return false;
    return item.title.toLowerCase().includes(query.toLowerCase());
  });

  const handleSelect = (href: string) => {
    setIsCommandPaletteOpen(false);
    setQuery('');
    router.push(href);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isCommandPaletteOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }

      if (!isCommandPaletteOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsCommandPaletteOpen(false);
        return;
      }

      const totalLength = filteredItems.length + 1; // +1 for Switch Role item

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => (prevIndex + 1) % totalLength);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => (prevIndex - 1 + totalLength) % totalLength);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex === 0) {
          toggleRole();
          setIsCommandPaletteOpen(false);
        } else {
          const item = filteredItems[selectedIndex - 1];
          if (item) {
            handleSelect(item.href);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen, selectedIndex, filteredItems, toggleRole]);

  if (!isCommandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCommandPaletteOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
        >
          {/* Input Bar */}
          <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800 py-3">
            <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search pages, actions, client files... (e.g. POS, Bookings)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline-block text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
          </div>

          {/* Quick Actions */}
          <div className="p-2 max-h-[350px] overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Switch Role
            </div>
            <button
              onClick={() => {
                toggleRole();
                setIsCommandPaletteOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-colors mb-2 ${
                selectedIndex === 0 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 ${selectedIndex === 0 ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>Switch Role (Current: <strong className="uppercase">{role}</strong>)</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                selectedIndex === 0 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              }`}>
                Toggle
              </span>
            </button>

            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation ({filteredItems.length})
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching results found for "{query}".
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === idx + 1;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-colors group ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-blue-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`font-medium ${
                        isSelected ? 'text-white' : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        {item.title}
                      </span>
                    </div>
                    <span className={`text-[11px] font-mono ${
                      isSelected ? 'text-white/85' : 'text-slate-400'
                    }`}>
                      {item.href}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{CLINIC_INFO.name} Command Palette</span>
            <span>Use ↑ ↓ to navigate, ↵ to select</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
