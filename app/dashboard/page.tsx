'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CreditCard,
  Sparkles,
  ArrowRight,
  Plus,
  Printer
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { StatCard } from '../../components/cards/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function DashboardPage() {
  const { 
    appointments: allAppointments, 
    inventory: allInventory, 
    transactions: allTransactions, 
    expenses: allExpenses, 
    branches,
    selectedBranchId,
    setSelectedBranchId,
    role, 
    setPrintData, 
    clinicInfo,
    staff,
    userEmail,
    markAttendance,
    attendance
  } = useClinic();

  // Filter collections if a specific branch is selected
  const appointments = selectedBranchId 
    ? allAppointments.filter(a => a.branchId === selectedBranchId)
    : allAppointments;

  const inventory = selectedBranchId 
    ? allInventory.filter(i => i.branchId === selectedBranchId)
    : allInventory;

  const transactions = selectedBranchId 
    ? allTransactions.filter(t => t.branchId === selectedBranchId)
    : allTransactions;

  const expenses = selectedBranchId 
    ? allExpenses.filter(e => e.branchId === selectedBranchId)
    : allExpenses;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const lowStockCount = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;

  const currentStaff = staff.find(s => s.email === userEmail);
  const todayRecord = attendance.find(a => a.staffId === currentStaff?.id && a.date === todayStr);
  const hasCheckedInToday = !!todayRecord;
  const hasCheckedOutToday = !!todayRecord?.checkOutTime;

  const totalRevenue = transactions.reduce((acc, t) => acc + t.grandTotal, 0);
  const todayRevenue = transactions.filter(t => t.date === todayStr).reduce((acc, t) => acc + t.grandTotal, 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyRevenue = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + t.grandTotal, 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  
  const monthlyExpenses = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, e) => acc + e.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Clinic Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Today's schedule and basic reports for {clinicInfo.name}.
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
          <Link href="/pos">
            <Button variant="primary" icon={<CreditCard className="w-4 h-4" />}>
              Open Billing
            </Button>
          </Link>
          <Link href="/appointments">
            <Button variant="outline" icon={<Plus className="w-4 h-4" />}>
              New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-[20px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              <strong>Inventory Alert:</strong> There are <strong>{lowStockCount}</strong> product items currently low or out of stock.
            </span>
          </div>
          <Link href="/inventory" className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0">
            View Inventory →
          </Link>
        </div>
      )}

      {/* Daily Practitioner Geofenced Attendance Check-In / Check-Out */}
      {role === 'staff' && currentStaff && (
        <div className="p-5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-[20px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-slate-800 dark:text-slate-200">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
              Practitioner Attendance Logging
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned branch: <strong>{branches.find(b => b.id === currentStaff.branchId)?.name || 'Main Clinic'}</strong>. 
              {hasCheckedInToday && ` Checked in at ${todayRecord?.checkInTime || 'N/A'}.`}
              {hasCheckedOutToday && ` Checked out at ${todayRecord?.checkOutTime || 'N/A'}.`}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {!hasCheckedInToday && (
              <Button
                variant="primary"
                onClick={async () => {
                  if (typeof window === 'undefined' || !navigator.geolocation) {
                    alert('Geolocation is not supported by your browser.');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      try {
                        await markAttendance(currentStaff.id, 'Present', 'Self Check-in', pos.coords.latitude, pos.coords.longitude);
                        alert('Checked in successfully!');
                        window.location.reload();
                      } catch (e: any) {
                        alert('Check-in failed: ' + e.message);
                      }
                    },
                    (err) => {
                      alert('GPS Location access is required to mark attendance.');
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                  );
                }}
              >
                Check-in Now
              </Button>
            )}
            {hasCheckedInToday && !hasCheckedOutToday && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (typeof window === 'undefined' || !navigator.geolocation) {
                    alert('Geolocation is not supported by your browser.');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      try {
                        await markAttendance(currentStaff.id, 'Checked Out', 'Self Check-out', pos.coords.latitude, pos.coords.longitude);
                        alert('Checked out successfully!');
                        window.location.reload();
                      } catch (e: any) {
                        alert('Check-out failed: ' + e.message);
                      }
                    },
                    (err) => {
                      alert('GPS Location access is required to check-out.');
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                  );
                }}
              >
                Check-out Now
              </Button>
            )}
            {hasCheckedInToday && hasCheckedOutToday && (
              <Badge variant="success" size="md">Shift Completed</Badge>
            )}
          </div>
        </div>
      )}

      {/* Streamlined 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'admin' ? (
          <>
            <Link href="/finance-reports" className="cursor-pointer block transition hover:-translate-y-0.5">
              <StatCard
                title="Today's Revenue"
                value={formatPKR(todayRevenue)}
                trend={`${todayAppointments.length} appointments`}
                trendDirection="neutral"
                colorVariant="blue"
                icon={<DollarSign className="w-5 h-5" />}
                subtitle="from POS & bookings"
              />
            </Link>
            <Link href="/finance-reports" className="cursor-pointer block transition hover:-translate-y-0.5">
              <StatCard
                title="Monthly Revenue"
                value={formatPKR(monthlyRevenue)}
                trend={new Date().toLocaleString('en-US', { month: 'long' })}
                trendDirection="up"
                colorVariant="emerald"
                icon={<TrendingUp className="w-5 h-5" />}
                subtitle="current month"
              />
            </Link>
            <StatCard
              title="Total Profit"
              value={formatPKR(netProfit)}
              trend="Net after expenses"
              trendDirection={netProfit >= 0 ? 'up' : 'down'}
              colorVariant="purple"
              icon={<Sparkles className="w-5 h-5" />}
              subtitle="revenue minus costs"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Today's Appointments"
              value={todayAppointments.length}
              trend="Scheduled today"
              trendDirection="neutral"
              colorVariant="blue"
              icon={<Calendar className="w-5 h-5" />}
              subtitle="active treatments"
            />
            <StatCard
              title="Total Bookings"
              value={appointments.length}
              trend="Overall assigned"
              trendDirection="up"
              colorVariant="emerald"
              icon={<TrendingUp className="w-5 h-5" />}
              subtitle="all-time schedule"
            />
            <StatCard
              title="Pending Requests"
              value={appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length}
              trend="Awaiting check-in"
              trendDirection="neutral"
              colorVariant="purple"
              icon={<Sparkles className="w-5 h-5" />}
              subtitle="treatments list"
            />
          </>
        )}
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

      {/* Today's Schedule Table */}
      <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Today's Live Treatment Schedule
              </h3>
              <p className="text-xs text-slate-500">Active client bookings and specialist assignments</p>
            </div>
            <Link href="/appointments">
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
                {todayAppointments.slice(0, 5).map((apt) => (
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
