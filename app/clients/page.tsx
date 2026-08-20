'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  ChevronRight,
  Eye,
  Sparkles,
  MapPin
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { Client } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function ClientsPage() {
  const { clients, addClient, staff, services, setPrintData, branches } = useClinic();

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Add Client Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+92');
  const [gender, setGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [age, setAge] = useState<string>('32');
  const [address, setAddress] = useState('');
  const [preferredService, setPreferredService] = useState(services[0]?.name || '');
  const [assignedStaffId, setAssignedStaffId] = useState(staff[0]?.id || '');
  const [clientBranchId, setClientBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const filteredClients = (clients || []).filter((c) => {
    if (!c) return false;
    const matchesBranch = branchFilter === 'All' || c.branchId === branchFilter;
    const matchesSearch = 
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));
    return matchesBranch && matchesSearch;
  });

  const handleRegisterClient = (e: React.FormEvent) => {
    e.preventDefault();
    const staffObj = staff.find(st => st.id === assignedStaffId);

    if (name.trim().length < 3) {
      alert("Full Name must be at least 3 characters long");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      alert("Full Name must contain only letters and spaces");
      return;
    }
    if (!/^\+92\d{9,10}$/.test(phone)) {
      alert("Please enter a valid Pakistani phone number (+92 followed by 9-10 digits)");
      return;
    }
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      alert("Please enter a valid age between 1 and 120");
      return;
    }
    if (address.trim().length === 0) {
      alert("Please enter a residential address");
      return;
    }

    addClient({
      name,
      phone,
      gender,
      age: ageNum,
      address,
      assignedStaffId: staffObj?.id,
      assignedStaffName: staffObj?.name,
      preferredService,
      notes,
      branchId: clientBranchId || undefined
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('+92');
    setAge('32');
    setAddress('');
    setNotes('');
    setClientBranchId('');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Client Directory & VIP Profiles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registered medical spa patients, treatment histories, and spending metrics.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add New Client
        </Button>
      </div>

      {/* Search & Branch Filter */}
      <div className="luxury-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <Input
          placeholder="Search by client name or phone number..."
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

      {/* Clients Table */}
      <div className="luxury-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Client ID</th>
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Gender & Age</th>
                <th className="py-3.5 px-4">Primary Doctor</th>
                <th className="py-3.5 px-4">Visits</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 font-bold">
                    {client.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{client.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{client.phone}</div>
                    {client.branchId && (
                      <div className="mt-1">
                        <Badge variant="gold" size="sm">
                          <MapPin className="w-2.5 h-2.5 mr-1 inline" />
                          {branches.find(b => b.id === client.branchId)?.name || 'Linked Branch'}
                        </Badge>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {client.gender}, {client.age} yrs
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                    {client.assignedStaffName || 'Dr. Elena Rostova'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="primary">{client.visitsCount} visits</Badge>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatPKR(client.totalSpent, { decimals: false })}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPrintData({ title: `Client ${client.name}`, type: 'client', data: client })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="Print Client Voucher"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Registration Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Client Profile"
        description="Add a new VIP patient record to the clinic database"
        maxWidth="xl"
      >
        <form onSubmit={handleRegisterClient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Victoria Beckham"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gender"
              options={[
                { label: 'Female', value: 'Female' },
                { label: 'Male', value: 'Male' },
                { label: 'Other', value: 'Other' }
              ]}
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
            />
            <Input
              label="Age"
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <Input
            label="Residential Address"
            placeholder="e.g. Penthouse 4B, Beverly Hills Crest, CA"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Preferred Treatment"
                options={services.map((s) => ({ label: s.name, value: s.name }))}
                value={preferredService}
                onChange={(e) => setPreferredService(e.target.value)}
              />
            </div>
            <Select
              label="Assigned Branch"
              options={[
                { label: 'Unassigned', value: '' },
                ...branches.map(b => ({ label: b.name, value: b.id }))
              ]}
              value={clientBranchId}
              onChange={(e) => setClientBranchId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Practitioner"
              options={staff.map((st) => ({ label: `${st.name} (${st.role})`, value: st.id }))}
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
            />
          </div>

          <Input
            label="Clinical Notes / Allergies"
            placeholder="e.g. Sensitive skin, skin allergy notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Client Profile Modal Drawer */}
      {selectedClient && (
        <Modal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={`Client File - ${selectedClient.name}`}
          description={`ID: ${selectedClient.id} • Registered since ${selectedClient.joinedDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Lifetime Spend</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">{formatPKR(selectedClient.totalSpent, { decimals: false })}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Visits</span>
                <span className="text-lg font-black text-blue-600 font-mono">{selectedClient.visitsCount} sessions</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Assigned Doctor</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedClient.assignedStaffName || 'Dr. Elena Rostova'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Clinical Notes</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                {selectedClient.notes || 'No specific clinical allergies recorded.'}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Recent Treatment History</h4>
              {selectedClient.history.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No past treatment history records found.</p>
              ) : (
                <div className="space-y-2">
                  {selectedClient.history.map((h) => (
                    <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{h.serviceName}</div>
                        <div className="text-slate-400">{h.date} • {h.staffName}</div>
                      </div>
                      <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{formatPKR(h.amount, { decimals: false })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => setPrintData({ title: `Client ${selectedClient.name}`, type: 'client', data: selectedClient })}
              >
                Print Client File Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
