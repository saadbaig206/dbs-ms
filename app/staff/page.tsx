'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  UserCheck,
  MapPin
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
  const { staff, addStaff, updateStaff, deleteStaff, attendance, markAttendance, role, branches, isLoading, partners, addPartner, deletePartner } = useClinic();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'partners'>('directory');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Partners management state
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [partnerUsername, setPartnerUsername] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');

  // Form State for Adding/Editing Staff
  const [name, setName] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('Aesthetic Physician');
  const [salary, setSalary] = useState<string>('12000');
  const [phone, setPhone] = useState('+92');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffBranchId, setStaffBranchId] = useState('');
  const [photo, setPhoto] = useState('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300');

  // Attendance Form State
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('Present');
  const [attNotes, setAttNotes] = useState('');
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkList, setBulkList] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'>>({});

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize selectedStaffId when staff list finishes loading
  React.useEffect(() => {
    if (staff.length > 0 && (!selectedStaffId || !staff.some(s => s.id === selectedStaffId))) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff]);

  if (isLoading || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 animate-pulse font-bold">Loading...</div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const leaveCount = attendance.filter((a) => a.status === 'Leave').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;

  const filteredStaff = staff.filter((s) => {
    const matchesBranch = branchFilter === 'All' || s.branchId === branchFilter;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const handleOpenEditModal = (member: Staff) => {
    setEditingStaffId(member.id);
    setName(member.name);
    setStaffRole(member.role);
    setSalary(String(member.salary));
    
    let memberPhone = member.phone || '';
    if (!memberPhone.startsWith('+92')) {
      if (memberPhone.startsWith('92')) memberPhone = '+' + memberPhone;
      else if (memberPhone.startsWith('0')) memberPhone = '+92' + memberPhone.substring(1);
      else memberPhone = '+92' + memberPhone.replace(/\D/g, '');
    }
    setPhone(memberPhone);
    
    setEmail(member.email);
    setStaffBranchId(member.branchId || '');
    setPhoto(member.photo);
    setIsEditModalOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;

    if (name.trim().length < 3) {
      showToast("Full Name must be at least 3 characters long", "error");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      showToast("Full Name must contain only letters and spaces", "error");
      return;
    }
    if (!/^\+92\d{9,10}$/.test(phone)) {
      showToast("Please enter a valid Pakistani phone number (+92 followed by 9-10 digits)", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (Number(salary) <= 0) {
      showToast("Salary must be a positive number", "error");
      return;
    }

    try {
      await updateStaff(editingStaffId, {
        photo,
        name,
        role: staffRole,
        salary: Number(salary) || 0,
        phone,
        email,
        branchId: staffBranchId || undefined
      });
      setIsEditModalOpen(false);
      setEditingStaffId(null);
      setName('');
      setPhone('+92');
      setEmail('');
      setStaffBranchId('');
      showToast('Staff member updated successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to update staff member', 'error');
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 3) {
      showToast("Full Name must be at least 3 characters long", "error");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      showToast("Full Name must contain only letters and spaces", "error");
      return;
    }
    if (!/^\+92\d{9,10}$/.test(phone)) {
      showToast("Please enter a valid Pakistani phone number (+92 followed by 9-10 digits)", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (Number(salary) <= 0) {
      showToast("Salary must be a positive number", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    addStaff({
      photo,
      name,
      role: staffRole,
      salary: Number(salary) || 0,
      phone,
      email,
      password,
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      performanceRating: 5.0,
      assignedServices: ['Signature Treatments'],
      attendanceRate: 100,
      branchId: staffBranchId || undefined
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('+92');
    setEmail('');
    setPassword('');
    setStaffBranchId('');
  };

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

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const coords = role === 'admin' ? undefined : await getCoordinates();
      await markAttendance(selectedStaffId, attStatus, attNotes, coords?.latitude, coords?.longitude);
      showToast("Attendance marked successfully!");
      setIsMarkModalOpen(false);
      setAttNotes('');
    } catch (err: any) {
      showToast("Failed to mark attendance: " + err.message, "error");
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPartner(partnerUsername, partnerPassword);
      setPartnerUsername('');
      setPartnerPassword('');
      setIsAddPartnerModalOpen(false);
      showToast('Partner added successfully');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to add partner', 'error');
    }
  };

  const handleDeletePartner = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this partner?')) return;
    try {
      await deletePartner(id);
      showToast('Partner deleted successfully');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to delete partner', 'error');
    }
  };

  const handleOpenBulkModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = attendance.filter(a => a.date === todayStr);
    const initialList: Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'> = {};
    staff.forEach(s => {
      const todayRec = todayRecords.find(r => r.staffId === s.id);
      initialList[s.id] = (todayRec?.status as any) || 'Present';
    });
    setBulkList(initialList);
    setIsBulkModalOpen(true);
  };

  const handleSaveBulkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Admins bypass GPS validation, so we pass undefined for coords
      await Promise.all(
        Object.entries(bulkList)
          .filter(([_, status]) => status !== 'Unmarked')
          .map(([staffId, status]) => 
            markAttendance(staffId, status as AttendanceStatus, 'Bulk Admin Mark')
          )
      );
      showToast("Bulk attendance updated successfully!");
      setIsBulkModalOpen(false);
    } catch (err: any) {
      showToast("Failed to mark bulk attendance: " + err.message, "error");
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
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'partners'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Partners
            </button>
          </div>

          {activeTab === 'directory' && role === 'admin' && (
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
              Add Practitioner
            </Button>
          )}

          {activeTab === 'partners' && role === 'admin' && (
            <Button onClick={() => setIsAddPartnerModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
              Add Partner
            </Button>
          )}

          {activeTab === 'attendance' && (
            <div className="flex gap-2">
              <Button onClick={handleOpenBulkModal} variant="outline" icon={<UserCheck className="w-4 h-4" />}>
                Bulk Attendance
              </Button>
              <Button onClick={() => setIsMarkModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
                Mark Attendance
              </Button>
            </div>
          )}
        </div>
      </div>

      {(role as string) === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Practitioner salary information and administrative edit permissions are locked in Staff Mode. Switch to Admin mode to unlock full controls.
          </span>
        </div>
      )}

      {activeTab === 'directory' && (
        <>
          {/* Search & Branch Filter */}
          <div className="luxury-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <Input
              placeholder="Search by doctor name, role, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="max-w-md"
            />
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { label: 'All Branches', value: 'All' },
                  ...branches.map(b => ({ label: b.name, value: b.id }))
                ]}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Directory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((member) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="luxury-card overflow-hidden hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar src={member.photo} name={member.name} size="md" statusDot={member.status === 'Active' ? 'online' : 'offline'} />
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">{member.name}</h4>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{member.role}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{branches.find(b => b.id === member.branchId)?.name || 'Main Clinic'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Joined {member.joiningDate}</span>
                    </div>
                    {role === 'admin' && (
                      <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Monthly Salary:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatPKR(member.salary, { decimals: false })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                    <span>{member.performanceRating.toFixed(1)}</span>
                  </div>
                  {role === 'admin' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEditModal(member)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteStaff(member.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'attendance' && (
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
                    <th className="py-3.5 px-4">Branch</th>
                    <th className="py-3.5 px-4">Check-In</th>
                    <th className="py-3.5 px-4">Check-Out</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 rounded-r-xl">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {attendance.map((rec) => {
                    const member = staff.find(s => s.id === rec.staffId);
                    const branch = member ? branches.find(b => b.id === member.branchId) : null;
                    const branchName = branch ? branch.name : 'Unassigned';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {rec.staffName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {rec.role}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <Badge variant="neutral">{branchName}</Badge>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'partners' && (
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Clinic Partners
            </h3>
            <Badge variant="primary">{partners.length} Active Accounts</Badge>
          </div>

          {partners.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No partner accounts created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Username</th>
                    <th className="py-3.5 px-4">Role Permission</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {p.username}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <Badge variant="neutral">Partner Mode</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeletePartner(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Partner Account"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
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
            </div>
            <Select
              label="Assigned Branch"
              options={[
                { label: 'Unassigned', value: '' },
                ...branches.map(b => ({ label: b.name, value: b.id }))
              ]}
              value={staffBranchId}
              onChange={(e) => setStaffBranchId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Salary (Rs)"
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +923001234567"
              value={phone}
              onChange={(e) => {
                let val = e.target.value;
                if (!val.startsWith('+92')) {
                  if (val.startsWith('92')) val = '+' + val;
                  else if (val.startsWith('0')) val = '+92' + val.substring(1);
                  else val = '+92' + val.replace(/\D/g, '');
                }
                const digits = val.substring(3).replace(/\D/g, '');
                setPhone('+92' + digits.substring(0, 10));
              }}
              required
            />
          </div>
            <Input
              label="Email Address"
              type="email"
              placeholder="staff@dbsaesthetic.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Portal Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />


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

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStaffId(null);
        }}
        title="Edit Staff Member Details"
        description="Update contact information, roles, branch assignments, and payroll"
        maxWidth="lg"
      >
        <form onSubmit={handleEditStaff} className="space-y-4">
          <Input
            label="Profile Picture URL"
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            required
          />

          <Input
            label="Full Name"
            placeholder="e.g. Dr. Ayesha Khan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
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
            </div>
            <Select
              label="Assigned Branch"
              options={[
                { label: 'Unassigned', value: '' },
                ...branches.map(b => ({ label: b.name, value: b.id }))
              ]}
              value={staffBranchId}
              onChange={(e) => setStaffBranchId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Salary (Rs)"
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +923001234567"
              value={phone}
              onChange={(e) => {
                let val = e.target.value;
                if (!val.startsWith('+92')) {
                  if (val.startsWith('92')) val = '+' + val;
                  else if (val.startsWith('0')) val = '+92' + val.substring(1);
                  else val = '+92' + val.replace(/\D/g, '');
                }
                const digits = val.substring(3).replace(/\D/g, '');
                setPhone('+92' + digits.substring(0, 10));
              }}
              required
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            placeholder="staff@dbsaesthetic.pk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => {
              setIsEditModalOpen(false);
              setEditingStaffId(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update Staff Member
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

      {/* Bulk Attendance Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Attendance Register"
        description="Verify and update status details for all active staff practitioners"
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
                  {['Present', 'Late', 'Absent'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setBulkList(prev => ({ ...prev, [s.id]: status as any }))}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer ${
                        bulkList[s.id] === status
                          ? status === 'Present'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : status === 'Absent'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
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

      {/* Add Partner Modal */}
      <Modal
        isOpen={isAddPartnerModalOpen}
        onClose={() => setIsAddPartnerModalOpen(false)}
        title="Add Clinic Partner Account"
        description="Register a new partner account with custom username credentials"
        maxWidth="md"
      >
        <form onSubmit={handleAddPartner} className="space-y-4">
          <Input
            label="Username"
            placeholder="e.g. saadbaig"
            value={partnerUsername}
            onChange={(e) => setPartnerUsername(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={partnerPassword}
            onChange={(e) => setPartnerPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddPartnerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Partner Account
            </Button>
          </div>
        </form>
      </Modal>

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
