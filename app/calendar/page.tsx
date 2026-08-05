'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Sparkles } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function CalendarPage() {
  const { appointments, attendance } = useClinic();
  const [currentMonth, setCurrentMonth] = useState('August 2026');

  // Days of August 2026 (starting Saturday Aug 1)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const paddingDays = [26, 27, 28, 29, 30, 31]; // Previous July padding

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Clinic Schedule Calendar & Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual appointment schedule & staff presence register.
          </p>
        </div>

        {/* Attendance Legend */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
          <Badge variant="success">Green: Present</Badge>
          <Badge variant="warning">Yellow: Late</Badge>
          <Badge variant="primary">Blue: Leave</Badge>
          <Badge variant="danger">Red: Absent</Badge>
        </div>
      </div>

      {/* Month Navigator Bar */}
      <div className="luxury-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{currentMonth}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<ChevronLeft className="w-4 h-4" />}>
            Prev Month
          </Button>
          <Button variant="outline" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
            Next Month
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="luxury-card p-6">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-2 mb-4 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-xs font-black uppercase tracking-wider text-slate-400">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* July Padding */}
          {paddingDays.map((d) => (
            <div key={`jul-${d}`} className="min-h-[110px] p-2 rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 text-slate-300 dark:text-slate-700 text-xs font-bold border border-transparent">
              {d}
            </div>
          ))}

          {/* August Days */}
          {daysInMonth.map((dayNum) => {
            const dayStr = `2026-08-${String(dayNum).padStart(2, '0')}`;
            const dayAppointments = appointments.filter((a) => a.date === dayStr);
            const isToday = dayNum === 5;

            return (
              <div
                key={`aug-${dayNum}`}
                className={`min-h-[110px] p-2.5 rounded-2xl border transition-all ${
                  isToday
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-extrabold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'}`}>
                    {dayNum}
                  </span>
                  {dayAppointments.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-md">
                      {dayAppointments.length} apt
                    </span>
                  )}
                </div>

                {/* Day Appointments */}
                <div className="space-y-1.5 overflow-hidden">
                  {dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-1.5 rounded-xl bg-blue-50/90 dark:bg-slate-800 text-[11px] font-semibold text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-slate-700 truncate shadow-2xs"
                      title={`${apt.clientName} - ${apt.serviceName} (${apt.time})`}
                    >
                      <div className="font-bold truncate">{apt.time} • {apt.clientName}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-300 truncate">{apt.serviceName}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
