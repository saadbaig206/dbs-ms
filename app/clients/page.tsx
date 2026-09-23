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
import { formatPhoneInput } from '../../lib/utils/phone';
import { Client } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function ClientsPage() {
  const { clients, addClient, staff, services, setPrintData, branches, settleClientDue } = useClinic();

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Settle Dues Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleClient, setSettleClient] = useState<Client | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Cash');
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Add Client Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+92');
  const [cnic, setCnic] = useState('');
  const [gender, setGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [age, setAge] = useState<string>('');
  const [address, setAddress] = useState('');
  const [preferredService, setPreferredService] = useState(services[0]?.name || '');
  const [assignedStaffId, setAssignedStaffId] = useState(staff[0]?.id || '');
  const [clientBranchId, setClientBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSettleDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleClient || isSettling) return;
    const amountNum = Number(settleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSettleError("Please enter a valid settlement amount.");
      return;
    }
    if (amountNum > (settleClient.outstandingBalance || 0)) {
      setSettleError(`Settlement amount (${formatPKR(amountNum)}) cannot exceed current outstanding due (${formatPKR(settleClient.outstandingBalance || 0)}).`);
      return;
    }

    try {
      setIsSettling(true);
      setSettleError(null);
      await settleClientDue(settleClient.id, amountNum, settleMethod, settleNotes.trim() || undefined);
      setIsSettleModalOpen(false);
      setSettleClient(null);
      setSettleAmount('');
      setSettleNotes('');
    } catch (err: any) {
      setSettleError(err.message || "Failed to settle due.");
    } finally {
      setIsSettling(false);
    }
  };

  const filteredClients = (clients || []).filter((c) => {
    if (!c) return false;
    const matchesBranch = branchFilter === 'All' || c.branchId === branchFilter;
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));
    return matchesBranch && matchesSearch;
  });

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const staffObj = staff.find(st => st.id === assignedStaffId);

    if (name.trim().length < 3) {
      setClientError("Full Name must be at least 3 characters long.");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(name.trim())) {
      setClientError("Full Name must contain only letters, dots, hyphens, and spaces.");
      return;
    }
    const cleanP = phone.trim().replace(/[\s\-]/g, '');
    if (!/^(\+92\d{9,10}|03\d{9})$/.test(cleanP)) {
      setClientError("Please enter a valid Pakistani phone number (e.g., 03001234567 or +923001234567).");
      return;
    }
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setClientError("Please enter a valid age between 1 and 120.");
      return;
    }

    const normPhone = cleanP.startsWith('03') ? '+92' + cleanP.slice(1) : cleanP;
    const existingPhoneClient = clients.find(c => {
      if (!c.phone) return false;
      const cClean = c.phone.trim().replace(/[\s\-]/g, '');
      const cNorm = cClean.startsWith('03') ? '+92' + cClean.slice(1) : cClean;
      return cNorm === normPhone;
    });
    if (existingPhoneClient) {
      setClientError(`A client with phone ${phone} already exists: ${existingPhoneClient.name} (${existingPhoneClient.id}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setClientError(null);
      await addClient({
        name,
        phone,
        cnic: cnic.trim() || undefined,
        gender,
        age: ageNum,
        address: address.trim() || 'N/A',
        assignedStaffId: staffObj?.id,
        assignedStaffName: staffObj?.name,
        preferredService,
        notes,
        branchId: clientBranchId || undefined
      });

      setIsAddModalOpen(false);
      setName('');
      setPhone('+92');
      setCnic('');
      setAge('');
      setAddress('');
      setNotes('');
      setClientBranchId('');
    } catch (err: any) {
      setClientError(err.message || "Failed to register client profile.");
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
          className="w-full sm:max-w-md"
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
        <div className="responsive-table-wrapper">
          <table className="w-full min-w-[650px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Client ID</th>
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Gender & Age</th>
                <th className="py-3.5 px-4">Primary Doctor</th>
                <th className="py-3.5 px-4">Visits</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4 text-right">Outstanding Dues</th>
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
                        <Badge variant="primary" size="sm">
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
                    {client.assignedStaffName || staff[0]?.name || 'Unassigned'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="primary">{client.visitsCount} visits</Badge>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatPKR(client.totalSpent, { decimals: false })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {(client.outstandingBalance || 0) > 0 ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatPKR(client.outstandingBalance || 0, { decimals: false })}
                        </span>
                        <button
                          onClick={() => {
                            setSettleClient(client);
                            setSettleAmount(String(client.outstandingBalance || 0));
                            setIsSettleModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
                        >
                          Collect Due
                        </button>
                      </div>
                    ) : (
                      <Badge variant="success" size="sm">Cleared</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
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
        onClose={() => {
          setIsAddModalOpen(false);
          setClientError(null);
        }}
        title="Register New Client Profile"
        description="Add a new VIP patient record to the clinic database"
        maxWidth="xl"
      >
        <form onSubmit={handleRegisterClient} className="space-y-4">
          {clientError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {clientError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Ayesha Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +92 3001234567"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
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
            placeholder="e.g. House 45-B, Clifton Block 5, Karachi"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Preferred Treatment"
                options={(services || []).map((s) => ({ label: s.name, value: s.name }))}
                value={preferredService}
                onChange={(e) => setPreferredService(e.target.value)}
              />
            </div>
            <Select
              label="Assigned Branch"
              options={[
                { label: 'Unassigned', value: '' },
                ...(branches || []).map(b => ({ label: b.name, value: b.id }))
              ]}
              value={clientBranchId}
              onChange={(e) => setClientBranchId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Practitioner"
              options={[
                { label: 'Select Practitioner', value: '' },
                ...(staff || []).map((st) => ({ label: `${st.name} (${st.role})`, value: st.id }))
              ]}
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
            />
            <Input
              label="National ID / CNIC (Optional)"
              placeholder="e.g. 42101-1234567-1"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
            />
          </div>

          <Input
            label="Clinical Notes / Allergies"
            placeholder="e.g. Sensitive skin, skin allergy notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Client'}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Lifetime Spend</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">{formatPKR(selectedClient.totalSpent, { decimals: false })}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Outstanding Due</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-lg font-black font-mono ${(selectedClient.outstandingBalance || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatPKR(selectedClient.outstandingBalance || 0, { decimals: false })}
                  </span>
                  {(selectedClient.outstandingBalance || 0) > 0 && (
                    <button
                      onClick={() => {
                        setSettleClient(selectedClient);
                        setSettleAmount(String(selectedClient.outstandingBalance || 0));
                        setIsSettleModalOpen(true);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300"
                    >
                      Collect
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Visits</span>
                <span className="text-lg font-black text-blue-600 font-mono">{selectedClient.visitsCount} sessions</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Assigned Doctor</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedClient.assignedStaffName || staff[0]?.name || 'Unassigned'}</span>
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
          </div>
        </Modal>
      )}

      {/* Settle Outstanding Dues Modal */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSettleClient(null);
          setSettleError(null);
        }}
        title={`Collect Outstanding Due - ${settleClient?.name || ''}`}
        description={`Current Balance Owed: ${formatPKR(settleClient?.outstandingBalance || 0, { decimals: false })}`}
        maxWidth="md"
      >
        <form onSubmit={handleSettleDue} className="space-y-4">
          {settleError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {settleError}
            </div>
          )}

          <Input
            label="Payment Amount Received (PKR)"
            type="number"
            value={settleAmount}
            onChange={(e) => setSettleAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Method"
            options={[
              { label: 'Cash at Counter', value: 'Cash' },
              { label: 'Credit / Debit Card POS', value: 'Card' },
              { label: 'Online / Bank Transfer (IBFT)', value: 'Online' }
            ]}
            value={settleMethod}
            onChange={(e) => setSettleMethod(e.target.value)}
          />

          <Input
            label="Reference / Receipt Notes"
            placeholder="e.g. Settle balance from laser session invoice"
            value={settleNotes}
            onChange={(e) => setSettleNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSettleModalOpen(false);
                setSettleClient(null);
              }}
              disabled={isSettling}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSettling}>
              {isSettling ? 'Recording...' : 'Record Payment Receipt'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
