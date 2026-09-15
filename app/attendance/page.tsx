'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  Plus,
  Search,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Calendar,
  MapPin
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Staff, AttendanceStatus } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { getLocalDateString } from '../../lib/utils/date';

export default function AttendancePage() {
  const {
    staff,
    attendance,
    markAttendance,
    revertAttendance,
    role,
    branches,
    isLoading
  } = useClinic();

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');

  // Mark single attendance modal state
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('Present');
  const [attNotes, setAttNotes] = useState('');

  // Bulk attendance modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkList, setBulkList] = useState<Record<string, AttendanceStatus>>({});

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize selectedStaffId when staff list updates
  React.useEffect(() => {
    if (staff.length > 0 && (!selectedStaffId || !staff.some(s => s.id === selectedStaffId))) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 animate-pulse font-bold">Loading Attendance Register...</div>
      </div>
    );
  }

  // Filter attendance records by selected date
  const dateRecords = attendance.filter((a) => a.date === selectedDate);

  const presentCount = dateRecords.filter((a) => a.status === 'Present').length;
  const lateCount = dateRecords.filter((a) => a.status === 'Late').length;
  const leaveCount = dateRecords.filter((a) => a.status === 'Leave').length;
  const absentCount = dateRecords.filter((a) => a.status === 'Absent').length;

  const filteredStaff = staff.filter((s) => {
    const matchesBranch = branchFilter === 'All' || s.branchId === branchFilter;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleOpenBulkModal = () => {
    const initialList: Record<string, AttendanceStatus> = {};
    staff.forEach(s => {
      const rec = dateRecords.find(r => r.staffId === s.id);
      initialList[s.id] = (rec?.status as AttendanceStatus) || 'Present';
    });
    setBulkList(initialList);
    setIsBulkModalOpen(true);
  };

  const handleSaveBulkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const coords = role === 'admin' ? undefined : await getCoordinates();
      await Promise.all(
        Object.entries(bulkList).map(([staffId, status]) =>
          markAttendance(staffId, status, 'Bulk Attendance', coords?.latitude, coords?.longitude)
        )
      );
      showToast("Bulk attendance saved successfully!");
      setIsBulkModalOpen(false);
    } catch (err: any) {
      showToast("Failed to mark bulk attendance: " + (err.message || err), "error");
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const coords = role === 'admin' ? undefined : await getCoordinates();
      await markAttendance(selectedStaffId, attStatus, attNotes, coords?.latitude, coords?.longitude);
      showToast("Attendance marked successfully!");
      setIsMarkModalOpen(false);
      setAttNotes('');
    } catch (err: any) {
      showToast("Failed to mark attendance: " + (err.message || err), "error");
    }
  };

  const handleRevertAttendance = async (recordId: string, staffName: string) => {
    if (role !== 'admin') {
      showToast("Only Admin can revert attendance records.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to revert the attendance for ${staffName}?`)) {
      return;
    }
    try {
      await revertAttendance(recordId);
      showToast(`Attendance for ${staffName} reverted successfully!`);
    } catch (err: any) {
      showToast("Failed to revert attendance: " + (err.message || err), "error");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-rose-500 text-white border-rose-400'
            }`}
          >
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Staff Attendance Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track daily employee attendance, late arrivals, and absences across branches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto text-xs py-1.5"
          />

          <Button onClick={handleOpenBulkModal} variant="outline" icon={<UserCheck className="w-4 h-4" />}>
            Bulk Attendance
          </Button>

          <Button onClick={() => setIsMarkModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Mark Attendance
          </Button>
        </div>
      </div>

      {role === 'staff' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-center gap-3 text-xs text-blue-800 dark:text-blue-200">
          <UserCheck className="w-5 h-5 shrink-0 text-blue-600" />
          <span>
            <strong>Staff Mode Active:</strong> You can mark and view employee attendance. Attendance reversals can only be authorized by an Admin.
          </span>
        </div>
      )}

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Present Today</p>
            <h3 className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{presentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Late Arrivals</p>
            <h3 className="text-2xl font-black text-amber-600 font-mono mt-0.5">{lateCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">On Leave</p>
            <h3 className="text-2xl font-black text-blue-600 font-mono mt-0.5">{leaveCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="luxury-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Absent</p>
            <h3 className="text-2xl font-black text-rose-600 font-mono mt-0.5">{absentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="luxury-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500">Branch:</span>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Attendance Register ({selectedDate})
          </h3>
          <Badge variant="primary">{filteredStaff.length} Employees</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const rec = dateRecords.find(a => a.staffId === member.id);
                  const branch = branches.find(b => b.id === member.branchId);
                  const branchName = branch ? branch.name : 'Unassigned';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <img
                          src={member.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300'}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <span>{member.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {member.role}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <Badge variant="neutral">{branchName}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {rec?.checkInTime || '--:--'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {rec?.checkOutTime || '--:--'}
                      </td>
                      <td className="py-3.5 px-4">
                        {rec ? (
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
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unmarked</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic max-w-[200px] truncate">
                        {rec?.notes || '--'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {rec ? (
                          role === 'admin' ? (
                            <button
                              onClick={() => handleRevertAttendance(rec.id, member.name)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 transition-colors flex items-center gap-1.5 ml-auto"
                              title="Revert Attendance Record"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revert</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed flex items-center gap-1.5 ml-auto opacity-70"
                              title="Only Admin can revert attendance"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Revert</span>
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStaffId(member.id);
                              setIsMarkModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-white transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mark</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Single Staff Attendance Modal */}
      <Modal
        isOpen={isMarkModalOpen}
        onClose={() => setIsMarkModalOpen(false)}
        title="Mark Staff Attendance"
        description="Select practitioner and update attendance status"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <Select
            label="Select Staff Practitioner"
            options={staff.map((s) => ({ label: `${s.name} (${s.role})`, value: s.id }))}
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          />

          <Select
            label="Attendance Status"
            options={[
              { label: 'Present', value: 'Present' },
              { label: 'Late Arrival', value: 'Late' },
              { label: 'On Leave', value: 'Leave' },
              { label: 'Absent', value: 'Absent' },
              { label: 'Checked Out', value: 'Checked Out' }
            ]}
            value={attStatus}
            onChange={(e) => setAttStatus(e.target.value as AttendanceStatus)}
          />

          <Input
            label="Notes / Remarks (Optional)"
            placeholder="e.g. Approved medical leave / On-time check in"
            value={attNotes}
            onChange={(e) => setAttNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsMarkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Attendance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Attendance Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={`Bulk Attendance Register (${selectedDate})`}
        description="Quickly update attendance status for all active staff practitioners for the selected date"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBulkAttendance} className="space-y-4">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                  <span className="text-[10px] text-slate-400 block font-normal">{s.role}</span>
                </div>
                <div className="flex gap-1.5">
                  {(['Present', 'Late', 'Leave', 'Absent'] as AttendanceStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setBulkList(prev => ({ ...prev, [s.id]: status }))}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer ${
                        bulkList[s.id] === status
                          ? status === 'Present'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : status === 'Absent'
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                              : status === 'Leave'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Bulk Attendance
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
