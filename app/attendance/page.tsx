'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { AttendanceStatus } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select, Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function AttendancePage() {
  const { attendance, staff, markAttendance } = useClinic();

  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [notes, setNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const leaveCount = attendance.filter((a) => a.status === 'Leave').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    markAttendance(selectedStaffId, status, notes);
    setIsMarkModalOpen(false);
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Staff Attendance & Daily Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track daily practitioner check-ins, leaves, and timeliness.
          </p>
        </div>

        <Button onClick={() => setIsMarkModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Mark Attendance
        </Button>
      </div>

      {/* Attendance Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Present Today</p>
            <h3 className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{presentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Late Arrivals</p>
            <h3 className="text-2xl font-black text-amber-600 font-mono mt-0.5">{lateCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">On Leave</p>
            <h3 className="text-2xl font-black text-blue-600 font-mono mt-0.5">{leaveCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Absent</p>
            <h3 className="text-2xl font-black text-rose-600 font-mono mt-0.5">{absentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Attendance Log ({todayStr})
          </h3>
          <Badge variant="primary">Updated Live</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 rounded-r-xl">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {attendance.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {rec.staffName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {rec.role}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {rec.checkInTime || '--:--'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {rec.checkOutTime || '--:--'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        rec.status === 'Present'
                          ? 'success'
                          : rec.status === 'Late'
                          ? 'warning'
                          : rec.status === 'Leave'
                          ? 'primary'
                          : 'danger'
                      }
                    >
                      {rec.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 italic">
                    {rec.notes || 'No remarks'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={isMarkModalOpen}
        onClose={() => setIsMarkModalOpen(false)}
        title="Mark Staff Attendance"
        description="Record today check-in status for clinic personnel"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <Select
            label="Staff Practitioner"
            options={staff.map((st) => ({ label: `${st.name} (${st.role})`, value: st.id }))}
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          />

          <Select
            label="Attendance Status"
            options={[
              { label: 'Present', value: 'Present' },
              { label: 'Late', value: 'Late' },
              { label: 'Approved Leave', value: 'Leave' },
              { label: 'Absent', value: 'Absent' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          />

          <Input
            label="Remarks / Late Reason"
            placeholder="e.g. Approved medical leave, traffic delay..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsMarkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Attendance Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
