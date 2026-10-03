'use client';

import React, { useState, useEffect } from 'react';
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
  Pencil,
  RefreshCw
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { StatCard } from '../cards/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Pagination, usePagination } from '../ui/Pagination';

export function PartnerEquityTab() {
  const {
    partnerEquity,
    refreshPartnerEquity,
    recordPartnerDrawing,
    updatePartnerProfile,
    role,
    inventory = [],
    purchaseBills = [],
    clients = [],
    expenses = [],
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
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const partners = partnerEquity?.partners || [];
  const drawings = partnerEquity?.recentDrawings || [];

  // 5 Recent Drawings per page
  const {
    currentPage: drawingsPage,
    setCurrentPage: setDrawingsPage,
    paginatedItems: pagedDrawings,
  } = usePagination(drawings, 5);

  useEffect(() => {
    refreshPartnerEquity();
  }, []);

  useEffect(() => {
    if (partners.length > 0 && !selectedPartnerId) {
      setSelectedPartnerId(partners[0].id);
    }
  }, [partners, selectedPartnerId]);

  const totalBrandValuation = partnerEquity?.estimatedBrandValuation || 0;
  const netProfit = partnerEquity?.netProfit || 0;
  const totalRevenue = partnerEquity?.totalRevenue || 0;
  const totalExpenses = partnerEquity?.totalExpenses || 0;
  const cogs = partnerEquity?.cogs || 0;

  // Resilient helpers ensuring profit share and net capital balances reflect equity stake in clinic net operating profit
  const getPartnerProfitShare = (p: any) => {
    if (typeof p.profitShare === 'number' && p.profitShare >= 0) {
      return p.profitShare;
    }
    const stake = Number(p.equityPercentage) || 0;
    const baseProfit = netProfit > 0 ? netProfit : Math.max(0, totalRevenue - totalExpenses - cogs);
    if (stake > 0 && baseProfit > 0) {
      return Math.round(baseProfit * (stake / 100));
    }
    return 0;
  };

  const getPartnerNetCapital = (p: any, profit: number) => {
    if (typeof p.netCapitalBalance === 'number') {
      return p.netCapitalBalance;
    }
    const inv = p.totalInvested ?? p.initialInvestment ?? 0;
    const withdrawn = p.totalWithdrawn || 0;
    return Math.round((inv + profit) - withdrawn);
  };

  const handleOpenEditProfile = (p: any) => {
    setEditingPartner(p);
    setEditEquityPercent(String(p.equityPercentage || 0));
    setErrorMsg(null);
    setIsEditProfileModalOpen(true);
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    const eqNum = Number(editEquityPercent);
    if (isNaN(eqNum) || eqNum < 0 || eqNum > 100) {
      setErrorMsg('Equity percentage must be between 0% and 100%.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await updatePartnerProfile({
        partnerName: editingPartner.partnerName,
        equityPercentage: eqNum
      });
      setIsEditProfileModalOpen(false);
      setEditingPartner(null);
      setProfileSuccessMsg(`Updated equity percentage for ${editingPartner.partnerName}!`);
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update partner equity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCumulativeWithdrawals = partners.reduce((acc, p) => acc + (p.totalWithdrawn || 0), 0);
  const totalNetCapital = partners.reduce((acc, p) => {
    const pProfit = getPartnerProfitShare(p);
    return acc + getPartnerNetCapital(p, pProfit);
  }, 0);

  const handlePrintAuditPDF = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const todayStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // --- BALANCE SHEET AUDIT COMPUTATIONS ---
    const accountsReceivable = clients.reduce((acc, c: any) => acc + (c.outstandingBalance || 0), 0);
    const inventoryValuation = inventory.reduce((acc, item: any) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
    const totalContributedCapital = partners.reduce((acc, p) => acc + (p.totalInvested ?? p.initialInvestment ?? 0), 0);
    const cumulativeDrawings = totalCumulativeWithdrawals;
    const totalPurchExp = purchaseBills.reduce((acc, b: any) => acc + (b.amountPaid || 0), 0);
    const netCashDrawer = totalContributedCapital + totalRevenue - totalExpenses - totalPurchExp - cumulativeDrawings;
    const cashAndEquivalents = Math.max(0, netCashDrawer);
    const totalCurrentAssets = cashAndEquivalents + accountsReceivable + inventoryValuation;
    const totalAssets = totalCurrentAssets;

    const accountsPayable = purchaseBills.reduce((acc, b: any) => acc + (b.remainingDue || 0), 0);
    const accruedExpenses = expenses.filter((e: any) => (e.status || "").toLowerCase() !== "paid" && e.category !== "Partner Drawing").reduce((acc, e: any) => acc + (e.remainingAmount ?? e.amount ?? 0), 0);
    const totalLiabilities = accountsPayable + accruedExpenses;
    const retainedOperatingProfit = netProfit + accountsReceivable - accruedExpenses;
    const totalEquity = totalContributedCapital + retainedOperatingProfit - cumulativeDrawings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    doc.write(`
      <html>
        <head>
          <title>Partner Equity & Financial Audit Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; background: #fff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
            h1 { margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
            p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; }
            .grid { display: flex; gap: 16px; margin-bottom: 24px; }
            .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #f8fafc; }
            .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; }
            .card-value { font-size: 18px; font-weight: 800; margin-top: 4px; display: block; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
            th { background: #0f172a; color: white; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; font-weight: 700; }
            @media print {
              body { padding: 20px; }
              th { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Partner Equity & Financial Audit</h1>
              <p>Generated on ${todayStr} • Confidential Internal Partner Record</p>
            </div>
          </div>
          <div class="grid">
            <div class="card">
              <span class="card-title">Collected Revenue</span>
              <span class="card-value">${formatPKR(totalRevenue)}</span>
            </div>
            <div class="card">
              <span class="card-title">Operating Overheads</span>
              <span class="card-value">${formatPKR(totalExpenses)}</span>
            </div>
            <div class="card">
              <span class="card-title">Net Operating Profit</span>
              <span class="card-value">${formatPKR(netProfit)}</span>
            </div>
            <div class="card">
              <span class="card-title">Total Available to Take</span>
              <span class="card-value">${formatPKR(totalNetCapital)}</span>
            </div>
          </div>
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; text-transform: uppercase;">Partner Capital & Profit Share Ledger</h3>
          <table>
            <thead>
              <tr>
                <th>Partner Name</th>
                <th>Equity Stake</th>
                <th class="text-right">Capital Invested</th>
                <th class="text-right">Profit Share</th>
                <th class="text-right">Withdrawn to Date</th>
                <th class="text-right">Available to Take</th>
              </tr>
            </thead>
            <tbody>
              ${partners.map(p => {
                const profit = getPartnerProfitShare(p);
                const netCap = getPartnerNetCapital(p, profit);
                const inv = p.totalInvested ?? p.initialInvestment ?? 0;
                return `
                  <tr>
                    <td><strong>${p.partnerName}</strong></td>
                    <td>${p.equityPercentage}%</td>
                    <td class="text-right font-mono">${formatPKR(inv)}</td>
                    <td class="text-right font-mono text-emerald-600">+${formatPKR(profit)}</td>
                    <td class="text-right font-mono text-red-600">-${formatPKR(p.totalWithdrawn || 0)}</td>
                    <td class="text-right font-mono"><strong>${formatPKR(netCap)}</strong></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>

          <h3 style="font-size: 14px; font-weight: 700; margin-top: 30px; margin-bottom: 6px; text-transform: uppercase;">Statement of Financial Position (Balance Sheet)</h3>
          <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 16px;">
            Audited Balance: Assets (${formatPKR(totalAssets)}) = Liabilities & Equity (${formatPKR(totalLiabilitiesAndEquity)})
          </p>

          <div class="grid" style="gap: 20px; align-items: stretch;">
            <!-- ASSETS -->
            <div class="card" style="background: #ffffff;">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;">
                <span style="font-size: 12px; font-weight: 800; text-transform: uppercase;">1. Clinic Assets</span>
                <span style="font-size: 10px; font-weight: 700; color: #64748b;">Current Resources</span>
              </div>
              <table style="width: 100%; font-size: 11px; margin-bottom: 12px;">
                <tbody>
                  <tr>
                    <td style="padding: 6px 0;">Cash & Bank Liquid Balances</td>
                    <td class="text-right font-mono">${formatPKR(cashAndEquivalents)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">Accounts Receivable (A/R)</td>
                    <td class="text-right font-mono">${formatPKR(accountsReceivable)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">Merchandise & Clinic Inventory</td>
                    <td class="text-right font-mono">${formatPKR(inventoryValuation)}</td>
                  </tr>
                  <tr style="font-weight: 800; border-top: 1px solid #cbd5e1;">
                    <td style="padding: 8px 0; border-bottom: 2px solid #0f172a;">Total Assets</td>
                    <td class="text-right font-mono" style="border-bottom: 2px solid #0f172a;">${formatPKR(totalAssets)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- LIABILITIES & EQUITY -->
            <div class="card" style="background: #ffffff;">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;">
                <span style="font-size: 12px; font-weight: 800; text-transform: uppercase;">2. Liabilities & Equity</span>
                <span style="font-size: 10px; font-weight: 700; color: #64748b;">Obligations & Ownership</span>
              </div>
              <table style="width: 100%; font-size: 11px; margin-bottom: 12px;">
                <tbody>
                  <tr>
                    <td style="padding: 6px 0;">Accounts Payable (Vendor Dues)</td>
                    <td class="text-right font-mono">${formatPKR(accountsPayable)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">Accrued Operating Expenses</td>
                    <td class="text-right font-mono">${formatPKR(accruedExpenses)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">Contributed Partner Capital</td>
                    <td class="text-right font-mono">${formatPKR(totalContributedCapital)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">Retained Operating Profit (Realized)</td>
                    <td class="text-right font-mono">${formatPKR(netProfit)}</td>
                  </tr>
                  ${accruedExpenses > 0 ? `
                  <tr>
                    <td style="padding: 6px 0;">Less: Accrued Overheads Recognized</td>
                    <td class="text-right font-mono text-red-600">(${formatPKR(accruedExpenses)})</td>
                  </tr>
                  ` : ''}
                  ${accountsReceivable > 0 ? `
                  <tr>
                    <td style="padding: 6px 0;">Add: Accounts Receivable (A/R)</td>
                    <td class="text-right font-mono text-emerald-600">+${formatPKR(accountsReceivable)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 6px 0;">Less: Cumulative Drawings</td>
                    <td class="text-right font-mono text-red-600">(${formatPKR(cumulativeDrawings)})</td>
                  </tr>
                  <tr style="font-weight: 800; border-top: 1px solid #cbd5e1;">
                    <td style="padding: 8px 0; border-bottom: 2px solid #0f172a;">Total Liabilities & Equity</td>
                    <td class="text-right font-mono" style="border-bottom: 2px solid #0f172a;">${formatPKR(totalLiabilitiesAndEquity)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  };

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
          colorVariant="blue"
          icon={<Building className="w-5 h-5" />}
          subtitle="Revenue + Capital Invested"
        />
        <StatCard
          title="Cumulative Withdrawn to Date"
          value={formatPKR(totalCumulativeWithdrawals)}
          colorVariant="blue"
          icon={<ArrowDownLeft className="w-5 h-5" />}
          subtitle="Total distributions taken by partners"
        />
        <StatCard
          title="Net Capital Balance Remaining"
          value={formatPKR(totalNetCapital)}
          colorVariant="blue"
          icon={<Wallet className="w-5 h-5" />}
          subtitle="Total invested + profit - drawings"
        />
        <StatCard
          title="Net Operating Profit"
          value={formatPKR(netProfit)}
          colorVariant="blue"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={
            cogs > 0
              ? `Rev: ${formatPKR(totalRevenue, { decimals: false })} | COGS: ${formatPKR(cogs, { decimals: false })} | Overheads: ${formatPKR(totalExpenses, { decimals: false })}`
              : `Rev: ${formatPKR(totalRevenue, { decimals: false })} | Overheads: ${formatPKR(totalExpenses, { decimals: false })}`
          }
        />
      </div>

      {/* Partner Equity Structure Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Partners Equity & Cumulative Withdrawals
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time audit of each partner's capital contributions, revenue profit share by stake, and available to take balance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  setIsRefreshing(true);
                  await refreshPartnerEquity();
                } finally {
                  setIsRefreshing(false);
                }
              }}
              icon={<RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />}
            >
              Sync Live Equity
            </Button>

            {/* Download Comprehensive Audit PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintAuditPDF}
              icon={<Download className="w-3.5 h-3.5 text-blue-500" />}
            >
              Full Audit PDF
            </Button>

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

        <div className="responsive-table-wrapper">
          <table className="w-full min-w-[720px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Partner Name</th>
                <th className="p-3.5 text-center">Equity Ownership</th>
                <th className="p-3.5 text-right">Total Invested</th>
                <th className="p-3.5 text-right">Profit Share (By Stake)</th>
                <th className="p-3.5 text-right bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-extrabold">
                  Withdrawn to Date
                </th>
                <th className="p-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  Available to Take
                </th>
                <th className="p-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No partner equity profiles configured yet.
                  </td>
                </tr>
              ) : (
                partners.map(p => {
                  const pProfitShare = getPartnerProfitShare(p);
                  const pNetCapital = getPartnerNetCapital(p, pProfitShare);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{p.partnerName}</div>
                        <div className="text-[10px] text-slate-400">{p.drawingsCount} withdrawals logged</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant="primary">{p.equityPercentage}% Stake</Badge>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{formatPKR(p.totalInvested ?? p.initialInvestment)}</div>
                        <div className="text-[9px] text-slate-400 font-normal">
                          {p.purchaseContributions && p.purchaseContributions > 0 ? (
                            <span>
                              Purchases: {formatPKR(p.purchaseContributions, { decimals: false })}
                              {p.expenseContributions && p.expenseContributions > 0 ? ` | Overheads: ${formatPKR(p.expenseContributions, { decimals: false })}` : ''}
                              {p.seedInvestment && p.seedInvestment > 0 ? ` | Seed: ${formatPKR(p.seedInvestment, { decimals: false })}` : ''}
                            </span>
                          ) : (
                            'Expenses & Bills Paid'
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <div className="font-bold text-blue-600 dark:text-blue-400">{formatPKR(pProfitShare)}</div>
                        <div className="text-[9px] text-slate-400 font-normal">{p.equityPercentage}% of Revenue</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                        {formatPKR(p.totalWithdrawn)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatPKR(pNetCapital)}
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
                );
              })
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

        <div className="responsive-table-wrapper">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
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
                pagedDrawings.map(d => (
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

        <Pagination
          currentPage={drawingsPage}
          totalItems={drawings.length}
          pageSize={5}
          onPageChange={setDrawingsPage}
          itemLabel="drawings"
        />
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
                label: `${p.partnerName} (${p.equityPercentage}% Stake — Available to Take: ${formatPKR(p.netCapitalBalance)})`,
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
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Available to Take</span>
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

      {/* Edit Partner Equity Modal */}
      <Modal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        title={`Edit Equity Percentage: ${editingPartner?.partnerName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <span className="font-bold block">Dynamic Capital Accounting</span>
            <p className="text-slate-600 dark:text-slate-400">
              Partner invested capital is automatically computed in real-time from expenses and purchases. Only equity ownership percentage (%) can be edited here.
            </p>
          </div>

          <Input
            label="Equity Ownership Percentage (%)"
            type="number"
            required
            step="0.1"
            min="0"
            max="100"
            placeholder="e.g. 50"
            value={editEquityPercent}
            onChange={e => setEditEquityPercent(e.target.value)}
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
              {isSubmitting ? 'Saving...' : 'Save Equity Percentage'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
