'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  UserCheck,
  AlertTriangle,
  CreditCard,
  Sparkles,
  ArrowRight,
  Plus,
  Printer,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { StatCard } from '../../components/cards/StatCard';
import { RevenueChart, AppointmentsChart, ServiceDistributionChart, ExpenseBreakdownChart } from '../../components/charts/ClinicCharts';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function DashboardPage() {
  const { appointments, clients, staff, inventory, role, setPrintData } = useClinic();

  const lowStockCount = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Clinic Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time performance analytics, revenue insights, and today's schedule for Aura Luxury Clinic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pos">
            <Button variant="primary" icon={<CreditCard className="w-4 h-4" />}>
              Open POS Billing
            </Button>
          </Link>
          <Link href="/bookings">
            <Button variant="outline" icon={<Plus className="w-4 h-4" />}>
              New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* 10 KPI Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Today's Revenue"
          value="$8,450.00"
          trend="+18.4%"
          trendDirection="up"
          colorVariant="blue"
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="vs yesterday"
        />
        <StatCard
          title="Monthly Revenue"
          value="$112,000.00"
          trend="+12.5%"
          trendDirection="up"
          colorVariant="emerald"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="August 2026"
        />
        <StatCard
          title="Total Revenue"
          value="$784,500.00"
          trend="+24.1%"
          trendDirection="up"
          colorVariant="indigo"
          icon={<Sparkles className="w-5 h-5" />}
          subtitle="All-time gross"
        />
        <StatCard
          title="Total Profit"
          value="$75,000.00"
          trend="+9.2%"
          trendDirection="up"
          colorVariant="purple"
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="Net after expense"
        />
        <StatCard
          title="Total Expenses"
          value="$37,000.00"
          trend="-3.5%"
          trendDirection="down"
          colorVariant="rose"
          icon={<CreditCard className="w-5 h-5" />}
          subtitle="Current month"
        />
        <StatCard
          title="Appointments Today"
          value="14"
          trend="10 Confirmed"
          trendDirection="neutral"
          colorVariant="blue"
          icon={<Calendar className="w-5 h-5" />}
          subtitle="Full schedule"
        />
        <StatCard
          title="Total Clients"
          value={clients.length}
          trend="+4 new"
          trendDirection="up"
          colorVariant="emerald"
          icon={<Users className="w-5 h-5" />}
          subtitle="Registered VIPs"
        />
        <StatCard
          title="Total Staff"
          value={staff.length}
          trend="100% active"
          trendDirection="neutral"
          colorVariant="indigo"
          icon={<UserCheck className="w-5 h-5" />}
          subtitle="Doctors & Technicians"
        />
        <StatCard
          title="Pending Payments"
          value="$1,850.00"
          trend="3 Invoices"
          trendDirection="neutral"
          colorVariant="amber"
          icon={<Clock className="w-5 h-5" />}
          subtitle="Due this week"
        />
        <StatCard
          title="Inventory Alerts"
          value={lowStockCount}
          trend="Action required"
          trendDirection="down"
          colorVariant="rose"
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Low stock items"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Area Chart */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Revenue & Net Profit Analytics
              </h3>
              <p className="text-xs text-slate-500">Monthly financial performance breakdown (2026)</p>
            </div>
            <Badge variant="primary">Updated Live</Badge>
          </div>
          <RevenueChart />
        </div>

        {/* Service Distribution Pie Chart */}
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Service Distribution
              </h3>
              <p className="text-xs text-slate-500">Treatment popularity share</p>
            </div>
          </div>
          <ServiceDistributionChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Appointments Bar Chart */}
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Weekly Patient Appointments
              </h3>
              <p className="text-xs text-slate-500">Completed vs Confirmed treatment volume</p>
            </div>
          </div>
          <AppointmentsChart />
        </div>

        {/* Expense Category Breakdown Chart */}
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Expense Category Breakdown
              </h3>
              <p className="text-xs text-slate-500">Operational costs by category</p>
            </div>
            {role === 'staff' && <Badge variant="warning">Admin View Only</Badge>}
          </div>
          <ExpenseBreakdownChart />
        </div>
      </div>

      {/* Today's Schedule Table */}
      <div className="luxury-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Today's Live Treatment Schedule
            </h3>
            <p className="text-xs text-slate-500">Active client bookings and specialist assignments</p>
          </div>
          <Link href="/bookings">
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              View All Bookings
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Time</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Staff Specialist</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {appointments.slice(0, 5).map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {apt.time}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {apt.clientName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {apt.serviceName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {apt.staffName}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        apt.status === 'Completed'
                          ? 'success'
                          : apt.status === 'In-Progress'
                          ? 'warning'
                          : apt.status === 'Confirmed'
                          ? 'primary'
                          : 'neutral'
                      }
                    >
                      {apt.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setPrintData({ title: `Slip ${apt.id}`, type: 'slip', data: apt })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="Print Booking Slip"
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
