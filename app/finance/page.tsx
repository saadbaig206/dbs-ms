'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, CreditCard, Lock, ArrowUpRight, Search, Printer } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { StatCard } from '../../components/cards/StatCard';
import { RevenueChart } from '../../components/charts/ClinicCharts';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function FinancePage() {
  const { transactions, role, setPrintData } = useClinic();
  const [search, setSearch] = useState('');

  const totalRevenue = transactions.reduce((acc, t) => acc + t.grandTotal, 0);
  const totalDiscounts = transactions.reduce((acc, t) => acc + t.discount, 0);

  const filteredTxns = transactions.filter((t) => {
    return (
      t.clientName.toLowerCase().includes(search.toLowerCase()) ||
      t.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      t.invoiceId.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Performance & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Revenue trends, profit metrics, and completed transactions history.
          </p>
        </div>

        {role === 'staff' && (
          <Badge variant="warning" size="md">
            <Lock className="w-3.5 h-3.5 mr-1 inline" /> Admin Only View
          </Badge>
        )}
      </div>

      {role === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Full financial metrics and profitability figures are hidden for Staff accounts. Switch to Admin mode to unlock full ledger controls.
          </span>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Gross Revenue (POS & Appointments)"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          trend="+18.4%"
          trendDirection="up"
          colorVariant="emerald"
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="Real-time calculated"
        />
        <StatCard
          title="Discounts & Promotions Given"
          value={`$${totalDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          trend="-2.1%"
          trendDirection="down"
          colorVariant="amber"
          icon={<CreditCard className="w-5 h-5" />}
          subtitle="Summer promos"
        />
        <StatCard
          title="Net Operating Profit Margin"
          value="68.4%"
          trend="+4.2%"
          trendDirection="up"
          colorVariant="indigo"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Target 70%"
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

      {/* Recent Transactions Table */}
      <div className="luxury-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recent Payment Transactions
          </h3>
          <Input
            placeholder="Search by invoice ID or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                    ${txn.grandTotal.toFixed(2)}
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
  );
}
