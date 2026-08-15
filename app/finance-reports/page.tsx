'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Lock,
  Search,
  Printer,
  Receipt,
  Plus,
  BarChart3,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { ExpenseCategory } from '../../lib/types/clinic';
import { StatCard } from '../../components/cards/StatCard';
import { RevenueChart, ServiceDistributionChart, ExpenseBreakdownChart } from '../../components/charts/ClinicCharts';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function FinanceReportsPage() {
  const { transactions, expenses, addExpense, updateExpense, role, setPrintData } = useClinic();
  const [activeTab, setActiveTab] = useState<'transactions' | 'expenses' | 'reports'>('transactions');

  const handlePayExpense = async (id: string) => {
    try {
      await updateExpense(id, { status: 'Paid' });
    } catch (e: any) {
      console.error("Failed to pay expense:", e);
    }
  };

  // Transactions Section State
  const [txnSearch, setTxnSearch] = useState('');

  // Expenses Section State
  const [expSearch, setExpSearch] = useState('');
  const [expCategoryFilter, setExpCategoryFilter] = useState<string>('All');
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Products');
  const [expAmount, setExpAmount] = useState<string>('1500');
  const [expPaymentMethod, setExpPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'>('Bank Transfer');
  const [expNotes, setExpNotes] = useState('');

  // Reports Section State
  const [activeReport, setActiveReport] = useState<
    'Revenue' | 'Expense' | 'Profit' | 'Salary' | 'Inventory' | 'Client' | 'Service'
  >('Revenue');

  const reportTabs = [
    'Revenue',
    'Expense',
    'Profit',
    'Salary',
    'Inventory',
    'Client',
    'Service'
  ] as const;

  // Calculators
  const totalRevenue = transactions.reduce((acc, t) => acc + t.grandTotal, 0);
  const totalDiscounts = transactions.reduce((acc, t) => acc + t.discount, 0);
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Dynamic profit margin and trend logic
  const now = new Date();
  const currentMonthNum = now.getMonth();
  const currentYearNum = now.getFullYear();

  // Previous month info
  const prevMonthNum = currentMonthNum === 0 ? 11 : currentMonthNum - 1;
  const prevMonthYear = currentMonthNum === 0 ? currentYearNum - 1 : currentYearNum;

  // Current Month metrics
  const curMonthRev = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
    })
    .reduce((acc, t) => acc + t.grandTotal, 0);

  const curMonthExp = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
    })
    .reduce((acc, e) => acc + e.amount, 0);

  // Previous Month metrics
  const prevMonthRev = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonthNum && d.getFullYear() === prevMonthYear;
    })
    .reduce((acc, t) => acc + t.grandTotal, 0);

  const prevMonthExp = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === prevMonthNum && d.getFullYear() === prevMonthYear;
    })
    .reduce((acc, e) => acc + e.amount, 0);

  const curMargin = curMonthRev > 0 ? ((curMonthRev - curMonthExp) / curMonthRev) * 100 : 0;
  const prevMargin = prevMonthRev > 0 ? ((prevMonthRev - prevMonthExp) / prevMonthRev) * 100 : 0;

  const marginDiff = curMargin - prevMargin;
  const dynamicTrend = marginDiff >= 0 ? `+${marginDiff.toFixed(1)}%` : `${marginDiff.toFixed(1)}%`;
  const trendDirection = marginDiff >= 0 ? 'up' : 'down';

  // Dynamic values for Gross Revenue & Discounts
  const curMonthDisc = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
    })
    .reduce((acc, t) => acc + t.discount, 0);

  const prevMonthDisc = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonthNum && d.getFullYear() === prevMonthYear;
    })
    .reduce((acc, t) => acc + t.discount, 0);

  // Revenue month-over-month trend
  const revDiff = prevMonthRev > 0 ? ((curMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0;
  const revTrend = revDiff >= 0 ? `+${revDiff.toFixed(1)}%` : `${revDiff.toFixed(1)}%`;
  const revTrendDirection = revDiff >= 0 ? 'up' : 'down';

  // Discount month-over-month trend
  const discDiff = prevMonthDisc > 0 ? ((curMonthDisc - prevMonthDisc) / prevMonthDisc) * 100 : 0;
  const discTrend = discDiff >= 0 ? `+${discDiff.toFixed(1)}%` : `${discDiff.toFixed(1)}%`;
  const discTrendDirection = discDiff >= 0 ? 'up' : 'down';

  // Margin Target Subtitle
  const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenseAmount) / totalRevenue) * 100 : 0;
  const marginTargetDiff = 70 - overallMargin;
  const marginSubtitle = marginTargetDiff > 0 
    ? `${marginTargetDiff.toFixed(1)}% below target (70%)` 
    : `Target reached! (70%)`;

  const filteredTxns = transactions.filter((t) => {
    return (
      t.clientName.toLowerCase().includes(txnSearch.toLowerCase()) ||
      t.serviceName.toLowerCase().includes(txnSearch.toLowerCase()) ||
      t.invoiceId.toLowerCase().includes(txnSearch.toLowerCase())
    );
  });

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(expSearch.toLowerCase());
    const matchesCat = expCategoryFilter === 'All' || e.category === expCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleAddExpense = (ev: React.FormEvent) => {
    ev.preventDefault();
    addExpense({
      title: expTitle,
      category: expCategory,
      amount: Number(expAmount) || 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Paid',
      paymentMethod: expPaymentMethod,
      notes: expNotes
    });

    setIsAddExpenseModalOpen(false);
    setExpTitle('');
    setExpNotes('');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Finance & Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track revenue, expenses, and view basic reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Sub-Tabs Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'reports'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Analytics
            </button>
          </div>

          {activeTab === 'expenses' && role === 'admin' && (
            <Button onClick={() => setIsAddExpenseModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
              Add Expense
            </Button>
          )}

          {activeTab === 'reports' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />}>
                Export CSV
              </Button>
              <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
                PDF Report
              </Button>
            </div>
          )}
        </div>
      </div>

      {role === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Full ledger records, operational overhead details, and executive profit audits are locked for Staff accounts. Switch to Admin mode to unlock full controls.
          </span>
        </div>
      )}

      {role === 'admin' && (
        <>
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Gross Revenue (POS & Appointments)"
                  value={formatPKR(totalRevenue)}
                  trend={revTrend}
                  trendDirection={revTrendDirection}
                  colorVariant="emerald"
                  icon={<DollarSign className="w-5 h-5" />}
                  subtitle={`${new Date().toLocaleString('en-US', { month: 'short' })} Rev: ${formatPKR(curMonthRev, { decimals: false })}`}
                />
                <StatCard
                  title="Discounts & Promotions Given"
                  value={formatPKR(totalDiscounts)}
                  trend={discTrend}
                  trendDirection={discTrendDirection}
                  colorVariant="amber"
                  icon={<CreditCard className="w-5 h-5" />}
                  subtitle={`${totalRevenue > 0 ? ((totalDiscounts / totalRevenue) * 100).toFixed(1) : '0.0'}% of gross revenue`}
                />
                <StatCard
                  title="Net Operating Profit Margin"
                  value={`${totalRevenue > 0 ? (((totalRevenue - totalExpenseAmount) / totalRevenue) * 100).toFixed(1) : '0.0'}%`}
                  trend={dynamicTrend}
                  trendDirection={trendDirection}
                  colorVariant="indigo"
                  icon={<TrendingUp className="w-5 h-5" />}
                  subtitle={marginSubtitle}
                />
              </div>

              {/* Revenue Area Chart */}
              <div className="luxury-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Monthly Revenue vs Operating Profit
                    </h3>
                    <p className="text-xs text-slate-500">2026 Fiscal Year Growth Chart</p>
                  </div>
                  <Badge variant="primary">Updated</Badge>
                </div>
                <RevenueChart />
              </div>

              {/* Payment Transactions Table */}
              <div className="luxury-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Recent Payment Transactions
                  </h3>
                  <Input
                    placeholder="Search by invoice ID or client..."
                    value={txnSearch}
                    onChange={(e) => setTxnSearch(e.target.value)}
                    icon={<Search className="w-4 h-4" />}
                    className="w-full sm:w-72"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 rounded-l-xl">Invoice ID</th>
                        <th className="py-3.5 px-4">Client Name</th>
                        <th className="py-3.5 px-4">Treatments</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Payment Method</th>
                        <th className="py-3.5 px-4">Grand Total</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right rounded-r-xl">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {filteredTxns.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {txn.invoiceId}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {txn.clientName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {txn.serviceName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {txn.date}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="neutral">{txn.paymentMethod}</Badge>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-slate-100">
                            {formatPKR(txn.grandTotal)}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="success">{txn.status}</Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setPrintData({ title: `Invoice ${txn.invoiceId}`, type: 'invoice', data: txn })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                              title="Print Official Invoice Receipt"
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
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Total Card */}
              <div className="luxury-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Operational Expenses</span>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                    {formatPKR(totalExpenseAmount)}
                  </h2>
                </div>
                <Badge variant="primary" size="md">{expenses.length} Active Entries</Badge>
              </div>

              {/* Filter & Search Bar */}
              <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Input
                  placeholder="Search expenses by title..."
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  className="w-full md:w-80"
                />

                <Select
                  options={[
                    { label: 'All Categories', value: 'All' },
                    { label: 'Salary', value: 'Salary' },
                    { label: 'Electric Bill', value: 'Electric Bill' },
                    { label: 'Water Bill', value: 'Water Bill' },
                    { label: 'Rent', value: 'Rent' },
                    { label: 'Products', value: 'Products' },
                    { label: 'Machines', value: 'Machines' },
                    { label: 'Marketing', value: 'Marketing' },
                    { label: 'Other', value: 'Other' }
                  ]}
                  value={expCategoryFilter}
                  onChange={(e) => setExpCategoryFilter(e.target.value)}
                  className="w-48"
                />
              </div>

              {/* Expenses Table */}
              <div className="luxury-card p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 rounded-l-xl">Expense Title</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Payment Method</th>
                        <th className="py-3.5 px-4">Amount</th>
                        <th className="py-3.5 px-4 text-right rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</div>
                            <div className="text-[11px] text-slate-400">{exp.notes || 'Routine expense'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="primary">{exp.category}</Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                            {exp.date}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {exp.paymentMethod}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-rose-600 dark:text-rose-400">
                            -{formatPKR(exp.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant={exp.status === 'Paid' ? 'success' : 'warning'}>{exp.status}</Badge>
                              {exp.status === 'Pending' && (
                                <button
                                  onClick={() => handlePayExpense(exp.id)}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                                >
                                  Pay Salary
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Reports Navigation Tabs */}
              <div className="luxury-card p-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {reportTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveReport(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeReport === tab
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {tab} Report
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Report Visual Panel */}
              <div className="luxury-card p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      Executive Analytics
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {activeReport} Audit & Breakdown (2026)
                    </h2>
                  </div>
                  <Badge variant="success" size="md">Verified Fiscal Data</Badge>
                </div>

                {/* Visual Charts Based on Selected Tab */}
                {(activeReport === 'Revenue' || activeReport === 'Profit') && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Interactive monthly net revenue trajectory compared against operational overheads.
                    </p>
                    <RevenueChart />
                  </div>
                )}

                {activeReport === 'Expense' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Breakdown of clinic operational costs across salaries, rent, machines, marketing, and products.
                    </p>
                    <ExpenseBreakdownChart />
                  </div>
                )}

                {(activeReport === 'Service' || activeReport === 'Client' || activeReport === 'Inventory' || activeReport === 'Salary') && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Share of treatment popularity and inventory utilization across key clinic categories.
                    </p>
                    <ServiceDistributionChart />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        title="Add Expense Record"
        description="Log operational costs and facility expenditures"
        maxWidth="lg"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Allergan Botox Stock Shipment"
            value={expTitle}
            onChange={(e) => setExpTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { label: 'Salary', value: 'Salary' },
                { label: 'Electric Bill', value: 'Electric Bill' },
                { label: 'Water Bill', value: 'Water Bill' },
                { label: 'Rent', value: 'Rent' },
                { label: 'Products', value: 'Products' },
                { label: 'Machines', value: 'Machines' },
                { label: 'Marketing', value: 'Marketing' },
                { label: 'Other', value: 'Other' }
              ]}
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as any)}
            />
            <Input
              label="Amount (Rs)"
              type="text"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <Select
            label="Payment Method"
            options={[
              { label: 'Bank Transfer', value: 'Bank Transfer' },
              { label: 'Card', value: 'Card' },
              { label: 'Cash', value: 'Cash' },
              { label: 'Cheque', value: 'Cheque' }
            ]}
            value={expPaymentMethod}
            onChange={(e) => setExpPaymentMethod(e.target.value as any)}
          />

          <Input
            label="Notes / Vendor Details"
            placeholder="Supplier reference or invoice notes..."
            value={expNotes}
            onChange={(e) => setExpNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Expense Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
