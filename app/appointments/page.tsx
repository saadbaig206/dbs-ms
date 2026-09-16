'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  CalendarDays,
  Clock3,
  CreditCard
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { formatPhoneInput } from '../../lib/utils/phone';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { getLocalDateString } from '../../lib/utils/date';

export default function AppointmentsPage() {
  const router = useRouter();
  const { appointments, addAppointment, updateAppointmentStatus, deleteAppointment, staff, services, setPrintData, branches, selectedBranchId, userBranchId } = useClinic();

  const [filterBranchId, setFilterBranchId] = useState<string>('');

  useEffect(() => {
    if (userBranchId) {
      setFilterBranchId(userBranchId);
    } else if (selectedBranchId) {
      setFilterBranchId(selectedBranchId);
    }
  }, [userBranchId, selectedBranchId]);

  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Tomorrow' | 'Week'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 30-minute interval time slots from 11:00 AM to 08:00 PM
  const ALL_30_MIN_SLOTS = useMemo(() => [
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
    '07:00 PM', '07:30 PM', '08:00 PM'
  ], []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newPhone, setNewPhone] = useState('+92 ');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [category, setCategory] = useState<'treatment' | 'consultation'>('treatment');
  const [aptDate, setAptDate] = useState(getLocalDateString());
  const [aptTime, setAptTime] = useState('11:00 AM');
  const [aptNotes, setAptNotes] = useState('');

  // Get unbooked 30-min slots for a given date & specialist
  const getAvailableTimeSlots = (targetDate: string, staffId: string, currentSlotTime?: string) => {
    if (!targetDate) return ALL_30_MIN_SLOTS;

    const bookedTimes = appointments
      .filter(a => a.date === targetDate && a.status !== 'Cancelled' && (!staffId || a.staffId === staffId))
      .map(a => a.time);

    return ALL_30_MIN_SLOTS.filter(slot => {
      if (currentSlotTime && slot === currentSlotTime) return true;
      return !bookedTimes.includes(slot);
    });
  };

  // Available slots for single session
  const availableSingleSlots = useMemo(() => {
    return getAvailableTimeSlots(aptDate, selectedStaffId, aptTime);
  }, [appointments, aptDate, selectedStaffId, aptTime]);

  const singleSlotOptions = useMemo(() => {
    if (availableSingleSlots.length === 0) {
      return [{ label: 'Fully Booked (No Slots Available)', value: '' }];
    }
    return availableSingleSlots.map(slot => ({ label: slot, value: slot }));
  }, [availableSingleSlots]);

  // Auto-sync single slot time if current selection is booked
  useEffect(() => {
    if (numberOfSessions === 1) {
      const freeSlots = getAvailableTimeSlots(aptDate, selectedStaffId);
      if (freeSlots.length > 0 && !freeSlots.includes(aptTime)) {
        setAptTime(freeSlots[0]);
      }
    }
  }, [aptDate, selectedStaffId, appointments]);

  // Multi-session State
  const [numberOfSessions, setNumberOfSessions] = useState<number>(1);
  const [sessionsList, setSessionsList] = useState<Array<{ sessionNumber: number; date: string; time: string }>>([
    { sessionNumber: 1, date: getLocalDateString(), time: '11:00 AM' }
  ]);

  const handleSessionsCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setNumberOfSessions(validCount);

    setSessionsList(prev => {
      const nextList: Array<{ sessionNumber: number; date: string; time: string }> = [];
      const baseDate = new Date(aptDate || getLocalDateString());

      for (let i = 0; i < validCount; i++) {
        const sessDate = new Date(baseDate);
        sessDate.setDate(sessDate.getDate() + (i * 7));
        const dateStr = getLocalDateString(sessDate);
        const freeSlots = getAvailableTimeSlots(dateStr, selectedStaffId);
        const defaultTime = freeSlots[0] || '11:00 AM';

        if (prev[i]) {
          nextList.push({
            ...prev[i],
            sessionNumber: i + 1,
            time: freeSlots.includes(prev[i].time) ? prev[i].time : defaultTime
          });
        } else {
          nextList.push({
            sessionNumber: i + 1,
            date: dateStr,
            time: defaultTime
          });
        }
      }
      return nextList;
    });
  };

  const handleUpdateSession = (index: number, field: 'date' | 'time', value: string) => {
    setSessionsList(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  // Check for staff double-booking collisions
  const hasCollision = useMemo(() => {
    if (!selectedStaffId || !aptDate || !aptTime) return false;
    return appointments.some(
      (a) => a.staffId === selectedStaffId && a.date === aptDate && a.time === aptTime && a.status !== 'Cancelled'
    );
  }, [appointments, selectedStaffId, aptDate, aptTime]);

  // Filtered list for table view
  const filteredAppointments = appointments.filter((apt) => {
    const matchesBranch = !filterBranchId || apt.branchId === filterBranchId;

    const matchesSearch =
      apt.clientName.toLowerCase().includes(search.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      apt.phone.includes(search);

    const matchesStatus = statusFilter === 'All' || apt.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || apt.category === categoryFilter;

    let matchesDate = true;
    const todayStr = getLocalDateString();
    if (dateFilter === 'Today') {
      matchesDate = apt.date === todayStr;
    } else if (dateFilter === 'Tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      matchesDate = apt.date === getLocalDateString(tomorrow);
    }

    return matchesBranch && matchesSearch && matchesStatus && matchesDate && matchesCategory;
  });

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const serviceObj = services.find(s => s.id === selectedServiceId);
    const staffObj = staff.find(st => st.id === selectedStaffId);

    if (!serviceObj || !staffObj) return;

    if (newClientName.trim().length < 3) {
      alert("Client Name must be at least 3 characters long");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(newClientName.trim())) {
      alert("Client Name must contain only letters and spaces");
      return;
    }
    if (!/^\+92\s?\d{9,10}$/.test(newPhone)) {
      alert("Please enter a valid Pakistani phone number (+92 followed by 9-10 digits)");
      return;
    }

    setIsSubmitting(true);

    try {
      if (numberOfSessions === 1) {
        await addAppointment({
          clientId: `CLT-${Math.floor(Math.random() * 900) + 100}`,
          clientName: newClientName,
          phone: newPhone.replace(/\s+/g, ''),
          serviceId: serviceObj.id,
          serviceName: serviceObj.name,
          staffId: staffObj.id,
          staffName: staffObj.name,
          date: aptDate,
          time: aptTime,
          status: 'Confirmed',
          notes: aptNotes,
          price: serviceObj.price,
          category: category
        });
      } else {
        // Multi-session creation
        for (let i = 0; i < sessionsList.length; i++) {
          const sess = sessionsList[i];
          const sessionTag = `Session ${i + 1}/${sessionsList.length}`;
          await addAppointment({
            clientId: `CLT-${Math.floor(Math.random() * 900) + 100}`,
            clientName: newClientName,
            phone: newPhone.replace(/\s+/g, ''),
            serviceId: serviceObj.id,
            serviceName: `${serviceObj.name} (${sessionTag})`,
            staffId: staffObj.id,
            staffName: staffObj.name,
            date: sess.date,
            time: sess.time,
            status: 'Confirmed',
            notes: aptNotes ? `${aptNotes} - ${sessionTag}` : sessionTag,
            price: serviceObj.price,
            category: category
          });
        }
      }

      setIsModalOpen(false);
      setNewClientName('');
      setNewPhone('+92 ');
      setCategory('treatment');
      setAptNotes('');
      setNumberOfSessions(1);
      setSessionsList([{ sessionNumber: 1, date: getLocalDateString(), time: '11:00 AM' }]);
    } catch (err: any) {
      alert("Failed to create appointment: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
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

        <div className="flex items-center gap-3 flex-wrap">
          {branches.length > 0 && (
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Button onClick={() => setIsModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            New Booking
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {(['All', 'Today', 'Tomorrow', 'Week'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setDateFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${dateFilter === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <Input
            placeholder="Search by client or treatment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="w-full md:w-64"
          />

          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select
              options={[
                { label: 'All Categories', value: 'All' },
                { label: 'Treatment', value: 'treatment' },
                { label: 'Consultation', value: 'consultation' }
              ]}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-40"
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
              className="w-full sm:w-40"
            />
          </div>
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
                      <div className="flex flex-col gap-1">
                        <span>{apt.serviceName}</span>
                        {apt.category && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-max ${
                            apt.category === 'consultation'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
                          }`}>
                            {apt.category}
                          </span>
                        )}
                      </div>
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const clientParam = encodeURIComponent(apt.clientName || '');
                            const serviceIdParam = encodeURIComponent(apt.serviceId || '');
                            const serviceNameParam = encodeURIComponent(apt.serviceName || '');
                            router.push(`/pos?client=${clientParam}&serviceId=${serviceIdParam}&serviceName=${serviceNameParam}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5"
                          title="Go to Billing & Checkout"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Go to Bill</span>
                        </button>
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Booking Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Treatment Appointment"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Ayesha Khan"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +92 3001234567"
              value={newPhone}
              onChange={(e) => setNewPhone(formatPhoneInput(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Appointment Category"
              options={[
                { label: 'Treatment', value: 'treatment' },
                { label: 'Consultation', value: 'consultation' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            />
            <Select
              label="Treatment Service"
              options={services.map((s) => ({ label: `${s.name} (${formatPKR(s.price, { decimals: false })})`, value: s.id }))}
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Specialist"
              options={staff.map((st) => ({ label: `${st.name} (${st.role})`, value: st.id }))}
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            />
            <Select
              label="Number of Sessions"
              options={[
                { label: '1 Session', value: '1' },
                { label: '2 Sessions', value: '2' },
                { label: '3 Sessions', value: '3' },
                { label: '4 Sessions', value: '4' },
                { label: '5 Sessions', value: '5' },
                { label: '6 Sessions', value: '6' },
                { label: '7 Sessions', value: '7' },
                { label: '8 Sessions', value: '8' },
                { label: '9 Sessions', value: '9' },
                { label: '10 Sessions', value: '10' }
              ]}
              value={numberOfSessions.toString()}
              onChange={(e) => handleSessionsCountChange(parseInt(e.target.value) || 1)}
            />
          </div>

          {numberOfSessions === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={aptDate}
                onChange={(e) => {
                  setAptDate(e.target.value);
                  handleUpdateSession(0, 'date', e.target.value);
                }}
                rightIcon={<CalendarDays className="w-4 h-4 text-blue-500" />}
                className="booking-date-input cursor-pointer bg-gradient-to-br from-white to-blue-50/70 dark:from-slate-900 dark:to-blue-950/30 border-blue-100 dark:border-blue-900/60 font-semibold tracking-wide"
                required
              />
              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Time Slot
                </label>
                <div className="relative flex items-center">
                  <Clock3 className="absolute left-3.5 z-10 w-4 h-4 text-blue-500 pointer-events-none" />
                  <Select
                    aria-label="Time Slot"
                    options={singleSlotOptions}
                    value={aptTime}
                    onChange={(e) => {
                      setAptTime(e.target.value);
                      handleUpdateSession(0, 'time', e.target.value);
                    }}
                    className="booking-time-select pl-10 bg-gradient-to-br from-white to-blue-50/70 dark:from-slate-900 dark:to-blue-950/30 border-blue-100 dark:border-blue-900/60 font-semibold tracking-wide cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Session Schedule ({numberOfSessions} Boxes Created)
                </label>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Auto-spaced weekly • Edit dates individually below
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                {sessionsList.map((sess, idx) => {
                  const currentService = services.find(s => s.id === selectedServiceId);
                  const sessSlots = getAvailableTimeSlots(sess.date, selectedStaffId, sess.time);
                  const sessOptions = sessSlots.length > 0
                    ? sessSlots.map(slot => ({ label: slot, value: slot }))
                    : [{ label: 'Fully Booked (No Slots Available)', value: '' }];

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          Session {sess.sessionNumber} / {numberOfSessions}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[140px]" title={currentService?.name || 'Service'}>
                          {currentService?.name || 'Service'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Date
                          </label>
                          <Input
                            type="date"
                            value={sess.date}
                            onChange={(e) => handleUpdateSession(idx, 'date', e.target.value)}
                            className="text-xs py-1.5 font-medium"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Time Slot
                          </label>
                          <Select
                            aria-label={`Session ${sess.sessionNumber} Time Slot`}
                            options={sessOptions}
                            value={sess.time}
                            onChange={(e) => handleUpdateSession(idx, 'time', e.target.value)}
                            className="text-xs py-1.5 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            label="Special Clinical Notes"
            placeholder="e.g. Skin sensitivity, pre-treatment instructions..."
            value={aptNotes}
            onChange={(e) => setAptNotes(e.target.value)}
          />

          {hasCollision && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
              <span className="text-sm font-bold">Warning:</span>
              This specialist is already booked for an appointment at this date and time slot.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Booking...' : 'Confirm & Save Booking'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
