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
  Edit,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Staff, StaffRole } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function StaffPage() {
  const { staff, addStaff, updateStaff, deleteStaff, role } = useClinic();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('Aesthetic Physician');
  const [salary, setSalary] = useState<number>(12000);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300');

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

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Staff Directory & Medical Practitioners
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage clinic dermatologists, aesthetic doctors, hydrafacialists, and nursing team.
          </p>
        </div>

        {role === 'admin' ? (
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add New Staff Member
          </Button>
        ) : (
          <Badge variant="warning" size="md">
            <Lock className="w-3.5 h-3.5 mr-1 inline" /> Admin Only Management
          </Badge>
        )}
      </div>

      {/* Role Restriction Banner if in Staff Mode */}
      {role === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> You are viewing staff directory in Staff Mode. Salary information and staff editing privileges are restricted to Clinic Administrators.
          </span>
        </div>
      )}

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
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">${member.salary.toLocaleString()}</span>
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
              label="Monthly Salary ($)"
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
              placeholder="doctor@auraluxuryclinic.com"
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
    </div>
  );
}
