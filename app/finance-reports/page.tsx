"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
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
  AlertTriangle,
  Banknote,
  Building2,
  Globe,
  Clock,
  RotateCcw,
  Package,
  ShoppingBag,
  BarChart3,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";
import { useClinic } from "../../lib/context/ClinicContext";
import { formatPKR, formatPKRCompact, formatUserName } from "../../lib/utils/currency";
import { formatDateDisplay } from "../../lib/utils/date";
import { escapeHtml } from "../../lib/utils/sanitize";
import { ExpenseCategory } from "../../lib/types/clinic";
import { StatCard } from "../../components/cards/StatCard";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { PurchasesTab } from "../../components/finance/PurchasesTab";
import { PartnerEquityTab } from "../../components/finance/PartnerEquityTab";
import { PartnerExpensesTab } from "../../components/finance/PartnerExpensesTab";

function FinanceDatePicker({
  label,
  value,
  onChange,
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
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0,
  ).getDate();
  const calendarDays = Array.from(
    { length: Math.ceil((firstDay + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = index - firstDay + 1;
      return day > 0 && day <= daysInMonth
        ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
        : null;
    },
  );
  const dateKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
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
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
                )
              }
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {viewDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
                )
              }
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((date, index) =>
              date ? (
                <button
                  key={dateKey(date)}
                  type="button"
                  onClick={() => {
                    onChange(dateKey(date));
                    setIsOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-bold transition ${dateKey(date) === value
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    }`}
                >
                  {date.getDate()}
                </button>
              ) : (
                <span key={`empty-${index}`} className="h-8" />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinanceReportsPage() {
  const {
    clinicInfo,
    transactions: allTransactions,
    expenses: allExpenses,
    purchaseBills: allPurchaseBills = [],
    clients: allClients = [],
    inventory: allInventory = [],
    addExpense,
    updateExpense,
    deleteExpense,
    updateTransaction,
    refundTransaction,
    role,
    userEmail,
    partners,
    staff,
    setPrintData,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    isLoading,
    partnerEquity,
    refreshPartnerEquity,
  } = useClinic();

  const router = useRouter();

  useEffect(() => {
    if (!partnerEquity?.partners || partnerEquity.partners.length === 0) {
      refreshPartnerEquity();
    }
  }, [partnerEquity?.partners, refreshPartnerEquity]);

  const partnerOptions = useMemo(() => {
    if (partnerEquity?.partners && partnerEquity.partners.length > 0) {
      return partnerEquity.partners.map((p) => ({
        label: p.partnerName,
        value: p.partnerName,
      }));
    }
    return [];
  }, [partnerEquity?.partners]);

  useEffect(() => {
    if (!isLoading && role !== "admin" && role !== "partner") {
      router.push("/dashboard");
    }
  }, [role, isLoading, router]);

  const transactions = selectedBranchId
    ? allTransactions.filter(
      (t) => !t.branchId || t.branchId === selectedBranchId,
    )
    : allTransactions;

  const expenses = selectedBranchId
    ? allExpenses.filter((e) => !e.branchId || e.branchId === selectedBranchId)
    : allExpenses;

  const purchaseBills = selectedBranchId
    ? allPurchaseBills.filter(
      (b: any) => !b.branchId || b.branchId === selectedBranchId,
    )
    : allPurchaseBills;

  const clients = selectedBranchId
    ? allClients.filter(
      (c: any) => !c.branchId || c.branchId === selectedBranchId,
    )
    : allClients;

  const inventory = selectedBranchId
    ? allInventory.filter(
      (i: any) => !i.branchId || i.branchId === selectedBranchId,
    )
    : allInventory;

  const [activeTab, setActiveTab] = useState<
    "transactions" | "purchases" | "expenses" | "equity" | "partner-expenses" | "reports"
  >("transactions");

  const [isClientMounted, setIsClientMounted] = useState(false);
  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Refund / Sales Return Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedRefundTxn, setSelectedRefundTxn] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundRestock, setRefundRestock] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundMode, setRefundMode] = useState<"item" | "full">("item");
  const [selectedRefundItems, setSelectedRefundItems] = useState<{ [index: number]: boolean }>({});
  const [refundItemQuantities, setRefundItemQuantities] = useState<{ [index: number]: number }>({});
  const [refundError, setRefundError] = useState<string | null>(null);

  const getTxnItems = (txn: any) => {
    if (txn?.items && Array.isArray(txn.items) && txn.items.length > 0) {
      return txn.items;
    }
    if (txn?.serviceName) {
      return [
        {
          name: txn.serviceName,
          price: txn.amount || txn.grandTotal || 0,
          quantity: 1,
          isProduct: false,
        },
      ];
    }
    return [];
  };

  const handleOpenRefundModal = (txn: any) => {
    setSelectedRefundTxn(txn);
    setRefundReason("");
    setRefundRestock(true);
    setRefundError(null);
    setRefundMode("item");
    const items = getTxnItems(txn);
    const initialSelected: { [index: number]: boolean } = {};
    const initialQtys: { [index: number]: number } = {};
    items.forEach((item: any, idx: number) => {
      // If single item, select it; if multi-item, select first by default so customer can return any one item
      initialSelected[idx] = (items.length === 1 || idx === 0) && !item.refunded;
      initialQtys[idx] = item.quantity || 1;
    });
    setSelectedRefundItems(initialSelected);
    setRefundItemQuantities(initialQtys);
    setIsRefundModalOpen(true);
  };

  const refundCalculation = useMemo(() => {
    if (!selectedRefundTxn) {
      return { refundSubtotal: 0, estimatedRefundAmount: 0, selectedCount: 0, isFullOrderReturn: false };
    }
    const items = getTxnItems(selectedRefundTxn);
    let subtotal = 0;
    let selectedCount = 0;
    let totalAvailQty = 0;
    let selectedQty = 0;

    items.forEach((item: any, idx: number) => {
      const origQty = item.quantity || 1;
      if (!item.refunded) {
        totalAvailQty += origQty;
        if (selectedRefundItems[idx]) {
          const qty = Math.min(origQty, Math.max(1, refundItemQuantities[idx] || 1));
          subtotal += (item.price || 0) * qty;
          selectedCount += 1;
          selectedQty += qty;
        }
      }
    });

    const txnAmt = selectedRefundTxn.amount || selectedRefundTxn.grandTotal || 1;
    const disc = selectedRefundTxn.discount || 0;
    const effDisc = Math.max(0, 1 - (disc / (txnAmt || 1)));
    const taxPct = selectedRefundTxn.taxPercent || 0;
    const effTax = 1 + (taxPct / 100);
    const estGross = Math.round(subtotal * effDisc * effTax * 100) / 100;
    const finalRefund = Math.min(selectedRefundTxn.amountPaid || selectedRefundTxn.grandTotal || 0, estGross);

    const isFull = (selectedQty === totalAvailQty && totalAvailQty > 0);

    return {
      refundSubtotal: subtotal,
      estimatedRefundAmount: isFull ? (selectedRefundTxn.amountPaid || selectedRefundTxn.grandTotal || 0) : finalRefund,
      selectedCount,
      isFullOrderReturn: isFull,
    };
  }, [selectedRefundTxn, selectedRefundItems, refundItemQuantities]);

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundTxn || !refundReason.trim()) return;
    try {
      setIsRefunding(true);
      setRefundError(null);
      const itemsList = getTxnItems(selectedRefundTxn);
      const itemsToRefund = itemsList
        .filter((item: any, idx: number) => selectedRefundItems[idx] && !item.refunded)
        .map((item: any, idx: number) => ({
          ...item,
          quantity: Math.min(item.quantity || 1, Math.max(1, refundItemQuantities[idx] || 1)),
        }));

      if (itemsToRefund.length === 0) {
        setRefundError("Please select at least one item to return / refund.");
        setIsRefunding(false);
        return;
      }

      const isPartial = !refundCalculation.isFullOrderReturn;

      await refundTransaction(
        selectedRefundTxn.id,
        refundReason.trim(),
        refundRestock,
        isPartial ? itemsToRefund : undefined,
      );
      setIsRefundModalOpen(false);
      setSelectedRefundTxn(null);
    } catch (err: any) {
      setRefundError(err.message || "Failed to process refund.");
    } finally {
      setIsRefunding(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "purchases" ||
        tabParam === "equity" ||
        tabParam === "partner-expenses" ||
        tabParam === "expenses" ||
        tabParam === "reports" ||
        tabParam === "transactions"
      ) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const handlePayExpense = async (id: string) => {
    try {
      await updateExpense(id, { status: "Paid" });
    } catch (e: any) {
      console.error("Failed to pay expense:", e);
    }
  };

  // Transactions Section State
  const [txnSearch, setTxnSearch] = useState("");
  const [txnPage, setTxnPage] = useState(1);
  const [txnMethodFilter, setTxnMethodFilter] = useState<
    "All" | "Cash" | "Card" | "Online"
  >("All");

  // Expenses Section State
  const [expSearch, setExpSearch] = useState("");
  const [expCategoryFilter, setExpCategoryFilter] = useState<string>("All");
  const [expStatusFilter, setExpStatusFilter] = useState<string>("All");
  const [isExpStatusModalOpen, setIsExpStatusModalOpen] = useState(false);

  const expStatusOptions = [
    { label: "All Statuses & Dues", value: "All" },
    {
      label: "Unpaid Vendor Dues (Remaining Balance > 0)",
      value: "UnpaidVendor",
    },
    { label: "Fully Paid Expenses", value: "Paid" },
    { label: "Pending Expenses", value: "Pending" },
  ];

  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Other");
  const [expAmount, setExpAmount] = useState<string>("");
  const [expPaymentMethod, setExpPaymentMethod] = useState<
    "Bank Transfer" | "Cash" | "Card" | "Cheque"
  >("Bank Transfer");
  const [expPaidBy, setExpPaidBy] = useState<string>("");
  const [expNotes, setExpNotes] = useState("");

  useEffect(() => {
    if (partnerOptions.length > 0 && !expPaidBy) {
      const matched = partnerOptions.find((o) =>
        userEmail && (
          o.value.toLowerCase().includes(userEmail.split('@')[0].toLowerCase()) ||
          userEmail.toLowerCase().includes(o.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
        )
      );
      setExpPaidBy(matched ? matched.value : partnerOptions[0].value);
    }
  }, [partnerOptions, expPaidBy, userEmail]);

  // Edit Transaction State
  const [isEditTxnModalOpen, setIsEditTxnModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [txnClientName, setTxnClientName] = useState("");
  const [txnServiceName, setTxnServiceName] = useState("");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDiscount, setTxnDiscount] = useState("");
  const [txnGrandTotal, setTxnGrandTotal] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [txnPaymentMethod, setTxnPaymentMethod] = useState<
    "Cash" | "Card" | "Online"
  >("Cash");

  // Edit Expense State
  const [isEditExpModalOpen, setIsEditExpModalOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<any>(null);
  const [editExpTitle, setEditExpTitle] = useState("");
  const [editExpCategory, setEditExpCategory] =
    useState<ExpenseCategory>("Other");
  const [editExpAmount, setEditExpAmount] = useState("");
  const [editExpPaymentMethod, setEditExpPaymentMethod] = useState<
    "Bank Transfer" | "Cash" | "Card" | "Cheque"
  >("Bank Transfer");
  const [editExpPaidBy, setEditExpPaidBy] = useState("");
  const [editExpNotes, setEditExpNotes] = useState("");
  const [editExpDate, setEditExpDate] = useState("");
  const [editExpStatus, setEditExpStatus] = useState<"Paid" | "Pending">(
    "Paid",
  );

  // Vendor Dues / Partial Payment & Audit Logs State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayExp, setSelectedPayExp] = useState<any>(null);
  const [payType, setPayType] = useState<"Full" | "Partial">("Full");
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payMethod, setPayMethod] = useState<
    "Bank Transfer" | "Cash" | "Card" | "Cheque"
  >("Cash");
  const [payNotes, setPayNotes] = useState("");
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedLogsExp, setSelectedLogsExp] = useState<any>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
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
        showToast(res.message, res.deleted ? "success" : "error");
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
    const currentPaid =
      selectedPayExp.amountPaid ??
      (selectedPayExp.status === "Paid" ? actual : 0);
    const currentRem =
      selectedPayExp.remainingAmount ??
      (selectedPayExp.status === "Paid" ? 0 : actual);

    const payAmt =
      payType === "Full" ? currentRem : Number(payAmountInput) || 0;
    if (payAmt <= 0) return;

    try {
      setIsSubmitting(true);
      const newAmountPaid = currentPaid + payAmt;
      const newRemainingAmount = Math.max(0, actual - newAmountPaid);
      const newStatus: "Paid" | "Pending" =
        newRemainingAmount === 0 ? "Paid" : "Pending";

      const activeUser = userEmail || role || "Admin/Partner";
      const nowFormatStr = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const newLog = {
        id: `PAYLOG-${Date.now()}`,
        amount: payAmt,
        paidBy: activeUser,
        date: nowFormatStr,
        paymentMethod: payMethod,
        notes:
          payNotes ||
          (payType === "Full" ? "Full Settlement" : "Partial Payment"),
      };

      const existingLogs = selectedPayExp.paymentLogs || [];
      const updatedLogs = [...existingLogs, newLog];

      await updateExpense(selectedPayExp.id, {
        amountPaid: newAmountPaid,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        paidBy: activeUser,
        paymentMethod: payMethod,
        paymentLogs: updatedLogs,
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
    "Revenue" | "Expense" | "Profit" | "Audit"
  >("Revenue");

  const reportTabs = ["Revenue", "Expense", "Profit", "Audit"] as const;

  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${month}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  });

  const handlePreset = (preset: "thisMonth" | "lastMonth" | "thisYear" | "allTime") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    if (preset === "thisMonth") {
      setReportStartDate(`${year}-${month}-01`);
      setReportEndDate(todayStr);
    } else if (preset === "lastMonth") {
      const prevMonthDate = new Date(year, now.getMonth() - 1, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
      const lastDayPrevMonth = new Date(year, now.getMonth(), 0).getDate();
      setReportStartDate(`${prevYear}-${prevMonth}-01`);
      setReportEndDate(`${prevYear}-${prevMonth}-${String(lastDayPrevMonth).padStart(2, "0")}`);
    } else if (preset === "thisYear") {
      setReportStartDate(`${year}-01-01`);
      setReportEndDate(todayStr);
    } else if (preset === "allTime") {
      setReportStartDate("2020-01-01");
      setReportEndDate(todayStr);
    }
  };

  const nowForPreset = new Date();
  const curMonthStart = `${nowForPreset.getFullYear()}-${String(nowForPreset.getMonth() + 1).padStart(2, "0")}-01`;
  const isThisMonth = reportStartDate === curMonthStart;
  const isThisYear = reportStartDate === `${nowForPreset.getFullYear()}-01-01`;
  const isAllTime = reportStartDate === "2020-01-01";

  // Calculators & Trends Memoized
  const {
    totalRevenue,
    totalDiscounts,
    totalExpenseAmount,
    operationalExpenseAmount,
    purchaseExpenseAmount,
    netOperatingProfit,
    isOperatingProfit,
    netOperatingMargin,
    cashRevenue,
    cashCount,
    cashPct,
    cardRevenue,
    cardCount,
    cardPct,
    onlineRevenue,
    onlineCount,
    onlinePct,
    uncollectedDues,
    duePct,
    curMonthRev,
    curMonthExp,
    curMonthDisc,
    dynamicTrend,
    trendDirection,
    revTrend,
    revTrendDirection,
    discTrend,
    discTrendDirection,
    marginSubtitle,
  } = useMemo(() => {
    const now = new Date();
    const currentMonthNum = now.getMonth();
    const currentYearNum = now.getFullYear();
    const prevMonthNum = currentMonthNum === 0 ? 11 : currentMonthNum - 1;
    const prevMonthYear =
      currentMonthNum === 0 ? currentYearNum - 1 : currentYearNum;

    let totalRev = 0;
    let totalDisc = 0;
    let curRev = 0;
    let curDisc = 0;
    let prevRev = 0;
    let prevDisc = 0;

    let cashRev = 0;
    let cashCount = 0;
    let cardRev = 0;
    let cardCount = 0;
    let onlineRev = 0;
    let onlineCount = 0;
    let txnRemainingDues = 0;

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const status = (t.status || "").toLowerCase();
      // Exclude refunded or cancelled transactions from sales revenue
      if (status === "refunded" || status === "cancelled") continue;

      const isDebtSettlement =
        t.transactionType === "Debt_Settlement" ||
        t.serviceName === "Client Debt Settlement";
      const gTotal = t.grandTotal || 0;
      const disc = t.discount || 0;

      const isPartialOrPending =
        t.paymentStatus === "Partial" ||
        t.paymentStatus === "Unpaid" ||
        t.status === "Pending" ||
        (t.remainingDue !== undefined && t.remainingDue !== null && t.remainingDue > 0);

      const paidAmt =
        t.amountPaid !== undefined && t.amountPaid !== null
          ? t.amountPaid
          : (isPartialOrPending && t.remainingDue !== undefined && t.remainingDue !== null
            ? Math.max(0, gTotal - t.remainingDue)
            : (isPartialOrPending ? 0 : gTotal));

      const remDue =
        t.remainingDue !== undefined && t.remainingDue !== null
          ? t.remainingDue
          : (isPartialOrPending ? Math.max(0, gTotal - paidAmt) : 0);

      // Exclude debt settlements from sales revenue to avoid double counting receivables
      if (!isDebtSettlement) {
        totalRev += gTotal;
        totalDisc += disc;
        txnRemainingDues += Math.max(0, remDue);
      }

      // Handle split payment tender vs single method
      if (t.paymentSplits && t.paymentSplits.length > 0) {
        for (const split of t.paymentSplits) {
          const sMethod = (split.method || "").toLowerCase();
          const sAmt = Number(split.amount) || 0;
          if (sMethod === "cash") {
            cashRev += sAmt;
            cashCount++;
          } else if (sMethod === "card" || sMethod.includes("pos")) {
            cardRev += sAmt;
            cardCount++;
          } else {
            onlineRev += sAmt;
            onlineCount++;
          }
        }
      } else {
        const pm = (t.paymentMethod || "").toLowerCase();
        if (pm === "cash") {
          cashRev += paidAmt;
          cashCount++;
        } else if (pm === "card" || pm.includes("pos")) {
          cardRev += paidAmt;
          cardCount++;
        } else {
          // online, digital gateway, etc.
          onlineRev += paidAmt;
          onlineCount++;
        }
      }

      if (t.date && !isDebtSettlement) {
        const parts = t.date.split("-");
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (y === currentYearNum && m === currentMonthNum) {
            curRev += gTotal;
            curDisc += disc;
          } else if (y === prevMonthYear && m === prevMonthNum) {
            prevRev += gTotal;
            prevDisc += disc;
          }
        }
      }
    }

    const clientDuesSum = (clients || []).reduce(
      (acc: number, c: any) => acc + (c.outstandingBalance || 0),
      0,
    );

    const calculatedDiffDue = Math.max(0, totalRev - (cashRev + cardRev + onlineRev));
    const uncollectedDues = Math.max(
      0,
      clientDuesSum > 0
        ? clientDuesSum
        : (txnRemainingDues > 0 ? txnRemainingDues : calculatedDiffDue),
    );

    const totalCollections = cashRev + cardRev + onlineRev;
    const baseCollDenominator = totalCollections > 0 ? totalCollections : 1;
    const cashPct =
      totalCollections > 0 ? (cashRev / baseCollDenominator) * 100 : 0;
    const cardPct =
      totalCollections > 0 ? (cardRev / baseCollDenominator) * 100 : 0;
    const onlinePct =
      totalCollections > 0 ? (onlineRev / baseCollDenominator) * 100 : 0;
    const duePct = totalRev > 0 ? (uncollectedDues / totalRev) * 100 : 0;

    let totalOpExp = 0;
    let curOpExp = 0;
    let prevOpExp = 0;

    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      const cat = (e.category || "").toLowerCase();
      const title = (e.title || "").toLowerCase();
      const id = (e.id || "").toUpperCase();

      // Completely exclude purchase bills, stock procurements, and partner drawings from operational overheads
      if (
        cat === "inventory purchase" ||
        cat === "products" ||
        cat === "purchases" ||
        cat === "purchase" ||
        cat === "partner drawing" ||
        cat.includes("drawing") ||
        cat.includes("withdraw") ||
        id.startsWith("EXP-PUR-") ||
        id.startsWith("EXP-DRW-") ||
        id.startsWith("PIT-") ||
        id.includes("-PUR-") ||
        title.includes("partner drawing") ||
        title.includes("partner withdrawal") ||
        title.includes("drawing") ||
        title.includes("withdraw") ||
        title.startsWith("vendor bill") ||
        title.includes("purchase bill") ||
        title.includes("supplier order") ||
        Boolean(e.productName)
      ) continue;

      const actual = e.actualAmount ?? e.amount ?? 0;
      let paid = 0;
      if (e.paymentLogs && Array.isArray(e.paymentLogs) && e.paymentLogs.length > 0) {
        paid = e.paymentLogs.reduce((acc: number, l: any) => acc + (Number(l?.amount) || 0), 0);
      } else if (e.amountPaid !== undefined && e.amountPaid !== null) {
        paid = Number(e.amountPaid) || 0;
      } else if ((e.status || "").toLowerCase() === "paid") {
        paid = actual;
      }

      // Only count settled outflow
      if (paid <= 0 && (e.status || "").toLowerCase() !== "paid") continue;
      const amt = paid > 0 ? paid : actual;

      totalOpExp += amt;

      if (e.date) {
        const parts = e.date.split("-");
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (y === currentYearNum && m === currentMonthNum) {
            curOpExp += amt;
          } else if (y === prevMonthYear && m === prevMonthNum) {
            prevOpExp += amt;
          }
        }
      }
    }

    // Integrate vendor purchase bills (stock & product purchases)
    let totalPurchExp = 0;
    let curPurchExp = 0;
    let prevPurchExp = 0;

    for (let i = 0; i < purchaseBills.length; i++) {
      const b = purchaseBills[i];
      const paid =
        b.amountPaid !== undefined && b.amountPaid !== null
          ? b.amountPaid
          : b.paymentStatus === "Paid"
            ? b.totalAmount || 0
            : 0;
      totalPurchExp += paid;

      if (b.date) {
        const parts = b.date.split("-");
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (y === currentYearNum && m === currentMonthNum) {
            curPurchExp += paid;
          } else if (y === prevMonthYear && m === prevMonthNum) {
            prevPurchExp += paid;
          }
        }
      }
    }

    const totalCombinedExp = totalOpExp + totalPurchExp;
    const curCombinedExp = curOpExp + curPurchExp;
    const prevCombinedExp = prevOpExp + prevPurchExp;

    const netOperatingProfit = totalRev - totalOpExp;
    const isOperatingProfit = netOperatingProfit >= 0;
    const netOperatingMargin = totalRev > 0 ? (netOperatingProfit / totalRev) * 100 : 0;

    const curMargin =
      curRev > 0 ? ((curRev - curCombinedExp) / curRev) * 100 : 0;
    const prevMargin =
      prevRev > 0 ? ((prevRev - prevCombinedExp) / prevRev) * 100 : 0;
    const marginDiff = curMargin - prevMargin;

    const revDiff = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
    const discDiff = prevDisc > 0 ? ((curDisc - prevDisc) / prevDisc) * 100 : 0;

    const overallMargin =
      totalRev > 0 ? ((totalRev - totalCombinedExp) / totalRev) * 100 : 0;
    const marginTargetDiff = 70 - overallMargin;

    return {
      totalRevenue: totalRev,
      totalDiscounts: totalDisc,
      totalExpenseAmount: totalCombinedExp,
      operationalExpenseAmount: totalOpExp,
      purchaseExpenseAmount: totalPurchExp,
      netOperatingProfit,
      isOperatingProfit,
      netOperatingMargin,
      cashRevenue: cashRev,
      cashCount,
      cashPct,
      cardRevenue: cardRev,
      cardCount,
      cardPct,
      onlineRevenue: onlineRev,
      onlineCount,
      onlinePct,
      uncollectedDues,
      duePct,
      curMonthRev: curRev,
      curMonthExp: curCombinedExp,
      curMonthDisc: curDisc,
      dynamicTrend:
        marginDiff >= 0
          ? `+${marginDiff.toFixed(1)}%`
          : `${marginDiff.toFixed(1)}%`,
      trendDirection: (marginDiff >= 0 ? "up" : "down") as "up" | "down",
      revTrend:
        revDiff >= 0 ? `+${revDiff.toFixed(1)}%` : `${revDiff.toFixed(1)}%`,
      revTrendDirection: (revDiff >= 0 ? "up" : "down") as "up" | "down",
      discTrend:
        discDiff >= 0 ? `+${discDiff.toFixed(1)}%` : `${discDiff.toFixed(1)}%`,
      discTrendDirection: (discDiff >= 0 ? "up" : "down") as "up" | "down",
      marginSubtitle:
        marginTargetDiff > 0
          ? `${marginTargetDiff.toFixed(1)}% below target (70%)`
          : `Target reached! (70%)`,
    };
  }, [transactions, expenses, purchaseBills]);

  const monthlyAnalyticsData = useMemo(() => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const curYear = new Date().getFullYear();

    const monthMap: Record<
      number,
      {
        monthIndex: number;
        monthName: string;
        fullMonthName: string;
        revenue: number;
        opExpenses: number;
        purchExpenses: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
        categoryBreakdown: Record<string, number>;
        topCategory: string;
        txnCount: number;
        expCount: number;
        hasActivity: boolean;
      }
    > = {};

    for (let m = 0; m < 12; m++) {
      monthMap[m] = {
        monthIndex: m,
        monthName: months[m],
        fullMonthName: `${new Date(curYear, m, 1).toLocaleString("en-US", { month: "long" })} ${curYear}`,
        revenue: 0,
        opExpenses: 0,
        purchExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        margin: 0,
        categoryBreakdown: {},
        topCategory: "None",
        txnCount: 0,
        expCount: 0,
        hasActivity: false,
      };
    }

    // 1. Transactions (Revenue)
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const status = (t.status || "").toLowerCase();
      if (status === "refunded" || status === "cancelled") continue;
      const isDebtSettlement =
        t.transactionType === "Debt_Settlement" ||
        t.serviceName === "Client Debt Settlement";
      if (isDebtSettlement) continue;

      if (!t.date) continue;
      const parts = t.date.split("-");
      if (parts.length < 2) continue;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (y !== curYear || m < 0 || m > 11) continue;

      const gTotal = t.grandTotal || 0;
      const isPartialOrPending =
        t.paymentStatus === "Partial" ||
        t.paymentStatus === "Unpaid" ||
        t.status === "Pending" ||
        (t.remainingDue !== undefined && t.remainingDue !== null && t.remainingDue > 0);

      const paidAmt =
        t.amountPaid !== undefined && t.amountPaid !== null
          ? t.amountPaid
          : (isPartialOrPending && t.remainingDue !== undefined && t.remainingDue !== null
            ? Math.max(0, gTotal - t.remainingDue)
            : (isPartialOrPending ? 0 : gTotal));

      monthMap[m].revenue += paidAmt;
      monthMap[m].txnCount += 1;
      monthMap[m].hasActivity = true;
    }

    // 2. Operational Expenses
    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      const cat = (e.category || "").toLowerCase();
      const id = (e.id || "").toUpperCase();
      const title = (e.title || "").toLowerCase();
      if (
        cat === "inventory purchase" ||
        cat === "products" ||
        cat === "purchases" ||
        cat === "purchase" ||
        cat === "partner drawing" ||
        cat.includes("drawing") ||
        cat.includes("withdraw") ||
        id.startsWith("EXP-PUR-") ||
        id.startsWith("EXP-DRW-") ||
        id.startsWith("PIT-") ||
        id.includes("-PUR-") ||
        title.includes("partner drawing") ||
        title.includes("partner withdrawal") ||
        title.includes("drawing") ||
        title.includes("withdraw") ||
        title.startsWith("vendor bill") ||
        title.includes("purchase bill") ||
        title.includes("supplier order") ||
        Boolean((e as any).productName)
      ) continue;

      if (!e.date) continue;
      const parts = e.date.split("-");
      if (parts.length < 2) continue;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (y !== curYear || m < 0 || m > 11) continue;

      const actual = e.actualAmount ?? e.amount ?? 0;
      let paid = 0;
      if (e.paymentLogs && Array.isArray(e.paymentLogs) && e.paymentLogs.length > 0) {
        paid = e.paymentLogs.reduce((acc: number, l: any) => acc + (Number(l?.amount) || 0), 0);
      } else if (e.amountPaid !== undefined && e.amountPaid !== null) {
        paid = Number(e.amountPaid) || 0;
      } else if ((e.status || "").toLowerCase() === "paid") {
        paid = actual;
      }

      if (paid <= 0 && (e.status || "").toLowerCase() !== "paid") continue;
      const amt = paid > 0 ? paid : actual;

      monthMap[m].opExpenses += amt;
      monthMap[m].expCount += 1;
      monthMap[m].hasActivity = true;

      const displayCat = e.category || "General";
      monthMap[m].categoryBreakdown[displayCat] = (monthMap[m].categoryBreakdown[displayCat] || 0) + amt;
    }

    // 3. Purchase Bills (Stock / Inventory Purchases)
    for (let i = 0; i < purchaseBills.length; i++) {
      const b = purchaseBills[i];
      if (!b.date) continue;
      const parts = b.date.split("-");
      if (parts.length < 2) continue;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (y !== curYear || m < 0 || m > 11) continue;

      const paid =
        b.amountPaid !== undefined && b.amountPaid !== null
          ? b.amountPaid
          : b.paymentStatus === "Paid"
            ? b.totalAmount || 0
            : 0;

      if (paid <= 0) continue;
      monthMap[m].purchExpenses += paid;
      monthMap[m].hasActivity = true;
    }

    // 4. Summarize and format
    return Object.values(monthMap).map((item) => {
      item.totalExpenses = item.opExpenses + item.purchExpenses;
      item.netProfit = item.revenue - item.opExpenses;
      item.margin = item.revenue > 0 ? (item.netProfit / item.revenue) * 100 : 0;

      let topCat = "None";
      let topAmt = 0;
      for (const [c, a] of Object.entries(item.categoryBreakdown)) {
        if (a > topAmt) {
          topAmt = a;
          topCat = c;
        }
      }
      item.topCategory = topCat;
      return item;
    });
  }, [transactions, expenses, purchaseBills]);

  const filteredTxns = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.clientName.toLowerCase().includes(txnSearch.toLowerCase()) ||
        t.serviceName.toLowerCase().includes(txnSearch.toLowerCase()) ||
        t.invoiceId.toLowerCase().includes(txnSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (txnMethodFilter === "All") return true;
      const pm = (t.paymentMethod || "").toLowerCase();
      if (txnMethodFilter === "Cash") return pm === "cash";
      if (txnMethodFilter === "Card")
        return pm === "card" || pm.includes("pos");
      if (txnMethodFilter === "Online")
        return pm === "online" || pm.includes("bank");
      return true;
    });
  }, [transactions, txnSearch, txnMethodFilter]);

  const sortedTxns = useMemo(() => {
    return [...filteredTxns].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    });
  }, [filteredTxns]);

  const itemsPerPage = 5;
  const totalTxnPages = Math.ceil(sortedTxns.length / itemsPerPage) || 1;
  const pagedTxns = useMemo(() => {
    return sortedTxns.slice(
      (txnPage - 1) * itemsPerPage,
      txnPage * itemsPerPage,
    );
  }, [sortedTxns, txnPage]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Exclude product purchases & inventory vendor bills from operational expenses
      const cat = (e.category || "").toLowerCase();
      const title = (e.title || "").toLowerCase();
      const id = (e.id || "").toUpperCase();
      const isPurchase =
        cat === "inventory purchase" ||
        cat === "products" ||
        cat === "purchases" ||
        cat === "purchase" ||
        id.startsWith("EXP-PUR-") ||
        id.startsWith("PIT-") ||
        id.includes("-PUR-") ||
        title.startsWith("vendor bill") ||
        title.includes("purchase bill") ||
        title.includes("supplier order") ||
        Boolean(e.productName);
      if (isPurchase) return false;

      // Exclude partner drawings & withdrawals from operational expenses list
      const isPartnerDrawing =
        cat === "partner drawing" ||
        cat.includes("drawing") ||
        cat.includes("withdraw") ||
        id.startsWith("EXP-DRW-") ||
        title.includes("partner drawing") ||
        title.includes("partner withdrawal") ||
        title.includes("drawing") ||
        title.includes("withdraw");
      if (isPartnerDrawing) return false;

      const query = expSearch.toLowerCase().trim();

      let matchesSearch = true;
      if (query) {
        const matchesTitle = e.title && e.title.toLowerCase().includes(query);
        const matchesVendor =
          e.vendorName && e.vendorName.toLowerCase().includes(query);
        const matchesProduct =
          e.productName && e.productName.toLowerCase().includes(query);
        const matchesAddedBy =
          e.addedBy && e.addedBy.toLowerCase().includes(query);
        const matchesPaidBy =
          e.paidBy && e.paidBy.toLowerCase().includes(query);
        const matchesNotes = e.notes && e.notes.toLowerCase().includes(query);
        const matchesMethod =
          e.paymentMethod && e.paymentMethod.toLowerCase().includes(query);
        const matchesType =
          e.paymentType && e.paymentType.toLowerCase().includes(query);

        // Match full or partial payment audit logs
        const matchesLogs =
          e.paymentLogs &&
          e.paymentLogs.some(
            (log: any) =>
              (log.paidBy && log.paidBy.toLowerCase().includes(query)) ||
              (log.notes && log.notes.toLowerCase().includes(query)) ||
              (log.paymentMethod &&
                log.paymentMethod.toLowerCase().includes(query)),
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

      const matchesCat =
        expCategoryFilter === "All" || e.category === expCategoryFilter;

      let matchesStatus = true;
      if (expStatusFilter === "UnpaidVendor") {
        matchesStatus =
          (e.remainingAmount !== undefined && e.remainingAmount > 0) ||
          e.status === "Pending";
      } else if (expStatusFilter === "Paid") {
        matchesStatus =
          e.status === "Paid" &&
          (e.remainingAmount === undefined || e.remainingAmount === 0);
      } else if (expStatusFilter === "Pending") {
        matchesStatus = e.status === "Pending";
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [expenses, expSearch, expCategoryFilter, expStatusFilter]);

  // 5 Recent Expenses per page
  const {
    currentPage: expPage,
    setCurrentPage: setExpPage,
    paginatedItems: pagedExpenses,
  } = usePagination(filteredExpenses, 5);

  const handleAddExpense = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await addExpense({
        title: expTitle,
        category: expCategory,
        amount: Number(expAmount) || 0,
        date: new Date().toISOString().split("T")[0],
        status: "Paid",
        paymentMethod: expPaymentMethod,
        paidBy: expPaidBy || partnerOptions[0]?.value || userEmail || "Admin",
        notes: expNotes,
      });

      setIsAddExpenseModalOpen(false);
      setExpTitle("");
      setExpAmount("");
      setExpNotes("");
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
      const taxable = Math.max(0, subtotal - discVal);
      const taxPct = selectedTxn.taxPercent ?? 0;
      const taxVal = Math.round(((taxable * taxPct) / 100) * 100) / 100;
      const total = Math.round((taxable + taxVal) * 100) / 100;
      await updateTransaction(selectedTxn.id, {
        clientName: txnClientName,
        serviceName: txnServiceName,
        amount: subtotal,
        discount: discVal,
        tax: taxVal,
        taxPercent: taxPct,
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
        paidBy: editExpPaidBy || undefined,
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

  const rangeMetrics = useMemo(() => {
    let rangeTotalRev = 0;
    let rangeTotalDisc = 0;
    let rangeCashRev = 0;
    let rangeCashCount = 0;
    let rangeCardRev = 0;
    let rangeCardCount = 0;
    let rangeOnlineRev = 0;
    let rangeOnlineCount = 0;
    let rangeTxnCount = 0;
    let rangeCollectedSales = 0;
    let rangeCollectedDebt = 0;

    const inRangeTxns = transactions.filter((t) => {
      const status = (t.status || "").toLowerCase();
      if (status === "refunded" || status === "cancelled") return false;
      const dateStr = (t.date || "").trim().slice(0, 10);
      if (reportStartDate && dateStr < reportStartDate) return false;
      if (reportEndDate && dateStr > reportEndDate) return false;
      return true;
    });

    for (const t of inRangeTxns) {
      const isDebtSettlement =
        t.transactionType === "Debt_Settlement" ||
        t.serviceName === "Client Debt Settlement";
      const gTotal = t.grandTotal || 0;
      const disc = t.discount || 0;
      const paidAmt =
        t.amountPaid !== undefined && t.amountPaid !== null
          ? t.amountPaid
          : (t.status === "Pending" ? 0 : gTotal);

      if (isDebtSettlement) {
        rangeCollectedDebt += paidAmt;
      } else {
        rangeTotalRev += gTotal;
        rangeTotalDisc += disc;
        rangeTxnCount++;
        rangeCollectedSales += paidAmt;
      }

      if (t.paymentSplits && t.paymentSplits.length > 0) {
        for (const split of t.paymentSplits) {
          const sMethod = (split.method || "").toLowerCase();
          const sAmt = Number(split.amount) || 0;
          if (sMethod === "cash") {
            rangeCashRev += sAmt;
            rangeCashCount++;
          } else if (sMethod === "card" || sMethod.includes("pos")) {
            rangeCardRev += sAmt;
            rangeCardCount++;
          } else {
            rangeOnlineRev += sAmt;
            rangeOnlineCount++;
          }
        }
      } else {
        const pm = (t.paymentMethod || "").toLowerCase();
        if (pm === "cash") {
          rangeCashRev += paidAmt;
          rangeCashCount++;
        } else if (pm === "card" || pm.includes("pos")) {
          rangeCardRev += paidAmt;
          rangeCardCount++;
        } else {
          rangeOnlineRev += paidAmt;
          rangeOnlineCount++;
        }
      }
    }

    const rangeTotalCollected = rangeCollectedSales + rangeCollectedDebt;
    const totalColl = rangeCashRev + rangeCardRev + rangeOnlineRev;
    const collDenom = totalColl > 0 ? totalColl : 1;
    const rangeCashPct = totalColl > 0 ? (rangeCashRev / collDenom) * 100 : 0;
    const rangeCardPct = totalColl > 0 ? (rangeCardRev / collDenom) * 100 : 0;
    const rangeOnlinePct = totalColl > 0 ? (rangeOnlineRev / collDenom) * 100 : 0;
    const rangeUncollected = Math.max(0, rangeTotalRev - rangeCollectedSales);

    let rangeOpExp = 0;
    const inRangeExps = expenses.filter((e) => {
      const cat = (e.category || "").toLowerCase();
      const title = (e.title || "").toLowerCase();
      const id = (e.id || "").toUpperCase();
      if (
        cat === "inventory purchase" ||
        cat === "products" ||
        cat === "purchases" ||
        cat === "purchase" ||
        cat === "partner drawing" ||
        cat.includes("drawing") ||
        cat.includes("withdraw") ||
        id.startsWith("EXP-PUR-") ||
        id.startsWith("EXP-DRW-") ||
        id.startsWith("PIT-") ||
        id.includes("-PUR-") ||
        title.includes("partner drawing") ||
        title.includes("partner withdrawal") ||
        title.includes("drawing") ||
        title.includes("withdraw") ||
        title.startsWith("vendor bill") ||
        title.includes("purchase bill") ||
        title.includes("supplier order") ||
        Boolean(e.productName)
      ) return false;

      const dateStr = (e.date || "").trim().slice(0, 10);
      if (reportStartDate && dateStr < reportStartDate) return false;
      if (reportEndDate && dateStr > reportEndDate) return false;
      return true;
    });

    const rangeCategoryMap: Record<string, { count: number; amount: number }> = {};

    for (const e of inRangeExps) {
      const actual = e.actualAmount ?? e.amount ?? 0;
      let paid = 0;
      if (e.paymentLogs && Array.isArray(e.paymentLogs) && e.paymentLogs.length > 0) {
        paid = e.paymentLogs.reduce((acc: number, l: any) => acc + (Number(l?.amount) || 0), 0);
      } else if (e.amountPaid !== undefined && e.amountPaid !== null) {
        paid = Number(e.amountPaid) || 0;
      } else if ((e.status || "").toLowerCase() === "paid") {
        paid = actual;
      }
      if (paid <= 0 && (e.status || "").toLowerCase() !== "paid") continue;
      const amt = paid > 0 ? paid : actual;
      rangeOpExp += amt;

      const catName = e.category || "Other";
      if (!rangeCategoryMap[catName]) rangeCategoryMap[catName] = { count: 0, amount: 0 };
      rangeCategoryMap[catName].count++;
      rangeCategoryMap[catName].amount += amt;
    }

    let rangePurchExp = 0;
    let rangePurchDue = 0;
    const inRangePurchases = purchaseBills.filter((b: any) => {
      const dateStr = (b.date || "").trim().slice(0, 10);
      if (reportStartDate && dateStr < reportStartDate) return false;
      if (reportEndDate && dateStr > reportEndDate) return false;
      return true;
    });

    for (const b of inRangePurchases) {
      const paid =
        b.amountPaid !== undefined && b.amountPaid !== null
          ? b.amountPaid
          : b.paymentStatus === "Paid"
            ? b.totalAmount || 0
            : 0;
      rangePurchExp += paid;
      rangePurchDue += (b.remainingDue || 0);
    }

    const rangeTotalExp = rangeOpExp + rangePurchExp;
    const rangeNetProfit = rangeTotalCollected - rangeOpExp;
    const rangeMargin = rangeTotalCollected > 0 ? (rangeNetProfit / rangeTotalCollected) * 100 : 0;
    const rangeCashFlow = rangeNetProfit - rangePurchExp;

    return {
      inRangeTxns,
      inRangeExps,
      inRangePurchases,
      rangeTotalRev,
      rangeTotalDisc,
      rangeGrossInvoiced: rangeTotalRev + rangeTotalDisc,
      rangeCollectedSales,
      rangeCollectedDebt,
      rangeTotalCollected,
      rangeCashRev,
      rangeCashCount,
      rangeCashPct,
      rangeCardRev,
      rangeCardCount,
      rangeCardPct,
      rangeOnlineRev,
      rangeOnlineCount,
      rangeOnlinePct,
      rangeUncollected,
      rangeTxnCount,
      rangeOpExp,
      rangePurchExp,
      rangePurchDue,
      rangeTotalExp,
      rangeNetProfit,
      rangeMargin,
      rangeCashFlow,
      rangeCategoryMap,
    };
  }, [transactions, expenses, purchaseBills, reportStartDate, reportEndDate]);

  const getPdfButtonLabel = () => {
    if (activeTab === "reports") {
      if (activeReport === "Revenue") return "Revenue PDF";
      if (activeReport === "Expense") return "Expense PDF";
      if (activeReport === "Profit") return "Profit & Loss PDF";
      if (activeReport === "Audit") return "Audit PDF";
      return "PDF Report";
    }
    if (activeTab === "transactions") return "Ledger PDF";
    if (activeTab === "purchases") return "Purchases PDF";
    if (activeTab === "expenses") return "Expenses PDF";
    if (activeTab === "equity") return "Equity PDF";
    if (activeTab === "partner-expenses") return "Partner PDF";
    return "PDF Report";
  };

  const handleExportPDF = (overrideType?: string) => {
    const reportType = (
      overrideType ||
      (activeTab === "reports" ? activeReport.toLowerCase() : activeTab)
    ).toLowerCase();

    const branch = branches.find((b: any) => b.id === selectedBranchId);
    const displayClinicName = branch
      ? `${clinicInfo?.name || "DBS Aesthetic Clinic & Salon"} (${branch.name})`
      : (clinicInfo?.name || "DBS Aesthetic Clinic & Salon");
    const displayAddress = branch
      ? branch.location
      : (clinicInfo?.address || "Building 4, Sector F-7, Islamabad");
    const displayPhone = branch
      ? branch.phone || clinicInfo?.phone
      : (clinicInfo?.phone || "+92 300 1234567");

    const formatFinancial = (val: number) => {
      const formatted = formatPKR(Math.abs(val), { decimals: false });
      return val < 0 ? `(${formatted})` : formatted;
    };

    const periodStr = `${formatDateDisplay(reportStartDate)} to ${formatDateDisplay(reportEndDate)}`;
    const todayStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    const commonStyles = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        padding: 32px 36px;
        margin: 0;
        line-height: 1.45;
      }
      .header {
        border-bottom: 2.5px solid #0f172a;
        padding-bottom: 16px;
        margin-bottom: 22px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        color: #0f172a;
      }
      .header p {
        margin: 4px 0 0 0;
        font-size: 12px;
        color: #475569;
        font-weight: 600;
      }
      .header .meta {
        font-size: 11px;
        color: #64748b;
        margin-top: 3px;
      }
      .badge {
        border: 2px solid #0f172a;
        color: #0f172a;
        font-size: 10px;
        font-weight: 800;
        padding: 6px 14px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
        margin-bottom: 20px;
      }
      .card {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 12px 14px;
        page-break-inside: avoid;
      }
      .card-title {
        font-size: 9.5px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
      }
      .card-value {
        font-size: 18px;
        font-weight: 900;
        margin-top: 4px;
        display: block;
        color: #0f172a;
      }
      h2 {
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 24px;
        margin-bottom: 10px;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 5px;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin-bottom: 20px;
      }
      tr {
        page-break-inside: avoid;
      }
      th {
        background: #0f172a;
        color: #ffffff;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 9.5px;
        padding: 8px 10px;
        text-align: left;
        letter-spacing: 0.5px;
      }
      td {
        padding: 8px 10px;
        border-bottom: 1px solid #e2e8f0;
        color: #0f172a;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .font-bold { font-weight: 700; }
      .double-underline { border-bottom: 3px double #0f172a; padding-bottom: 2px; }
      .signatures {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px dashed #cbd5e1;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        page-break-inside: avoid;
      }
      .sig-line {
        border-top: 1.5px solid #0f172a;
        margin-top: 32px;
        padding-top: 6px;
        text-align: center;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 9.5px;
        color: #475569;
      }
      .footer-note {
        text-align: center;
        font-size: 9.5px;
        color: #94a3b8;
        margin-top: 24px;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
      }
      @media print {
        body { padding: 12px 18px; color: #000 !important; background: #fff !important; }
        th { background: #0f172a !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .card { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;

    let htmlBody = "";

    // 1. REVENUE REPORT
    if (reportType === "revenue") {
      const salesTxns = rangeMetrics.inRangeTxns.filter(
        (t) => t.transactionType !== "Debt_Settlement" && t.serviceName !== "Client Debt Settlement"
      );
      const debtTxns = rangeMetrics.inRangeTxns.filter(
        (t) => t.transactionType === "Debt_Settlement" || t.serviceName === "Client Debt Settlement"
      );

      // Aggregate top treatments / services
      const serviceAgg: Record<string, { name: string; count: number; total: number }> = {};
      salesTxns.forEach((t) => {
        const items = (t.items && t.items.length > 0)
          ? t.items
          : [{ name: t.serviceName || "Clinical Treatment", price: t.grandTotal, quantity: 1 }];
        items.forEach((item: any) => {
          const sName = item.name || "General Service";
          if (!serviceAgg[sName]) {
            serviceAgg[sName] = { name: sName, count: 0, total: 0 };
          }
          serviceAgg[sName].count += (item.quantity || 1);
          serviceAgg[sName].total += (item.price || 0) * (item.quantity || 1);
        });
      });
      const topServices = Object.values(serviceAgg).sort((a, b) => b.total - a.total);

      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>REVENUE & SALES PERFORMANCE REPORT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Revenue Audit</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Gross Invoiced Revenue</span>
            <span class="card-value">${formatFinancial(rangeMetrics.rangeGrossInvoiced)}</span>
          </div>
          <div class="card">
            <span class="card-title">Discounts Granted</span>
            <span class="card-value" style="color: #dc2626;">-${formatFinancial(rangeMetrics.rangeTotalDisc)}</span>
          </div>
          <div class="card">
            <span class="card-title">Net Realized Inflows</span>
            <span class="card-value" style="color: #16a34a;"><span class="double-underline">${formatFinancial(rangeMetrics.rangeTotalCollected)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Uncollected Receivables</span>
            <span class="card-value" style="color: #ea580c;">${formatFinancial(rangeMetrics.rangeUncollected)}</span>
          </div>
        </div>

        <h2>Collections by Payment Channel</h2>
        <table>
          <thead>
            <tr>
              <th>Payment Channel</th>
              <th>Destination Account / Vault</th>
              <th class="text-right">Invoices</th>
              <th class="text-right">Total Collected</th>
              <th class="text-right">Share (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Cash Receipts</strong></td>
              <td>Front Desk Drawer Liquidity</td>
              <td class="text-right">${rangeMetrics.rangeCashCount}</td>
              <td class="text-right font-mono font-bold">${formatFinancial(rangeMetrics.rangeCashRev)}</td>
              <td class="text-right font-mono">${rangeMetrics.rangeCashPct.toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>POS / Card Terminals</strong></td>
              <td>Merchant Holding & Settlement</td>
              <td class="text-right">${rangeMetrics.rangeCardCount}</td>
              <td class="text-right font-mono font-bold">${formatFinancial(rangeMetrics.rangeCardRev)}</td>
              <td class="text-right font-mono">${rangeMetrics.rangeCardPct.toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Online / Bank Transfers</strong></td>
              <td>Digital Gateway & Bank Transfers</td>
              <td class="text-right">${rangeMetrics.rangeOnlineCount}</td>
              <td class="text-right font-mono font-bold">${formatFinancial(rangeMetrics.rangeOnlineRev)}</td>
              <td class="text-right font-mono">${rangeMetrics.rangeOnlinePct.toFixed(1)}%</td>
            </tr>
            ${debtTxns.length > 0 ? `
            <tr>
              <td><strong>Client Debt Recoveries</strong></td>
              <td>Past Outstanding Balance Collections</td>
              <td class="text-right">${debtTxns.length}</td>
              <td class="text-right font-mono font-bold">${formatFinancial(rangeMetrics.rangeCollectedDebt)}</td>
              <td class="text-right font-mono">${rangeMetrics.rangeTotalCollected > 0 ? ((rangeMetrics.rangeCollectedDebt / rangeMetrics.rangeTotalCollected) * 100).toFixed(1) : "0.0"}%</td>
            </tr>
            ` : ""}
            <tr style="font-weight: 800; background: #f8fafc;">
              <td>Total Realized Collections</td>
              <td>Audited Operating Receipts</td>
              <td class="text-right font-mono">${rangeMetrics.rangeTxnCount + debtTxns.length}</td>
              <td class="text-right font-mono double-underline">${formatFinancial(rangeMetrics.rangeTotalCollected)}</td>
              <td class="text-right font-mono">100.0%</td>
            </tr>
          </tbody>
        </table>

        <h2>Top Services & Treatments Revenue</h2>
        <table>
          <thead>
            <tr>
              <th>Service / Package Name</th>
              <th class="text-center">Units Sold</th>
              <th class="text-right">Revenue Generated</th>
              <th class="text-right">Share of Sales</th>
            </tr>
          </thead>
          <tbody>
            ${topServices.slice(0, 10).map((s) => `
              <tr>
                <td style="font-weight: 700;">${escapeHtml(s.name)}</td>
                <td class="text-center font-mono">${s.count}</td>
                <td class="text-right font-mono font-bold">${formatFinancial(s.total)}</td>
                <td class="text-right font-mono">${rangeMetrics.rangeTotalRev > 0 ? ((s.total / rangeMetrics.rangeTotalRev) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
            `).join("")}
            ${topServices.length === 0 ? '<tr><td colspan="4" class="text-center" style="color: #94a3b8;">No service transactions in selected date range.</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Detailed Sales Transactions Ledger (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Client Name</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount Paid</th>
              <th class="text-right">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangeTxns.map((t) => `
              <tr>
                <td style="font-weight: 700;">${escapeHtml(t.invoiceId || t.id)}</td>
                <td style="font-weight: 600;">${escapeHtml(t.clientName || "Valued Client")}</td>
                <td>${escapeHtml(t.date)}</td>
                <td>${escapeHtml(t.paymentMethod || "Cash")}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(t.paymentStatus || t.status)}</span></td>
                <td class="text-right font-mono font-bold">${formatFinancial(t.amountPaid !== undefined && t.amountPaid !== null ? t.amountPaid : (t.status === "Pending" ? 0 : t.grandTotal))}</td>
                <td class="text-right font-mono">${formatFinancial(t.grandTotal)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangeTxns.length === 0 ? '<tr><td colspan="7" class="text-center" style="color: #94a3b8;">No transactions recorded in selected timeframe.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 2. EXPENSE REPORT
    else if (reportType === "expense") {
      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>OPERATING OVERHEADS & PROCUREMENT EXPENSES REPORT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Expense Audit</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Operational Overheads Paid</span>
            <span class="card-value" style="color: #dc2626;">-${formatFinancial(rangeMetrics.rangeOpExp)}</span>
          </div>
          <div class="card">
            <span class="card-title">Stock Procurements Paid</span>
            <span class="card-value" style="color: #2563eb;">-${formatFinancial(rangeMetrics.rangePurchExp)}</span>
          </div>
          <div class="card">
            <span class="card-title">Total Cash Outflow</span>
            <span class="card-value"><span class="double-underline">${formatFinancial(rangeMetrics.rangeTotalExp)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Pending Vendor Liabilities</span>
            <span class="card-value" style="color: #ea580c;">${formatFinancial(rangeMetrics.rangePurchDue)}</span>
          </div>
        </div>

        <h2>Category-Wise Operating Outflow Distribution</h2>
        <table>
          <thead>
            <tr>
              <th>Expense Category</th>
              <th class="text-center">Entries</th>
              <th class="text-right">Total Outflow (PKR)</th>
              <th class="text-right">Share of Overheads</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(rangeMetrics.rangeCategoryMap).map(([cat, data]) => `
              <tr>
                <td><strong>${escapeHtml(cat)}</strong></td>
                <td class="text-center font-mono">${data.count}</td>
                <td class="text-right font-mono font-bold" style="color: #dc2626;">-${formatFinancial(data.amount)}</td>
                <td class="text-right font-mono">${rangeMetrics.rangeOpExp > 0 ? ((data.amount / rangeMetrics.rangeOpExp) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
            `).join("")}
            ${Object.keys(rangeMetrics.rangeCategoryMap).length === 0 ? '<tr><td colspan="4" class="text-center" style="color: #94a3b8;">No operating expenses recorded in selected timeframe.</td></tr>' : ""}
            <tr style="font-weight: 800; background: #f8fafc;">
              <td>Total Operational Overheads</td>
              <td class="text-center font-mono">${rangeMetrics.inRangeExps.length}</td>
              <td class="text-right font-mono double-underline">-${formatFinancial(rangeMetrics.rangeOpExp)}</td>
              <td class="text-right font-mono">100.0%</td>
            </tr>
          </tbody>
        </table>

        <h2>Operating Overheads Breakdown (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Expense Title / Purpose</th>
              <th>Category</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangeExps.map((e) => `
              <tr>
                <td><strong style="display: block;">${escapeHtml(e.title)}</strong><span style="font-size: 9.5px; color: #64748b;">${escapeHtml(e.vendorName || e.paidBy || "")}</span></td>
                <td>${escapeHtml(e.category)}</td>
                <td>${escapeHtml(e.date)}</td>
                <td>${escapeHtml(e.paymentMethod)}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(e.status)}</span></td>
                <td class="text-right font-mono font-bold" style="color: #dc2626;">-${formatFinancial(e.amountPaid !== undefined && e.amountPaid !== null ? e.amountPaid : e.amount)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangeExps.length === 0 ? '<tr><td colspan="6" class="text-center" style="color: #94a3b8;">No operational expenses in range.</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Vendor Inventory & Stock Purchases (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor / Supplier</th>
              <th>Bill #</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount Paid</th>
              <th class="text-right">Remaining Due</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangePurchases.map((b: any) => `
              <tr>
                <td><strong>${escapeHtml(b.vendorName || "Supplier Bill")}</strong></td>
                <td style="font-family: monospace;">${escapeHtml(b.billNumber || b.id || "N/A")}</td>
                <td>${escapeHtml(b.date || "")}</td>
                <td>${escapeHtml(b.paymentMethod || "Bank Transfer")}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(b.paymentStatus || "Paid")}</span></td>
                <td class="text-right font-mono font-bold" style="color: #2563eb;">-${formatFinancial(b.amountPaid || 0)}</td>
                <td class="text-right font-mono">${formatFinancial(b.remainingDue || 0)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangePurchases.length === 0 ? '<tr><td colspan="7" class="text-center" style="color: #94a3b8;">No stock purchases in range.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 3. PROFIT & LOSS STATEMENT (P&L) REPORT
    else if (reportType === "profit") {
      const marginStatus = rangeMetrics.rangeMargin >= 35
        ? "Excellent operational surplus & sustainable fiscal health"
        : rangeMetrics.rangeMargin >= 20
          ? "Solid positive operating margin meeting clinic targets"
          : rangeMetrics.rangeMargin > 0
            ? "Positive surplus; overhead containment recommended"
            : "Operating cash deficit for selected timeframe";

      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>EXECUTIVE PROFIT & LOSS (P&L) STATEMENT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">P&L Statement</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Realized Revenue</span>
            <span class="card-value" style="color: #2563eb;">${formatFinancial(rangeMetrics.rangeTotalCollected)}</span>
          </div>
          <div class="card">
            <span class="card-title">Operating Overheads</span>
            <span class="card-value" style="color: #dc2626;">-${formatFinancial(rangeMetrics.rangeOpExp)}</span>
          </div>
          <div class="card">
            <span class="card-title">Net Operating Profit</span>
            <span class="card-value" style="color: ${rangeMetrics.rangeNetProfit >= 0 ? '#16a34a' : '#dc2626'};">
              <span class="double-underline">${formatFinancial(rangeMetrics.rangeNetProfit)}</span>
            </span>
          </div>
          <div class="card">
            <span class="card-title">Operating Margin</span>
            <span class="card-value" style="color: #4f46e5;">${rangeMetrics.rangeMargin.toFixed(1)}%</span>
          </div>
        </div>

        <h2>Statement of Profit & Loss</h2>
        <table>
          <thead>
            <tr>
              <th>Financial Item & Account Code</th>
              <th class="text-right">Subtotal</th>
              <th class="text-right">Total (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="3">1. OPERATING REVENUE (INFLOW)</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Gross Invoiced Treatment & Product Sales</td>
              <td class="text-right font-mono">${formatFinancial(rangeMetrics.rangeGrossInvoiced)}</td>
              <td></td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Less: Promotional & Package Discounts</td>
              <td class="text-right font-mono" style="color: #dc2626;">(${formatFinancial(rangeMetrics.rangeTotalDisc)})</td>
              <td></td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Realized Cash & Bank Sales Inflow</td>
              <td class="text-right font-mono">${formatFinancial(rangeMetrics.rangeCollectedSales)}</td>
              <td></td>
            </tr>
            ${rangeMetrics.rangeCollectedDebt > 0 ? `
            <tr>
              <td style="padding-left: 20px;">Add: Past Client Debt Collections Recovered</td>
              <td class="text-right font-mono">+${formatFinancial(rangeMetrics.rangeCollectedDebt)}</td>
              <td></td>
            </tr>
            ` : ""}
            <tr style="font-weight: 700; background: #fafafa;">
              <td style="padding-left: 20px;">Total Realized Operating Inflow</td>
              <td></td>
              <td class="text-right font-mono font-bold">${formatFinancial(rangeMetrics.rangeTotalCollected)}</td>
            </tr>

            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="3">2. OPERATING OVERHEADS (OUTFLOW)</td>
            </tr>
            ${Object.entries(rangeMetrics.rangeCategoryMap).map(([cat, data]) => `
              <tr>
                <td style="padding-left: 20px;">${escapeHtml(cat)} Overhead Expenditures</td>
                <td class="text-right font-mono" style="color: #dc2626;">(${formatFinancial(data.amount)})</td>
                <td></td>
              </tr>
            `).join("")}
            <tr style="font-weight: 700; background: #fafafa;">
              <td style="padding-left: 20px;">Total Operating Overheads</td>
              <td></td>
              <td class="text-right font-mono font-bold" style="color: #dc2626;">(${formatFinancial(rangeMetrics.rangeOpExp)})</td>
            </tr>

            <tr style="background: #f1f5f9; font-weight: 900; font-size: 12px;">
              <td>3. NET OPERATING PROFIT (EBITDA SURPLUS)</td>
              <td></td>
              <td class="text-right font-mono double-underline" style="color: ${rangeMetrics.rangeNetProfit >= 0 ? '#16a34a' : '#dc2626'};">
                ${formatFinancial(rangeMetrics.rangeNetProfit)}
              </td>
            </tr>

            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="3">4. CAPITAL & STOCK ASSET PROCUREMENT</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Wholesale Inventory & Stock Procurements Paid</td>
              <td></td>
              <td class="text-right font-mono" style="color: #2563eb;">(${formatFinancial(rangeMetrics.rangePurchExp)})</td>
            </tr>

            <tr style="background: #f1f5f9; font-weight: 900; font-size: 12px;">
              <td>5. NET CASH FLOW (AFTER INVENTORY PROCUREMENT)</td>
              <td></td>
              <td class="text-right font-mono double-underline" style="color: ${rangeMetrics.rangeCashFlow >= 0 ? '#16a34a' : '#dc2626'};">
                ${formatFinancial(rangeMetrics.rangeCashFlow)}
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Operating Margin Analysis</h2>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="display: block; font-size: 13px;">Net Margin: ${rangeMetrics.rangeMargin.toFixed(1)}%</strong>
              <span style="font-size: 11px; color: #475569;">${marginStatus}</span>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              Audit Benchmark: <strong>30.0%</strong>
            </div>
          </div>
        </div>
      `;
    }

    // 4. TRANSACTIONS LEDGER REPORT
    else if (reportType === "transactions") {
      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>FINANCIAL TRANSACTIONS & SALES INFLOW LEDGER</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Transactions Ledger</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Ledger Entries Count</span>
            <span class="card-value">${rangeMetrics.inRangeTxns.length}</span>
          </div>
          <div class="card">
            <span class="card-title">Total Invoiced Value</span>
            <span class="card-value">${formatFinancial(rangeMetrics.rangeGrossInvoiced)}</span>
          </div>
          <div class="card">
            <span class="card-title">Realized Receipts</span>
            <span class="card-value" style="color: #16a34a;"><span class="double-underline">${formatFinancial(rangeMetrics.rangeTotalCollected)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Uncollected Balance</span>
            <span class="card-value" style="color: #ea580c;">${formatFinancial(rangeMetrics.rangeUncollected)}</span>
          </div>
        </div>

        <h2>Detailed Sales & Inflows Table (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Client Name</th>
              <th>Date</th>
              <th>Service / Package</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount Paid</th>
              <th class="text-right">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangeTxns.map((t) => `
              <tr>
                <td style="font-weight: 700;">${escapeHtml(t.invoiceId || t.id)}</td>
                <td style="font-weight: 600;">${escapeHtml(t.clientName || "Valued Client")}</td>
                <td>${escapeHtml(t.date)}</td>
                <td>${escapeHtml(t.serviceName || "Treatment")}</td>
                <td>${escapeHtml(t.paymentMethod || "Cash")}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(t.paymentStatus || t.status)}</span></td>
                <td class="text-right font-mono font-bold">${formatFinancial(t.amountPaid !== undefined && t.amountPaid !== null ? t.amountPaid : (t.status === "Pending" ? 0 : t.grandTotal))}</td>
                <td class="text-right font-mono">${formatFinancial(t.grandTotal)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangeTxns.length === 0 ? '<tr><td colspan="8" class="text-center" style="color: #94a3b8;">No transactions found in selected period.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 5. PURCHASES REPORT
    else if (reportType === "purchases") {
      const totalPurchOrders = rangeMetrics.inRangePurchases.length;
      const totalPurchValue = rangeMetrics.inRangePurchases.reduce((acc, b: any) => acc + (b.totalAmount || 0), 0);

      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>VENDOR PROCUREMENT & STOCK PURCHASES REPORT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Purchases Report</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Stock Orders Count</span>
            <span class="card-value">${totalPurchOrders}</span>
          </div>
          <div class="card">
            <span class="card-title">Total Orders Value</span>
            <span class="card-value">${formatFinancial(totalPurchValue)}</span>
          </div>
          <div class="card">
            <span class="card-title">Total Paid to Vendors</span>
            <span class="card-value" style="color: #2563eb;"><span class="double-underline">${formatFinancial(rangeMetrics.rangePurchExp)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Outstanding Accounts Payable</span>
            <span class="card-value" style="color: #ea580c;">${formatFinancial(rangeMetrics.rangePurchDue)}</span>
          </div>
        </div>

        <h2>Vendor Purchase Bills Ledger (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Vendor / Supplier</th>
              <th>Date</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th class="text-right">Total Invoice</th>
              <th class="text-right">Amount Paid</th>
              <th class="text-right">Remaining Due</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangePurchases.map((b: any) => `
              <tr>
                <td style="font-family: monospace; font-weight: 700;">${escapeHtml(b.billNumber || b.id || "N/A")}</td>
                <td><strong>${escapeHtml(b.vendorName || "Supplier Bill")}</strong></td>
                <td>${escapeHtml(b.date || "")}</td>
                <td>${escapeHtml(b.paymentMethod || "Bank Transfer")}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(b.paymentStatus || "Paid")}</span></td>
                <td class="text-right font-mono">${formatFinancial(b.totalAmount || 0)}</td>
                <td class="text-right font-mono font-bold" style="color: #2563eb;">${formatFinancial(b.amountPaid || 0)}</td>
                <td class="text-right font-mono" style="color: ${(b.remainingDue || 0) > 0 ? '#ea580c' : '#475569'};">${formatFinancial(b.remainingDue || 0)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangePurchases.length === 0 ? '<tr><td colspan="8" class="text-center" style="color: #94a3b8;">No vendor bills recorded in selected period.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 6. EXPENSES TAB REPORT
    else if (reportType === "expenses") {
      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>OPERATIONAL EXPENSES AUDIT REPORT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Expenses Ledger</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Expense Records</span>
            <span class="card-value">${rangeMetrics.inRangeExps.length}</span>
          </div>
          <div class="card">
            <span class="card-title">Settled Overheads</span>
            <span class="card-value" style="color: #dc2626;"><span class="double-underline">-${formatFinancial(rangeMetrics.rangeOpExp)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Active Categories</span>
            <span class="card-value">${Object.keys(rangeMetrics.rangeCategoryMap).length}</span>
          </div>
          <div class="card">
            <span class="card-title">Audit Status</span>
            <span class="card-value" style="color: #16a34a;">Verified</span>
          </div>
        </div>

        <h2>Detailed Expenses Table (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Title / Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangeExps.map((e) => `
              <tr>
                <td><strong style="display: block;">${escapeHtml(e.title)}</strong><span style="font-size: 9.5px; color: #64748b;">Paid by: ${escapeHtml(e.paidBy || e.addedBy || "Clinic Admin")}</span></td>
                <td>${escapeHtml(e.category)}</td>
                <td>${escapeHtml(e.date)}</td>
                <td>${escapeHtml(e.paymentMethod)}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(e.status)}</span></td>
                <td class="text-right font-mono font-bold" style="color: #dc2626;">-${formatFinancial(e.amountPaid !== undefined && e.amountPaid !== null ? e.amountPaid : e.amount)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangeExps.length === 0 ? '<tr><td colspan="6" class="text-center" style="color: #94a3b8;">No operating expenses in selected period.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 7. PARTNER & ADMIN EXPENSES REPORT
    else if (reportType === "partner-expenses") {
      const partnerExps = expenses.filter((e) => {
        const d = (e.date || "").trim().slice(0, 10);
        if (reportStartDate && d < reportStartDate) return false;
        if (reportEndDate && d > reportEndDate) return false;
        const cat = (e.category || "").toLowerCase();
        const title = (e.title || "").toLowerCase();
        const id = (e.id || "").toUpperCase();
        if (
          cat === "partner drawing" ||
          cat.includes("drawing") ||
          cat.includes("withdraw") ||
          id.startsWith("EXP-DRW-") ||
          title.includes("partner drawing") ||
          title.includes("partner withdrawal") ||
          title.includes("drawing") ||
          title.includes("withdraw")
        ) return false;
        return Boolean(e.paidBy);
      });
      const partnerTotal = partnerExps.reduce((acc, e) => acc + (e.actualAmount ?? e.amount ?? 0), 0);

      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>PARTNER & ADMIN EXPENSES AUDIT REPORT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Partner Outflows</div>
        </div>

        <div class="grid-3">
          <div class="card">
            <span class="card-title">Partner Records</span>
            <span class="card-value">${partnerExps.length}</span>
          </div>
          <div class="card">
            <span class="card-title">Total Partner Outflows</span>
            <span class="card-value" style="color: #dc2626;"><span class="double-underline">${formatFinancial(partnerTotal)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Audit Record</span>
            <span class="card-value">Verified</span>
          </div>
        </div>

        <h2>Partner & Admin Expense Allocations (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Title / Purpose</th>
              <th>Paid / Disbursed By</th>
              <th>Category</th>
              <th>Date</th>
              <th>Method</th>
              <th class="text-right">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${partnerExps.map((e) => `
              <tr>
                <td><strong>${escapeHtml(e.title)}</strong></td>
                <td><strong style="color: #2563eb;">${escapeHtml(e.paidBy || "Admin")}</strong></td>
                <td>${escapeHtml(e.category)}</td>
                <td>${escapeHtml(e.date)}</td>
                <td>${escapeHtml(e.paymentMethod)}</td>
                <td class="text-right font-mono font-bold">${formatFinancial(e.amount)}</td>
              </tr>
            `).join("")}
            ${partnerExps.length === 0 ? '<tr><td colspan="6" class="text-center" style="color: #94a3b8;">No partner expenditures in selected period.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 8. PARTNER EQUITY REPORT
    else if (reportType === "equity") {
      const partnersList = partnerEquity?.partners || [];
      const totalContributed = partnersList.reduce((acc: number, p: any) => acc + (p.totalInvested ?? p.initialInvestment ?? 0), 0);
      const totalDrawn = partnersList.reduce((acc: number, p: any) => acc + (p.totalWithdrawn || 0), 0);
      const totalCurrentCapital = partnersList.reduce((acc: number, p: any) => acc + (p.currentCapital || 0), 0);

      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>PARTNER EQUITY & CAPITAL POSITION REPORT</p>
            <div class="meta">As of: ${formatDateDisplay(reportEndDate)} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Equity Audit</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Contributed Capital</span>
            <span class="card-value">${formatFinancial(totalContributed)}</span>
          </div>
          <div class="card">
            <span class="card-title">Cumulative Drawings</span>
            <span class="card-value" style="color: #dc2626;">-${formatFinancial(totalDrawn)}</span>
          </div>
          <div class="card">
            <span class="card-title">Net Partners' Capital</span>
            <span class="card-value" style="color: #16a34a;"><span class="double-underline">${formatFinancial(totalCurrentCapital)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Active Partners</span>
            <span class="card-value">${partnersList.length}</span>
          </div>
        </div>

        <h2>Partner Ownership & Equity Position</h2>
        <table>
          <thead>
            <tr>
              <th>Partner Name</th>
              <th>Equity Share (%)</th>
              <th class="text-right">Contributed Capital</th>
              <th class="text-right">Cumulative Withdrawn</th>
              <th class="text-right">Net Equity Balance</th>
            </tr>
          </thead>
          <tbody>
            ${partnersList.map((p: any) => `
              <tr>
                <td><strong>${escapeHtml(p.partnerName)}</strong></td>
                <td><span style="font-weight: 700; color: #2563eb;">${p.equityPercentage || 0}%</span></td>
                <td class="text-right font-mono">${formatFinancial(p.totalInvested ?? p.initialInvestment ?? 0)}</td>
                <td class="text-right font-mono" style="color: #dc2626;">(${formatFinancial(p.totalWithdrawn || 0)})</td>
                <td class="text-right font-mono font-bold">${formatFinancial(p.currentCapital ?? 0)}</td>
              </tr>
            `).join("")}
            ${partnersList.length === 0 ? '<tr><td colspan="5" class="text-center" style="color: #94a3b8;">No partner equity records registered.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    // 9. COMPREHENSIVE FINANCIAL AUDIT REPORT (DEFAULT / AUDIT)
    else {
      // Balance sheet cumulative as of reportEndDate
      const asOfActiveTxns = transactions.filter((t) => {
        const status = (t.status || "").toLowerCase();
        return (
          (!t.date || t.date.trim().slice(0, 10) <= reportEndDate) &&
          status !== "refunded" &&
          status !== "cancelled"
        );
      });
      const asOfSalesTxns = asOfActiveTxns.filter(
        (t) => t.transactionType !== "Debt_Settlement" && t.serviceName !== "Client Debt Settlement"
      );
      const asOfDebtTxns = asOfActiveTxns.filter(
        (t) => t.transactionType === "Debt_Settlement" || t.serviceName === "Client Debt Settlement"
      );
      const asOfCollectedSalesRev = asOfSalesTxns.reduce(
        (acc, t) => acc + (t.amountPaid !== undefined && t.amountPaid !== null ? t.amountPaid : (t.status === "Pending" ? 0 : t.grandTotal)),
        0
      );
      const asOfCollectedDebtRev = asOfDebtTxns.reduce(
        (acc, t) => acc + (t.amountPaid !== undefined && t.amountPaid !== null ? t.amountPaid : t.grandTotal),
        0
      );
      const asOfTotalCollectedRev = asOfCollectedSalesRev + asOfCollectedDebtRev;

      const asOfPaidExps = expenses.filter((e) => {
        const cat = (e.category || "").toLowerCase();
        const id = (e.id || "").toUpperCase();
        const title = (e.title || "").toLowerCase();
        return (
          (!e.date || e.date.trim().slice(0, 10) <= reportEndDate) &&
          (e.status === "Paid" || (e.amountPaid && e.amountPaid > 0)) &&
          cat !== "inventory purchase" &&
          cat !== "products" &&
          cat !== "partner drawing" &&
          !cat.includes("drawing") &&
          !cat.includes("withdraw") &&
          !id.startsWith("EXP-PUR-") &&
          !id.startsWith("EXP-DRW-") &&
          !title.includes("partner drawing") &&
          !title.includes("partner withdrawal") &&
          !title.includes("drawing") &&
          !title.includes("withdraw")
        );
      });
      const asOfTotalOpExp = asOfPaidExps.reduce((acc, e) => acc + (e.amountPaid ?? e.amount), 0);

      const asOfPaidPurchases = purchaseBills.filter(
        (b: any) => (!b.date || b.date.trim().slice(0, 10) <= reportEndDate) && (b.amountPaid || 0) > 0
      );
      const asOfTotalPurchPaid = asOfPaidPurchases.reduce((acc, b: any) => acc + (b.amountPaid || 0), 0);

      const cumRealizedProfit = asOfTotalCollectedRev - asOfTotalOpExp;
      const accountsReceivable = clients.reduce((acc: number, c: any) => acc + (c.outstandingBalance || 0), 0);
      const inventoryValuation = inventory.reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
      const totalContributedCapital = (partnerEquity?.partners || []).reduce((acc: number, p: any) => acc + (p.totalInvested ?? p.initialInvestment ?? 0), 0);
      const cumulativeDrawings = (partnerEquity?.partners || []).reduce((acc: number, p: any) => acc + (p.totalWithdrawn || 0), 0);

      const netCashDrawer = totalContributedCapital + asOfTotalCollectedRev - asOfTotalOpExp - asOfTotalPurchPaid - cumulativeDrawings;
      const cashAndEquivalents = Math.max(0, netCashDrawer);
      const totalCurrentAssets = cashAndEquivalents + accountsReceivable + inventoryValuation;
      const totalAssets = totalCurrentAssets;

      const accountsPayable = purchaseBills
        .filter((b: any) => !b.date || b.date.trim().slice(0, 10) <= reportEndDate)
        .reduce((acc: number, b: any) => acc + (b.remainingDue || 0), 0);

      const accruedExpenses = expenses
        .filter((e: any) => {
          const cat = (e.category || "").toLowerCase();
          const id = (e.id || "").toUpperCase();
          const title = (e.title || "").toLowerCase();
          return (
            (!e.date || e.date.trim().slice(0, 10) <= reportEndDate) &&
            (e.status || "").toLowerCase() !== "paid" &&
            cat !== "partner drawing" &&
            !cat.includes("drawing") &&
            !cat.includes("withdraw") &&
            !id.startsWith("EXP-DRW-") &&
            !title.includes("partner drawing") &&
            !title.includes("partner withdrawal") &&
            !title.includes("drawing") &&
            !title.includes("withdraw")
          );
        })
        .reduce((acc: number, e: any) => acc + (e.remainingAmount ?? e.amount ?? 0), 0);

      const totalLiabilities = accountsPayable + accruedExpenses;
      const retainedEarnings = cumRealizedProfit + accountsReceivable - accruedExpenses;
      const totalEquity = totalContributedCapital + retainedEarnings - cumulativeDrawings;
      const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

      htmlBody = `
        <div class="header">
          <div>
            <h1>${escapeHtml(displayClinicName)}</h1>
            <p>STATEMENT OF FINANCIAL POSITION & AUDIT REPORT</p>
            <div class="meta">Timeframe: ${periodStr} • Generated: ${todayStr} • ${escapeHtml(displayAddress)}</div>
          </div>
          <div class="badge">Audit Certified</div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="card-title">Realized Inflow (Period)</span>
            <span class="card-value">${formatFinancial(rangeMetrics.rangeTotalCollected)}</span>
          </div>
          <div class="card">
            <span class="card-title">Operating Overheads (Period)</span>
            <span class="card-value" style="color: #dc2626;">-${formatFinancial(rangeMetrics.rangeOpExp)}</span>
          </div>
          <div class="card">
            <span class="card-title">Net Operating Profit</span>
            <span class="card-value" style="color: #16a34a;"><span class="double-underline">${formatFinancial(rangeMetrics.rangeNetProfit)}</span></span>
          </div>
          <div class="card">
            <span class="card-title">Stock Procurement Outflow</span>
            <span class="card-value" style="color: #2563eb;">-${formatFinancial(rangeMetrics.rangePurchExp)}</span>
          </div>
        </div>

        <h2>Statement of Financial Position (Balance Sheet as of ${formatDateDisplay(reportEndDate)})</h2>
        <div style="font-size: 10px; color: #64748b; margin-top: -6px; margin-bottom: 14px;">
          Cumulative Fiscal Position • Total Assets (${formatFinancial(totalAssets)}) = Liabilities & Equity (${formatFinancial(totalLiabilitiesAndEquity)})
        </div>

        <div class="grid-2">
          <!-- ASSETS -->
          <div class="card" style="background: #ffffff;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;">
              <strong style="text-transform: uppercase; font-size: 11px;">1. Clinic Assets</strong>
              <span style="font-size: 9.5px; color: #64748b;">Owned Resources</span>
            </div>
            <table>
              <tbody>
                <tr>
                  <td>Cash & Bank Liquidity Reserves</td>
                  <td class="text-right font-mono">${formatFinancial(cashAndEquivalents)}</td>
                </tr>
                <tr>
                  <td>Accounts Receivable (A/R Patient Dues)</td>
                  <td class="text-right font-mono">${formatFinancial(accountsReceivable)}</td>
                </tr>
                <tr>
                  <td>Merchandise & Inventory Stock Valuation</td>
                  <td class="text-right font-mono">${formatFinancial(inventoryValuation)}</td>
                </tr>
                <tr style="font-weight: 800; background: #f8fafc;">
                  <td>Total Current Assets</td>
                  <td class="text-right font-mono double-underline">${formatFinancial(totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- LIABILITIES & EQUITY -->
          <div class="card" style="background: #ffffff;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;">
              <strong style="text-transform: uppercase; font-size: 11px;">2. Liabilities & Equity</strong>
              <span style="font-size: 9.5px; color: #64748b;">Obligations & Net Worth</span>
            </div>
            <table>
              <tbody>
                <tr>
                  <td>Accounts Payable (Vendor Unpaid Bills)</td>
                  <td class="text-right font-mono">${formatFinancial(accountsPayable)}</td>
                </tr>
                <tr>
                  <td>Accrued Operating Overheads</td>
                  <td class="text-right font-mono">${formatFinancial(accruedExpenses)}</td>
                </tr>
                <tr style="font-weight: 700; background: #fafafa;">
                  <td>Total Current Liabilities</td>
                  <td class="text-right font-mono">${formatFinancial(totalLiabilities)}</td>
                </tr>
                <tr>
                  <td>Contributed Capital</td>
                  <td class="text-right font-mono">${formatFinancial(totalContributedCapital)}</td>
                </tr>
                <tr>
                  <td>Retained Operating Earnings</td>
                  <td class="text-right font-mono">${formatFinancial(retainedEarnings)}</td>
                </tr>
                <tr>
                  <td>Less: Partner Cumulative Drawings</td>
                  <td class="text-right font-mono" style="color: #dc2626;">(${formatFinancial(cumulativeDrawings)})</td>
                </tr>
                <tr style="font-weight: 800; background: #f8fafc;">
                  <td>Total Liabilities & Partners' Equity</td>
                  <td class="text-right font-mono double-underline">${formatFinancial(totalLiabilitiesAndEquity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h2>Recent Sales Transactions (${periodStr})</h2>
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
            ${rangeMetrics.inRangeTxns.map((t) => `
              <tr>
                <td style="font-weight: 700;">${escapeHtml(t.invoiceId || t.id)}</td>
                <td style="font-weight: 600;">${escapeHtml(t.clientName || "Valued Client")}</td>
                <td>${escapeHtml(t.date)}</td>
                <td>${escapeHtml(t.paymentMethod)}</td>
                <td class="text-right font-mono font-bold">${formatFinancial(t.grandTotal)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangeTxns.length === 0 ? '<tr><td colspan="5" class="text-center" style="color: #94a3b8;">No sales in selected period.</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Operational Expenses Breakdown (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Title / Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangeExps.map((e) => `
              <tr>
                <td><strong>${escapeHtml(e.title)}</strong></td>
                <td>${escapeHtml(e.category)}</td>
                <td>${escapeHtml(e.date)}</td>
                <td>${escapeHtml(e.paymentMethod)}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(e.status)}</span></td>
                <td class="text-right font-mono font-bold" style="color: #dc2626;">-${formatFinancial(e.amountPaid !== undefined && e.amountPaid !== null ? e.amountPaid : e.amount)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangeExps.length === 0 ? '<tr><td colspan="6" class="text-center" style="color: #94a3b8;">No expenses in selected period.</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Product & Stock Purchases (${periodStr})</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor / Order</th>
              <th>Bill #</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="text-right">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${rangeMetrics.inRangePurchases.map((b: any) => `
              <tr>
                <td><strong>${escapeHtml(b.vendorName || "Vendor Bill")}</strong></td>
                <td style="font-family: monospace;">${escapeHtml(b.billNumber || b.id || "Purchase Bill")}</td>
                <td>${escapeHtml(b.date || "")}</td>
                <td>${escapeHtml(b.paymentMethod || "Bank Transfer")}</td>
                <td><span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${escapeHtml(b.paymentStatus || "Paid")}</span></td>
                <td class="text-right font-mono font-bold" style="color: #2563eb;">-${formatFinancial(b.amountPaid || 0)}</td>
              </tr>
            `).join("")}
            ${rangeMetrics.inRangePurchases.length === 0 ? '<tr><td colspan="6" class="text-center" style="color: #94a3b8;">No stock purchases in selected period.</td></tr>' : ""}
          </tbody>
        </table>
      `;
    }

    const signaturesHtml = `
      <div class="signatures">
        <div>
          <div class="sig-line">Prepared By (Finance / POS)</div>
        </div>
        <div>
          <div class="sig-line">Internal Audit Review</div>
        </div>
        <div>
          <div class="sig-line">Director / Managing Partner Approval</div>
        </div>
      </div>
      <div class="footer-note">
        Official Computer-Generated Fiscal Document • ${escapeHtml(displayClinicName)} • Confidential Record
      </div>
    `;

    const fullDocumentHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(displayClinicName)} - ${reportType.toUpperCase()} REPORT (${periodStr})</title>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${htmlBody}
          ${signaturesHtml}
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      alert("Failed to initialize printable document.");
      return;
    }

    doc.write(fullDocumentHtml);
    doc.close();
    iframe.contentWindow?.focus();

    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  return (
    <div className="space-y-6 pb-10">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white transition-all flex items-center gap-2 ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
        >
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

        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full lg:w-auto min-w-0">
          {branches.length > 0 && (
            <select
              value={selectedBranchId || ""}
              onChange={(e) => setSelectedBranchId(e.target.value || null)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm cursor-pointer shrink-0"
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
          <div className="inline-flex shrink-0 max-w-full gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTab("transactions")}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "transactions"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "purchases"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Purchases
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "expenses"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab("equity")}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "equity"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Partner Equity
            </button>
            <button
              onClick={() => setActiveTab("partner-expenses")}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "partner-expenses"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Partner & Admin Expenses
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "reports"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Analytics
            </button>
          </div>

          {activeTab === "expenses" &&
            (role === "admin" || role === "partner") && (
              <Button
                onClick={() => setIsAddExpenseModalOpen(true)}
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                className="shrink-0"
              >
                Add Expense
              </Button>
            )}

          {/* Unified Date Constraints & Dynamic Report Export */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                From:
              </span>
              <FinanceDatePicker
                label="report start date"
                value={reportStartDate}
                onChange={setReportStartDate}
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                To:
              </span>
              <FinanceDatePicker
                label="report end date"
                value={reportEndDate}
                onChange={setReportEndDate}
              />
            </div>

            {/* Quick Date Presets */}
            <div className="hidden sm:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handlePreset("thisMonth")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  isThisMonth
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("lastMonth")}
                className="px-2 py-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("thisYear")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  isThisYear
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                This Year
              </button>
              <button
                type="button"
                onClick={() => handlePreset("allTime")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  isAllTime
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All
              </button>
            </div>

            <Button
              onClick={() => handleExportPDF()}
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              className="shrink-0 font-bold"
            >
              {getPdfButtonLabel()}
            </Button>
          </div>
        </div>
      </div>

      {role === "staff" && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Full ledger records,
            operational overhead details, and executive profit audits are locked
            for Staff accounts. Switch to Admin mode to unlock full controls.
          </span>
        </div>
      )}

      {(role === "admin" || role === "partner") && (
        <>
          {activeTab === "transactions" && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Gross Revenue (POS & Inflow)"
                  value={formatPKR(totalRevenue)}
                  trend={revTrend}
                  trendDirection={revTrendDirection}
                  colorVariant="blue"
                  icon={<DollarSign className="w-5 h-5" />}
                  subtitle={`${new Date().toLocaleString("en-US", { month: "short" })} Rev: ${formatPKR(curMonthRev, { decimals: false })}`}
                />
                <StatCard
                  title="Operational Overheads"
                  value={formatPKR(operationalExpenseAmount)}
                  colorVariant="blue"
                  icon={<CreditCard className="w-5 h-5" />}
                  subtitle="Staff salaries, utilities & clinic overheads"
                />
                <StatCard
                  title={isOperatingProfit ? "Net Operating Profit" : "Net Operating Loss"}
                  value={`${isOperatingProfit ? "+" : "-"}${formatPKR(Math.abs(netOperatingProfit))}`}
                  colorVariant="blue"
                  icon={<TrendingUp className="w-5 h-5" />}
                  subtitle={`Revenue (${formatPKR(totalRevenue, { decimals: false })}) - Overheads (${formatPKR(operationalExpenseAmount, { decimals: false })})`}
                />
                <StatCard
                  title="Net Operating Margin"
                  value={`${netOperatingMargin.toFixed(1)}%`}
                  colorVariant="blue"
                  icon={<TrendingUp className="w-5 h-5" />}
                  subtitle={`Discounts given: ${formatPKR(totalDiscounts, { decimals: false })}`}
                />
              </div>

              {/* Payment Methods Breakdown: Cash, Card, Online */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-blue-500" />
                      Payment Collections by Channel (Cash vs. Card vs. Online)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real-time breakdown of gross revenue collected across
                      front-desk cash, physical card terminals, and online
                      payments.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>Total Inflow:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 text-sm">
                      {formatPKR(totalRevenue)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Cash Card */}
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4" />
                        Cash Collections
                      </span>
                      <Badge variant="primary" size="sm">
                        {cashPct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                        {formatPKR(cashRevenue)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {cashCount} transaction{cashCount !== 1 ? "s" : ""}
                      </span>
                      <span className="font-mono">
                        Avg:{" "}
                        {formatPKR(
                          cashCount > 0
                            ? Math.round(cashRevenue / cashCount)
                            : 0,
                          { decimals: false },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Card / POS Terminals */}
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        Card / POS Swipes
                      </span>
                      <Badge variant="primary" size="sm">
                        {cardPct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="text-2xl font-black font-mono text-blue-900 dark:text-blue-100">
                        {formatPKR(cardRevenue)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-blue-700/80 dark:text-blue-400">
                      <span>
                        {cardCount} transaction{cardCount !== 1 ? "s" : ""}
                      </span>
                      <span className="font-mono">
                        Avg:{" "}
                        {formatPKR(
                          cardCount > 0
                            ? Math.round(cardRevenue / cardCount)
                            : 0,
                          { decimals: false },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Online Payments Card */}
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <Globe className="w-4 h-4" />
                        Online Payments
                      </span>
                      <Badge variant="primary" size="sm">
                        {onlinePct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                        {formatPKR(onlineRevenue)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {onlineCount} transaction{onlineCount !== 1 ? "s" : ""}
                      </span>
                      <span className="font-mono">
                        Avg:{" "}
                        {formatPKR(
                          onlineCount > 0
                            ? Math.round(onlineRevenue / onlineCount)
                            : 0,
                          { decimals: false },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Accounts Receivable / Uncollected Dues Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Uncollected Dues
                      </span>
                      <Badge variant="neutral" size="sm">
                        {duePct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                        {formatPKR(uncollectedDues)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Accounts Receivable</span>
                      <span className="font-mono">
                        {duePct.toFixed(1)}% of Revenue
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multi-segment Progress Distribution Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    <span>Payment Channel Distribution</span>
                    <span>
                      {cashCount + cardCount + onlineCount} Invoices Total
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      style={{ width: `${cashPct}%` }}
                      className="h-full bg-blue-600 transition-all duration-500"
                      title={`Cash: ${cashPct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${cardPct}%` }}
                      className="h-full bg-blue-500 transition-all duration-500"
                      title={`Card: ${cardPct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${onlinePct}%` }}
                      className="h-full bg-sky-400 transition-all duration-500"
                      title={`Online: ${onlinePct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${duePct}%` }}
                      className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                      title={`Receivable Dues: ${duePct.toFixed(1)}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Transactions Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Recent Payment Transactions
                      </h3>
                      <Badge variant={isOperatingProfit ? "success" : "danger"} size="sm">
                        {isOperatingProfit ? "Net Profit" : "Net Loss"}: {isOperatingProfit ? "+" : "-"}{formatPKR(Math.abs(netOperatingProfit))}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Itemized client invoices and settlement history • Operating Net: <span className={`font-semibold font-mono ${isOperatingProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{isOperatingProfit ? "+" : "-"}{formatPKR(Math.abs(netOperatingProfit))}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Payment Channel Filter Tabs: Cash, Card, Online */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        onClick={() => {
                          setTxnMethodFilter("All");
                          setTxnPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${txnMethodFilter === "All"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                      >
                        All ({transactions.length})
                      </button>
                      <button
                        onClick={() => {
                          setTxnMethodFilter("Cash");
                          setTxnPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${txnMethodFilter === "Cash"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                      >
                        Cash ({cashCount})
                      </button>
                      <button
                        onClick={() => {
                          setTxnMethodFilter("Card");
                          setTxnPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${txnMethodFilter === "Card"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                      >
                        Card ({cardCount})
                      </button>
                      <button
                        onClick={() => {
                          setTxnMethodFilter("Online");
                          setTxnPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${txnMethodFilter === "Online"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                      >
                        Online ({onlineCount})
                      </button>
                    </div>

                    <Input
                      placeholder="Search invoice or client..."
                      value={txnSearch}
                      onChange={(e) => {
                        setTxnSearch(e.target.value);
                        setTxnPage(1);
                      }}
                      icon={<Search className="w-4 h-4" />}
                      className="w-full sm:w-60"
                    />
                  </div>
                </div>

                <div className="responsive-table-wrapper">
                  <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 rounded-l-xl">Invoice ID</th>
                        <th className="py-3.5 px-4">Client Name</th>
                        <th className="py-3.5 px-4">Treatments</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Payment Method</th>
                        <th className="py-3.5 px-4">Grand Total</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right rounded-r-xl">
                          Receipt
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {pagedTxns.map((txn) => (
                        <tr
                          key={txn.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
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
                            <Badge variant="primary">{txn.paymentMethod}</Badge>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-slate-100">
                            {formatPKR(txn.grandTotal)}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                (txn.status || "").toLowerCase() ===
                                  "refunded" ||
                                  (txn.status || "").toLowerCase() === "cancelled"
                                  ? "danger"
                                  : (txn.status || "").toLowerCase() ===
                                    "partial" ||
                                    (txn.status || "").toLowerCase() ===
                                    "pending"
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {txn.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {role === "admin" && (
                                <button
                                  onClick={() => {
                                    setSelectedTxn(txn);
                                    setTxnClientName(txn.clientName);
                                    setTxnServiceName(txn.serviceName);
                                    setTxnAmount(txn.amount.toString());
                                    setTxnDiscount(txn.discount.toString());
                                    setTxnGrandTotal(txn.grandTotal.toString());
                                    setTxnDate(txn.date);
                                    setTxnPaymentMethod(
                                      txn.paymentMethod as any,
                                    );
                                    setIsEditTxnModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit Transaction / Receipt"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {(role === "admin" || role === "partner") &&
                                (txn.status || "").toLowerCase() !== "refunded" && (
                                  <button
                                    onClick={() => handleOpenRefundModal(txn)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                    title="Process Sales Return / Refund"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              <button
                                onClick={() =>
                                  setPrintData({
                                    title: `Invoice ${txn.invoiceId}`,
                                    type: "invoice",
                                    data: txn,
                                  })
                                }
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
                <Pagination
                  currentPage={txnPage}
                  totalItems={sortedTxns.length}
                  pageSize={5}
                  onPageChange={setTxnPage}
                  itemLabel="transactions"
                />
              </div>
            </div>
          )}

          {activeTab === "purchases" && <PurchasesTab />}

          {activeTab === "equity" && <PartnerEquityTab />}

          {activeTab === "partner-expenses" && <PartnerExpensesTab />}

          {activeTab === "expenses" && (
            <div className="space-y-6">
              {/* Overview Metric Cards: Operational vs Purchases */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Operational Expenses
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                      {formatPKR(operationalExpenseAmount)}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Clinic overheads, salaries, rent & utilities
                    </p>
                  </div>
                  <div className="mt-3">
                    <Badge variant="primary" size="sm">
                      {filteredExpenses.length} Active Operational Entries
                    </Badge>
                  </div>
                </div>

                <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Purchases (Product Procurement)
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-blue-100 font-mono mt-1">
                      {formatPKR(purchaseExpenseAmount)}
                    </h2>
                    <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">
                      Separated vendor orders, stock & medicine inventory
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge variant="info" size="sm">
                      {purchaseBills.length} Purchase Bills
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setActiveTab("purchases")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Purchases Tab →
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Combined Clinic Outflow
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                      {formatPKR(totalExpenseAmount)}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Total Operational Expenses + Purchases
                    </p>
                  </div>
                  <div className="mt-3">
                    <Badge variant="neutral" size="sm">
                      Net Operating Outflow
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <Input
                  placeholder="Search operational expenses by title, staff, or notes..."
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
                      {expStatusOptions.find((o) => o.value === expStatusFilter)
                        ?.label || "All Statuses & Dues"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>

                  <Select
                    options={[
                      { label: "All Categories", value: "All" },
                      { label: "Salary", value: "Salary" },
                      { label: "Electric Bill", value: "Electric Bill" },
                      { label: "Water Bill", value: "Water Bill" },
                      { label: "Rent", value: "Rent" },
                      { label: "Machines", value: "Machines" },
                      { label: "Marketing", value: "Marketing" },
                      { label: "Other", value: "Other" },
                    ]}
                    value={expCategoryFilter}
                    onChange={(e) => setExpCategoryFilter(e.target.value)}
                    className="w-full sm:w-44"
                  />
                </div>
              </div>

              {/* Expenses Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="responsive-table-wrapper">
                  <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 rounded-l-xl">
                          Expense Title
                        </th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Added By / Paid By</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Payment Terms</th>
                        <th className="py-3.5 px-4">Amount & Dues</th>
                        <th className="py-3.5 px-4 text-right rounded-r-xl">
                          Actions & Audit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {pagedExpenses.map((exp) => {
                        const actual = exp.actualAmount ?? exp.amount;
                        const paid =
                          exp.amountPaid ??
                          (exp.status === "Paid" ? actual : 0);
                        const remaining =
                          exp.remainingAmount ??
                          (exp.status === "Paid" ? 0 : actual);
                        const hasRemaining = remaining > 0;

                        const isVendorExpense = !!(
                          exp.vendorName ||
                          exp.paymentType
                        );
                        const approvals = exp.deletionApprovals || [];
                        const totalApprovers = Math.max(1, partners.length + 1);
                        const activeUser = userEmail || role || "Admin/Partner";
                        const hasCurrentUserApproved =
                          approvals.includes(activeUser);

                        return (
                          <tr
                            key={exp.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {exp.title}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {exp.notes || "Operational expense"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="primary">{exp.category}</Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                {formatUserName(exp.addedBy, staff)}
                              </div>
                              {exp.paidBy &&
                                formatUserName(exp.paidBy, staff) !==
                                formatUserName(exp.addedBy, staff) && (
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
                                  Paid: {formatPKR(paid)} • Due:{" "}
                                  {formatPKR(remaining)}
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Fully Paid ({formatPKR(paid)})
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                <Badge
                                  variant={
                                    exp.status === "Paid"
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {exp.status === "Paid"
                                    ? "Paid"
                                    : "Pending / Credit"}
                                </Badge>

                                {(exp.status === "Pending" || hasRemaining) && (
                                  <button
                                    onClick={() => {
                                      setSelectedPayExp(exp);
                                      setPayType("Full");
                                      setPayAmountInput(remaining.toString());
                                      setPayMethod("Cash");
                                      setPayNotes("");
                                      setIsPayModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
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
                                      <Badge
                                        variant="danger"
                                        title={`Approved by: ${approvals.join(", ")}`}
                                      >
                                        Deletion Pending ({approvals.length}/
                                        {totalApprovers})
                                      </Badge>
                                    )}
                                    {role !== "partner" && (
                                      <button
                                        onClick={() =>
                                          handleDeleteExpenseClick(exp)
                                        }
                                        disabled={hasCurrentUserApproved}
                                        className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all flex items-center gap-1 ${hasCurrentUserApproved
                                            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                            : "bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer"
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
                                    )}
                                  </>
                                ) : role !== "partner" ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedExp(exp);
                                        setEditExpTitle(exp.title);
                                        setEditExpCategory(exp.category);
                                        setEditExpAmount(exp.amount.toString());
                                        setEditExpPaymentMethod(
                                          exp.paymentMethod,
                                        );
                                        setEditExpNotes(exp.notes || "");
                                        setEditExpDate(exp.date);
                                        setEditExpStatus(exp.status);
                                        setEditExpPaidBy(exp.paidBy || "");
                                        setIsEditExpModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                                      title="Edit Expense"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteExpenseClick(exp)
                                      }
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                      title="Delete Expense"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={expPage}
                  totalItems={filteredExpenses.length}
                  pageSize={5}
                  onPageChange={setExpPage}
                  itemLabel="expenses"
                />
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Reports Navigation Tabs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {reportTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveReport(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeReport === tab
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                    >
                      {tab} Report
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Report Visual Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Executive Analytics & Audits
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {activeReport} Audit & Trajectory
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {activeReport === "Profit" && "Real-time operating profit, overhead outflows, and profit margins for selected date range."}
                      {activeReport === "Expense" && "Cash outflows across operating overheads and inventory purchases for selected date range."}
                      {activeReport === "Revenue" && "Gross collections, payment tender breakdowns, and billing receipts for selected date range."}
                      {activeReport === "Audit" && "Balance sheet status, receivables, payables, and period ledger audit."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                      Period: {formatDateDisplay(reportStartDate)} – {formatDateDisplay(reportEndDate)}
                    </span>
                    <Button
                      onClick={() => handleExportPDF(activeReport.toLowerCase() as any)}
                      variant="secondary"
                      size="sm"
                      icon={<Printer className="w-4 h-4" />}
                    >
                      Print {activeReport} PDF
                    </Button>
                  </div>
                </div>

                {/* 1. SEPARATE PROFIT REPORT: Graph, KPIs, and Monthly Table */}
                {activeReport === "Profit" && (
                  <div className="space-y-6">
                    {/* Top Profit KPI Cards (Date-Constrained) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Collected Revenue
                        </span>
                        <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">
                          {formatPKR(rangeMetrics.rangeTotalCollected)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Invoiced: {formatPKR(rangeMetrics.rangeGrossInvoiced, { decimals: false })}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Operating Overheads
                        </span>
                        <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                          -{formatPKR(rangeMetrics.rangeOpExp)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Salaries, rent & utilities in range
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Net Operating Profit
                        </span>
                        <span className={`text-xl font-bold font-mono mt-1 block ${rangeMetrics.rangeNetProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {rangeMetrics.rangeNetProfit >= 0 ? "+" : "-"}{formatPKR(Math.abs(rangeMetrics.rangeNetProfit))}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Surplus in selected period
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Operating Margin
                        </span>
                        <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                          {rangeMetrics.rangeMargin.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Profit / collected revenue
                        </span>
                      </div>
                    </div>

                    {/* Monthly Profit Visual Graph */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Monthly Profit & Revenue Trajectory (2026)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Comparative monthly visual of gross inflow, operational expenses, and net profit.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" /> Revenue
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> Overheads
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Net Profit
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-80 pt-2">
                        {isClientMounted ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={monthlyAnalyticsData}
                              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.2} />
                              <XAxis
                                dataKey="monthName"
                                stroke="#64748B"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                              />
                              <YAxis
                                stroke="#64748B"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickFormatter={(v) => formatPKRCompact(v)}
                              />
                              <RechartsTooltip
                                formatter={(value: any, name: any) => [formatPKR(Number(value)), name]}
                                contentStyle={{
                                  backgroundColor: "#0F172A",
                                  borderRadius: "12px",
                                  border: "none",
                                  color: "#FFF",
                                  fontSize: "12px",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                                }}
                                labelStyle={{ fontWeight: "bold", color: "#94A3B8", marginBottom: "4px" }}
                              />
                              <Bar
                                dataKey="revenue"
                                name="Gross Revenue"
                                fill="#3B82F6"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                              <Bar
                                dataKey="opExpenses"
                                name="Operating Overheads"
                                fill="#F43F5E"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                              <Bar
                                dataKey="netProfit"
                                name="Net Operating Profit"
                                fill="#10B981"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/40 rounded-xl">
                            <span className="text-xs text-slate-400">Loading Profit Chart...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Monthly Profit Ledger Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          Monthly Operating Profit & Margin Ledger (2026)
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          12-Month Fiscal Breakdown
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Month</th>
                              <th className="py-3 px-4 text-right">Gross Inflow (PKR)</th>
                              <th className="py-3 px-4 text-right">Operating Overheads (PKR)</th>
                              <th className="py-3 px-4 text-right">Net Operating Profit (PKR)</th>
                              <th className="py-3 px-4 text-right">Margin (%)</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                            {monthlyAnalyticsData.map((row) => {
                              const isPos = row.netProfit > 0;
                              const isZero = row.netProfit === 0 && row.revenue === 0 && row.opExpenses === 0;
                              return (
                                <tr key={row.monthIndex} className={row.hasActivity ? "bg-blue-50/20 dark:bg-blue-950/10" : ""}>
                                  <td className="py-3 px-4 font-bold flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${row.hasActivity ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                                    {row.fullMonthName}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                                    {formatPKR(row.revenue)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                                    {row.opExpenses > 0 ? `-${formatPKR(row.opExpenses)}` : formatPKR(0)}
                                  </td>
                                  <td className={`py-3 px-4 text-right font-mono font-black ${isPos ? "text-emerald-600 dark:text-emerald-400" : row.netProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                                    {isPos ? `+${formatPKR(row.netProfit)}` : row.netProfit < 0 ? `-${formatPKR(Math.abs(row.netProfit))}` : formatPKR(0)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-semibold">
                                    {row.revenue > 0 ? `${row.margin.toFixed(1)}%` : "0.0%"}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {isZero ? (
                                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">No Activity</span>
                                    ) : isPos ? (
                                      <Badge variant="success" size="sm">Profitable</Badge>
                                    ) : row.netProfit === 0 ? (
                                      <Badge variant="warning" size="sm">Break-Even</Badge>
                                    ) : (
                                      <Badge variant="danger" size="sm">Deficit</Badge>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-800/80">
                            <tr>
                              <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                Annual Fiscal Total
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                                {formatPKR(totalRevenue)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                -{formatPKR(operationalExpenseAmount)}
                              </td>
                              <td className={`py-3.5 px-4 text-right font-mono font-black ${isOperatingProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {isOperatingProfit ? `+${formatPKR(netOperatingProfit)}` : `-${formatPKR(Math.abs(netOperatingProfit))}`}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                                {netOperatingMargin.toFixed(1)}%
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Badge variant={isOperatingProfit ? "success" : "danger"} size="sm">
                                  {isOperatingProfit ? "Net Profit" : "Net Deficit"}
                                </Badge>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SEPARATE EXPENSE REPORT: Graph, KPIs, Monthly Table, and Category Table */}
                {activeReport === "Expense" && (
                  <div className="space-y-6">
                    {/* Top Expense KPI Cards (Date-Constrained) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Operational Overheads
                        </span>
                        <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                          {formatPKR(rangeMetrics.rangeOpExp)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Salaries, utilities, rent in range
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Stock & Product Purchases
                        </span>
                        <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">
                          {formatPKR(rangeMetrics.rangePurchExp)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Vendor inventory procurement
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Combined Outflow
                        </span>
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                          {formatPKR(rangeMetrics.rangeTotalExp)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          All period operational + stock outlays
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Expense Records
                        </span>
                        <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                          {rangeMetrics.inRangeExps.length + rangeMetrics.inRangePurchases.length} Records
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Entries in selected date range
                        </span>
                      </div>
                    </div>

                    {/* Monthly Expense Visual Graph */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-rose-500" />
                            Monthly Expense Distribution (2026)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Breakdown of operational overheads vs. inventory stock purchases month by month.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-xs bg-indigo-500 inline-block" /> Operating Overheads
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-xs bg-sky-500 inline-block" /> Stock Purchases
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> Total Outflow
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-80 pt-2">
                        {isClientMounted ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={monthlyAnalyticsData}
                              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.2} />
                              <XAxis
                                dataKey="monthName"
                                stroke="#64748B"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                              />
                              <YAxis
                                stroke="#64748B"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickFormatter={(v) => formatPKRCompact(v)}
                              />
                              <RechartsTooltip
                                formatter={(value: any, name: any) => [formatPKR(Number(value)), name]}
                                contentStyle={{
                                  backgroundColor: "#0F172A",
                                  borderRadius: "12px",
                                  border: "none",
                                  color: "#FFF",
                                  fontSize: "12px",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                                }}
                                labelStyle={{ fontWeight: "bold", color: "#94A3B8", marginBottom: "4px" }}
                              />
                              <Bar
                                dataKey="opExpenses"
                                name="Operating Overheads"
                                fill="#6366F1"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                              <Bar
                                dataKey="purchExpenses"
                                name="Stock Purchases"
                                fill="#0EA5E9"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                              <Bar
                                dataKey="totalExpenses"
                                name="Total Outflow"
                                fill="#F43F5E"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/40 rounded-xl">
                            <span className="text-xs text-slate-400">Loading Expense Chart...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Monthly Expense Ledger Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-rose-500" />
                          Monthly Expense Ledger (2026)
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          12-Month Outflow Breakdown
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Month</th>
                              <th className="py-3 px-4 text-right">Operating Overheads</th>
                              <th className="py-3 px-4 text-right">Stock Purchases</th>
                              <th className="py-3 px-4 text-right">Total Outflow (PKR)</th>
                              <th className="py-3 px-4">Top Cost Driver</th>
                              <th className="py-3 px-4 text-right">Annual Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                            {monthlyAnalyticsData.map((row) => {
                              const sharePct = totalExpenseAmount > 0 ? (row.totalExpenses / totalExpenseAmount) * 100 : 0;
                              return (
                                <tr key={row.monthIndex} className={row.hasActivity ? "bg-rose-50/20 dark:bg-rose-950/10" : ""}>
                                  <td className="py-3 px-4 font-bold flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${row.hasActivity ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                                    {row.fullMonthName}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                    {row.opExpenses > 0 ? formatPKR(row.opExpenses) : "Rs 0.00"}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                                    {row.purchExpenses > 0 ? formatPKR(row.purchExpenses) : "Rs 0.00"}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                    {row.totalExpenses > 0 ? `-${formatPKR(row.totalExpenses)}` : "Rs 0.00"}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                                    {row.topCategory !== "None" ? row.topCategory : <span className="text-slate-400 italic">No Outflow</span>}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-semibold">
                                    {sharePct > 0 ? `${sharePct.toFixed(1)}%` : "0.0%"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-800/80">
                            <tr>
                              <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                Annual Fiscal Total
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                                {formatPKR(operationalExpenseAmount)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                                {formatPKR(purchaseExpenseAmount)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                -{formatPKR(totalExpenseAmount)}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 font-semibold text-xs">
                                All Active Categories
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                                100.0%
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Category Breakdown Table */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-500" />
                          Category-Wise Operating Outflow Breakdown
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          Annual Category Distribution
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                            <tr>
                              <th className="py-2.5 px-4">Expense Category</th>
                              <th className="py-2.5 px-4 text-right">Total Outflow (PKR)</th>
                              <th className="py-2.5 px-4 text-right">Share of Overheads</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                            {[
                              "Salary",
                              "Electric Bill",
                              "Water Bill",
                              "Rent",
                              "Machines",
                              "Marketing",
                              "Other",
                            ].map((cat) => {
                              const catExps = rangeMetrics.inRangeExps.filter((e) => {
                                const c = (e.category || "").toLowerCase();
                                const target = cat.toLowerCase();
                                return c === target && !e.id?.startsWith("EXP-PUR-");
                              });
                              const amt = catExps.reduce((sum, e) => {
                                const actual = e.actualAmount ?? e.amount ?? 0;
                                let paid = 0;
                                if (e.paymentLogs && Array.isArray(e.paymentLogs) && e.paymentLogs.length > 0) {
                                  paid = e.paymentLogs.reduce((acc: number, l: any) => acc + (Number(l?.amount) || 0), 0);
                                } else if (e.amountPaid !== undefined && e.amountPaid !== null) {
                                  paid = Number(e.amountPaid) || 0;
                                } else if ((e.status || "").toLowerCase() === "paid") {
                                  paid = actual;
                                }
                                if (paid <= 0 && (e.status || "").toLowerCase() !== "paid") return sum;
                                return sum + (paid > 0 ? paid : actual);
                              }, 0);
                              const pct = rangeMetrics.rangeOpExp > 0 ? (amt / rangeMetrics.rangeOpExp) * 100 : 0;
                              return (
                                <tr key={cat}>
                                  <td className="py-2.5 px-4 font-bold flex items-center justify-between">
                                    <span>{cat}</span>
                                    {pct > 0 && (
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        {catExps.length} entries
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-bold">
                                    {amt > 0 ? `-${formatPKR(amt)}` : "Rs 0.00"}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                                    {pct > 0 ? `${pct.toFixed(1)}%` : "0.0%"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="border-t border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm">
                            <tr className="bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                              <td className="py-2.5 px-4 flex items-center justify-between">
                                <span>Purchases (Product & Stock Orders)</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("purchases")}
                                  className="text-[11px] underline font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
                                >
                                  View in Purchases →
                                </button>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                -{formatPKR(rangeMetrics.rangePurchExp)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-blue-600">
                                Separate Stock Ledger
                              </td>
                            </tr>
                            <tr className="bg-slate-100/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100">
                              <td className="py-2.5 px-4 font-black">Total Combined Outflow (Operational + Purchases)</td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-rose-600">
                                -{formatPKR(rangeMetrics.rangeTotalExp)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black">
                                100.0%
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SEPARATE REVENUE REPORT: Graph, KPIs, and Channel Breakdown */}
                {activeReport === "Revenue" && (
                  <div className="space-y-6">
                    {/* Top Revenue KPI Cards (Date-Constrained) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Gross Invoiced Revenue
                        </span>
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                          {formatPKR(rangeMetrics.rangeGrossInvoiced)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Invoiced before discount subtractions
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Discounts Granted
                        </span>
                        <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
                          -{formatPKR(rangeMetrics.rangeTotalDisc)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Promotional price adjustments
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Net Collected Revenue
                        </span>
                        <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
                          {formatPKR(rangeMetrics.rangeTotalCollected)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Actual collections (Sales + Debt Settled)
                        </span>
                      </div>
                    </div>

                    {/* Monthly Revenue Inflow Graph */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-blue-500" />
                            Monthly Revenue Inflow Trajectory (2026)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Monthly cash receipts and POS collections throughout the fiscal year.
                          </p>
                        </div>
                      </div>

                      <div className="w-full h-72 pt-2">
                        {isClientMounted ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={monthlyAnalyticsData}
                              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.2} />
                              <XAxis
                                dataKey="monthName"
                                stroke="#64748B"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                              />
                              <YAxis
                                stroke="#64748B"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickFormatter={(v) => formatPKRCompact(v)}
                              />
                              <RechartsTooltip
                                formatter={(value: any) => [formatPKR(Number(value)), "Revenue"]}
                                contentStyle={{
                                  backgroundColor: "#0F172A",
                                  borderRadius: "12px",
                                  border: "none",
                                  color: "#FFF",
                                  fontSize: "12px",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                                }}
                                labelStyle={{ fontWeight: "bold", color: "#94A3B8", marginBottom: "4px" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#revenueGradient)"
                                name="Revenue"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/40 rounded-xl">
                            <span className="text-xs text-slate-400">Loading Revenue Chart...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Channel Breakdown Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-500" />
                          Collections by Payment Method (Cash, Card, Online)
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          Channel Audit
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                            <tr>
                              <th className="py-2.5 px-4">Payment Channel</th>
                              <th className="py-2.5 px-4">Destination Account</th>
                              <th className="py-2.5 px-4 text-center">Invoices</th>
                              <th className="py-2.5 px-4 text-right">Total Collected (PKR)</th>
                              <th className="py-2.5 px-4 text-right">Revenue Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                            <tr>
                              <td className="py-3 px-4 font-bold flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                Cash Collections
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px]">
                                Front Desk Cash Drawer (#1010)
                              </td>
                              <td className="py-3 px-4 text-center font-mono">
                                {rangeMetrics.rangeCashCount}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatPKR(rangeMetrics.rangeCashRev)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold">
                                {rangeMetrics.rangeCashPct.toFixed(1)}%
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 px-4 font-bold flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                Card / POS Terminals
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px]">
                                Merchant POS Terminal (#1020)
                              </td>
                              <td className="py-3 px-4 text-center font-mono">
                                {rangeMetrics.rangeCardCount}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {formatPKR(rangeMetrics.rangeCardRev)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold">
                                {rangeMetrics.rangeCardPct.toFixed(1)}%
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 px-4 font-bold flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                                Online Payments
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px]">
                                Digital Checkout & Gateways
                              </td>
                              <td className="py-3 px-4 text-center font-mono">
                                {rangeMetrics.rangeOnlineCount}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {formatPKR(rangeMetrics.rangeOnlineRev)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold">
                                {rangeMetrics.rangeOnlinePct.toFixed(1)}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. AUDIT REPORT: Balance Sheet, Receivables, Payables, Period Inflows & Outflows */}
                {activeReport === "Audit" && (
                  <div className="space-y-6">
                    {/* Top Audit KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Realized Period Inflow
                        </span>
                        <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                          {formatPKR(rangeMetrics.rangeTotalCollected)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Sales + debt settlements collected
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Period Outflow
                        </span>
                        <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                          -{formatPKR(rangeMetrics.rangeTotalExp)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Overheads ({formatPKR(rangeMetrics.rangeOpExp, { decimals: false })}) + Stock ({formatPKR(rangeMetrics.rangePurchExp, { decimals: false })})
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Net Period Cash Flow
                        </span>
                        <span className={`text-xl font-bold font-mono mt-1 block ${rangeMetrics.rangeCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {rangeMetrics.rangeCashFlow >= 0 ? "+" : "-"}{formatPKR(Math.abs(rangeMetrics.rangeCashFlow))}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Realized surplus after all disbursements
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Receivables & Payables
                        </span>
                        <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                          AR: {formatPKR(rangeMetrics.rangeUncollected, { decimals: false })}
                        </span>
                        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                          AP (Vendor Dues): {formatPKR(rangeMetrics.rangePurchDue, { decimals: false })}
                        </span>
                      </div>
                    </div>

                    {/* Executive Balance Sheet Snapshot */}
                    <div className="p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-500" />
                            Balance Sheet & Solvency Status (As of {formatDateDisplay(reportEndDate)})
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Snapshot of liquid assets, accounts receivable, vendor obligations, and net equity.
                          </p>
                        </div>
                        <Button
                          onClick={() => handleExportPDF("audit")}
                          variant="secondary"
                          size="sm"
                          icon={<Printer className="w-3.5 h-3.5" />}
                        >
                          Print Audit PDF
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Current Assets */}
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] block border-b border-slate-100 dark:border-slate-800 pb-2">
                            Current Assets
                          </span>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 dark:text-slate-400">Cash & Bank Collections (Period Inflow)</span>
                            <span className="font-mono font-bold text-emerald-600">{formatPKR(rangeMetrics.rangeTotalCollected)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 dark:text-slate-400">Accounts Receivable (Uncollected Client Dues)</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(rangeMetrics.rangeUncollected)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 dark:text-slate-400">Total Active Clients in Ledger</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{clients.length} Clients</span>
                          </div>
                        </div>

                        {/* Current Liabilities & Equity */}
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] block border-b border-slate-100 dark:border-slate-800 pb-2">
                            Liabilities & Net Capital
                          </span>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 dark:text-slate-400">Accounts Payable (Vendor Procurement Dues)</span>
                            <span className="font-mono font-bold text-amber-600">{formatPKR(rangeMetrics.rangePurchDue)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 dark:text-slate-400">Total Operating Disbursements</span>
                            <span className="font-mono font-bold text-rose-600">-{formatPKR(rangeMetrics.rangeTotalExp)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 dark:text-slate-400">Net Retained Operating Surplus</span>
                            <span className={`font-mono font-bold ${rangeMetrics.rangeNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {rangeMetrics.rangeNetProfit >= 0 ? "+" : "-"}{formatPKR(Math.abs(rangeMetrics.rangeNetProfit))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Period Activity Audit Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Audited Period Ledger Entries ({rangeMetrics.inRangeTxns.length} Invoices, {rangeMetrics.inRangeExps.length} Overheads, {rangeMetrics.inRangePurchases.length} Purchase Bills)
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatDateDisplay(reportStartDate)} – {formatDateDisplay(reportEndDate)}
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                            <tr>
                              <th className="py-2.5 px-4">Date</th>
                              <th className="py-2.5 px-4">Audit Classification</th>
                              <th className="py-2.5 px-4">Entity / Description</th>
                              <th className="py-2.5 px-4 text-center">Status</th>
                              <th className="py-2.5 px-4 text-right">Inflow (PKR)</th>
                              <th className="py-2.5 px-4 text-right">Outflow (PKR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                            {rangeMetrics.inRangeTxns.slice(0, 10).map((t) => (
                              <tr key={t.id}>
                                <td className="py-2.5 px-4 font-mono text-[11px]">{t.date}</td>
                                <td className="py-2.5 px-4">
                                  <Badge variant="primary" size="sm">Client Sale</Badge>
                                </td>
                                <td className="py-2.5 px-4 font-semibold">{t.clientName} - {t.serviceName}</td>
                                <td className="py-2.5 px-4 text-center">
                                  <Badge variant="success" size="sm">{t.status || "Paid"}</Badge>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                                  +{formatPKR(t.amountPaid ?? t.grandTotal ?? 0)}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                              </tr>
                            ))}
                            {rangeMetrics.inRangeExps.slice(0, 5).map((e) => (
                              <tr key={e.id}>
                                <td className="py-2.5 px-4 font-mono text-[11px]">{e.date}</td>
                                <td className="py-2.5 px-4">
                                  <Badge variant="neutral" size="sm">Overhead Exp</Badge>
                                </td>
                                <td className="py-2.5 px-4 font-semibold">{e.title} ({e.category})</td>
                                <td className="py-2.5 px-4 text-center">
                                  <Badge variant="neutral" size="sm">{e.status || "Paid"}</Badge>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                                  -{formatPKR(e.actualAmount ?? e.amount ?? 0)}
                                </td>
                              </tr>
                            ))}
                            {rangeMetrics.inRangePurchases.slice(0, 5).map((b: any) => (
                              <tr key={b.id}>
                                <td className="py-2.5 px-4 font-mono text-[11px]">{b.date}</td>
                                <td className="py-2.5 px-4">
                                  <Badge variant="warning" size="sm">Stock Purchase</Badge>
                                </td>
                                <td className="py-2.5 px-4 font-semibold">{b.vendorName || "Vendor"} ({b.billNumber || b.id})</td>
                                <td className="py-2.5 px-4 text-center">
                                  <Badge variant="warning" size="sm">{b.paymentStatus || "Paid"}</Badge>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                                  -{formatPKR(b.amountPaid || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span>Buying product inventory or clinic stock?</span>
            <button
              type="button"
              onClick={() => {
                setIsAddExpenseModalOpen(false);
                setActiveTab("purchases");
              }}
              className="font-bold underline hover:text-blue-800 dark:hover:text-blue-200 ml-2 shrink-0 cursor-pointer"
            >
              Use Purchases Tab →
            </button>
          </div>

          <Input
            label="Expense Title"
            placeholder="e.g. Clinic Cleaning Supplies, Courier, Tea & Refreshments"
            value={expTitle}
            onChange={(e) => setExpTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { label: "Salary", value: "Salary" },
                { label: "Electric Bill", value: "Electric Bill" },
                { label: "Water Bill", value: "Water Bill" },
                { label: "Rent", value: "Rent" },
                { label: "Machines", value: "Machines" },
                { label: "Marketing", value: "Marketing" },
                { label: "Other", value: "Other" },
              ]}
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as any)}
            />
            <Input
              label="Amount (Rs)"
              type="text"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Paid By (Partner / Admin)"
              options={
                partnerOptions.length > 0
                  ? partnerOptions
                  : [{ label: "Loading Partners...", value: "" }]
              }
              value={expPaidBy}
              onChange={(e) => setExpPaidBy(e.target.value)}
            />

            <Select
              label="Payment Method"
              options={[
                { label: "Bank Transfer", value: "Bank Transfer" },
                { label: "Card", value: "Card" },
                { label: "Cash", value: "Cash" },
                { label: "Cheque", value: "Cheque" },
              ]}
              value={expPaymentMethod}
              onChange={(e) => setExpPaymentMethod(e.target.value as any)}
            />
          </div>

          <Input
            label="Notes / Vendor Details"
            placeholder="Supplier reference or invoice notes..."
            value={expNotes}
            onChange={(e) => setExpNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddExpenseModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Expense Entry"}
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
            placeholder="e.g. Clinic Cleaning Supplies, Courier, Tea & Refreshments"
            value={editExpTitle}
            onChange={(e) => setEditExpTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { label: "Salary", value: "Salary" },
                { label: "Electric Bill", value: "Electric Bill" },
                { label: "Water Bill", value: "Water Bill" },
                { label: "Rent", value: "Rent" },
                { label: "Machines", value: "Machines" },
                { label: "Marketing", value: "Marketing" },
                { label: "Other", value: "Other" },
              ]}
              value={editExpCategory}
              onChange={(e) => setEditExpCategory(e.target.value as any)}
            />
            <Input
              label="Amount (Rs)"
              type="text"
              value={editExpAmount}
              onChange={(e) =>
                setEditExpAmount(e.target.value.replace(/\D/g, ""))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              options={[
                { label: "Bank Transfer", value: "Bank Transfer" },
                { label: "Card", value: "Card" },
                { label: "Cash", value: "Cash" },
                { label: "Cheque", value: "Cheque" },
              ]}
              value={editExpPaymentMethod}
              onChange={(e) => setEditExpPaymentMethod(e.target.value as any)}
            />
            <Select
              label="Status"
              options={[
                { label: "Paid", value: "Paid" },
                { label: "Pending", value: "Pending" },
              ]}
              value={editExpStatus}
              onChange={(e) => setEditExpStatus(e.target.value as any)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Paid By (Partner / Admin)"
              options={
                partnerOptions.length > 0
                  ? partnerOptions
                  : [{ label: "Loading Partners...", value: "" }]
              }
              value={editExpPaidBy}
              onChange={(e) => setEditExpPaidBy(e.target.value)}
            />
            <Input
              label="Date"
              type="date"
              value={editExpDate}
              onChange={(e) => setEditExpDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Notes / Vendor Details"
            placeholder="Supplier reference or invoice notes..."
            value={editExpNotes}
            onChange={(e) => setEditExpNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditExpModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
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
                const val = e.target.value.replace(/\D/g, "");
                setTxnAmount(val);
                setTxnGrandTotal(
                  (Number(val) - Number(txnDiscount)).toString(),
                );
              }}
              required
            />
            <Input
              label="Discount (Rs)"
              type="text"
              value={txnDiscount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
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
                { label: "Cash", value: "Cash" },
                { label: "Card", value: "Card" },
                { label: "Online", value: "Online" },
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditTxnModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Full / Partial Vendor Due Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Pay Vendor Dues (Full or Partial)"
        description={
          selectedPayExp
            ? `Expense: ${selectedPayExp.title} — Current Remaining Due: ${formatPKR(selectedPayExp.remainingAmount ?? selectedPayExp.amount)}`
            : ""
        }
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
                  setPayType("Full");
                  if (selectedPayExp) {
                    const rem =
                      selectedPayExp.remainingAmount ?? selectedPayExp.amount;
                    setPayAmountInput(rem.toString());
                  }
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${payType === "Full"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
              >
                Full Payment
              </button>
              <button
                type="button"
                onClick={() => setPayType("Partial")}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${payType === "Partial"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
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
              disabled={payType === "Full"}
              onChange={(e) =>
                setPayAmountInput(e.target.value.replace(/\D/g, ""))
              }
              required
            />
            <Select
              label="Payment Method"
              options={[
                { label: "Cash", value: "Cash" },
                { label: "Bank Transfer", value: "Bank Transfer" },
                { label: "Card", value: "Card" },
                { label: "Cheque", value: "Cheque" },
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
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {userEmail || role || "Admin/Partner"}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Confirming..." : "Confirm Payment & Update Logs"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Logs History Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="Payment Audit Logs & Installment Details"
        description={
          selectedLogsExp
            ? `Full payment trail for ${selectedLogsExp.title}`
            : ""
        }
        maxWidth="lg"
      >
        <div className="space-y-4">
          {selectedLogsExp && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Actual Total
                </span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {formatPKR(
                    selectedLogsExp.actualAmount ?? selectedLogsExp.amount,
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Total Paid
                </span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {formatPKR(
                    selectedLogsExp.amountPaid ??
                    (selectedLogsExp.status === "Paid"
                      ? selectedLogsExp.amount
                      : 0),
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Remaining Balance
                </span>
                <span className="font-mono font-bold text-sm text-amber-600">
                  {formatPKR(
                    selectedLogsExp.remainingAmount ??
                    (selectedLogsExp.status === "Paid"
                      ? 0
                      : selectedLogsExp.amount),
                  )}
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
                {selectedLogsExp?.paymentLogs &&
                  selectedLogsExp.paymentLogs.length > 0 ? (
                  selectedLogsExp.paymentLogs.map((log: any, idx: number) => (
                    <tr
                      key={log.id || idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {log.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                        {formatPKR(log.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {formatUserName(log.paidBy, staff)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {log.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {log.notes || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-slate-400 italic"
                    >
                      No payment logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogsModalOpen(false)}
            >
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
        {selectedDeleteExp &&
          (() => {
            const isVendor = !!(
              selectedDeleteExp.vendorName ||
              selectedDeleteExp.paymentType ||
              selectedDeleteExp.category === "Products"
            );
            const approvals = selectedDeleteExp.deletionApprovals || [];
            const totalApprovers = Math.max(1, partners.length + 1);
            const activeUser = userEmail || role || "Admin/Partner";
            const hasCurrentUserApproved = approvals.includes(activeUser);

            return (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                    <h4 className="font-bold text-sm">
                      {isVendor
                        ? "Multi-Approval Deletion Required"
                        : "Delete Standard Expense"}
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
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">
                      Expense Title
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {selectedDeleteExp.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">
                      Category
                    </span>
                    <Badge variant="primary">
                      {selectedDeleteExp.category}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">
                      Amount
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatPKR(
                        selectedDeleteExp.actualAmount ??
                        selectedDeleteExp.amount,
                      )}
                    </span>
                  </div>
                  {isVendor && (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 font-semibold uppercase text-[10px]">
                          Approval Progress
                        </span>
                        <Badge
                          variant={
                            approvals.length + 1 >= totalApprovers
                              ? "success"
                              : "warning"
                          }
                        >
                          {approvals.length} / {totalApprovers} Approved
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold uppercase text-[10px]">
                          Your Status
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {hasCurrentUserApproved
                            ? " Already Approved"
                            : " Pending Your Approval"}
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
                      ? "Processing..."
                      : isVendor
                        ? hasCurrentUserApproved
                          ? "Re-submit Approval Request"
                          : `Approve & ${approvals.length + 1 >= totalApprovers ? "Permanently Delete" : "Record Approval"}`
                        : "Confirm Permanent Deletion"}
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
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium",
                  )}
                >
                  <span className="text-sm">{opt.label}</span>
                  <div
                    className={clsx(
                      "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-colors",
                      isSelected
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-300 dark:border-slate-600 bg-transparent",
                    )}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Sales Return / Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setSelectedRefundTxn(null);
        }}
        title="Sales Return & Item Refund"
        description={
          selectedRefundTxn
            ? `Invoice ${selectedRefundTxn.invoiceId} • ${selectedRefundTxn.clientName} (Total: ${formatPKR(selectedRefundTxn.grandTotal)})`
            : undefined
        }
        maxWidth="lg"
      >
        {selectedRefundTxn && (
          <form onSubmit={handleConfirmRefund} className="space-y-4 pt-1">
            {refundError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {refundError}
              </div>
            )}

            {/* Scope Switcher: Return Specific Items vs Return Entire Order */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Return Option
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRefundMode("item")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${refundMode === "item"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-600"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Return Specific Item(s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefundMode("full");
                    const allSel: { [index: number]: boolean } = {};
                    const allQ: { [index: number]: number } = {};
                    getTxnItems(selectedRefundTxn).forEach((it: any, idx: number) => {
                      if (!it.refunded) {
                        allSel[idx] = true;
                        allQ[idx] = it.quantity || 1;
                      }
                    });
                    setSelectedRefundItems(allSel);
                    setRefundItemQuantities(allQ);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${refundMode === "full"
                      ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm border border-slate-200/60 dark:border-slate-600"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return Entire Order</span>
                </button>
              </div>
            </div>

            {/* Item Selection List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span>Select Item(s) Being Returned</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSel: { [index: number]: boolean } = {};
                      getTxnItems(selectedRefundTxn).forEach((it: any, idx: number) => {
                        if (!it.refunded) allSel[idx] = true;
                      });
                      setSelectedRefundItems(allSel);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRefundItems({})}
                    className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                {getTxnItems(selectedRefundTxn).map((item: any, idx: number) => {
                  const isChecked = !!selectedRefundItems[idx];
                  const isAlreadyRefunded = !!item.refunded;
                  const maxQty = item.quantity || 1;
                  const currentQty = refundItemQuantities[idx] ?? maxQty;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${isAlreadyRefunded
                          ? "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                          : isChecked
                            ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 shadow-xs"
                            : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            disabled={isAlreadyRefunded}
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedRefundItems((prev) => ({ ...prev, [idx]: e.target.checked }));
                            }}
                            className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span>{item.name}</span>
                              {item.isProduct ? (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Product
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Treatment
                                </span>
                              )}
                              {isAlreadyRefunded && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                  Already Refunded
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                              Sold: {maxQty} × {formatPKR(item.price)}
                            </div>
                          </div>
                        </label>

                        {/* Quantity to return controller */}
                        {!isAlreadyRefunded && isChecked && maxQty > 1 && (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Qty to Return:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundItemQuantities((prev) => ({
                                  ...prev,
                                  [idx]: Math.max(1, (prev[idx] || maxQty) - 1),
                                }));
                              }}
                              className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs hover:bg-slate-200"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-xs px-1 text-slate-800 dark:text-slate-200">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundItemQuantities((prev) => ({
                                  ...prev,
                                  [idx]: Math.min(maxQty, (prev[idx] || maxQty) + 1),
                                }));
                              }}
                              className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs hover:bg-slate-200"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                            {formatPKR((item.price || 0) * (isChecked ? currentQty : maxQty))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculated Refund Summary Card */}
            <div className="p-3.5 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {refundCalculation.isFullOrderReturn ? "Full Order Return" : "Partial Return Summary"}
                </span>
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                  {refundCalculation.selectedCount} item(s) selected
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1 border-t border-red-100 dark:border-red-900/30">
                <span className="text-xs text-slate-600 dark:text-slate-400">Amount to Refund to Client:</span>
                <span className="text-base font-mono font-black text-red-600 dark:text-red-400">
                  {formatPKR(refundCalculation.estimatedRefundAmount)}
                </span>
              </div>
              {!refundCalculation.isFullOrderReturn && refundCalculation.selectedCount > 0 && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>Retained Balance on Invoice:</span>
                  <span className="font-mono font-semibold">
                    {formatPKR(Math.max(0, (selectedRefundTxn.grandTotal || 0) - refundCalculation.estimatedRefundAmount))}
                  </span>
                </div>
              )}
            </div>

            <Input
              label="Return / Refund Reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Client returned 1 product, allergic reaction, service adjustment"
              required
            />

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={refundRestock}
                onChange={(e) => setRefundRestock(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>Restock returned product(s) back into inventory</span>
            </label>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRefundModalOpen(false);
                  setSelectedRefundTxn(null);
                }}
                disabled={isRefunding}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={isRefunding || refundCalculation.selectedCount === 0 || !refundReason.trim()}
              >
                {isRefunding
                  ? "Processing Return..."
                  : refundCalculation.isFullOrderReturn
                    ? `Refund Full Order (${formatPKR(refundCalculation.estimatedRefundAmount)})`
                    : `Process Return (${formatPKR(refundCalculation.estimatedRefundAmount)})`}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
