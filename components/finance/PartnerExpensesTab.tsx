"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Wallet,
  Building2,
  TrendingDown,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  PieChart,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { useClinic } from "../../lib/context/ClinicContext";
import { formatPKR } from "../../lib/utils/currency";
import { StatCard } from "../../components/cards/StatCard";
import { Badge } from "../../components/ui/Badge";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ExpenseItem } from "../../lib/types/clinic";

export function PartnerExpensesTab() {
  const { expenses = [], purchaseBills = [], partnerEquity, role } = useClinic();
  const equityPartners = partnerEquity?.partners || [];

  // Filter States
  const [selectedPayer, setSelectedPayer] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "this-month" | "last-30" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Normalizer for payer identity
  const classifyPayer = (paidBy?: string): string => {
    if (!paidBy || !paidBy.trim()) return "Admin / Clinic Account";
    const clean = paidBy.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.includes("zaini")) return "Dr. Zaini";
    if (clean.includes("sheraz")) return "Sheraz";
    
    // Check against any other dynamically registered partners
    for (const p of equityPartners) {
      const pClean = p.partnerName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.includes(pClean) || pClean.includes(clean)) {
        return p.partnerName;
      }
    }
    return paidBy.trim();
  };

  // Compile all paid disbursements (Expenses + Vendor Bill partial/full logs)
  const unifiedExpenses = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: string;
      vendorName?: string;
      amount: number;
      date: string;
      paidBy: string;
      standardPayer: string;
      paymentMethod: string;
      status: string;
      notes?: string;
      source: "expense" | "vendor_bill";
    }> = [];

    // 1. Regular Clinic Expenses
    expenses.forEach((exp) => {
      // Exclude partner drawings if any are marked as expense
      if (exp.category === ("Partner Drawing" as any) || (exp.title && exp.title.toLowerCase().includes("partner drawing"))) {
        return;
      }

      // If expense has payment logs, break them down, otherwise use the top-level expense
      if (exp.paymentLogs && exp.paymentLogs.length > 0) {
        exp.paymentLogs.forEach((log) => {
          list.push({
            id: `${exp.id}-${log.id}`,
            title: exp.title,
            category: exp.category,
            vendorName: exp.vendorName,
            amount: log.amount,
            date: log.date || exp.date,
            paidBy: log.paidBy || exp.paidBy || "Admin / Clinic",
            standardPayer: classifyPayer(log.paidBy || exp.paidBy),
            paymentMethod: log.paymentMethod || exp.paymentMethod || "Cash",
            status: exp.status,
            notes: log.notes || exp.notes,
            source: "expense",
          });
        });
      } else {
        list.push({
          id: exp.id,
          title: exp.title,
          category: exp.category,
          vendorName: exp.vendorName,
          amount: exp.amountPaid ?? exp.amount,
          date: exp.date,
          paidBy: exp.paidBy || "Admin / Clinic",
          standardPayer: classifyPayer(exp.paidBy),
          paymentMethod: exp.paymentMethod || "Cash",
          status: exp.status,
          notes: exp.notes,
          source: "expense",
        });
      }
    });

    // 2. Vendor Purchase Bills that might not have mirrored into expenses or had separate payment logs
    purchaseBills.forEach((bill) => {
      if (bill.paymentLogs && bill.paymentLogs.length > 0) {
        bill.paymentLogs.forEach((log) => {
          // Prevent exact duplicate if this log is already linked to an expense item
          const isAlreadyInList = list.some(
            (item) =>
              item.date === log.date &&
              item.amount === log.amount &&
              item.vendorName === bill.vendorName
          );
          if (!isAlreadyInList) {
            list.push({
              id: `${bill.id}-${log.id}`,
              title: `Vendor Bill: ${bill.billNumber || bill.vendorName}`,
              category: "Inventory Purchase",
              vendorName: bill.vendorName,
              amount: log.amount,
              date: log.date,
              paidBy: log.paidBy || bill.paidBy || "Admin / Clinic",
              standardPayer: classifyPayer(log.paidBy || bill.paidBy),
              paymentMethod: log.paymentMethod || "Bank Transfer",
              status: bill.paymentStatus,
              notes: log.notes || bill.notes,
              source: "vendor_bill",
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, purchaseBills, partnerEquity]);

  // Aggregate KPI metrics across all disbursements
  const kpis = useMemo(() => {
    let totalAll = 0;
    let totalZaini = 0;
    let totalSheraz = 0;
    let totalAdminOther = 0;

    let countZaini = 0;
    let countSheraz = 0;
    let countAdminOther = 0;

    unifiedExpenses.forEach((item) => {
      totalAll += item.amount;
      if (item.standardPayer === "Dr. Zaini") {
        totalZaini += item.amount;
        countZaini++;
      } else if (item.standardPayer === "Sheraz") {
        totalSheraz += item.amount;
        countSheraz++;
      } else {
        totalAdminOther += item.amount;
        countAdminOther++;
      }
    });

    return {
      totalAll,
      totalZaini,
      totalSheraz,
      totalAdminOther,
      countZaini,
      countSheraz,
      countAdminOther,
      zainiPct: totalAll > 0 ? ((totalZaini / totalAll) * 100).toFixed(1) : "0",
      sherazPct: totalAll > 0 ? ((totalSheraz / totalAll) * 100).toFixed(1) : "0",
      adminPct: totalAll > 0 ? ((totalAdminOther / totalAll) * 100).toFixed(1) : "0",
    };
  }, [unifiedExpenses]);

  // Filtered dataset according to user selection
  const filteredList = useMemo(() => {
    const today = new Date();
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return unifiedExpenses.filter((item) => {
      // Payer filter
      if (selectedPayer !== "all") {
        if (selectedPayer === "Dr. Zaini" && item.standardPayer !== "Dr. Zaini") return false;
        if (selectedPayer === "Sheraz" && item.standardPayer !== "Sheraz") return false;
        if (selectedPayer === "Admin / Clinic" && item.standardPayer === "Dr. Zaini") return false;
        if (selectedPayer === "Admin / Clinic" && item.standardPayer === "Sheraz") return false;
      }

      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Date preset filter
      if (dateFilter === "this-month" && !item.date.startsWith(currentMonthPrefix)) {
        return false;
      }
      if (dateFilter === "last-30") {
        const itemDate = new Date(item.date);
        if (itemDate < thirtyDaysAgo) return false;
      }
      if (dateFilter === "custom") {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
      }

      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesVendor = (item.vendorName || "").toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesNotes = (item.notes || "").toLowerCase().includes(q);
        const matchesPaidBy = item.paidBy.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVendor && !matchesCategory && !matchesNotes && !matchesPaidBy) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedExpenses, selectedPayer, selectedCategory, dateFilter, startDate, endDate, searchQuery]);

  // Total amount of currently filtered records
  const filteredTotal = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredList]);

  // Breakdown of "Where the money went" (by Category)
  const categoryBreakdown = useMemo(() => {
    const map: { [key: string]: { category: string; amount: number; count: number } } = {};
    filteredList.forEach((item) => {
      const cat = item.category || "Other";
      if (!map[cat]) {
        map[cat] = { category: cat, amount: 0, count: 0 };
      }
      map[cat].amount += item.amount;
      map[cat].count += 1;
    });

    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredList]);

  // Breakdown of "Who received the money" (by Vendor / Payee)
  const vendorBreakdown = useMemo(() => {
    const map: { [key: string]: { vendor: string; amount: number; count: number } } = {};
    filteredList.forEach((item) => {
      const v = item.vendorName || (item.category === "Salary" ? "Staff Salaries" : item.category === "Rent" ? "Clinic Landlord" : "Direct Expense");
      if (!map[v]) {
        map[v] = { vendor: v, amount: 0, count: 0 };
      }
      map[v].amount += item.amount;
      map[v].count += 1;
    });

    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [filteredList]);

  // Export filtered expenses to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ["Date", "Title", "Category", "Vendor/Payee", "Amount (PKR)", "Paid By", "Payment Method", "Notes"];
    const rows = filteredList.map((item) => [
      `"${item.date}"`,
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${(item.category || "").replace(/"/g, '""')}"`,
      `"${(item.vendorName || "").replace(/"/g, '""')}"`,
      item.amount,
      `"${item.paidBy}"`,
      `"${item.paymentMethod}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `partner_expenses_breakdown_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPayerBadgeVariant = (standardPayer: string) => {
    if (standardPayer === "Dr. Zaini") return "primary";
    if (standardPayer === "Sheraz") return "success";
    return "neutral";
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Partner & Admin Expense Breakdown
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Live Audit
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Detailed breakdown of every clinic expense and vendor bill payment made by each partner or admin. Tracks exactly who paid how much, where the funds were allocated, and provides transparent capital investment accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export Breakdown (.CSV)
          </Button>
        </div>
      </div>

      {/* KPI Cards: Who Paid What */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clinic Expenses"
          value={formatPKR(kpis.totalAll)}
          colorVariant="blue"
          icon={<Receipt className="w-5 h-5 text-blue-500" />}
          subtitle={`${unifiedExpenses.length} total expense entries logged`}
        />

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Paid by Dr. Zaini
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              {kpis.zainiPct}% of total
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            {formatPKR(kpis.totalZaini)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{kpis.countZaini} payments logged</span>
            <button
              onClick={() => setSelectedPayer("Dr. Zaini")}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Filter Dr. Zaini →
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Paid by Sheraz
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              {kpis.sherazPct}% of total
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            {formatPKR(kpis.totalSheraz)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{kpis.countSheraz} payments logged</span>
            <button
              onClick={() => setSelectedPayer("Sheraz")}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Filter Sheraz →
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Admin & Clinic Account
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {kpis.adminPct}% of total
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            {formatPKR(kpis.totalAdminOther)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{kpis.countAdminOther} operations payments</span>
            <button
              onClick={() => setSelectedPayer("Admin / Clinic")}
              className="text-slate-600 dark:text-slate-400 font-bold hover:underline"
            >
              Filter Admin →
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Payer Toggle Buttons */}
          <div className="inline-flex max-w-full gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setSelectedPayer("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPayer === "all"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Payers ({unifiedExpenses.length})
            </button>
            <button
              onClick={() => setSelectedPayer("Dr. Zaini")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPayer === "Dr. Zaini"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Dr. Zaini ({kpis.countZaini})
            </button>
            <button
              onClick={() => setSelectedPayer("Sheraz")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPayer === "Sheraz"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Sheraz ({kpis.countSheraz})
            </button>
            <button
              onClick={() => setSelectedPayer("Admin / Clinic")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPayer === "Admin / Clinic"
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Admin / Clinic ({kpis.countAdminOther})
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-400 text-[11px] mr-1">Period:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "this-month", label: "This Month" },
              { id: "last-30", label: "Last 30 Days" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  dateFilter === p.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Controls: Category, Search, Custom Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Input
            placeholder="Search by title, vendor, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            options={[
              { label: "All Expense Categories", value: "all" },
              { label: "Inventory Purchase / Vendor Bill", value: "Inventory Purchase" },
              { label: "Products", value: "Products" },
              { label: "Salary", value: "Salary" },
              { label: "Rent", value: "Rent" },
              { label: "Electric Bill", value: "Electric Bill" },
              { label: "Water Bill", value: "Water Bill" },
              { label: "Machines", value: "Machines" },
              { label: "Marketing", value: "Marketing" },
              { label: "Other", value: "Other" },
            ]}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          />

          {dateFilter === "custom" && (
            <>
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}

          {dateFilter !== "custom" && (
            <div className="hidden md:flex items-center justify-end text-xs text-slate-500 font-medium">
              Filtered Total: <strong className="ml-1 text-slate-900 dark:text-slate-100 font-mono">{formatPKR(filteredTotal)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Section: "Where Did It Go?" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Allocation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500" />
              Category Breakdown (Where the money went)
            </h3>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
              {categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No expenses in this filter range.</div>
            ) : (
              categoryBreakdown.map((cat) => {
                const pct = filteredTotal > 0 ? (cat.amount / filteredTotal) * 100 : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cat.category}</span>
                        <span className="text-[10px] text-slate-400">({cat.count} items)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatPKR(cat.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Vendors & Recipients */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Top Vendors & Recipients Paid
            </h3>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
              Top Recipients
            </span>
          </div>

          <div className="space-y-2.5">
            {vendorBreakdown.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No vendor transactions found.</div>
            ) : (
              vendorBreakdown.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{v.vendor}</div>
                      <div className="text-[10px] text-slate-400">{v.count} payments issued</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatPKR(v.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Itemized Transaction Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Itemized Payment Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredList.length} expenses totalling <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(filteredTotal)}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Date</th>
                <th className="p-3.5">Expense Title / Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Vendor / Payee</th>
                <th className="p-3.5">Paid By</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5 text-right pr-4">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No expense or billing records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 pl-4 text-slate-500 font-mono whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                      {item.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.notes}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {item.vendorName || "—"}
                    </td>
                    <td className="p-3.5">
                      <Badge variant={getPayerBadgeVariant(item.standardPayer)}>
                        {item.paidBy || item.standardPayer}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {item.paymentMethod}
                    </td>
                    <td className="p-3.5 text-right pr-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatPKR(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700 text-xs">
                  <td colSpan={6} className="p-3.5 pl-4 text-right uppercase tracking-wider text-[11px] text-slate-500">
                    Filtered Total:
                  </td>
                  <td className="p-3.5 text-right pr-4 font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                    {formatPKR(filteredTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
