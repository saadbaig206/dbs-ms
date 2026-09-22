'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { PurchasesTab } from '../../components/finance/PurchasesTab';

export default function PurchasesPage() {
  const { role, isLoading, branches, selectedBranchId, setSelectedBranchId } = useClinic();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== 'admin' && role !== 'partner') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5 mt-1">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            Purchases & Supplier Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Individual item unit procurement costs, multi-product vendor bills, and supplier accounts payable.
          </p>
        </div>

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
      </div>

      {/* Main Purchases Component */}
      <PurchasesTab />
    </div>
  );
}
