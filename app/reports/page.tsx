'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, FileSpreadsheet, Lock, Printer, Sparkles } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { RevenueChart, AppointmentsChart, ServiceDistributionChart, ExpenseBreakdownChart } from '../../components/charts/ClinicCharts';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function ReportsPage() {
  const { role } = useClinic();
  const [activeReport, setActiveReport] = useState<
    'Revenue' | 'Expense' | 'Profit' | 'Salary' | 'Attendance' | 'Inventory' | 'Client' | 'Service'
  >('Revenue');

  const reportTabs = [
    'Revenue',
    'Expense',
    'Profit',
    'Salary',
    'Attendance',
    'Inventory',
    'Client',
    'Service'
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Executive Analytics & Reports Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual reports for clinic revenue, profitability, inventory utilization, and practitioner outputs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
            Download PDF Report
          </Button>
        </div>
      </div>

      {role === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Executive financial and salary reports are restricted to Clinic Administrators.
          </span>
        </div>
      )}

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
              {activeReport} Audit & Breakdown Report (2026)
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

        {(activeReport === 'Attendance' || activeReport === 'Salary') && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Practitioner attendance timeliness and treatment output volume distribution.
            </p>
            <AppointmentsChart />
          </div>
        )}

        {(activeReport === 'Service' || activeReport === 'Client' || activeReport === 'Inventory') && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Share of treatment popularity and inventory utilization across key clinic categories.
            </p>
            <ServiceDistributionChart />
          </div>
        )}
      </div>
    </div>
  );
}
