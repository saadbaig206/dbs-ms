'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Settings as SettingsIcon, Sparkles, Save, Download, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { CLINIC_INFO } from '../../lib/constants/clinic';
import { formatPhoneInput } from '../../lib/utils/phone';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function SettingsPage() {
  const { theme, toggleTheme, role, clinicInfo, updateClinicInfo, isLoading, clients, staff, services, inventory, appointments } = useClinic();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const [clinicName, setClinicName] = useState<string>(clinicInfo?.name || '');
  const [phone, setPhone] = useState<string>(clinicInfo?.phone || '');
  const [email, setEmail] = useState<string>(clinicInfo?.email || '');
  const [address, setAddress] = useState<string>(clinicInfo?.address || '');
  const [currency, setCurrency] = useState<string>(clinicInfo?.currency || 'PKR (Rs)');
  const [language, setLanguage] = useState<string>(clinicInfo?.language || 'English (US)');
  const [operatingHours, setOperatingHours] = useState<string>(clinicInfo?.operatingHours || '11:00 AM - 08:00 PM (Mon-Sat)');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 animate-pulse font-bold">Loading...</div>
      </div>
    );
  }

  // Sync state with context when context loads/updates
  useEffect(() => {
    if (clinicInfo) {
      setClinicName(clinicInfo.name);
      setPhone(clinicInfo.phone);
      setEmail(clinicInfo.email);
      setAddress(clinicInfo.address);
      setCurrency(clinicInfo.currency);
      setLanguage(clinicInfo.language);
      setOperatingHours(clinicInfo.operatingHours || '11:00 AM - 08:00 PM (Mon-Sat)');
    }
  }, [clinicInfo]);

  // Reset save state after 3 seconds
  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => {
        setIsSaved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateClinicInfo({
      name: clinicName,
      phone,
      email,
      address,
      currency,
      language,
      operatingHours
    });
    setIsSaved(true);
  };

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setIsSaved(false);
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        clinicInfo,
        exportedAt: new Date().toISOString(),
        clientsCount: clients?.length || 0,
        staffCount: staff?.length || 0,
        servicesCount: services?.length || 0,
        inventoryCount: inventory?.length || 0,
        clients: clients || [],
        staff: staff || [],
        services: services || [],
        inventory: inventory || [],
        appointments: appointments || [],
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dbs-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMsg({ text: 'Backup snapshot exported successfully!', type: 'success' });
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (err: any) {
      setBackupMsg({ text: 'Failed to export backup: ' + (err.message || err), type: 'error' });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.clinicInfo) {
          updateClinicInfo(json.clinicInfo);
        }
        setBackupMsg({ text: `Backup file "${file.name}" validated successfully!`, type: 'success' });
        setTimeout(() => setBackupMsg(null), 4000);
      } catch (err) {
        setBackupMsg({ text: 'Invalid JSON backup file format.', type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

      {/* Security Advisory Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-[20px] flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Security Recommendation:</strong> Ensure default administrator login credentials have been updated to a strong, confidential password in production.
          </span>
        </div>
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
              onChange={(e) => handleFieldChange(setClinicName, e.target.value)}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="e.g. +92 3001234567"
              value={phone}
              onChange={(e) => handleFieldChange(setPhone, formatPhoneInput(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Official Email"
              type="email"
              value={email}
              onChange={(e) => handleFieldChange(setEmail, e.target.value)}
              required
            />
            <Input
              label="Address"
              value={address}
              onChange={(e) => handleFieldChange(setAddress, e.target.value)}
              required
            />
            <Input
              label="Operating Hours / Clinic Timing"
              value={operatingHours}
              onChange={(e) => handleFieldChange(setOperatingHours, e.target.value)}
              placeholder="e.g. 11:00 AM - 08:00 PM (Mon-Sat)"
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
              onChange={(e) => handleFieldChange(setCurrency, e.target.value)}
            />

            <Select
              label="System Language"
              options={[
                { label: 'English (US)', value: 'English (US)' },
                { label: 'Urdu (Ur)', value: 'Urdu (Ur)' },
              ]}
              value={language}
              onChange={(e) => handleFieldChange(setLanguage, e.target.value)}
            />
          </div>
        </div>

        {/* Data Backup & Export UI */}
        <div className="luxury-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Database Backup & Export Controls
          </h3>

          <p className="text-xs text-slate-500">
            Export a full snapshot JSON archive of all appointments, clients, staff, inventory items, and clinic settings.
          </p>

          {backupMsg && (
            <div className={clsx(
              "p-3 rounded-xl text-xs font-semibold flex items-center gap-2",
              backupMsg.type === 'success'
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            )}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{backupMsg.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json,application/json"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportBackup}
            >
              Export JSON Backup Snapshot
            </Button>
            <Button
              type="button"
              variant="outline"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
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