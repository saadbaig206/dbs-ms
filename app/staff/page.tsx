'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users2,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  Star,
  Lock,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  UserCheck
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { Staff, StaffRole, AttendanceStatus } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function StaffPage() {
  const { staff, addStaff, deleteStaff, attendance, markAttendance, role } = useClinic();

  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding Staff
  const [name, setName] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('Aesthetic Physician');
  const [salary, setSalary] = useState<number>(12000);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300');

  // Attendance Form State
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('Present');
  const [attNotes, setAttNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const leaveCount = attendance.filter((a) => a.status === 'Leave').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;

  const filteredStaff = staff.filter((s) => {
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    addStaff({
      photo,
      name,
      role: staffRole,
      salary,
      phone,
      email,
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      performanceRating: 5.0,
      assignedServices: ['Signature Treatments'],
      attendanceRate: 100
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    markAttendance(selectedStaffId, attStatus, attNotes);
    setIsMarkModalOpen(false);
    setAttNotes('');
  };

  const handleBulkCheckIn = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = attendance.filter(a => a.date === todayStr);
    const unmarkedStaff = staff.filter(s => !todayRecords.some(r => r.staffId === s.id));

    if (unmarkedStaff.length === 0) {
      alert("All staff members have already been marked for today!");
      return;
    }

    try {
      await Promise.all(
        unmarkedStaff.map(s => markAttendance(s.id, 'Present', 'Bulk Check-In'))
      );
      alert(`Successfully checked in ${unmarkedStaff.length} staff members!`);
    } catch (err: any) {
      alert("Failed to mark bulk attendance: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Staff & Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage clinic staff and track attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Sub-Tabs Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'directory'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Directory
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Attendance
            </button>
          </div>

          {activeTab === 'directory' && role === 'admin' && (
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
              Add Practitioner
            </Button>
          )}

          {activeTab === 'attendance' && (
            <div className="flex gap-2">
              <Button onClick={handleBulkCheckIn} variant="outline" icon={<UserCheck className="w-4 h-4" />}>
                Bulk Check-In
              </Button>
              <Button onClick={() => setIsMarkModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
                Mark Attendance
              </Button>
            </div>
          )}
        </div>
      </div>

      {role === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Practitioner salary information and administrative edit permissions are locked in Staff Mode. Switch to Admin mode to unlock full controls.
          </span>
        </div>
      )}

      {activeTab === 'directory' ? (
        <>
          {/* Search */}
          <div className="luxury-card p-4">
            <Input
              placeholder="Search by doctor name, role, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="max-w-md"
            />
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((member) => (
              <motion.div
                key={member.id}
                whileHover={{ y: -4 }}
                className="luxury-card p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={member.photo} name={member.name} size="lg" statusDot="online" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{member.name}</h3>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{member.role}</p>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {member.id}</span>
                      </div>
                    </div>
                    <Badge variant={member.status === 'Active' ? 'success' : 'warning'}>
                      {member.status}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5" /> Phone:
                      </span>
                      <span className="font-mono">{member.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Mail className="w-3.5 h-3.5" /> Email:
                      </span>
                      <span className="font-mono truncate max-w-[150px]">{member.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" /> Joined:
                      </span>
                      <span>{member.joiningDate}</span>
                    </div>

                    {role === 'admin' && (
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <span>Monthly Salary:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatPKR(member.salary, { decimals: false })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 stroke-none" />
                    <span>{member.performanceRating.toFixed(1)} / 5.0</span>
                  </div>

                  {role === 'admin' && (
                    <button
                      onClick={() => deleteStaff(member.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <>
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
                Daily Attendance Register ({todayStr})
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
        </>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Clinic Staff Practitioner"
        description="Register a new dermatologist, doctor, or specialist"
        maxWidth="lg"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Dr. Marcus Vance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Staff Role"
              options={[
                { label: 'Medical Director', value: 'Medical Director' },
                { label: 'Senior Dermatologist', value: 'Senior Dermatologist' },
                { label: 'Aesthetic Physician', value: 'Aesthetic Physician' },
                { label: 'Hydrafacial Specialist', value: 'Hydrafacial Specialist' },
                { label: 'Laser Specialist', value: 'Laser Specialist' },
                { label: 'Cosmetic Nurse', value: 'Cosmetic Nurse' },
                { label: 'Clinic Manager', value: 'Clinic Manager' },
                { label: 'Receptionist', value: 'Receptionist' }
              ]}
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as any)}
            />
            <Input
              label="Monthly Salary (Rs)"
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="staff@dbsaesthetic.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Staff Member
            </Button>
          </div>
        </form>
      </Modal>

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
            value={attStatus}
            onChange={(e) => setAttStatus(e.target.value as any)}
          />

          <Input
            label="Remarks / Late Reason"
            placeholder="e.g. Approved medical leave, traffic delay..."
            value={attNotes}
            onChange={(e) => setAttNotes(e.target.value)}
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
