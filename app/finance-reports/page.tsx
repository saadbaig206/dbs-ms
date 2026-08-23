'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Lock,
  Search,
  Printer,
  Plus,
  Download,
  Edit,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { ExpenseCategory } from '../../lib/types/clinic';
import { StatCard } from '../../components/cards/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

function FinanceDatePicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = new Date(`${value}T00:00:00`);
  const [viewDate, setViewDate] = useState(selectedDate);
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) : null;
  });
  const dateKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Select ${label.toLowerCase()}`}
        aria-expanded={isOpen}
        onClick={() => {
          setViewDate(selectedDate);
          setIsOpen((open) => !open);
        }}
        className="finance-date-input flex w-[138px] items-center justify-between gap-2 px-3 py-2 bg-gradient-to-br from-white to-blue-50/70 dark:from-slate-900 dark:to-blue-950/30 border border-blue-100 dark:border-blue-900/60 text-slate-950 dark:text-slate-50 text-xs font-bold rounded-xl focus:outline-none transition-all"
      >
        <span>{value}</span>
        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-blue-500" />
      </button>

      {isOpen && (
        <div className="finance-calendar-popover absolute right-0 z-30 mt-2 w-[270px] rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-900/15 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-1 pb-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((date, index) => date ? (
              <button
                key={dateKey(date)}
                type="button"
                onClick={() => {
                  onChange(dateKey(date));
                  setIsOpen(false);
                }}
                className={`h-8 rounded-lg text-xs font-bold transition ${dateKey(date) === value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300'
                  }`}
              >
                {date.getDate()}
              </button>
            ) : <span key={`empty-${index}`} className="h-8" />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinanceReportsPage() {
  const {
    transactions: allTransactions,
    expenses: allExpenses,
    addExpense,
    updateExpense,
    updateTransaction,
    role,
    setPrintData,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    isLoading
  } = useClinic();

  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== 'admin' && role !== 'partner') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const transactions = selectedBranchId
    ? allTransactions.filter(t => t.branchId === selectedBranchId)
    : allTransactions;

  const expenses = selectedBranchId
    ? allExpenses.filter(e => e.branchId === selectedBranchId)
    : allExpenses;

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
  const [txnPage, setTxnPage] = useState(1);

  // Expenses Section State
  const [expSearch, setExpSearch] = useState('');
  const [expCategoryFilter, setExpCategoryFilter] = useState<string>('All');
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Products');
  const [expAmount, setExpAmount] = useState<string>('1500');
  const [expPaymentMethod, setExpPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'>('Bank Transfer');
  const [expNotes, setExpNotes] = useState('');

  // Edit Transaction State
  const [isEditTxnModalOpen, setIsEditTxnModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [txnClientName, setTxnClientName] = useState('');
  const [txnServiceName, setTxnServiceName] = useState('');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDiscount, setTxnDiscount] = useState('');
  const [txnGrandTotal, setTxnGrandTotal] = useState('');
  const [txnDate, setTxnDate] = useState('');
  const [txnPaymentMethod, setTxnPaymentMethod] = useState<'Cash' | 'Card' | 'Bank' | 'Online'>('Cash');

  // Edit Expense State
  const [isEditExpModalOpen, setIsEditExpModalOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<any>(null);
  const [editExpTitle, setEditExpTitle] = useState('');
  const [editExpCategory, setEditExpCategory] = useState<ExpenseCategory>('Products');
  const [editExpAmount, setEditExpAmount] = useState('');
  const [editExpPaymentMethod, setEditExpPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'>('Bank Transfer');
  const [editExpNotes, setEditExpNotes] = useState('');
  const [editExpDate, setEditExpDate] = useState('');
  const [editExpStatus, setEditExpStatus] = useState<'Paid' | 'Pending'>('Paid');

  const [activeReport, setActiveReport] = useState<
    'Revenue' | 'Expense' | 'Profit'
  >('Revenue');

  const reportTabs = [
    'Revenue',
    'Expense',
    'Profit'
  ] as const;

  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  });

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

  const sortedTxns = [...filteredTxns].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });

  const itemsPerPage = 10;
  const totalTxnPages = Math.ceil(sortedTxns.length / itemsPerPage) || 1;
  const pagedTxns = sortedTxns.slice((txnPage - 1) * itemsPerPage, txnPage * itemsPerPage);

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

  const handleEditTransactionSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedTxn) return;
    try {
      const subtotal = Number(txnAmount) || 0;
      const discVal = Number(txnDiscount) || 0;
      const total = subtotal - discVal;
      await updateTransaction(selectedTxn.id, {
        clientName: txnClientName,
        serviceName: txnServiceName,
        amount: subtotal,
        discount: discVal,
        grandTotal: total,
        date: txnDate,
        paymentMethod: txnPaymentMethod,
      });
      setIsEditTxnModalOpen(false);
      setSelectedTxn(null);
    } catch (e) {
      console.error("Failed to update transaction:", e);
    }
  };

  const handleEditExpenseSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedExp) return;
    try {
      await updateExpense(selectedExp.id, {
        title: editExpTitle,
        category: editExpCategory,
        amount: Number(editExpAmount) || 0,
        paymentMethod: editExpPaymentMethod,
        notes: editExpNotes,
        date: editExpDate,
        status: editExpStatus,
      });
      setIsEditExpModalOpen(false);
      setSelectedExp(null);
    } catch (e) {
      console.error("Failed to update expense:", e);
    }
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

        <div className="flex items-center gap-3 flex-wrap">
          {branches.length > 0 && (
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value || null)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Main Sub-Tabs Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'transactions'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'expenses'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'reports'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              Analytics
            </button>
          </div>

          {activeTab === 'expenses' && (role === 'admin' || role === 'partner') && (
            <Button onClick={() => setIsAddExpenseModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
              Add Expense
            </Button>
          )}

          {activeTab === 'reports' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">From:</span>
                <FinanceDatePicker label="report start date" value={reportStartDate} onChange={setReportStartDate} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">To:</span>
                <FinanceDatePicker label="report end date" value={reportEndDate} onChange={setReportEndDate} />
              </div>
              <Button
                onClick={() => {
                  const filteredTxns = transactions.filter(t => t.date >= reportStartDate && t.date <= reportEndDate);
                  const filteredExps = expenses.filter(e => e.date >= reportStartDate && e.date <= reportEndDate);

                  const totalRev = filteredTxns.reduce((acc, t) => acc + t.grandTotal, 0);
                  const totalExp = filteredExps.reduce((acc, e) => acc + e.amount, 0);
                  const netProfit = totalRev - totalExp;

                  const formatFinancial = (val: number) => {
                    const formatted = formatPKR(Math.abs(val), { decimals: false });
                    return val < 0 ? `(${formatted})` : formatted;
                  };

                  const iframe = document.createElement('iframe');
                  iframe.style.position = 'fixed';
                  iframe.style.width = '0px';
                  iframe.style.height = '0px';
                  iframe.style.border = 'none';
                  document.body.appendChild(iframe);

                  const doc = iframe.contentWindow?.document || iframe.contentDocument;
                  if (!doc) {
                    alert('Failed to generate document context.');
                    return;
                  }

                  doc.write(`
                    <html>
                      <head>
                        <title>Financial Audit Report (${reportStartDate} to ${reportEndDate})</title>
                        <style>
                          body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            color: #000000;
                            padding: 40px;
                            margin: 0;
                            line-height: 1.5;
                            background: white;
                          }
                          .header {
                            border-bottom: 2px solid #000000;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          }
                          .header h1 {
                            margin: 0;
                            font-size: 26px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: -0.5px;
                            color: #000000;
                          }
                          .header p {
                            margin: 5px 0 0 0;
                            font-size: 13px;
                            color: #333333;
                            font-weight: 500;
                          }
                          .badge {
                            border: 2px solid #000000;
                            color: #000000;
                            font-size: 10px;
                            font-weight: 800;
                            padding: 6px 12px;
                            border-radius: 20px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                          }
                          .grid {
                            display: flex;
                            gap: 20px;
                            margin-bottom: 25px;
                          }
                          .grid-item {
                            flex: 1;
                          }
                          .card {
                            background: #ffffff;
                            border: 1px solid #000000;
                            border-radius: 16px;
                            padding: 20px;
                          }
                          .card-title {
                            font-size: 10px;
                            font-weight: 800;
                            color: #666666;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            display: block;
                          }
                          .card-value {
                            font-size: 22px;
                            font-weight: 900;
                            margin-top: 6px;
                            display: block;
                            color: #000000;
                          }
                          h2 {
                            font-size: 15px;
                            font-weight: 800;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-top: 35px;
                            margin-bottom: 15px;
                            border-bottom: 2px solid #000000;
                            padding-bottom: 8px;
                            color: #000000;
                          }
                          table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 12px;
                            margin-bottom: 30px;
                          }
                          th {
                            background: #000000;
                            color: #ffffff;
                            font-weight: 700;
                            text-transform: uppercase;
                            font-size: 10px;
                            padding: 12px;
                            text-align: left;
                            letter-spacing: 0.5px;
                          }
                          td {
                            padding: 12px;
                            border-bottom: 1px solid #000000;
                            color: #000000;
                          }
                          .text-right { text-align: right; }
                          .font-mono { font-family: monospace; font-weight: 700; }
                          .double-underline {
                            border-bottom: 3px double #000000;
                            padding-bottom: 2px;
                          }
                          @media print {
                            body {
                              color: #000000 !important;
                              background: #ffffff !important;
                            }
                            * {
                              color: #000000 !important;
                              border-color: #000000 !important;
                            }
                            th {
                              background: #000000 !important;
                              color: #ffffff !important;
                              -webkit-print-color-adjust: exact;
                              print-color-adjust: exact;
                            }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div>
                            <h1>DBS Aesthetic Clinic & Salon</h1>
                            <p>Financial Audit Report • Timeframe: ${reportStartDate} to ${reportEndDate}</p>
                          </div>
                          <div class="badge">Audit Report</div>
                        </div>

                        <div class="grid">
                          <div class="grid-item">
                            <div class="card">
                              <span class="card-title">Report Period</span>
                              <span class="card-value">${reportStartDate} to ${reportEndDate}</span>
                            </div>
                          </div>
                          <div class="grid-item">
                            <div class="card" style="text-align: right;">
                              <span class="card-title">Transactions Count</span>
                              <span class="card-value">${filteredTxns.length} Sales Entries</span>
                            </div>
                          </div>
                        </div>

                        <div class="grid">
                          <div class="grid-item">
                            <div class="card">
                              <span class="card-title">Net Revenue</span>
                              <span class="card-value">${formatFinancial(totalRev)}</span>
                            </div>
                          </div>
                          <div class="grid-item">
                            <div class="card">
                              <span class="card-title">Total Expenses</span>
                              <span class="card-value">${formatFinancial(-totalExp)}</span>
                            </div>
                          </div>
                          <div class="grid-item">
                            <div class="card">
                              <span class="card-title">Net Profit</span>
                              <span class="card-value">
                                <span class="double-underline">${formatFinancial(netProfit)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <h2>Sales Transactions Ledger</h2>
                        <table>
                          <thead>
                            <tr>
                              <th>Invoice ID</th>
                              <th>Client Name</th>
                              <th>Date</th>
                              <th>Method</th>
                              <th class="text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredTxns.map(t => `
                              <tr>
                                <td style="font-weight: bold;">${t.invoiceId || 'N/A'}</td>
                                <td style="font-weight: bold;">${t.clientName || 'Valued Client'}</td>
                                <td>${t.date}</td>
                                <td>${t.paymentMethod}</td>
                                <td class="text-right font-mono font-bold">${formatFinancial(t.grandTotal)}</td>
                              </tr>
                            `).join('')}
                            ${filteredTxns.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No sales transactions in range.</td></tr>' : ''}
                          </tbody>
                        </table>

                        <h2>Operational Expenses Breakdown</h2>
                        <table>
                          <thead>
                            <tr>
                              <th>Category / Title</th>
                              <th>Date</th>
                              <th>Method</th>
                              <th>Status</th>
                              <th class="text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredExps.map(e => `
                              <tr>
                                <td>
                                  <span style="font-weight: bold; display: block;">${e.title}</span>
                                  <span style="font-size: 10px; color: #333333;">${e.category}</span>
                                </td>
                                <td>${e.date}</td>
                                <td>${e.paymentMethod}</td>
                                <td>${e.status}</td>
                                <td class="text-right font-mono font-bold">${formatFinancial(-e.amount)}</td>
                              </tr>
                            `).join('')}
                            ${filteredExps.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No expenses in range.</td></tr>' : ''}
                          </tbody>
                        </table>
                      </body>
                    </html>
                  `);

                  doc.close();
                  iframe.contentWindow?.focus();

                  setTimeout(() => {
                    iframe.contentWindow?.print();
                    document.body.removeChild(iframe);
                  }, 500);
                }}
                variant="primary"
                size="sm"
                icon={<Download className="w-4 h-4" />}
              >
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

      {(role === 'admin' || role === 'partner') && (
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
                  colorVariant="indigo"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
              </div>

              {/* Payment Transactions Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Recent Payment Transactions
                  </h3>
                  <Input
                    placeholder="Search by invoice ID or client..."
                    value={txnSearch}
                    onChange={(e) => {
                      setTxnSearch(e.target.value);
                      setTxnPage(1);
                    }}
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
                      {pagedTxns.map((txn) => (
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedTxn(txn);
                                  setTxnClientName(txn.clientName);
                                  setTxnServiceName(txn.serviceName);
                                  setTxnAmount(txn.amount.toString());
                                  setTxnDiscount(txn.discount.toString());
                                  setTxnGrandTotal(txn.grandTotal.toString());
                                  setTxnDate(txn.date);
                                  setTxnPaymentMethod(txn.paymentMethod as any);
                                  setIsEditTxnModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Transaction / Receipt"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setPrintData({ title: `Invoice ${txn.invoiceId}`, type: 'invoice', data: txn })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                title="Print Official Invoice Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {sortedTxns.length > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4 text-xs font-semibold text-slate-500">
                    <div>
                      Showing <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(sortedTxns.length, (txnPage - 1) * itemsPerPage + 1)}</span> to{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(sortedTxns.length, txnPage * itemsPerPage)}</span> of{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{sortedTxns.length}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={txnPage === 1}
                        onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                        className="py-1 px-3"
                      >
                        Previous
                      </Button>
                      <span className="text-slate-400 font-mono">
                        Page {txnPage} of {totalTxnPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={txnPage === totalTxnPages}
                        onClick={() => setTxnPage(p => Math.min(totalTxnPages, p + 1))}
                        className="py-1 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Total Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Operational Expenses</span>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                    {formatPKR(totalExpenseAmount)}
                  </h2>
                </div>
                <Badge variant="primary" size="md">{expenses.length} Active Entries</Badge>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
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
                              <button
                                onClick={() => {
                                  setSelectedExp(exp);
                                  setEditExpTitle(exp.title);
                                  setEditExpCategory(exp.category);
                                  setEditExpAmount(exp.amount.toString());
                                  setEditExpPaymentMethod(exp.paymentMethod);
                                  setEditExpNotes(exp.notes || '');
                                  setEditExpDate(exp.date);
                                  setEditExpStatus(exp.status);
                                  setIsEditExpModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Expense"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {reportTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveReport(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeReport === tab
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6">
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

                {/* Data Summaries instead of Visual Charts */}
                {(activeReport === 'Revenue' || activeReport === 'Profit') && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Overview of gross receipts, discounts applied, and resulting net revenue.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Revenue</span>
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">{formatPKR(totalRevenue + totalDiscounts)}</span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Discounts</span>
                        <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">-{formatPKR(totalDiscounts)}</span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Net Revenue</span>
                        <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">{formatPKR(totalRevenue)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Expense' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Overhead and expenditure distribution grouped by operational category.
                    </p>
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                          <tr>
                            <th className="py-2.5 px-4">Expense Category</th>
                            <th className="py-2.5 px-4 text-right">Total Outflow (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                          {['Salary', 'Electric Bill', 'Water Bill', 'Rent', 'Products', 'Machines', 'Marketing', 'Other'].map(cat => {
                            const amt = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                            return (
                              <tr key={cat}>
                                <td className="py-2.5 px-4 font-bold">{cat}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-bold">-{formatPKR(amt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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

      {/* Edit Expense Modal */}
      <Modal
        isOpen={isEditExpModalOpen}
        onClose={() => setIsEditExpModalOpen(false)}
        title="Edit Expense Record"
        description="Update operational expense details"
        maxWidth="lg"
      >
        <form onSubmit={handleEditExpenseSubmit} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Allergan Botox Stock Shipment"
            value={editExpTitle}
            onChange={(e) => setEditExpTitle(e.target.value)}
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
              value={editExpCategory}
              onChange={(e) => setEditExpCategory(e.target.value as any)}
            />
            <Input
              label="Amount (Rs)"
              type="text"
              value={editExpAmount}
              onChange={(e) => setEditExpAmount(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              options={[
                { label: 'Bank Transfer', value: 'Bank Transfer' },
                { label: 'Card', value: 'Card' },
                { label: 'Cash', value: 'Cash' },
                { label: 'Cheque', value: 'Cheque' }
              ]}
              value={editExpPaymentMethod}
              onChange={(e) => setEditExpPaymentMethod(e.target.value as any)}
            />
            <Select
              label="Status"
              options={[
                { label: 'Paid', value: 'Paid' },
                { label: 'Pending', value: 'Pending' }
              ]}
              value={editExpStatus}
              onChange={(e) => setEditExpStatus(e.target.value as any)}
            />
          </div>

          <Input
            label="Date"
            type="date"
            value={editExpDate}
            onChange={(e) => setEditExpDate(e.target.value)}
            required
          />

          <Input
            label="Notes / Vendor Details"
            placeholder="Supplier reference or invoice notes..."
            value={editExpNotes}
            onChange={(e) => setEditExpNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={isEditTxnModalOpen}
        onClose={() => setIsEditTxnModalOpen(false)}
        title="Edit Client Receipt"
        description="Update transaction details to correct mistake receipt"
        maxWidth="lg"
      >
        <form onSubmit={handleEditTransactionSubmit} className="space-y-4">
          <Input
            label="Client Name"
            value={txnClientName}
            onChange={(e) => setTxnClientName(e.target.value)}
            required
          />

          <Input
            label="Treatments / Services"
            value={txnServiceName}
            onChange={(e) => setTxnServiceName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Subtotal Amount (Rs)"
              type="text"
              value={txnAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setTxnAmount(val);
                setTxnGrandTotal((Number(val) - Number(txnDiscount)).toString());
              }}
              required
            />
            <Input
              label="Discount (Rs)"
              type="text"
              value={txnDiscount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setTxnDiscount(val);
                setTxnGrandTotal((Number(txnAmount) - Number(val)).toString());
              }}
            />
            <Input
              label="Grand Total (Rs)"
              type="text"
              value={txnGrandTotal}
              disabled
              className="bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              options={[
                { label: 'Cash', value: 'Cash' },
                { label: 'Card', value: 'Card' },
                { label: 'Bank', value: 'Bank' },
                { label: 'Online', value: 'Online' }
              ]}
              value={txnPaymentMethod}
              onChange={(e) => setTxnPaymentMethod(e.target.value as any)}
            />
            <Input
              label="Date"
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditTxnModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
