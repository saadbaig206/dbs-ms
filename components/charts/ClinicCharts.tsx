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

const revenueData = [
  { month: 'Jan', revenue: 42000, profit: 26000, expenses: 16000 },
  { month: 'Feb', revenue: 48000, profit: 30000, expenses: 18000 },
  { month: 'Mar', revenue: 55000, profit: 34000, expenses: 21000 },
  { month: 'Apr', revenue: 62000, profit: 39000, expenses: 23000 },
  { month: 'May', revenue: 71000, profit: 46000, expenses: 25000 },
  { month: 'Jun', revenue: 84000, profit: 54000, expenses: 30000 },
  { month: 'Jul', revenue: 98000, profit: 64000, expenses: 34000 },
  { month: 'Aug', revenue: 112000, profit: 75000, expenses: 37000 },
];

const weeklyAppointmentsData = [
  { day: 'Mon', confirmed: 14, completed: 12, cancelled: 1 },
  { day: 'Tue', confirmed: 18, completed: 16, cancelled: 2 },
  { day: 'Wed', confirmed: 22, completed: 20, cancelled: 1 },
  { day: 'Thu', confirmed: 19, completed: 18, cancelled: 0 },
  { day: 'Fri', confirmed: 25, completed: 24, cancelled: 1 },
  { day: 'Sat', confirmed: 28, completed: 26, cancelled: 2 },
  { day: 'Sun', confirmed: 10, completed: 10, cancelled: 0 },
];

const serviceDistributionData = [
  { name: 'Injectables (Botox/Fillers)', value: 45, color: '#10B981' },
  { name: 'Laser Treatments', value: 22, color: '#2563EB' },
  { name: 'HydraFacials & Skincare', value: 15, color: '#3B82F6' },
  { name: 'PRP & Hair Therapies', value: 10, color: '#F59E0B' },
  { name: 'IV Drips & Wellness', value: 8, color: '#8B5CF6' },
];

const expenseBreakdownData = [
  { category: 'Staff Salaries', amount: 148000 },
  { category: 'Clinic Rent', amount: 28000 },
  { category: 'Products & Serums', amount: 24400 },
  { category: 'Marketing & Ads', amount: 18300 },
  { category: 'Machine Service', amount: 9600 },
  { category: 'Utilities & Water', amount: 4490 },
];

export const RevenueChart: React.FC = () => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

export const AppointmentsChart: React.FC = () => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeklyAppointmentsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '12px' }} />
          <Legend />
          <Bar dataKey="completed" fill="#2563EB" radius={[6, 6, 0, 0]} name="Completed" />
          <Bar dataKey="confirmed" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Scheduled" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ServiceDistributionChart: React.FC = () => {
  return (
    <div className="w-full h-72 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={serviceDistributionData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {serviceDistributionData.map((entry, index) => (
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

export const ExpenseBreakdownChart: React.FC = () => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={expenseBreakdownData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" stroke="#64748B" fontSize={12} tickFormatter={(v) => formatPKRCompact(v)} />
          <YAxis type="category" dataKey="category" stroke="#64748B" fontSize={11} tickLine={false} />
          <Tooltip formatter={(value: any) => [formatPKRCompact(Number(value)), 'Amount']} contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '12px' }} />
          <Bar dataKey="amount" fill="#F59E0B" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
