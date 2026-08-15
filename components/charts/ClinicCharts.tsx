'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatPKRCompact } from '../../lib/utils/currency';
import { FinancialTransaction, ExpenseItem, Appointment } from '../../lib/types/clinic';

// Helper to show a stylized fallback for empty states
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
    <p className="text-xs font-semibold text-slate-400 max-w-[250px] leading-relaxed">
      {message}
    </p>
  </div>
);

// 1. Revenue & Profit Area Chart
interface RevenueChartProps {
  transactions?: FinancialTransaction[];
  expenses?: ExpenseItem[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ transactions = [], expenses = [] }) => {
  // Aggregate data dynamically by month
  // We'll gather the last 6 months or all months in the data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Create an object to hold monthly sums
  const monthlyDataMap: Record<number, { revenue: number; expenses: number }> = {};
  
  // Initialize current year's months
  const currentYear = new Date().getFullYear();
  for (let m = 0; m < 12; m++) {
    monthlyDataMap[m] = { revenue: 0, expenses: 0 };
  }

  // Populate revenues
  transactions.forEach((t) => {
    if (t.status === 'Paid') {
      const d = new Date(t.date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyDataMap[m].revenue += t.grandTotal;
      }
    }
  });

  // Populate expenses
  expenses.forEach((e) => {
    if (e.status === 'Paid') {
      const d = new Date(e.date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyDataMap[m].expenses += e.amount;
      }
    }
  });

  // Format into recharts format
  const chartData = Object.entries(monthlyDataMap).map(([mStr, val]) => {
    const m = parseInt(mStr);
    const profit = Math.max(0, val.revenue - val.expenses);
    return {
      month: months[m],
      revenue: val.revenue,
      expenses: val.expenses,
      profit: profit,
      monthIndex: m
    };
  });

  // Filter to show only months that have had transactions/expenses OR up to the current month
  const currentMonthIdx = new Date().getMonth();
  const activeChartData = chartData.filter((d) => {
    return d.monthIndex <= currentMonthIdx || d.revenue > 0 || d.expenses > 0;
  });

  const hasData = activeChartData.some((d) => d.revenue > 0 || d.expenses > 0);

  if (!hasData) {
    return <EmptyState message="No revenue or expense records found for this year to plot statistics." />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748B" fontSize={12} tickLine={false} tickFormatter={(v) => formatPKRCompact(v)} />
          <Tooltip 
            formatter={(value: any) => [formatPKRCompact(Number(value)), '']}
            contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Total Revenue" />
          <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Net Profit" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Service Distribution Pie Chart
interface ServiceDistributionProps {
  appointments?: Appointment[];
}

export const ServiceDistributionChart: React.FC<ServiceDistributionProps> = ({ appointments = [] }) => {
  // Count by Service Name
  const distributionMap: Record<string, number> = {};
  appointments.forEach((a) => {
    if (a.status !== 'Cancelled') {
      distributionMap[a.serviceName] = (distributionMap[a.serviceName] || 0) + 1;
    }
  });

  const total = Object.values(distributionMap).reduce((acc, v) => acc + v, 0);

  const colors = ['#10B981', '#2563EB', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

  const chartData = Object.entries(distributionMap).map(([name, val], index) => {
    const percentage = total > 0 ? Math.round((val / total) * 100) : 0;
    return {
      name,
      value: percentage,
      color: colors[index % colors.length]
    };
  }).filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return <EmptyState message="No scheduled or completed appointments available to display service shares." />;
  }

  return (
    <div className="w-full h-72 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [`${value}%`, 'Share']}
            contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '12px' }} 
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Expense Category Breakdown Bar Chart
interface ExpenseBreakdownProps {
  expenses?: ExpenseItem[];
}

export const ExpenseBreakdownChart: React.FC<ExpenseBreakdownProps> = ({ expenses = [] }) => {
  const breakdownMap: Record<string, number> = {};
  
  expenses.forEach((e) => {
    if (e.status === 'Paid') {
      breakdownMap[e.category] = (breakdownMap[e.category] || 0) + e.amount;
    }
  });

  const chartData = Object.entries(breakdownMap).map(([category, amount]) => ({
    category,
    amount
  })).sort((a, b) => b.amount - a.amount);

  if (chartData.length === 0) {
    return <EmptyState message="No paid expense entries found to display category breakdown." />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" stroke="#64748B" fontSize={12} tickFormatter={(v) => formatPKRCompact(v)} />
          <YAxis type="category" dataKey="category" stroke="#64748B" fontSize={11} tickLine={false} />
          <Tooltip 
            formatter={(value: any) => [formatPKRCompact(Number(value)), 'Amount']} 
            contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '12px' }} 
          />
          <Bar dataKey="amount" fill="#F59E0B" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
