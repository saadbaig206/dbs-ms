'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Printer,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Appointment } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function BookingsPage() {
  const { appointments, addAppointment, updateAppointmentStatus, deleteAppointment, staff, services, clients, setPrintData } = useClinic();

  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Tomorrow' | 'Week'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [aptDate, setAptDate] = useState(new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('11:00 AM');
  const [aptNotes, setAptNotes] = useState('');

  // Filtered List
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
            Bookings & Appointments Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage client appointments, status tracking, and specialist assignments.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
          New Booking
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Filter Tabs */}
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

        {/* Search & Select Status */}
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
                      ${apt.price}
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
              options={services.map((s) => ({ label: `${s.name} ($${s.price})`, value: s.id }))}
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
