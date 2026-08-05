'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Sparkles, Save, Download, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function SettingsPage() {
  const { theme, toggleTheme, role } = useClinic();

  const [clinicName, setClinicName] = useState('DBS Aesthetics Clinic and Salon');
  const [phone, setPhone] = useState('+92 321 1112337');
  const [email, setEmail] = useState('dbs@gmail.com');
  const [address, setAddress] = useState('13-C Khayaban-e-Saadi, phase 7, opposite to TM roots pharmacy, Phase 7 Ext Karachi, 75500, Pakistan');
  const [currency, setCurrency] = useState('PKR (Rs)');
  const [language, setLanguage] = useState('English (US), Urdu (Ur)');
  const [isSaved, setIsSaved] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Clinic Settings & Branding
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure clinic profile, currency, location details, theme preferences, and data backups.
          </p>
        </div>

        <Badge variant="gold" size="md">
          <Sparkles className="w-4 h-4 mr-1 inline" /> VIP Enterprise License
        </Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Clinic Identity Card */}
        <div className="luxury-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Clinic Branding & Contact Info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Clinic Official Name"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              required
            />
            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Official Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
        </div>

        {/* System & Currency Settings */}
        <div className="luxury-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Regional & Interface Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="System Currency"
              options={[
                { label: 'PKR (Rs) - Pak Rupee', value: 'PKR (Rs)' },
              ]}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />

            <Select
              label="System Language"
              options={[
                { label: 'English (US)', value: 'English (US)' },
                { label: 'Urdu (Ur)', value: 'Urdu (Ur)' },
              ]}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
        </div>

        {/* Data Backup & Export UI */}
        <div className="luxury-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Database Backup & Export Controls
          </h3>

          <p className="text-xs text-slate-500">
            Export a full snapshot JSON archive of all appointments, clients, staff, inventory items, and transaction logs.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              icon={<Download className="w-4 h-4" />}
              onClick={() => alert('Exporting full clinic JSON backup file...')}
            >
              Export JSON Backup Snapshot
            </Button>
            <Button
              type="button"
              variant="outline"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => alert('Select JSON file to import snapshot...')}
            >
              Import JSON Snapshot
            </Button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {isSaved ? (
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Clinic Settings Saved Successfully!
            </span>
          ) : (
            <span className="text-xs text-slate-400">Changes will apply across the portal immediately.</span>
          )}

          <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
