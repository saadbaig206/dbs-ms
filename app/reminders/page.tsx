'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Send, 
  XOctagon, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Calendar,
  User,
  Phone,
  Sparkles,
  HelpCircle,
  MapPin
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

function isReminderEligible(dateStr: string, timeStr: string): { eligible: boolean; hoursRemaining?: number } {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hours = 0;
    let minutes = 0;
    if (timeStr) {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
    }
    const aptDateTime = new Date(year, month - 1, day, hours, minutes, 0);
    const now = new Date();
    const diffMs = aptDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 24) {
      return { eligible: false, hoursRemaining: Math.ceil(diffHours - 24) };
    }
    return { eligible: true };
  } catch (e) {
    return { eligible: true };
  }
}

export default function RemindersPage() {
  const { 
    appointments, 
    sendAppointmentReminder, 
    rejectAppointmentReminder,
    markAppointmentReminderSent,
    branches,
    clinicInfo,
    isLoading,
    role
  } = useClinic();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Sent' | 'Rejected'>('Pending');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 animate-pulse font-bold">Loading reminders...</div>
      </div>
    );
  }

  // Filter pending/upcoming appointments
  const filteredAppointments = appointments.filter((apt) => {
    // Only display reminders for Pending or Confirmed status appointments
    if (apt.status !== 'Pending' && apt.status !== 'Confirmed') return false;

    // Filter by reminderStatus
    const remStatus = apt.reminderStatus || 'Pending';
    const matchesReminderFilter = statusFilter === 'All' || remStatus === statusFilter;
    if (!matchesReminderFilter) return false;

    // Filter by search text
    const matchesSearch = 
      apt.clientName.toLowerCase().includes(search.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      apt.phone.includes(search);
    
    return matchesSearch;
  });

  const handleSend = async (id: string, clientName: string) => {
    try {
      const apt = appointments.find(a => a.id === id);
      if (!apt) throw new Error('Appointment not found');

      const { eligible } = isReminderEligible(apt.date, apt.time);
      if (!eligible) {
        setToastMessage({
          text: 'Reminder sending option is available only 24 hours prior to the appointment.',
          type: 'error'
        });
        return;
      }

      // 1. Find branch & clinic details for the location
      const branch = branches.find(b => b.id === apt.branchId) || (branches.length > 0 ? branches[0] : null);
      const clinicName = clinicInfo?.name || 'Aura Luxury Clinic';
      const locationStr = branch
        ? `${branch.name} — ${branch.location}`
        : (clinicInfo?.address || 'Main Clinic Location');

      // 2. Format the message properly using the requested template
      const message = `Hi ${apt.clientName}!
This is a reminder that you have an appointment with ${clinicName} tomorrow.

Date: ${apt.date}
Time: ${apt.time}
Location: ${locationStr}

We look forward to seeing you! If you need to reschedule, please contact us.

Thank you!`;

      // 3. Normalize the phone number (keeping only digits)
      let cleanPhone = apt.phone.replace(/\D/g, '');
      // If it's a Pakistani local number starting with 0, convert to 92 international format
      if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = '92' + cleanPhone.substring(1);
      }

      // 4. Open WhatsApp Web Click-to-Chat link
      const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(waUrl, 'whatsapp_window');

      // 5. Update state in the database to 'Sent'
      await markAppointmentReminderSent(id);

      setToastMessage({
        text: `Reminder WhatsApp opened and marked as sent for ${clientName}!`,
        type: 'success'
      });
    } catch (e: any) {
      setToastMessage({
        text: `Failed to open WhatsApp reminder: ${e.message || e}`,
        type: 'error'
      });
    }
  };

  const handleReject = async (id: string, clientName: string) => {
    try {
      await rejectAppointmentReminder(id);
      setToastMessage({
        text: `Reminder request dismissed for ${clientName}.`,
        type: 'success'
      });
    } catch (e: any) {
      setToastMessage({
        text: `Failed to reject reminder: ${e.message || e}`,
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Appointment Reminders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch upcoming booking reminders to clients via WhatsApp Bot API.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(['Pending', 'Sent', 'Rejected', 'All'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {filter} {filter !== 'All' ? 'Queue' : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by client or treatment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="w-full md:w-80"
          />
        </div>
      </div>

      {/* Reminders Queue List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAppointments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="luxury-card p-8 text-center text-slate-500 dark:text-slate-400"
            >
              <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="font-bold text-sm">No appointments in the selected reminder queue.</p>
              <p className="text-xs text-slate-400 mt-1">New scheduled bookings will appear here automatically.</p>
            </motion.div>
          ) : (
            filteredAppointments.map((apt) => {
              const remStatus = apt.reminderStatus || 'Pending';
              const { eligible, hoursRemaining } = isReminderEligible(apt.date, apt.time);

              return (
                <motion.div
                  key={apt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="luxury-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      remStatus === 'Sent'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : remStatus === 'Rejected'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {apt.clientName}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {apt.id}
                        </Badge>
                        <Badge 
                          variant={
                            remStatus === 'Sent'
                              ? 'success'
                              : remStatus === 'Rejected'
                              ? 'danger'
                              : 'warning'
                          } 
                          size="sm"
                        >
                          Reminder: {remStatus}
                        </Badge>

                        {remStatus === 'Pending' && !eligible && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                            Available 24h prior (in ~{hoursRemaining}h)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                          {apt.serviceName}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {apt.date} @ {apt.time}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          {apt.phone}
                        </span>
                        {(() => {
                          const b = branches.find(br => br.id === apt.branchId) || (branches.length > 0 ? branches[0] : null);
                          return b ? (
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              {b.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {remStatus === 'Pending' && (
                      <>
                        <Button
                          onClick={() => handleReject(apt.id, apt.clientName)}
                          variant="outline"
                          size="sm"
                          icon={<XOctagon className="w-4 h-4" />}
                          className="hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-900/60 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300"
                        >
                          Reject
                        </Button>
                        {eligible ? (
                          <Button
                            onClick={() => handleSend(apt.id, apt.clientName)}
                            variant="primary"
                            size="sm"
                            icon={<Send className="w-4 h-4" />}
                          >
                            Send Reminder
                          </Button>
                        ) : (
                          <Button
                            disabled
                            variant="outline"
                            size="sm"
                            icon={<Send className="w-4 h-4 opacity-40" />}
                            className="opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-800"
                            title="Reminder option becomes available 24 hours prior to appointment"
                          >
                            Send Reminder (24h Prior)
                          </Button>
                        )}
                      </>
                    )}

                    {remStatus === 'Sent' && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Message Sent
                      </span>
                    )}

                    {remStatus === 'Rejected' && (
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3 py-1.5 rounded-xl">
                        <XOctagon className="w-4 h-4" /> Dismissed
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span className="text-xs font-semibold">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
