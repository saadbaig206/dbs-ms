'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  List,
  CalendarCheck
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
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

export default function AppointmentsPage() {
  const { appointments, addAppointment, updateAppointmentStatus, deleteAppointment, staff, services, setPrintData } = useClinic();

  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Tomorrow' | 'Week'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Calendar Specific States
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [aptDate, setAptDate] = useState(new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('11:00 AM');
  const [aptNotes, setAptNotes] = useState('');

  // Check for staff double-booking collisions
  const hasCollision = useMemo(() => {
    if (!selectedStaffId || !aptDate || !aptTime) return false;
    return appointments.some(
      (a) => a.staffId === selectedStaffId && a.date === aptDate && a.time === aptTime
    );
  }, [appointments, selectedStaffId, aptDate, aptTime]);

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

  // Filtered list for table view
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(search.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      apt.phone.includes(search);

    const matchesStatus = statusFilter === 'All' || apt.status === statusFilter;

    let matchesDate = true;
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateFilter === 'Today') {
      matchesDate = apt.date === todayStr;
    } else if (dateFilter === 'Tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      matchesDate = apt.date === tomorrow.toISOString().split('T')[0];
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const selectedAppointments = selectedDate ? appointments.filter(a => a.date === selectedDate) : [];

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceObj = services.find(s => s.id === selectedServiceId);
    const staffObj = staff.find(st => st.id === selectedStaffId);

    if (!serviceObj || !staffObj) return;

    addAppointment({
      clientId: `CLT-${Math.floor(Math.random() * 900) + 100}`,
      clientName: newClientName || 'VIP Guest',
      phone: newPhone || '+1 (555) 000-1122',
      serviceId: serviceObj.id,
      serviceName: serviceObj.name,
      staffId: staffObj.id,
      staffName: staffObj.name,
      date: aptDate,
      time: aptTime,
      status: 'Confirmed',
      notes: aptNotes,
      price: serviceObj.price
    });

    setIsModalOpen(false);
    setNewClientName('');
    setNewPhone('');
    setAptNotes('');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Book and manage client appointments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>

          <Button onClick={() => setIsModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            New Booking
          </Button>
        </div>
      </div>

      {activeView === 'list' ? (
        <>
          {/* Filter & Search Bar */}
          <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['All', 'Today', 'Tomorrow', 'Week'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDateFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dateFilter === tab
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Input
                placeholder="Search by client or treatment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="w-full md:w-64"
              />

              <Select
                options={[
                  { label: 'All Statuses', value: 'All' },
                  { label: 'Confirmed', value: 'Confirmed' },
                  { label: 'In-Progress', value: 'In-Progress' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Pending', value: 'Pending' }
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Appointment Table */}
          <div className="luxury-card p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">ID</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Treatment Service</th>
                    <th className="py-3.5 px-4">Assigned Doctor</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Fee</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                        No appointments match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500 font-bold">
                          {apt.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{apt.clientName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{apt.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                          {apt.serviceName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                          {apt.staffName}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{apt.date}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{apt.time}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {formatPKR(apt.price, { decimals: false })}
                        </td>
                        <td className="py-3.5 px-4">
                          <Select
                            options={[
                              { label: 'Confirmed', value: 'Confirmed' },
                              { label: 'In-Progress', value: 'In-Progress' },
                              { label: 'Completed', value: 'Completed' },
                              { label: 'Cancelled', value: 'Cancelled' }
                            ]}
                            value={apt.status}
                            onChange={(e) => updateAppointmentStatus(apt.id, e.target.value as any)}
                            className="py-1 px-2 text-xs w-32"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => setPrintData({ title: `Slip ${apt.id}`, type: 'slip', data: apt })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                            title="Print Confirmation Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteAppointment(apt.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Calendar Controls */}
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
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
            </div>
          </div>
        </>
      )}

      {/* New Booking Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Treatment Appointment"
        description="Book a luxury treatment session for a VIP client"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Client Name"
              placeholder="e.g. Victoria Beckham"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+1 (555) 000-0000"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Treatment Service"
              options={services.map((s) => ({ label: `${s.name} (${formatPKR(s.price, { decimals: false })})`, value: s.id }))}
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            />
            <Select
              label="Assigned Specialist"
              options={staff.map((st) => ({ label: `${st.name} (${st.role})`, value: st.id }))}
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={aptDate}
              onChange={(e) => setAptDate(e.target.value)}
              required
            />
            <Select
              label="Time Slot"
              options={[
                { label: '09:00 AM', value: '09:00 AM' },
                { label: '10:30 AM', value: '10:30 AM' },
                { label: '11:30 AM', value: '11:30 AM' },
                { label: '01:00 PM', value: '01:00 PM' },
                { label: '02:30 PM', value: '02:30 PM' },
                { label: '04:00 PM', value: '04:00 PM' },
                { label: '05:30 PM', value: '05:30 PM' }
              ]}
              value={aptTime}
              onChange={(e) => setAptTime(e.target.value)}
            />
          </div>

          <Input
            label="Special Clinical Notes"
            placeholder="e.g. Skin sensitivity, pre-treatment instructions..."
            value={aptNotes}
            onChange={(e) => setAptNotes(e.target.value)}
          />

          {hasCollision && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
              <span className="text-sm font-bold">⚠️ Warning:</span>
              This specialist is already booked for an appointment at this date and time slot.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm & Save Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
