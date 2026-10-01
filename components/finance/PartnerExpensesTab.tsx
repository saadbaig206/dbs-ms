"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Check,
} from "lucide-react";
import { useClinic } from "../../lib/context/ClinicContext";
import { formatPKR } from "../../lib/utils/currency";
import { StatCard } from "../../components/cards/StatCard";
import { Badge } from "../../components/ui/Badge";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { PartnerEquityReportItem } from "../../lib/types/clinic";

export function PartnerExpensesTab() {
  const { expenses = [], purchaseBills = [], partnerEquity, refreshPartnerEquity, updateExpense, role } = useClinic();
  const equityPartners = partnerEquity?.partners || [];

  // Always refresh partner equity when mounting this tab
  useEffect(() => {
    refreshPartnerEquity();
  }, []);

  // Filter States
  const [selectedPayer, setSelectedPayer] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "this-month" | "last-30" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reassigningExpId, setReassigningExpId] = useState<string | null>(null);

  // Dynamic Payer Matching: every penny belongs to the partner who paid it out of pocket
  const matchPartner = (paidBy?: string): PartnerEquityReportItem | null => {
    if (!paidBy || !paidBy.trim()) return null;
    const lower = paidBy.toLowerCase().trim();
    if (["cash", "clinic cash", "clinic drawer", "drawer cash", "common clinic operating", "clinic account", "company account", "petty cash", "none"].includes(lower)) {
      return null;
    }
    const clean = lower.replace(/[^a-z0-9]/g, "");
    if (!clean) return null;

    if (clean.includes("sheraz")) {
      const sheraz = equityPartners.find(p => p.partnerName.toLowerCase().includes("sheraz"));
      if (sheraz) return sheraz;
    }
    if (clean.includes("drzaini") || clean.includes("zaini")) {
      const zaini = equityPartners.find(p => p.partnerName.toLowerCase().includes("zaini"));
      if (zaini) return zaini;
    }

    for (const p of equityPartners) {
      const pClean = p.partnerName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (pClean && (clean === pClean || pClean.includes(clean) || clean.includes(pClean))) {
        return p;
      }
    }
    return null;
  };

  // Compile all paid disbursements (Expenses + Vendor Bill partial/full logs)
  const unifiedExpenses = useMemo(() => {
    const list: Array<{
      id: string;
      rawExpenseId?: string;
      title: string;
      category: string;
      vendorName?: string;
      amount: number;
      date: string;
      paidBy: string;
      matchedPartner: PartnerEquityReportItem | null;
      isSettledShared: boolean;
      paymentMethod: string;
      status: string;
      notes?: string;
      source: "expense" | "vendor_bill";
    }> = [];

    // 1. Regular Clinic Operating Expenses
    expenses.forEach((exp) => {
      if (
        exp.category === ("Partner Drawing" as any) ||
        (exp.title && exp.title.toLowerCase().includes("partner drawing")) ||
        exp.category === ("Inventory Purchase" as any) ||
        exp.category === ("Products" as any) ||
        exp.id?.startsWith("EXP-PUR-") ||
        (exp.title && exp.title.toLowerCase().includes("vendor bill payment"))
      ) {
        return;
      }

      if (exp.paymentLogs && exp.paymentLogs.length > 0) {
        exp.paymentLogs.forEach((log) => {
          const matched = matchPartner(log.paidBy || exp.paidBy);
          list.push({
            id: `${exp.id}-${log.id}`,
            rawExpenseId: exp.id,
            title: exp.title,
            category: exp.category,
            vendorName: exp.vendorName,
            amount: log.amount,
            date: log.date || exp.date,
            paidBy: log.paidBy || exp.paidBy || "Common Clinic Operating",
            matchedPartner: matched,
            isSettledShared: matched === null,
            paymentMethod: log.paymentMethod || exp.paymentMethod || "Cash",
            status: exp.status,
            notes: log.notes || exp.notes,
            source: "expense",
          });
        });
      } else {
        const amt = (exp.status || "").toLowerCase() === "paid"
          ? (exp.amountPaid ?? exp.amount)
          : (exp.amountPaid || 0);
        if (amt <= 0) return;

        const matched = matchPartner(exp.paidBy);
        list.push({
          id: exp.id,
          rawExpenseId: exp.id,
          title: exp.title,
          category: exp.category,
          vendorName: exp.vendorName,
          amount: amt,
          date: exp.date,
          paidBy: exp.paidBy || "Common Clinic Operating",
          matchedPartner: matched,
          isSettledShared: matched === null,
          paymentMethod: exp.paymentMethod || "Cash",
          status: exp.status,
          notes: exp.notes,
          source: "expense",
        });
      }
    });

    // 2. Partner Seed Capital Investments (e.g. Sheraz Rs 50,000)
    equityPartners.forEach((p) => {
      const initInv = p.seedInvestment !== undefined ? p.seedInvestment : (p.partnerName.toLowerCase().includes("sheraz") ? 50000 : 0);
      if (initInv > 0) {
        list.push({
          id: `CAP-INV-${p.id}`,
          rawExpenseId: `CAP-INV-${p.id}`,
          title: `Partner Capital Investment - ${p.partnerName}`,
          category: "Capital Investment",
          vendorName: "Partner Capital Contribution",
          amount: initInv,
          date: "2026-08-01",
          paidBy: p.partnerName,
          matchedPartner: p,
          isSettledShared: false,
          paymentMethod: "Bank Transfer",
          status: "Paid",
          notes: `Equity seed capital investment paid by ${p.partnerName}`,
          source: "expense",
        });
      }
    });

    // 3. Purchase Bills Contributions (Full settlements or partial payment logs)
    purchaseBills.forEach((bill) => {
      if (bill.paymentLogs && bill.paymentLogs.length > 0) {
        bill.paymentLogs.forEach((log) => {
          const logAmt = Number(log.amount) || 0;
          if (logAmt <= 0) return;
          const payer = log.paidBy || (log as any).paid_by || bill.paidBy || bill.createdBy || "Common Clinic Operating";
          const matched = matchPartner(payer);
          list.push({
            id: `${bill.id}-${log.id}`,
            rawExpenseId: bill.id,
            title: `Purchase: ${bill.vendorName} (${bill.billNumber || bill.id})`,
            category: "Purchases (Product Stock)",
            vendorName: bill.vendorName,
            amount: logAmt,
            date: log.date || bill.date,
            paidBy: payer,
            matchedPartner: matched,
            isSettledShared: matched === null,
            paymentMethod: log.paymentMethod || bill.paymentMethod || "Bank Transfer",
            status: "Paid",
            notes: log.notes || bill.notes || `Stock purchase payment for ${bill.vendorName}`,
            source: "vendor_bill",
          });
        });
      } else {
        const amt = (bill.paymentStatus || "").toLowerCase() === "paid"
          ? (bill.amountPaid ?? bill.totalAmount)
          : (bill.amountPaid || 0);
        if (amt <= 0) return;
        const payer = bill.paidBy || bill.createdBy || "Common Clinic Operating";
        const matched = matchPartner(payer);
        list.push({
          id: `${bill.id}-PAY`,
          rawExpenseId: bill.id,
          title: `Purchase: ${bill.vendorName} (${bill.billNumber || bill.id})`,
          category: "Purchases (Product Stock)",
          vendorName: bill.vendorName,
          amount: amt,
          date: bill.date,
          paidBy: payer,
          matchedPartner: matched,
          isSettledShared: matched === null,
          paymentMethod: bill.paymentMethod || "Bank Transfer",
          status: bill.paymentStatus || "Paid",
          notes: bill.notes || `Stock purchase payment for ${bill.vendorName}`,
          source: "vendor_bill",
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, purchaseBills, equityPartners]);

  // Aggregate Partner Metrics: strictly direct expenses paid by each partner
  const partnerSummaries = useMemo(() => {
    let totalAll = 0;
    const directTotals: { [partnerId: string]: { partner: PartnerEquityReportItem; directAmount: number; count: number } } = {};

    equityPartners.forEach((p) => {
      directTotals[p.id] = { partner: p, directAmount: 0, count: 0 };
    });

    unifiedExpenses.forEach((item) => {
      totalAll += item.amount;
      if (item.matchedPartner && directTotals[item.matchedPartner.id]) {
        directTotals[item.matchedPartner.id].directAmount += item.amount;
        directTotals[item.matchedPartner.id].count += 1;
      }
    });

    return equityPartners.map((p) => {
      const direct = directTotals[p.id]?.directAmount || 0;
      const count = directTotals[p.id]?.count || 0;
      const pct = totalAll > 0 ? ((direct / totalAll) * 100).toFixed(1) : "0";

      return {
        partner: p,
        direct,
        totalContributed: direct,
        count,
        pct,
      };
    });
  }, [unifiedExpenses, equityPartners]);

  const totalClinicExpenses = useMemo(() => {
    return unifiedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [unifiedExpenses]);

  // Aggregate Clinic Direct (Common operating expenses not paid out of pocket by a partner)
  const clinicDirectSummary = useMemo(() => {
    let amount = 0;
    let count = 0;
    unifiedExpenses.forEach((item) => {
      if (!item.matchedPartner) {
        amount += item.amount;
        count += 1;
      }
    });
    const pct = totalClinicExpenses > 0 ? ((amount / totalClinicExpenses) * 100).toFixed(1) : "0";
    return { amount, count, pct };
  }, [unifiedExpenses, totalClinicExpenses]);

  // Filtered dataset
  const filteredList = useMemo(() => {
    const today = new Date();
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return unifiedExpenses.filter((item) => {
      // Payer filter: strictly filter by selected partner or clinic-direct
      if (selectedPayer !== "all") {
        if (selectedPayer === "clinic-direct") {
          if (item.matchedPartner !== null) return false;
        } else if (item.matchedPartner?.id !== selectedPayer) {
          return false;
        }
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
        const matchesPartner = (item.matchedPartner?.partnerName || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesVendor && !matchesCategory && !matchesNotes && !matchesPaidBy && !matchesPartner) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedExpenses, selectedPayer, selectedCategory, dateFilter, startDate, endDate, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredList]);

  // Category breakdown
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

  // Top vendors & payees
  const vendorBreakdown = useMemo(() => {
    const map: { [key: string]: { vendor: string; amount: number; count: number } } = {};
    filteredList.forEach((item) => {
      const v = item.vendorName || (item.category === "Salary" ? "Staff Salaries" : item.category === "Rent" ? "Clinic Landlord" : "Operational Direct");
      if (!map[v]) {
        map[v] = { vendor: v, amount: 0, count: 0 };
      }
      map[v].amount += item.amount;
      map[v].count += 1;
    });

    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [filteredList]);

  // Quick reassign of a common expense to a specific partner
  const handleAssignExpenseToPartner = async (rawExpId: string, partnerName: string) => {
    try {
      await updateExpense(rawExpId, { paidBy: partnerName });
      await refreshPartnerEquity();
      setReassigningExpId(null);
    } catch (err: any) {
      console.error("Failed to reassign expense:", err);
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ["Date", "Title", "Category", "Vendor/Payee", "Amount (PKR)", "Attribution / Paid By", "Method", "Notes"];
    const rows = filteredList.map((item) => [
      `"${item.date}"`,
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${(item.category || "").replace(/"/g, '""')}"`,
      `"${(item.vendorName || "").replace(/"/g, '""')}"`,
      item.amount,
      `"${item.matchedPartner ? item.matchedPartner.partnerName : (item.paidBy && item.paidBy !== "Common Clinic Operating" ? item.paidBy : "Dr. Zaini")}"`,
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

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Partner Expenses & Direct Disbursements
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              Direct Partner Expenses
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Detailed breakdown of clinic expenses and vendor payments directly attributed to each paying partner. Direct expenses are credited to the partner who paid them.
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

      {/* Dynamic KPI Cards: Total Clinic Expenses + One Card per Active Partner + Clinic Direct */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clinic Expenses */}
        <StatCard
          title="Total Outflow & Capital"
          value={formatPKR(totalClinicExpenses)}
          colorVariant="blue"
          icon={<Receipt className="w-5 h-5 text-blue-500" />}
          subtitle={`${unifiedExpenses.length} disbursements & capital investments logged`}
        />

        {/* Dynamic Card for Each Active Partner (NO HARDCODING) */}
        {partnerSummaries.map(({ partner, direct, count, pct }, idx) => {
          const colors = [
            { bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300", accent: "text-blue-600 dark:text-blue-400" },
            { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", accent: "text-emerald-600 dark:text-emerald-400" },
            { bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300", accent: "text-purple-600 dark:text-purple-400" },
            { bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", accent: "text-amber-600 dark:text-amber-400" },
          ];
          const color = colors[idx % colors.length];

          return (
            <div
              key={partner.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    {partner.partnerName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${color.bg}`}>
                    {pct}% of Total
                  </span>
                </div>

                <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                  {formatPKR(direct)}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatPKR(direct)} direct invested & paid
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <span>{count} direct logs</span>
                <button
                  onClick={() => setSelectedPayer(selectedPayer === partner.id ? "all" : partner.id)}
                  className={`${color.accent} font-bold hover:underline cursor-pointer`}
                >
                  {selectedPayer === partner.id ? "Showing Filtered ✓" : `Filter ${partner.partnerName} →`}
                </button>
              </div>
            </div>
          );
        })}

      </div>

      {/* Dynamic Filter and Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Dynamic Payer Toggle Buttons */}
          <div className="inline-flex max-w-full gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setSelectedPayer("all")}
              className={`px-3 py-1.5 rounded-lg transition ${selectedPayer === "all"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              All Expenses ({unifiedExpenses.length})
            </button>
            {equityPartners.map((p) => {
              const summary = partnerSummaries.find((s) => s.partner.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPayer(p.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${selectedPayer === p.id
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                >
                  {p.partnerName} ({summary?.count || 0})
                </button>
              );
            })}
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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${dateFilter === p.id
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
              { label: "All Categories", value: "all" },
              { label: "Purchases (Product Stock)", value: "Purchases (Product Stock)" },
              { label: "Capital Investment", value: "Capital Investment" },
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

        <div className="responsive-table-wrapper">
          <table className="w-full min-w-[720px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Date</th>
                <th className="p-3.5">Expense Title / Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Vendor / Payee</th>
                <th className="p-3.5">Attributed To</th>
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.category === "Capital Investment"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : item.category === "Purchases (Product Stock)"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {item.vendorName || "—"}
                    </td>
                    <td className="p-3.5">
                      {item.matchedPartner ? (
                        <Badge variant="primary">
                          {item.matchedPartner.partnerName}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.paidBy && item.paidBy !== "Common Clinic Operating" ? item.paidBy : "Dr. Zaini"}
                          </span>
                          {item.rawExpenseId && (role === "admin" || role === "partner") && (
                            <div className="relative inline-block">
                              {reassigningExpId === item.rawExpenseId ? (
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border shadow-lg z-10">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAssignExpenseToPartner(item.rawExpenseId!, e.target.value);
                                      }
                                    }}
                                    defaultValue=""
                                    className="text-[10px] p-1 border rounded bg-transparent"
                                  >
                                    <option value="" disabled>Assign to...</option>
                                    {equityPartners.map((p) => (
                                      <option key={p.id} value={p.partnerName}>{p.partnerName}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => setReassigningExpId(null)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 px-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReassigningExpId(item.rawExpenseId!)}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                  title="Assign directly to a specific partner if paid out-of-pocket"
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
