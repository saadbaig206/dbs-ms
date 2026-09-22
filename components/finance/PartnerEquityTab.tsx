'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  Users,
  Plus,
  Download,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  Pencil
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { StatCard } from '../cards/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';

export function PartnerEquityTab() {
  const {
    partnerEquity,
    refreshPartnerEquity,
    recordPartnerDrawing,
    updatePartnerProfile,
    role
  } = useClinic();

  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [drawingAmount, setDrawingAmount] = useState('');
  const [drawingDate, setDrawingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [drawingMethod, setDrawingMethod] = useState('Online');
  const [drawingNotes, setDrawingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Partner Profile Modal State
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editEquityPercent, setEditEquityPercent] = useState('');
  const [editInitialInvestment, setEditInitialInvestment] = useState('');
  const [editProfileNotes, setEditProfileNotes] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  const partners = partnerEquity?.partners || [];
  const drawings = partnerEquity?.recentDrawings || [];

  const totalBrandValuation = partnerEquity?.estimatedBrandValuation || 0;
  const netProfit = partnerEquity?.netProfit || 0;
  const totalRevenue = partnerEquity?.totalRevenue || 0;
  const totalExpenses = partnerEquity?.totalExpenses || 0;

  const handleOpenEditProfile = (p: any) => {
    setEditingPartner(p);
    setEditEquityPercent(String(p.equityPercentage || 0));
    setEditInitialInvestment(String(p.initialInvestment || 0));
    setEditProfileNotes('');
    setErrorMsg(null);
    setIsEditProfileModalOpen(true);
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    const eqNum = Number(editEquityPercent);
    const invNum = Number(editInitialInvestment);
    if (isNaN(eqNum) || eqNum < 0 || eqNum > 100) {
      setErrorMsg('Equity percentage must be between 0% and 100%.');
      return;
    }
    if (isNaN(invNum) || invNum < 0) {
      setErrorMsg('Initial capital investment cannot be negative.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await updatePartnerProfile({
        partnerName: editingPartner.partnerName,
        equityPercentage: eqNum,
        initialInvestment: invNum,
        notes: editProfileNotes.trim() || undefined
      });
      setIsEditProfileModalOpen(false);
      setEditingPartner(null);
      setProfileSuccessMsg(`Updated equity details for ${editingPartner.partnerName}!`);
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update partner profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCumulativeWithdrawals = partners.reduce((acc, p) => acc + (p.totalWithdrawn || 0), 0);
  const totalNetCapital = partners.reduce((acc, p) => acc + (p.netCapitalBalance || 0), 0);

  const handleRecordDrawingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      setErrorMsg('Please select a partner.');
      return;
    }
    const amt = Number(drawingAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await recordPartnerDrawing({
        partnerId: selectedPartnerId,
        amount: amt,
        date: drawingDate,
        paymentMethod: drawingMethod,
        notes: drawingNotes.trim() || undefined
      });

      setIsDrawingModalOpen(false);
      setDrawingAmount('');
      setDrawingNotes('');
      await refreshPartnerEquity();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record drawing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Valuation & Capital KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Brand Valuation"
          value={formatPKR(totalBrandValuation)}
          colorVariant="indigo"
          icon={<Building className="w-5 h-5" />}
          subtitle="5.0x EBITDA Multiplier Valuation"
        />
        <StatCard
          title="Cumulative Withdrawn to Date"
          value={formatPKR(totalCumulativeWithdrawals)}
          colorVariant="amber"
          icon={<ArrowDownLeft className="w-5 h-5" />}
          subtitle="Total distributions taken by partners"
        />
        <StatCard
          title="Net Capital Balance Remaining"
          value={formatPKR(totalNetCapital)}
          colorVariant="emerald"
          icon={<Wallet className="w-5 h-5" />}
          subtitle="Initial capital + retained earnings"
        />
        <StatCard
          title="Net Operating Profit"
          value={formatPKR(netProfit)}
          colorVariant="blue"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={`Rev: ${formatPKR(totalRevenue, { decimals: false })} | Exp: ${formatPKR(totalExpenses, { decimals: false })}`}
        />
      </div>

      {/* Partner Equity Structure Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Partners Equity, Cumulative Withdrawals & Brand Stake
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time audit of each partner's capital contributions, total withdrawals taken, and equity stake in the clinic brand.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Comprehensive Audit PDF */}
            <a
              href="/Aura_Clinic_Financial_Systems_Comprehensive_Report.pdf"
              download="Aura_Clinic_Financial_Systems_Comprehensive_Report.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              Full Audit PDF
            </a>

            {(role === 'admin' || role === 'partner') && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setErrorMsg(null);
                  if (partners.length > 0 && !selectedPartnerId) {
                    setSelectedPartnerId(partners[0].id);
                  }
                  setIsDrawingModalOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Record Drawing
              </Button>
            )}
          </div>
        </div>

        {profileSuccessMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Partner Name</th>
                <th className="p-3.5 text-center">Equity Ownership</th>
                <th className="p-3.5 text-right">Initial Capital</th>
                <th className="p-3.5 text-right">Profit Share</th>
                <th className="p-3.5 text-right bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-extrabold">
                  Withdrawn to Date
                </th>
                <th className="p-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  Net Capital Balance
                </th>
                <th className="p-3.5 text-right font-bold text-indigo-700 dark:text-indigo-400">
                  Brand Value Stake
                </th>
                <th className="p-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No partner equity profiles configured yet.
                  </td>
                </tr>
              ) : (
                partners.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{p.partnerName}</div>
                      <div className="text-[10px] text-slate-400">{p.drawingsCount} withdrawals logged</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="primary">{p.equityPercentage}% Stake</Badge>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatPKR(p.initialInvestment)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatPKR(p.profitShare)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                      {formatPKR(p.totalWithdrawn)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatPKR(p.netCapitalBalance)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {formatPKR(p.marketBrandStake)}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      {(role === 'admin' || role === 'partner') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditProfile(p)}
                          className="text-xs px-2.5 py-1"
                          icon={<Pencil className="w-3 h-3 mr-1" />}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Withdrawals / Drawings Audit History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-amber-500" />
              Partner Drawings & Distribution Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of cash and bank profit distributions taken out by partners.
            </p>
          </div>
          <Badge variant="warning">{drawings.length} Transactions</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Date</th>
                <th className="p-3.5">Partner Name</th>
                <th className="p-3.5 text-right">Amount Withdrawn</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Purpose / Notes</th>
                <th className="p-3.5 text-right pr-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {drawings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No partner drawings recorded to date.
                  </td>
                </tr>
              ) : (
                drawings.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 pl-4 font-mono text-slate-500 dark:text-slate-400">
                      {d.date}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {d.partnerName}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatPKR(d.amount)}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                        {d.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 italic">
                      {d.notes || 'Routine profit drawing'}
                    </td>
                    <td className="p-3.5 text-right pr-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {d.createdBy || 'Admin'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Partner Drawing */}
      <Modal
        isOpen={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
        title="Record Partner Drawing / Withdrawal"
        maxWidth="md"
      >
        <form onSubmit={handleRecordDrawingSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <Select
            label="Select Partner"
            value={selectedPartnerId}
            onChange={e => setSelectedPartnerId(e.target.value)}
            required
            options={[
              { label: '-- Select Partner --', value: '' },
              ...partners.map(p => ({
                label: `${p.partnerName} (${p.equityPercentage}% Stake — Net Balance: ${formatPKR(p.netCapitalBalance)})`,
                value: p.id
              }))
            ]}
          />

          {(() => {
            const activePartner = partners.find(p => p.id === selectedPartnerId);
            if (!activePartner) return null;
            return (
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 text-xs grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Equity Stake</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">{activePartner.equityPercentage}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Capital Balance</span>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100">{formatPKR(activePartner.netCapitalBalance)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Drawn To Date</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatPKR(activePartner.totalWithdrawn)}</span>
                </div>
              </div>
            );
          })()}

          <Input
            label="Withdrawal Amount (PKR)"
            type="number"
            required
            min="1"
            placeholder="e.g. 50000"
            value={drawingAmount}
            onChange={e => setDrawingAmount(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Withdrawal Date"
              type="date"
              required
              value={drawingDate}
              onChange={e => setDrawingDate(e.target.value)}
            />
            <Select
              label="Payment Method"
              value={drawingMethod}
              onChange={e => setDrawingMethod(e.target.value)}
              options={[
                { label: 'Online / Bank Transfer', value: 'Online' },
                { label: 'Cash', value: 'Cash' },
                { label: 'Credit / Debit Card', value: 'Card' }
              ]}
            />
          </div>

          <Input
            label="Reason / Distribution Notes"
            placeholder="e.g. Monthly Profit Distribution Q3"
            value={drawingNotes}
            onChange={e => setDrawingNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Confirm Withdrawal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Partner Capital & Equity Modal */}
      <Modal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        title={`Configure Capital & Equity: ${editingPartner?.partnerName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Configure this partner's real equity ownership percentage and initial capital contribution.
          </div>

          <Input
            label="Equity Ownership Percentage (%)"
            type="number"
            required
            step="0.1"
            min="0"
            max="100"
            value={editEquityPercent}
            onChange={e => setEditEquityPercent(e.target.value)}
          />

          <Input
            label="Initial Capital Investment (PKR)"
            type="number"
            required
            min="0"
            placeholder="0"
            value={editInitialInvestment}
            onChange={e => setEditInitialInvestment(e.target.value)}
          />

          <Input
            label="Notes / Agreement Details"
            placeholder="e.g. Partnership agreement dated 2026"
            value={editProfileNotes}
            onChange={e => setEditProfileNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditProfileModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
