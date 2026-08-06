'use client';

import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPadding = firstDay.getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const paddingDays = Array.from({ length: startPadding }, (_, i) => prevMonthDays - startPadding + i + 1);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trailingCount = (7 - ((startPadding + daysInMonth) % 7)) % 7;
  const trailingDays = Array.from({ length: trailingCount }, (_, i) => i + 1);
  return { paddingDays, monthDays, trailingDays, monthLabel: firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const { appointments, attendance } = useClinic();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));

  const { paddingDays, monthDays, trailingDays, monthLabel } = useMemo(
    () => getMonthData(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const selectedAppointments = selectedDate ? appointments.filter(a => a.date === selectedDate) : [];
  const selectedAttendance = selectedDate ? attendance.filter(a => a.date === selectedDate) : [];

  const attendanceVariant = (status: string) => {
    if (status === 'Present') return 'success';
    if (status === 'Late') return 'warning';
    if (status === 'Leave') return 'primary';
    return 'danger';
  };

  return (
    <div className="space-y-6 pb-10">
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

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
          <Badge variant="success">Present</Badge>
          <Badge variant="warning">Late</Badge>
          <Badge variant="primary">Leave</Badge>
          <Badge variant="danger">Absent</Badge>
        </div>
      </div>

      <div className="luxury-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{monthLabel}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={goToPrevMonth} icon={<ChevronLeft className="w-4 h-4" />}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth} icon={<ChevronRight className="w-4 h-4" />}>
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 luxury-card p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 text-center">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {paddingDays.map(d => (
              <div key={`pad-${d}`} className="min-h-[70px] sm:min-h-[90px] p-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 text-xs font-bold">
                {d}
              </div>
            ))}

            {monthDays.map(dayNum => {
              const dayStr = toDateStr(viewYear, viewMonth, dayNum);
              const dayAppointments = appointments.filter(a => a.date === dayStr);
              const dayAttendance = attendance.filter(a => a.date === dayStr);
              const todayFlag = isToday(dayNum);
              const isSelected = selectedDate === dayStr;

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => setSelectedDate(dayStr)}
                  className={`min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                      : todayFlag
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-extrabold ${todayFlag ? 'bg-blue-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'}`}>
                      {dayNum}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden hidden sm:block">
                    {dayAppointments.slice(0, 2).map(apt => (
                      <div key={apt.id} className="p-1 rounded-lg bg-blue-50 dark:bg-slate-800 text-[10px] font-semibold text-blue-900 dark:text-blue-200 truncate">
                        {apt.time} {apt.clientName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-[9px] text-slate-500">+{dayAppointments.length - 2} more</div>
                    )}
                  </div>

                  {dayAttendance.length > 0 && (
                    <div className="mt-1 flex gap-0.5 flex-wrap">
                      {dayAttendance.slice(0, 3).map(att => (
                        <span
                          key={att.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            att.status === 'Present' ? 'bg-emerald-500' :
                            att.status === 'Late' ? 'bg-amber-500' :
                            att.status === 'Leave' ? 'bg-blue-500' : 'bg-rose-500'
                          }`}
                          title={`${att.staffName}: ${att.status}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}

            {trailingDays.map(d => (
              <div key={`trail-${d}`} className="min-h-[70px] sm:min-h-[90px] p-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 text-xs font-bold">
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="luxury-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              {selectedDate ? `Schedule — ${selectedDate}` : 'Select a date'}
            </h3>
            {selectedAppointments.length === 0 ? (
              <p className="text-xs text-slate-500">No appointments on this date.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedAppointments.map(apt => (
                  <div key={apt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-600">{apt.time}</span>
                      <Badge variant={apt.status === 'Confirmed' ? 'success' : apt.status === 'Cancelled' ? 'danger' : 'primary'} size="sm">
                        {apt.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{apt.clientName}</p>
                    <p className="text-xs text-slate-500">{apt.serviceName}</p>
                    <p className="text-xs text-slate-400 mt-1">with {apt.staffName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="luxury-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Staff Attendance
            </h3>
            {selectedAttendance.length === 0 ? (
              <p className="text-xs text-slate-500">No attendance records for this date.</p>
            ) : (
              <div className="space-y-2">
                {selectedAttendance.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{att.staffName}</p>
                      <p className="text-[10px] text-slate-500">{att.role}</p>
                    </div>
                    <Badge variant={attendanceVariant(att.status)} size="sm">{att.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
