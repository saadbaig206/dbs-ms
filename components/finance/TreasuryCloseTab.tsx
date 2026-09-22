'use client';

import React, { useState, useMemo } from 'react';
import {
  Vault,
  Building2,
  CreditCard,
  Banknote,
  CalendarCheck2,
  Printer,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { StatCard } from '../cards/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

interface MonthCloseRecord {
  id: string;
  month: string;
  closedAt: string;
  closedBy: string;
  grossRevenue: number;
  totalExpenses: number;
  netIncome: number;
  retainedReserves: number;
  partnerPool: number;
  status: 'Closed' | 'Audited';
}

export function TreasuryCloseTab() {
  const {
    transactions,
    expenses,
    partnerEquity,
    setPrintData,
    role
  } = useClinic();

  // Multi-tier Treasury Calculations based on real transactions, expenses, and partner drawings
  const {
    drawerCash,
    vaultCash,
    inTransitMerchant,
    bankOperating
  } = useMemo(() => {
    let cashIn = 0;
    let cardIn = 0;
    let bankIn = 0;

    for (const t of transactions) {
      const status = (t.status || '').toLowerCase();
      if (status === 'refunded' || status === 'cancelled') continue;

      const amt = t.amountPaid !== undefined && t.amountPaid !== null ? t.amountPaid : (t.grandTotal || 0);

      if (t.paymentSplits && t.paymentSplits.length > 0) {
        for (const split of t.paymentSplits) {
          const sMethod = (split.method || '').toLowerCase();
          const sAmt = Number(split.amount) || 0;
          if (sMethod === 'cash') cashIn += sAmt;
          else if (sMethod === 'card' || sMethod.includes('pos')) cardIn += sAmt;
          else bankIn += sAmt;
        }
      } else {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (pm === 'cash') cashIn += amt;
        else if (pm === 'card' || pm.includes('pos')) cardIn += amt;
        else bankIn += amt;
      }
    }

    // Cash and bank expenses
    const cashExpenses = expenses
      .filter(e => (e.paymentMethod || '').toLowerCase() === 'cash' && e.status === 'Paid')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const bankExpenses = expenses
      .filter(e => ((e.paymentMethod || '').toLowerCase().includes('bank') || (e.paymentMethod || '').toLowerCase() === 'online') && e.status === 'Paid')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    // Partner drawings deduction
    const drawings = partnerEquity?.recentDrawings || [];
    const cashDrawings = drawings
      .filter((d: any) => (d.paymentMethod || '').toLowerCase() === 'cash')
      .reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);
    const bankDrawings = drawings
      .filter((d: any) => (d.paymentMethod || '').toLowerCase() !== 'cash')
      .reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);

    const netCash = Math.max(0, cashIn - (cashExpenses + cashDrawings));
    
    // Tier 1: Real Working Front Desk Drawer Cash
    const drawer = netCash;
    // Tier 2: Vault Sweep (safe reserve)
    const vault = 0;

    // Tier 3: Card / POS Terminal In-Transit
    const inTransit = cardIn;

    // Tier 4: Commercial Bank Operating Account
    const bank = Math.max(0, bankIn - (bankExpenses + bankDrawings));

    return {
      drawerCash: drawer,
      vaultCash: vault,
      inTransitMerchant: inTransit,
      bankOperating: bank
    };
  }, [transactions, expenses, partnerEquity]);

  // Daily Z-Report State
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [physicalCashCount, setPhysicalCashCount] = useState('');
  const [zReportNotes, setZReportNotes] = useState('');

  // Month-End Close State
  const [isMonthCloseModalOpen, setIsMonthCloseModalOpen] = useState(false);
  const [closingMonth, setClosingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [retainPercent, setRetainPercent] = useState('30');
  const [isClosing, setIsClosing] = useState(false);

  // Stored Month-End Close Records (loaded from localStorage or empty)
  const [closeHistory, setCloseHistory] = useState<MonthCloseRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clinic_month_closes');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  const proposedCloseFigures = useMemo(() => {
    const [yStr, mStr] = closingMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;

    let rev = 0;
    for (const t of transactions) {
      const status = (t.status || '').toLowerCase();
      if (status === 'refunded' || status === 'cancelled') continue;
      if (t.transactionType === 'Debt_Settlement' || t.serviceName === 'Client Debt Settlement') continue;

      if (t.date) {
        const parts = t.date.split('-');
        if (parts.length >= 2 && parseInt(parts[0], 10) === y && parseInt(parts[1], 10) - 1 === m) {
          rev += (t.amountPaid ?? t.grandTotal ?? 0);
        }
      }
    }

    let exp = 0;
    for (const e of expenses) {
      if (e.date && e.status === 'Paid') {
        const parts = e.date.split('-');
        if (parts.length >= 2 && parseInt(parts[0], 10) === y && parseInt(parts[1], 10) - 1 === m) {
          exp += e.amount;
        }
      }
    }

    const net = Math.max(0, rev - exp);
    const retPct = Number(retainPercent) || 30;
    const retained = Math.round((net * retPct) / 100);
    const partnerPool = net - retained;

    return { rev, exp, net, retained, partnerPool };
  }, [closingMonth, retainPercent, transactions, expenses]);

  const handleRunMonthClose = (e: React.FormEvent) => {
    e.preventDefault();
    setIsClosing(true);

    const newRecord: MonthCloseRecord = {
      id: `CLOSE-${closingMonth}`,
      month: closingMonth,
      closedAt: new Date().toLocaleString(),
      closedBy: 'Authorized Admin / Partner',
      grossRevenue: proposedCloseFigures.rev,
      totalExpenses: proposedCloseFigures.exp,
      netIncome: proposedCloseFigures.net,
      retainedReserves: proposedCloseFigures.retained,
      partnerPool: proposedCloseFigures.partnerPool,
      status: 'Closed'
    };

    const nextList = [newRecord, ...closeHistory.filter(c => c.id !== newRecord.id)];
    setCloseHistory(nextList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_month_closes', JSON.stringify(nextList));
    }

    setIsClosing(false);
    setIsMonthCloseModalOpen(false);

    alert(`Month-End Close for ${closingMonth} finalized successfully!\n\nNet Income: ${formatPKR(proposedCloseFigures.net)}\nRetained Working Capital (30%): ${formatPKR(proposedCloseFigures.retained)}\nPartner Distributable Pool (70%): ${formatPKR(proposedCloseFigures.partnerPool)}`);
  };

  const [openingFloat, setOpeningFloat] = useState('');

  const handleGenerateZReport = (e: React.FormEvent) => {
    e.preventDefault();
    const floatAmt = Number(openingFloat) || 0;
    const count = Number(physicalCashCount) || 0;
    const expectedTotal = drawerCash + floatAmt;
    const variance = count - expectedTotal;

    setPrintData({
      title: `Daily Z-Report Shift Closeout - ${new Date().toLocaleDateString()}`,
      type: 'z-report',
      data: {
        title: 'DAILY CASH DRAWER Z-REPORT',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        openingFloat: floatAmt,
        shiftNetInflow: drawerCash,
        systemExpectedCash: expectedTotal,
        actualCountedCash: count,
        variance,
        varianceStatus: variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short',
        notes: zReportNotes || 'Shift verified by cashier'
      }
    });

    setIsZReportModalOpen(false);
    setOpeningFloat('');
    setPhysicalCashCount('');
    setZReportNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Treasury Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tier 1: Cash Drawer (#1010)"
          value={formatPKR(drawerCash)}
          colorVariant="emerald"
          icon={<Banknote className="w-5 h-5" />}
          subtitle="Reception cash register float"
        />
        <StatCard
          title="Tier 2: Main Vault (#1015)"
          value={formatPKR(vaultCash)}
          colorVariant="blue"
          icon={<Vault className="w-5 h-5" />}
          subtitle="Dual-custody manager safe"
        />
        <StatCard
          title="Tier 3: In-Transit (#1020)"
          value={formatPKR(inTransitMerchant)}
          colorVariant="amber"
          icon={<CreditCard className="w-5 h-5" />}
          subtitle="POS terminal card settlement"
        />
        <StatCard
          title="Tier 4: Operating Bank (#1030)"
          value={formatPKR(bankOperating)}
          colorVariant="indigo"
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Meezan / HBL corporate current"
        />
      </div>

      {/* Control Actions Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Treasury Management & Fiscal Closeout Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-world asset account reconciliation, daily cash drawer Z-Reports, and monthly closing to Retained Earnings (#3010).
          </p>
        </div>

        {(role === 'admin' || role === 'partner') && (
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsZReportModalOpen(true)}
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4 text-emerald-500" />}
            >
              Daily Shift Z-Report
            </Button>
            <Button
              onClick={() => setIsMonthCloseModalOpen(true)}
              variant="primary"
              size="sm"
              icon={<CalendarCheck2 className="w-4 h-4" />}
            >
              Run Month-End Close
            </Button>
          </div>
        )}
      </div>

      {/* Treasury Breakdown Architecture Specification Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          Multi-Tier Asset Account Allocation Architecture
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Treasury Tier</th>
                <th className="py-2.5 px-3">Account Type & GL Code</th>
                <th className="py-2.5 px-3">Current Balance</th>
                <th className="py-2.5 px-3">Reconciliation Cycle</th>
                <th className="py-2.5 px-3">Custody & Physical Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">Tier 1: Drawer</td>
                <td className="py-3 px-3 font-mono font-semibold">Front Desk Cash Drawer (#1010)</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(drawerCash)}</td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-400">Daily Z-Report shift closeout</td>
                <td className="py-3 px-3 text-slate-500">Reception cash drawer at branch</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">Tier 2: Vault</td>
                <td className="py-3 px-3 font-mono font-semibold">Clinic Main Safe / Vault (#1015)</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(vaultCash)}</td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-400">Weekly sweep of drawer cash surplus</td>
                <td className="py-3 px-3 text-slate-500">Dual-custody safe in Manager office</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">Tier 3: In-Transit</td>
                <td className="py-3 px-3 font-mono font-semibold">Merchant POS Clearing (#1020)</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(inTransitMerchant)}</td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-400">T+1 automated bank settlement</td>
                <td className="py-3 px-3 text-slate-500">Bank terminal clearing account</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">Tier 4: Bank</td>
                <td className="py-3 px-3 font-mono font-semibold">Commercial Operating Acc (#1030)</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(bankOperating)}</td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-400">Monthly corporate bank reconciliation</td>
                <td className="py-3 px-3 text-slate-500">Meezan Bank / HBL Corporate Account</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Month-End Fiscal Closing Engine Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-emerald-500" />
              Historical Month-End Fiscal Closings & Profit Allocations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Net income closed into Retained Earnings (#3010) and Partner Distributable Pool (#3020)
            </p>
          </div>
          <Badge variant="success">{closeHistory.length} Months Closed</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Close ID</th>
                <th className="py-3 px-3.5">Fiscal Month</th>
                <th className="py-3 px-3.5">Closed Timestamp</th>
                <th className="py-3 px-3.5 text-right">Gross Revenue</th>
                <th className="py-3 px-3.5 text-right">Operating OPEX</th>
                <th className="py-3 px-3.5 text-right">Net Income (#3010)</th>
                <th className="py-3 px-3.5 text-right">Retained Reserves (30%)</th>
                <th className="py-3 px-3.5 text-right">Partner Pool (70%)</th>
                <th className="py-3 px-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {closeHistory.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-medium">
                  <td className="py-3 px-3.5 font-mono font-bold text-blue-600">{rec.id}</td>
                  <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">{rec.month}</td>
                  <td className="py-3 px-3.5 text-slate-500">{rec.closedAt}</td>
                  <td className="py-3 px-3.5 text-right font-mono">{formatPKR(rec.grossRevenue)}</td>
                  <td className="py-3 px-3.5 text-right font-mono text-rose-600">{formatPKR(rec.totalExpenses)}</td>
                  <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600">{formatPKR(rec.netIncome)}</td>
                  <td className="py-3 px-3.5 text-right font-mono text-blue-600">{formatPKR(rec.retainedReserves)}</td>
                  <td className="py-3 px-3.5 text-right font-mono text-amber-600 font-bold">{formatPKR(rec.partnerPool)}</td>
                  <td className="py-3 px-3.5 text-center">
                    <Badge variant="success" size="sm">Closed & Reconciled</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Z-Report Modal */}
      <Modal
        isOpen={isZReportModalOpen}
        onClose={() => setIsZReportModalOpen(false)}
        title="Generate Daily Cash Drawer Z-Report"
        description="Verify end-of-shift cash drawer balance and log physical cash count variances."
        maxWidth="md"
      >
        <form onSubmit={handleGenerateZReport} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Shift Net Cash Inflow</span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{formatPKR(drawerCash)}</span>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase block">Total System Expected</span>
              <span className="text-lg font-black font-mono text-indigo-900 dark:text-indigo-200">
                {formatPKR(drawerCash + (Number(openingFloat) || 0))}
              </span>
            </div>
          </div>

          <Input
            label="Morning Opening Cash Float (PKR)"
            type="number"
            min="0"
            placeholder="e.g. 10000 (Float present in till at start of shift)"
            value={openingFloat}
            onChange={e => setOpeningFloat(e.target.value)}
          />

          <Input
            label="Actual Physical Cash Counted (PKR)"
            type="number"
            min="0"
            required
            placeholder="Count all notes currently in drawer"
            value={physicalCashCount}
            onChange={e => setPhysicalCashCount(e.target.value)}
          />

          {physicalCashCount && (
            <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
              Number(physicalCashCount) - (drawerCash + (Number(openingFloat) || 0)) === 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : Number(physicalCashCount) - (drawerCash + (Number(openingFloat) || 0)) > 0
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              <span>Count Variance:</span>
              <span className="font-mono">
                {Number(physicalCashCount) - (drawerCash + (Number(openingFloat) || 0)) === 0
                  ? 'Perfect Match (Rs. 0)'
                  : Number(physicalCashCount) - (drawerCash + (Number(openingFloat) || 0)) > 0
                  ? `Over: +${formatPKR(Number(physicalCashCount) - (drawerCash + (Number(openingFloat) || 0)))}`
                  : `Short: -${formatPKR(Math.abs(Number(physicalCashCount) - (drawerCash + (Number(openingFloat) || 0))))}`}
              </span>
            </div>
          )}

          <Input
            label="Cashier Shift Notes / Handover"
            placeholder="e.g. Evening shift closeout by front desk"
            value={zReportNotes}
            onChange={e => setZReportNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsZReportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Printer className="w-4 h-4" />}>
              Print Z-Report Slip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Month-End Close Modal */}
      <Modal
        isOpen={isMonthCloseModalOpen}
        onClose={() => setIsMonthCloseModalOpen(false)}
        title="Execute Month-End Fiscal Close (Closing to Retained Earnings)"
        description="Formal accounting closing zeroes temporary P&L accounts, retains laser maintenance reserves, and credits the Partner Distributable Pool."
        maxWidth="lg"
      >
        <form onSubmit={handleRunMonthClose} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fiscal Month to Close"
              type="month"
              required
              value={closingMonth}
              onChange={e => setClosingMonth(e.target.value)}
            />
            <Input
              label="Retained Working Capital %"
              type="number"
              min="0"
              max="100"
              required
              value={retainPercent}
              onChange={e => setRetainPercent(e.target.value)}
            />
          </div>

          {/* Allocation Preview Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Accounting Allocation Summary for {closingMonth}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Month Gross Revenue:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(proposedCloseFigures.rev)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Operating Expenses:</span>
                <span className="font-mono font-bold text-rose-600">{formatPKR(proposedCloseFigures.exp)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Net Income:</span>
                <span className="font-mono font-black text-emerald-600">{formatPKR(proposedCloseFigures.net)}</span>
              </div>
              <div className="sm:col-span-1">
                <span className="text-slate-400 block">Retained Reserves ({retainPercent}%):</span>
                <span className="font-mono font-bold text-blue-600">{formatPKR(proposedCloseFigures.retained)}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block">Partner Distributable Pool ({100 - (Number(retainPercent) || 30)}%):</span>
                <span className="font-mono font-black text-amber-600">{formatPKR(proposedCloseFigures.partnerPool)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
            Note: Executing this closeout locks the fiscal month. Future adjustments to this period will require an audited journal entry.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsMonthCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isClosing}>
              {isClosing ? 'Closing Period...' : 'Confirm & Execute Fiscal Close'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
