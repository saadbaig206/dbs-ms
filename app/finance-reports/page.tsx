'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR, formatUserName } from '../../lib/utils/currency';
import { escapeHtml } from '../../lib/utils/sanitize';
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
        <div className="finance-calendar-popover absolute right-0 z-30 mt-2 w-[270px] max-w-[calc(100vw-2rem)] rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-900/15 dark:border-slate-700 dark:bg-slate-900">
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
    deleteExpense,
    updateTransaction,
    role,
    userEmail,
    partners,
    staff,
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
  const [expStatusFilter, setExpStatusFilter] = useState<string>('All');
  const [isExpStatusModalOpen, setIsExpStatusModalOpen] = useState(false);

  const expStatusOptions = [
    { label: 'All Statuses & Dues', value: 'All' },
    { label: 'Unpaid Vendor Dues (Remaining Balance > 0)', value: 'UnpaidVendor' },
    { label: 'Fully Paid Expenses', value: 'Paid' },
    { label: 'Pending Expenses', value: 'Pending' }
  ];

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

  // Vendor Dues / Partial Payment & Audit Logs State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayExp, setSelectedPayExp] = useState<any>(null);
  const [payType, setPayType] = useState<'Full' | 'Partial'>('Full');
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMethod, setPayMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'>('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedLogsExp, setSelectedLogsExp] = useState<any>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Delete Expense Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDeleteExp, setSelectedDeleteExp] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteExpenseClick = (exp: any) => {
    setSelectedDeleteExp(exp);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteExpenseSubmit = async () => {
    if (!selectedDeleteExp) return;
    setIsDeleting(true);
    try {
      const res = await deleteExpense(selectedDeleteExp.id);
      setIsDeleteModalOpen(false);
      setSelectedDeleteExp(null);
      if (res && res.message) {
        showToast(res.message, res.deleted ? 'success' : 'error');
      } else {
        showToast("Expense deletion request processed");
      }
    } catch (err: any) {
      console.error("Failed to delete expense:", err);
      showToast(err.message || "Failed to process expense deletion", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedPayExp) return;

    const actual = selectedPayExp.actualAmount ?? selectedPayExp.amount;
    const currentPaid = selectedPayExp.amountPaid ?? (selectedPayExp.status === 'Paid' ? actual : 0);
    const currentRem = selectedPayExp.remainingAmount ?? (selectedPayExp.status === 'Paid' ? 0 : actual);

    const payAmt = payType === 'Full' ? currentRem : (Number(payAmountInput) || 0);
    if (payAmt <= 0) return;

    try {
      setIsSubmitting(true);
      const newAmountPaid = currentPaid + payAmt;
      const newRemainingAmount = Math.max(0, actual - newAmountPaid);
      const newStatus: 'Paid' | 'Pending' = newRemainingAmount === 0 ? 'Paid' : 'Pending';

      const activeUser = userEmail || role || 'Admin/Partner';
      const nowFormatStr = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const newLog = {
        id: `PAYLOG-${Date.now()}`,
        amount: payAmt,
        paidBy: activeUser,
        date: nowFormatStr,
        paymentMethod: payMethod,
        notes: payNotes || (payType === 'Full' ? 'Full Settlement' : 'Partial Payment')
      };

      const existingLogs = selectedPayExp.paymentLogs || [];
      const updatedLogs = [...existingLogs, newLog];

      await updateExpense(selectedPayExp.id, {
        amountPaid: newAmountPaid,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        paidBy: activeUser,
        paymentMethod: payMethod,
        paymentLogs: updatedLogs
      });

      setIsPayModalOpen(false);
      setSelectedPayExp(null);
    } catch (err: any) {
      showToast("Failed to process payment: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };


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

  // Calculators & Trends Memoized
  const {
    totalRevenue,
    totalDiscounts,
    totalExpenseAmount,
    curMonthRev,
    curMonthExp,
    curMonthDisc,
    dynamicTrend,
    trendDirection,
    revTrend,
    revTrendDirection,
    discTrend,
    discTrendDirection,
    marginSubtitle
  } = useMemo(() => {
    const totalRev = transactions.reduce((acc, t) => acc + t.grandTotal, 0);
    const totalDisc = transactions.reduce((acc, t) => acc + t.discount, 0);
    const totalExp = expenses.reduce((acc, e) => acc + e.amount, 0);

    const now = new Date();
    const currentMonthNum = now.getMonth();
    const currentYearNum = now.getFullYear();

    const prevMonthNum = currentMonthNum === 0 ? 11 : currentMonthNum - 1;
    const prevMonthYear = currentMonthNum === 0 ? currentYearNum - 1 : currentYearNum;

    const curRev = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
      })
      .reduce((acc, t) => acc + t.grandTotal, 0);

    const curExp = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
      })
      .reduce((acc, e) => acc + e.amount, 0);

    const prevRev = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === prevMonthNum && d.getFullYear() === prevMonthYear;
      })
      .reduce((acc, t) => acc + t.grandTotal, 0);

    const prevExp = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === prevMonthNum && d.getFullYear() === prevMonthYear;
      })
      .reduce((acc, e) => acc + e.amount, 0);

    const curMargin = curRev > 0 ? ((curRev - curExp) / curRev) * 100 : 0;
    const prevMargin = prevRev > 0 ? ((prevRev - prevExp) / prevRev) * 100 : 0;
    const marginDiff = curMargin - prevMargin;

    const curDisc = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
      })
      .reduce((acc, t) => acc + t.discount, 0);

    const prevDisc = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === prevMonthNum && d.getFullYear() === prevMonthYear;
      })
      .reduce((acc, t) => acc + t.discount, 0);

    const revDiff = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
    const discDiff = prevDisc > 0 ? ((curDisc - prevDisc) / prevDisc) * 100 : 0;

    const overallMargin = totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0;
    const marginTargetDiff = 70 - overallMargin;

    return {
      totalRevenue: totalRev,
      totalDiscounts: totalDisc,
      totalExpenseAmount: totalExp,
      curMonthRev: curRev,
      curMonthExp: curExp,
      curMonthDisc: curDisc,
      dynamicTrend: marginDiff >= 0 ? `+${marginDiff.toFixed(1)}%` : `${marginDiff.toFixed(1)}%`,
      trendDirection: (marginDiff >= 0 ? 'up' : 'down') as 'up' | 'down',
      revTrend: revDiff >= 0 ? `+${revDiff.toFixed(1)}%` : `${revDiff.toFixed(1)}%`,
      revTrendDirection: (revDiff >= 0 ? 'up' : 'down') as 'up' | 'down',
      discTrend: discDiff >= 0 ? `+${discDiff.toFixed(1)}%` : `${discDiff.toFixed(1)}%`,
      discTrendDirection: (discDiff >= 0 ? 'up' : 'down') as 'up' | 'down',
      marginSubtitle: marginTargetDiff > 0 ? `${marginTargetDiff.toFixed(1)}% below target (70%)` : `Target reached! (70%)`
    };
  }, [transactions, expenses]);

  const filteredTxns = useMemo(() => {
    return transactions.filter((t) => {
      return (
        t.clientName.toLowerCase().includes(txnSearch.toLowerCase()) ||
        t.serviceName.toLowerCase().includes(txnSearch.toLowerCase()) ||
        t.invoiceId.toLowerCase().includes(txnSearch.toLowerCase())
      );
    });
  }, [transactions, txnSearch]);

  const sortedTxns = useMemo(() => {
    return [...filteredTxns].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    });
  }, [filteredTxns]);

  const itemsPerPage = 10;
  const totalTxnPages = Math.ceil(sortedTxns.length / itemsPerPage) || 1;
  const pagedTxns = useMemo(() => {
    return sortedTxns.slice((txnPage - 1) * itemsPerPage, txnPage * itemsPerPage);
  }, [sortedTxns, txnPage]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const query = expSearch.toLowerCase().trim();
      
      let matchesSearch = true;
      if (query) {
        const matchesTitle = e.title && e.title.toLowerCase().includes(query);
        const matchesVendor = e.vendorName && e.vendorName.toLowerCase().includes(query);
        const matchesProduct = e.productName && e.productName.toLowerCase().includes(query);
        const matchesAddedBy = e.addedBy && e.addedBy.toLowerCase().includes(query);
        const matchesPaidBy = e.paidBy && e.paidBy.toLowerCase().includes(query);
        const matchesNotes = e.notes && e.notes.toLowerCase().includes(query);
        const matchesMethod = e.paymentMethod && e.paymentMethod.toLowerCase().includes(query);
        const matchesType = e.paymentType && e.paymentType.toLowerCase().includes(query);

        // Match full or partial payment audit logs
        const matchesLogs = e.paymentLogs && e.paymentLogs.some((log: any) =>
          (log.paidBy && log.paidBy.toLowerCase().includes(query)) ||
          (log.notes && log.notes.toLowerCase().includes(query)) ||
          (log.paymentMethod && log.paymentMethod.toLowerCase().includes(query))
        );

        matchesSearch =
          Boolean(matchesTitle) ||
          Boolean(matchesVendor) ||
          Boolean(matchesProduct) ||
          Boolean(matchesAddedBy) ||
          Boolean(matchesPaidBy) ||
          Boolean(matchesNotes) ||
          Boolean(matchesMethod) ||
          Boolean(matchesType) ||
          Boolean(matchesLogs);
      }

      const matchesCat = expCategoryFilter === 'All' || e.category === expCategoryFilter;

      let matchesStatus = true;
      if (expStatusFilter === 'UnpaidVendor') {
        matchesStatus = (e.remainingAmount !== undefined && e.remainingAmount > 0) || e.status === 'Pending';
      } else if (expStatusFilter === 'Paid') {
        matchesStatus = e.status === 'Paid' && (e.remainingAmount === undefined || e.remainingAmount === 0);
      } else if (expStatusFilter === 'Pending') {
        matchesStatus = e.status === 'Pending';
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [expenses, expSearch, expCategoryFilter, expStatusFilter]);

  const handleAddExpense = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await addExpense({
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
    } catch (e: any) {
      showToast("Failed to add expense: " + (e.message || e), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransactionSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isSubmitting || !selectedTxn) return;
    try {
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpenseSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isSubmitting || !selectedExp) return;
    try {
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white transition-all flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}>
          <span>{toast.message}</span>
        </div>
      )}

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
                                <td style="font-weight: bold;">${escapeHtml(t.invoiceId) || 'N/A'}</td>
                                <td style="font-weight: bold;">${escapeHtml(t.clientName) || 'Valued Client'}</td>
                                <td>${escapeHtml(t.date)}</td>
                                <td>${escapeHtml(t.paymentMethod)}</td>
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
                                  <span style="font-weight: bold; display: block;">${escapeHtml(e.title)}</span>
                                  <span style="font-size: 10px; color: #333333;">${escapeHtml(e.category)}</span>
                                </td>
                                <td>${escapeHtml(e.date)}</td>
                                <td>${escapeHtml(e.paymentMethod)}</td>
                                <td>${escapeHtml(e.status)}</td>
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
                              {role === 'admin' && (
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
                              )}
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <Input
                  placeholder="Search expenses by title, vendor, product, or added by..."
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  className="w-full lg:w-80"
                />

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setIsExpStatusModalOpen(true)}
                    className="w-full sm:w-72 flex items-center justify-between rounded-[14px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 hover:border-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <span className="truncate font-medium">
                      {expStatusOptions.find(o => o.value === expStatusFilter)?.label || 'All Statuses & Dues'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>

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
                    className="w-full sm:w-44"
                  />
                </div>
              </div>

              {/* Expenses Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 rounded-l-xl">Expense Title</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Added By / Paid By</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Payment Terms</th>
                        <th className="py-3.5 px-4">Amount & Dues</th>
                        <th className="py-3.5 px-4 text-right rounded-r-xl">Actions & Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {filteredExpenses.map((exp) => {
                        const actual = exp.actualAmount ?? exp.amount;
                        const paid = exp.amountPaid ?? (exp.status === 'Paid' ? actual : 0);
                        const remaining = exp.remainingAmount ?? (exp.status === 'Paid' ? 0 : actual);
                        const hasRemaining = remaining > 0;

                        const isVendorExpense = !!(exp.vendorName || exp.paymentType || exp.category === 'Products');
                        const approvals = exp.deletionApprovals || [];
                        const totalApprovers = Math.max(1, partners.length + 1);
                        const activeUser = userEmail || role || 'Admin/Partner';
                        const hasCurrentUserApproved = approvals.includes(activeUser);

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</div>
                              <div className="text-[11px] text-slate-400">{exp.notes || 'Operational expense'}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="primary">{exp.category}</Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                {formatUserName(exp.addedBy, staff)}
                              </div>
                              {exp.paidBy && formatUserName(exp.paidBy, staff) !== formatUserName(exp.addedBy, staff) && (
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                  Paid by: {formatUserName(exp.paidBy, staff)}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                              {exp.date}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <div>{exp.paymentMethod}</div>
                              {exp.paymentType && (
                                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                                  Mode: {exp.paymentType}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {formatPKR(actual)}
                              </div>
                              {hasRemaining ? (
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                  Paid: {formatPKR(paid)} • Due: {formatPKR(remaining)}
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Fully Paid ({formatPKR(paid)})
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                <Badge variant={exp.status === 'Paid' ? 'success' : 'warning'}>
                                  {exp.status === 'Paid' ? 'Paid' : 'Pending / Credit'}
                                </Badge>

                                {(exp.status === 'Pending' || hasRemaining) && (
                                  <button
                                    onClick={() => {
                                      setSelectedPayExp(exp);
                                      setPayType('Full');
                                      setPayAmountInput(remaining.toString());
                                      setPayMethod('Cash');
                                      setPayNotes('');
                                      setIsPayModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm cursor-pointer"
                                  >
                                    Pay Full / Partial
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedLogsExp(exp);
                                    setIsLogsModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                  title="View Payment Audit Logs"
                                >
                                  Logs ({exp.paymentLogs?.length || 0})
                                </button>

                                {isVendorExpense ? (
                                  <>
                                    {approvals.length > 0 && (
                                      <Badge variant="danger" title={`Approved by: ${approvals.join(', ')}`}>
                                        Deletion Pending ({approvals.length}/{totalApprovers})
                                      </Badge>
                                    )}
                                    <button
                                      onClick={() => handleDeleteExpenseClick(exp)}
                                      disabled={hasCurrentUserApproved}
                                      className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all flex items-center gap-1 ${hasCurrentUserApproved
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                        : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer'
                                        }`}
                                      title={
                                        hasCurrentUserApproved
                                          ? `You have approved deletion (${approvals.length}/${totalApprovers})`
                                          : `Approve deletion of vendor expense (Requires all Admin & Partner approvals)`
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      {hasCurrentUserApproved
                                        ? `Approved (${approvals.length}/${totalApprovers})`
                                        : approvals.length > 0
                                          ? `Approve Delete (${approvals.length}/${totalApprovers})`
                                          : `Delete Vendor Expense`}
                                    </button>
                                  </>
                                ) : (
                                  <>
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
                                    <button
                                      onClick={() => handleDeleteExpenseClick(exp)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                      title="Delete Expense"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
            <Button type="button" variant="outline" onClick={() => setIsAddExpenseModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Expense Entry'}
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
            <Button type="button" variant="outline" onClick={() => setIsEditExpModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
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
            <Button type="button" variant="outline" onClick={() => setIsEditTxnModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Full / Partial Vendor Due Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Pay Vendor Dues (Full or Partial)"
        description={selectedPayExp ? `Expense: ${selectedPayExp.title} — Current Remaining Due: ${formatPKR(selectedPayExp.remainingAmount ?? selectedPayExp.amount)}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handlePayExpenseSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Payment Option
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPayType('Full');
                  if (selectedPayExp) {
                    const rem = selectedPayExp.remainingAmount ?? selectedPayExp.amount;
                    setPayAmountInput(rem.toString());
                  }
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${payType === 'Full'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
              >
                Full Payment
              </button>
              <button
                type="button"
                onClick={() => setPayType('Partial')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${payType === 'Partial'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
              >
                Partial Installment
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Payment Amount (Rs)"
              type="text"
              value={payAmountInput}
              disabled={payType === 'Full'}
              onChange={(e) => setPayAmountInput(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Select
              label="Payment Method"
              options={[
                { label: 'Cash', value: 'Cash' },
                { label: 'Bank Transfer', value: 'Bank Transfer' },
                { label: 'Card', value: 'Card' },
                { label: 'Cheque', value: 'Cheque' }
              ]}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as any)}
            />
          </div>

          <Input
            label="Notes / Reference"
            placeholder="e.g. Bank slip transaction ID or cash voucher reference..."
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex justify-between items-center font-mono">
            <span>Logged Paying User:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{userEmail || role || 'Admin/Partner'}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Confirming...' : 'Confirm Payment & Update Logs'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Logs History Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="Payment Audit Logs & Installment Details"
        description={selectedLogsExp ? `Full payment trail for ${selectedLogsExp.title}` : ''}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {selectedLogsExp && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Actual Total</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {formatPKR(selectedLogsExp.actualAmount ?? selectedLogsExp.amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Total Paid</span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {formatPKR(selectedLogsExp.amountPaid ?? (selectedLogsExp.status === 'Paid' ? selectedLogsExp.amount : 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Remaining Balance</span>
                <span className="font-mono font-bold text-sm text-amber-600">
                  {formatPKR(selectedLogsExp.remainingAmount ?? (selectedLogsExp.status === 'Paid' ? 0 : selectedLogsExp.amount))}
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Amount Paid</th>
                  <th className="py-2.5 px-3">Paid By User</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedLogsExp?.paymentLogs && selectedLogsExp.paymentLogs.length > 0 ? (
                  selectedLogsExp.paymentLogs.map((log: any, idx: number) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{formatPKR(log.amount)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{formatUserName(log.paidBy, staff)}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{log.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-slate-500">{log.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No payment logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsLogsModalOpen(false)}>
              Close Audit Logs
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Expense Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setSelectedDeleteExp(null);
          }
        }}
        title="Confirm Expense Deletion"
        description="Review deletion requirements and confirm action"
        maxWidth="md"
      >
        {selectedDeleteExp && (() => {
          const isVendor = !!(selectedDeleteExp.vendorName || selectedDeleteExp.paymentType || selectedDeleteExp.category === 'Products');
          const approvals = selectedDeleteExp.deletionApprovals || [];
          const totalApprovers = Math.max(1, partners.length + 1);
          const activeUser = userEmail || role || 'Admin/Partner';
          const hasCurrentUserApproved = approvals.includes(activeUser);

          return (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                  <h4 className="font-bold text-sm">
                    {isVendor ? 'Multi-Approval Deletion Required' : 'Delete Standard Expense'}
                  </h4>
                  <p>
                    {isVendor
                      ? `Vendor expenses require 100% approval from all active Admins and Partners before permanent removal.`
                      : `Are you sure you want to permanently delete this expense record? This action cannot be undone.`}
                  </p>
                </div>
              </div>

              {/* Expense Details Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Expense Title</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedDeleteExp.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Category</span>
                  <Badge variant="primary">{selectedDeleteExp.category}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Amount</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatPKR(selectedDeleteExp.actualAmount ?? selectedDeleteExp.amount)}
                  </span>
                </div>
                {isVendor && (
                  <>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-semibold uppercase text-[10px]">Approval Progress</span>
                      <Badge variant={approvals.length + 1 >= totalApprovers ? 'success' : 'warning'}>
                        {approvals.length} / {totalApprovers} Approved
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold uppercase text-[10px]">Your Status</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {hasCurrentUserApproved ? ' Already Approved' : ' Pending Your Approval'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedDeleteExp(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isDeleting}
                  onClick={confirmDeleteExpenseSubmit}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {isDeleting
                    ? 'Processing...'
                    : isVendor
                      ? hasCurrentUserApproved
                        ? 'Re-submit Approval Request'
                        : `Approve & ${approvals.length + 1 >= totalApprovers ? 'Permanently Delete' : 'Record Approval'}`
                      : 'Confirm Permanent Deletion'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Expense Status Filter Dialog Box */}
      <Modal
        isOpen={isExpStatusModalOpen}
        onClose={() => setIsExpStatusModalOpen(false)}
        title="Filter Expenses by Status & Dues"
        maxWidth="md"
      >
        <div className="space-y-4 py-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select an option below to filter the operational expenses list:
          </p>
          <div className="space-y-2">
            {expStatusOptions.map((opt) => {
              const isSelected = expStatusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setExpStatusFilter(opt.value);
                    setIsExpStatusModalOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-semibold shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium"
                  )}
                >
                  <span className="text-sm">{opt.label}</span>
                  <div className={clsx(
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-colors",
                    isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 dark:border-slate-600 bg-transparent"
                  )}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}

