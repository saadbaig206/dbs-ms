'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Trash2,
  Package,
  Layers,
  ArrowDownLeft,
  RotateCcw,
  Printer
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { StatCard } from '../cards/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';

interface PurchaseItemRow {
  itemName: string;
  category: string;
  unitCost: number;
  sellingPrice?: number;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

export function PurchasesTab() {
  const {
    purchaseItems = [],
    purchaseBills = [],
    addPurchase,
    payPurchaseBill,
    returns: contextReturns = [],
    createPurchaseReturn,
    setPrintData,
    role,
    selectedBranchId,
    inventory = []
  } = useClinic();

  const returns = useMemo(() => Array.isArray(contextReturns) ? contextReturns : [], [contextReturns]);
  const safeBills = useMemo(() => Array.isArray(purchaseBills) ? purchaseBills : [], [purchaseBills]);
  const safeItems = useMemo(() => Array.isArray(purchaseItems) ? purchaseItems : [], [purchaseItems]);

  const [activeSubTab, setActiveSubTab] = useState<'items' | 'bills' | 'returns'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');

  // RTV Modal State
  const [isRtvModalOpen, setIsRtvModalOpen] = useState(false);
  const [rtvVendorName, setRtvVendorName] = useState('');
  const [rtvSettlementType, setRtvSettlementType] = useState<'Deduct_From_Payable' | 'Cash_Refund' | 'Store_Credit'>('Deduct_From_Payable');
  const [rtvReason, setRtvReason] = useState('Near Expiry');
  const [rtvDate, setRtvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rtvNotes, setRtvNotes] = useState('');
  const [rtvItems, setRtvItems] = useState([
    { itemName: '', quantity: 1, unitCost: 0, batchNumber: '', reason: 'Near Expiry' }
  ]);
  const [isRtvSubmitting, setIsRtvSubmitting] = useState(false);
  const [rtvError, setRtvError] = useState<string | null>(null);

  // Add Purchase Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState('Online');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Multi-product line items state
  const [items, setItems] = useState<PurchaseItemRow[]>([
    { itemName: '', category: 'Products', unitCost: 0, sellingPrice: undefined, quantity: 1, batchNumber: '', expiryDate: '' }
  ]);

  // Pay Bill Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Online');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Global success notification banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Calculations for KPI Cards
  const totalStockPurchased = useMemo(() => {
    return safeBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  }, [safeBills]);

  const totalVendorDues = useMemo(() => {
    return safeBills.reduce((acc, b) => acc + (b.remainingDue || 0), 0);
  }, [safeBills]);

  const totalPaidToVendors = useMemo(() => {
    return safeBills.reduce((acc, b) => acc + (b.amountPaid || 0), 0);
  }, [safeBills]);

  const totalDistinctProducts = useMemo(() => {
    return safeItems.length;
  }, [safeItems]);

  // Filtered Itemized Products
  const filteredItems = useMemo(() => {
    return safeItems.filter(item => {
      const matchesSearch = !searchTerm ||
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [safeItems, searchTerm]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return safeBills.filter(bill => {
      const matchesSearch = !searchTerm ||
        bill.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.billNumber && bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        bill.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All' || bill.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [safeBills, searchTerm, statusFilter]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return returns.filter(ret => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (ret.debitNoteNumber && ret.debitNoteNumber.toLowerCase().includes(term)) ||
        (ret.vendorName && ret.vendorName.toLowerCase().includes(term)) ||
        (ret.notes && ret.notes.toLowerCase().includes(term))
      );
    });
  }, [returns, searchTerm]);

  // Line item helpers
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { itemName: '', category: 'Products', unitCost: 0, sellingPrice: undefined, quantity: 1, batchNumber: '', expiryDate: '' }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemRow = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        if (field === 'itemName' && typeof value === 'string' && value.trim()) {
          const matched = inventory.find(inv => inv.itemName.toLowerCase() === value.trim().toLowerCase());
          if (matched) {
            updated.category = matched.category || updated.category;
            if (updated.sellingPrice === undefined || updated.sellingPrice === 0) {
              updated.sellingPrice = matched.price;
            }
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const computedBillTotal = useMemo(() => {
    return items.reduce((acc, row) => acc + ((Number(row.unitCost) || 0) * (Number(row.quantity) || 1)), 0);
  }, [items]);

  const handleCreatePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setSubmitError('Vendor name is required.');
      return;
    }

    const validItems = items.filter(i => i.itemName.trim().length > 0 && i.unitCost >= 0 && i.quantity > 0);
    if (validItems.length === 0) {
      setSubmitError('Please enter at least one valid product line item.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const paidAmount = paymentStatus === 'Paid'
        ? computedBillTotal
        : paymentStatus === 'Pending'
        ? 0
        : Math.min(computedBillTotal, Number(amountPaidInput) || 0);

      await addPurchase({
        vendorName: vendorName.trim(),
        billNumber: billNumber.trim() || undefined,
        date: purchaseDate,
        paymentStatus,
        paymentMethod,
        amountPaid: paidAmount,
        notes: notes.trim() || undefined,
        branchId: selectedBranchId || undefined,
        items: validItems.map(i => ({
          itemName: i.itemName.trim(),
          category: i.category || 'Products',
          unitCost: Number(i.unitCost),
          sellingPrice: i.sellingPrice !== undefined && i.sellingPrice !== null ? Number(i.sellingPrice) : undefined,
          quantity: Number(i.quantity),
          batchNumber: i.batchNumber?.trim() || undefined,
          expiryDate: i.expiryDate?.trim() || undefined
        }))
      });

      setIsAddModalOpen(false);
      setVendorName('');
      setBillNumber('');
      setNotes('');
      setAmountPaidInput('');
      setItems([{ itemName: '', category: 'Products', unitCost: 0, sellingPrice: undefined, quantity: 1, batchNumber: '', expiryDate: '' }]);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to record purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setPayError(null);
      await payPurchaseBill(selectedBill.id, amount, payMethod, payNotes.trim() || undefined);
      setIsPayModalOpen(false);
      setSelectedBill(null);
      setPayAmount('');
      setPayNotes('');
      setSuccessBanner(`Vendor payment of ${formatPKR(amount)} successfully recorded.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setPayError(err.message || 'Payment recording failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRtvItemRow = () => {
    setRtvItems(prev => [...prev, { itemName: '', quantity: 1, unitCost: 0, batchNumber: '', reason: 'Near Expiry' }]);
  };

  const handleRemoveRtvItemRow = (idx: number) => {
    if (rtvItems.length === 1) return;
    setRtvItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateRtvItemRow = (idx: number, field: string, value: any) => {
    setRtvItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRtvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRtvSubmitting) return;
    if (!rtvVendorName.trim()) {
      setRtvError("Please specify the vendor name.");
      return;
    }
    const validItems = rtvItems.filter(it => it.itemName.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      setRtvError("Please add at least one item to return.");
      return;
    }

    try {
      setIsRtvSubmitting(true);
      setRtvError(null);
      const ret = await createPurchaseReturn({
        vendorName: rtvVendorName,
        settlementType: rtvSettlementType,
        reason: rtvReason,
        date: rtvDate,
        notes: rtvNotes,
        branchId: selectedBranchId || undefined,
        items: validItems
      });

      setIsRtvModalOpen(false);
      setRtvVendorName('');
      setRtvItems([{ itemName: '', quantity: 1, unitCost: 0, batchNumber: '', reason: 'Near Expiry' }]);
      setRtvNotes('');
      setSuccessBanner(`Debit Note ${ret.debitNoteNumber} issued successfully for ${formatPKR(ret.totalRefundAmount)}. Physical inventory decremented.`);
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err: any) {
      setRtvError(err.message || "Failed to process Return to Vendor.");
    } finally {
      setIsRtvSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Action Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stock Procured"
          value={formatPKR(totalStockPurchased)}
          colorVariant="blue"
          icon={<ShoppingBag className="w-5 h-5" />}
          subtitle="Cumulative stock valuation"
        />
        <StatCard
          title="Outstanding Vendor Dues"
          value={formatPKR(totalVendorDues)}
          colorVariant="amber"
          icon={<Clock className="w-5 h-5" />}
          subtitle="Unpaid accounts payable"
        />
        <StatCard
          title="Total Settled to Vendors"
          value={formatPKR(totalPaidToVendors)}
          colorVariant="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
          subtitle="Cleared supplier invoices"
        />
        <StatCard
          title="Procured Line Items"
          value={totalDistinctProducts.toString()}
          colorVariant="indigo"
          icon={<Layers className="w-5 h-5" />}
          subtitle="Individual stock batches"
        />
      </div>

      {/* Control Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('items')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'items'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Itemized Products ({safeItems.length})
            </button>
            <button
              onClick={() => setActiveSubTab('bills')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'bills'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Vendor Bills ({safeBills.length})
            </button>
            <button
              onClick={() => setActiveSubTab('returns')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'returns'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              Vendor Returns & Debit Notes ({returns.length})
            </button>
          </div>

          {/* Status Filter for Bills */}
          {activeSubTab === 'bills' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Dues</option>
              <option value="Pending">Unpaid / Pending</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeSubTab === 'items' ? "Search product, vendor, batch..." : activeSubTab === 'bills' ? "Search bill #, vendor..." : "Search debit note, vendor..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          {(role === 'admin' || role === 'partner') && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setRtvError(null);
                  setIsRtvModalOpen(true);
                }}
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-4 h-4 text-amber-500" />}
              >
                Return to Vendor (RTV)
              </Button>
              <Button
                onClick={() => {
                  setSubmitError(null);
                  setIsAddModalOpen(true);
                }}
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
              >
                Record Purchase
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'items' ? (
        /* Itemized Products View - Showing each product individually with unit costs */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                Purchased Products & Unit Costs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Individual product breakdown across all supplier orders with specific unit procurement costs.
              </p>
            </div>
            <Badge variant="primary">{filteredItems.length} Products</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">Product / Item Name</th>
                  <th className="p-3.5">Vendor / Supplier</th>
                  <th className="p-3.5">Batch / Expiry</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                  <th className="p-3.5 text-center">Quantity</th>
                  <th className="p-3.5 text-right">Total Cost</th>
                  <th className="p-3.5 text-right pr-4">Procured Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No purchased products found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.itemName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.category}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.vendorName}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {item.batchNumber || '—'}
                        </div>
                        {item.expiryDate && (
                          <div className="text-[10px] text-slate-400">Exp: {item.expiryDate}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatPKR(item.unitCost)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-bold text-slate-800 dark:text-slate-200">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        {formatPKR(item.totalCost)}
                      </td>
                      <td className="p-3.5 text-right pr-4 font-mono text-slate-500 dark:text-slate-400">
                        {item.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === 'bills' ? (
        /* Vendor Bills & Invoices View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Vendor Bills & Order Invoices
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supplier orders, settled amounts, and outstanding Accounts Payable balances.
              </p>
            </div>
            <Badge variant="primary">{filteredBills.length} Bills</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">Bill # / Order ID</th>
                  <th className="p-3.5">Vendor / Supplier</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                  <th className="p-3.5 text-right">Amount Paid</th>
                  <th className="p-3.5 text-right">Remaining Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No vendor bills found.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{bill.billNumber || bill.id}</div>
                        <div className="text-[10px] text-slate-400">{bill.paymentMethod}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{bill.vendorName}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {bill.date}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatPKR(bill.totalAmount)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatPKR(bill.amountPaid)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatPKR(bill.remainingDue)}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge
                          variant={
                            bill.paymentStatus === 'Paid'
                              ? 'success'
                              : bill.paymentStatus === 'Partial'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {bill.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        {bill.remainingDue > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBill(bill);
                              setPayAmount(bill.remainingDue.toString());
                              setIsPayModalOpen(true);
                            }}
                            className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          >
                            Pay Due
                          </Button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cleared
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Return to Vendor (RTV) & Debit Notes View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                Return to Vendor (RTV) Ledger & Debit Notes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Surplus, damaged, or near-expiry returns with official printable Debit Notes for vendor sign-off.
              </p>
            </div>
            <Badge variant="warning">{filteredReturns.length} Debit Notes</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">Debit Note #</th>
                  <th className="p-3.5">Vendor</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Returned Products</th>
                  <th className="p-3.5 text-right">Total Refund Value</th>
                  <th className="p-3.5">Settlement Method</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                      No Return to Vendor orders or debit notes found.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map(ret => (
                    <tr key={ret.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {ret.debitNoteNumber}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {ret.vendorName}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {ret.date}
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {ret.items.map((it, i) => (
                            <div key={i} className="text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">{it.itemName}</span> × {it.quantity} units ({formatPKR(it.unitCost)}/unit)
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatPKR(ret.totalRefundAmount)}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={ret.settlementType === 'Deduct_From_Payable' ? 'primary' : 'success'} size="sm">
                          {ret.settlementType === 'Deduct_From_Payable' ? 'Deducted from Payable' : ret.settlementType === 'Cash_Refund' ? 'Cash/Bank Refund' : 'Store Credit'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <button
                          onClick={() => {
                            setPrintData({
                              title: `Debit Note Voucher - ${ret.debitNoteNumber}`,
                              type: 'slip',
                              data: {
                                title: `DEBIT NOTE VOUCHER: ${ret.debitNoteNumber}`,
                                vendor: ret.vendorName,
                                date: ret.date,
                                items: ret.items,
                                total: ret.totalRefundAmount,
                                settlement: ret.settlementType,
                                notes: ret.notes
                              }
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1"
                          title="Print Official Debit Note Voucher"
                        >
                          <Printer className="w-3 h-3" />
                          Print Note
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Record Vendor Purchase with Multiple Products */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Vendor Purchase Order & Receive Stock"
        description="Receive incoming stock from pharmaceutical suppliers, set retail pricing, and record accounts payable."
        maxWidth="4xl"
      >
        <form onSubmit={handleCreatePurchaseSubmit} className="space-y-5">
          {/* Autocomplete Datalist for Inventory Items */}
          <datalist id="inventory-purchase-suggestions">
            {inventory.map((inv) => (
              <option key={inv.id} value={inv.itemName}>
                {inv.category} • Current Stock: {inv.quantity} units
              </option>
            ))}
          </datalist>

          {submitError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {submitError}
            </div>
          )}

          {/* Header Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <Input
              label="Vendor / Supplier Name"
              required
              placeholder="e.g. DermaCare Pharmaceuticals"
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
            />
            <Input
              label="Supplier Bill / Invoice #"
              placeholder="e.g. INV-9842"
              value={billNumber}
              onChange={e => setBillNumber(e.target.value)}
            />
            <Input
              label="Purchase Date"
              type="date"
              required
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
            />
          </div>

          {/* Multiple Products Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900/60 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Products & Consumables in Bill
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Pick existing products or type new names to auto-stock
                  </span>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItemRow}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="rounded-xl"
              >
                Add Another Product
              </Button>
            </div>

            {/* Desktop Column Headers */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div className="col-span-4">Product Name</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-right">Cost Price</div>
              <div className="col-span-2 text-right">Retail Price (POS)</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* Line Items Rows */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {items.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl space-y-2.5 transition hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    {/* Product Name with suggestions */}
                    <div className="col-span-12 md:col-span-4">
                      <label className="md:hidden block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        list="inventory-purchase-suggestions"
                        placeholder="Search or type product..."
                        required
                        value={row.itemName}
                        onChange={e => handleUpdateItemRow(idx, 'itemName', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-6 md:col-span-2">
                      <label className="md:hidden block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Category
                      </label>
                      <select
                        value={row.category}
                        onChange={e => handleUpdateItemRow(idx, 'category', e.target.value)}
                        className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Products">Products</option>
                        <option value="Injectables & Toxins">Injectables</option>
                        <option value="Dermal Fillers">Fillers</option>
                        <option value="Facial Serums & Solutions">Serums</option>
                        <option value="Disposables & Needles">Disposables</option>
                        <option value="Skincare Products">Skincare</option>
                      </select>
                    </div>

                    {/* Unit Cost */}
                    <div className="col-span-3 md:col-span-2">
                      <label className="md:hidden block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Cost (PKR)
                      </label>
                      <input
                        type="number"
                        placeholder="Unit Cost"
                        min="0"
                        step="any"
                        required
                        value={row.unitCost || ''}
                        onChange={e => handleUpdateItemRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 text-xs font-mono font-bold text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Selling / Retail Price (For POS checkout) */}
                    <div className="col-span-3 md:col-span-2">
                      <label className="md:hidden block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Retail Price (PKR)
                      </label>
                      <input
                        type="number"
                        placeholder="Retail (PKR)"
                        min="0"
                        step="any"
                        value={row.sellingPrice !== undefined ? row.sellingPrice : ''}
                        onChange={e => handleUpdateItemRow(idx, 'sellingPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full px-2.5 py-2 text-xs font-mono font-bold text-right bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        title="Set retail price to sell at POS"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-6 md:col-span-1">
                      <label className="md:hidden block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        required
                        value={row.quantity || ''}
                        onChange={e => handleUpdateItemRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 text-xs font-mono font-black text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Delete Action */}
                    <div className="col-span-6 md:col-span-1 flex items-center justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Remove product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Secondary Details: Batch Number & Expiry Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Batch:</span>
                      <input
                        type="text"
                        placeholder="Batch # (e.g. BTX-2026)"
                        value={row.batchNumber || ''}
                        onChange={e => handleUpdateItemRow(idx, 'batchNumber', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Expiry:</span>
                      <input
                        type="date"
                        value={row.expiryDate || ''}
                        onChange={e => handleUpdateItemRow(idx, 'expiryDate', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold mr-1.5">Item Cost:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatPKR((Number(row.unitCost) || 0) * (Number(row.quantity) || 1))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary Strip */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Distinct Products</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{items.length} lines</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Units Received</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)} units
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Grand Subtotal</span>
                <span className="font-black font-mono text-base text-slate-900 dark:text-slate-100">
                  {formatPKR(computedBillTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <Select
              label="Payment Terms"
              value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as any)}
              options={[
                { label: 'Fully Paid Immediately', value: 'Paid' },
                { label: 'Partial Advance Payment', value: 'Partial' },
                { label: 'Full Credit (Unpaid / Payable)', value: 'Pending' }
              ]}
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              options={[
                { label: 'Online / Bank Transfer', value: 'Online' },
                { label: 'Cash (Drawer / Safe)', value: 'Cash' },
                { label: 'Credit / Debit Card', value: 'Card' }
              ]}
            />

            {paymentStatus === 'Partial' ? (
              <div className="space-y-1">
                <Input
                  label="Advance Amount Paid (PKR)"
                  type="number"
                  min="0"
                  max={computedBillTotal}
                  value={amountPaidInput}
                  onChange={e => setAmountPaidInput(e.target.value)}
                  placeholder="Enter paid advance"
                />
                <div className="flex justify-between items-center text-[10px] text-amber-600 font-bold px-1">
                  <span>Remaining Due:</span>
                  <span>{formatPKR(Math.max(0, computedBillTotal - (Number(amountPaidInput) || 0)))}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment Clearing
                </span>
                <div className={`py-2.5 px-3 rounded-[14px] text-xs font-bold border ${
                  paymentStatus === 'Paid'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  {paymentStatus === 'Paid'
                    ? `100% Cleared: ${formatPKR(computedBillTotal)}`
                    : `Payable Due: ${formatPKR(computedBillTotal)}`}
                </div>
              </div>
            )}
          </div>

          <Input
            label="Internal Procurement Notes / Storage Location"
            placeholder="e.g. Delivered to 2nd floor laser cabinet; expiry batch verified"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording & Stocking...' : 'Save Purchase & Restock Inventory'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Pay Outstanding Vendor Bill Due */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setPayError(null);
        }}
        title="Pay Vendor Bill Due"
        description="Settle outstanding vendor liabilities and update accounts payable records."
        maxWidth="md"
      >
        {selectedBill && (
          <form onSubmit={handlePayBillSubmit} className="space-y-4">
            {payError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {payError}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Vendor:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedBill.vendorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Bill #:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{selectedBill.billNumber || selectedBill.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Invoice Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(selectedBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[11px]">Outstanding Due:</span>
                <span className="font-mono font-black text-base text-amber-600 dark:text-amber-400">{formatPKR(selectedBill.remainingDue)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment Amount (PKR)
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(selectedBill.remainingDue))}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Pay Full Due
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(Math.round(selectedBill.remainingDue / 2)))}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Pay 50%
                  </button>
                </div>
              </div>
              <Input
                type="number"
                required
                min="1"
                max={selectedBill.remainingDue}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
              {Number(payAmount) > 0 && (
                <div className="text-[10px] text-slate-400 flex justify-between px-1">
                  <span>Balance remaining after payment:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatPKR(Math.max(0, selectedBill.remainingDue - Number(payAmount)))}
                  </span>
                </div>
              )}
            </div>

            <Select
              label="Payment Method"
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              options={[
                { label: 'Online / Bank Transfer', value: 'Online' },
                { label: 'Cash (Drawer / Safe)', value: 'Cash' },
                { label: 'Credit / Debit Card', value: 'Card' }
              ]}
            />

            <Input
              label="Payment Reference / Notes"
              placeholder="e.g. Bank Ref #992120 / Cheque #8831"
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPayModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Recording Payment...' : 'Confirm & Record Payment'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Return to Vendor (RTV) & Debit Note Generation */}
      <Modal
        isOpen={isRtvModalOpen}
        onClose={() => setIsRtvModalOpen(false)}
        title="Issue Return to Vendor (RTV) & Debit Note"
        description="Return surplus, damaged, or near-expiry pharmaceutical stock and decrement inventory immediately."
        maxWidth="3xl"
      >
        <form onSubmit={handleRtvSubmit} className="space-y-4">
          <datalist id="inventory-rtv-suggestions">
            {inventory.map((inv) => (
              <option key={inv.id} value={inv.itemName}>
                Stock: {inv.quantity} units • {formatPKR(inv.price)}
              </option>
            ))}
          </datalist>

          {rtvError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {rtvError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Input
              label="Vendor / Supplier"
              required
              placeholder="e.g. DermaCare Pharmaceuticals"
              value={rtvVendorName}
              onChange={e => setRtvVendorName(e.target.value)}
            />
            <Input
              label="Return Date"
              type="date"
              required
              value={rtvDate}
              onChange={e => setRtvDate(e.target.value)}
            />
            <Select
              label="Settlement Action"
              value={rtvSettlementType}
              onChange={e => setRtvSettlementType(e.target.value as any)}
              options={[
                { label: 'Deduct from Unpaid Bills', value: 'Deduct_From_Payable' },
                { label: 'Incoming Cash / Bank Refund', value: 'Cash_Refund' },
                { label: 'Vendor Store Credit', value: 'Store_Credit' }
              ]}
            />
          </div>

          {/* Returned Items Line-Items */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                Products Being Returned
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddRtvItemRow}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="rounded-xl"
              >
                Add Another Product
              </Button>
            </div>

            {/* Column headers for RTV */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div className="col-span-4">Product Name</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Cost</div>
              <div className="col-span-3">Return Reason</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {rtvItems.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 items-center text-xs"
                >
                  <div className="col-span-12 md:col-span-4">
                    <input
                      type="text"
                      list="inventory-rtv-suggestions"
                      placeholder="Product Name"
                      required
                      value={row.itemName}
                      onChange={e => handleUpdateRtvItemRow(idx, 'itemName', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      required
                      value={row.quantity || ''}
                      onChange={e => handleUpdateRtvItemRow(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs font-mono text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Cost"
                      min="0"
                      step="any"
                      required
                      value={row.unitCost || ''}
                      onChange={e => handleUpdateRtvItemRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs font-mono text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="col-span-4 md:col-span-3">
                    <select
                      value={row.reason}
                      onChange={e => handleUpdateRtvItemRow(idx, 'reason', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="Near Expiry">Near Expiry</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Excess Stock">Excess Stock</option>
                      <option value="Quality Issue">Quality Issue</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveRtvItemRow(idx)}
                      disabled={rtvItems.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 px-1 text-xs border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Total Debit Note Credit:</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                {formatPKR(rtvItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0))}
              </span>
            </div>
          </div>

          <Input
            label="Internal Notes / Courier Reference"
            placeholder="e.g. Courier tracking # or reason for return"
            value={rtvNotes}
            onChange={e => setRtvNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRtvModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isRtvSubmitting}
            >
              {isRtvSubmitting ? 'Issuing Note...' : 'Issue Debit Note & Decrement Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
