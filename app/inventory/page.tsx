'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Plus, Search, Minus, UserCheck, DollarSign, RotateCw } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { InventoryCategory } from '../../lib/types/clinic';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function InventoryPage() {
  const {
    inventory: allInventory,
    addInventoryItem,
    updateInventoryQuantity,
    addExpense,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    userBranchId,
    role,
    userEmail,
    isLoading
  } = useClinic();

  const router = useRouter();

  // Role guard: Staff role cannot access Inventory tab
  useEffect(() => {
    if (!isLoading && role === 'staff') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const [filterBranchId, setFilterBranchId] = useState<string>('');

  useEffect(() => {
    if (userBranchId) {
      setFilterBranchId(userBranchId);
    } else if (selectedBranchId) {
      setFilterBranchId(selectedBranchId);
    }
  }, [userBranchId, selectedBranchId]);

  const inventory = filterBranchId 
    ? allInventory.filter(i => i.branchId === filterBranchId)
    : allInventory;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [reduceModalItemId, setReduceModalItemId] = useState<string | null>(null);
  const [reduceAmount, setReduceAmount] = useState<string>('1');

  // Vendor Form State
  const [vendorName, setVendorName] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<InventoryCategory | 'custom'>('Injectables & Toxins');
  const [customCategory, setCustomCategory] = useState('');
  const [vendorBranchId, setVendorBranchId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('10');
  const [paymentType, setPaymentType] = useState<'Debit' | 'Credit'>('Debit');
  const [actualAmount, setActualAmount] = useState<string>('5000');
  const [amountPaid, setAmountPaid] = useState<string>('5000');

  // Auto-sync vendor branch default
  useEffect(() => {
    if (!vendorBranchId && branches.length > 0) {
      setVendorBranchId(filterBranchId || selectedBranchId || userBranchId || branches[0].id);
    }
  }, [filterBranchId, selectedBranchId, userBranchId, branches, vendorBranchId]);

  // Auto-sync amountPaid when Debit is selected or actualAmount changes under Debit
  useEffect(() => {
    if (paymentType === 'Debit') {
      setAmountPaid(actualAmount);
    }
  }, [paymentType, actualAmount]);

  const calcActual = Number(actualAmount) || 0;
  const calcPaid = paymentType === 'Debit' ? calcActual : (Number(amountPaid) || 0);
  const remainingAmount = Math.max(0, calcActual - calcPaid);

  // Renew Vendor Form State
  const [isRenewVendorModalOpen, setIsRenewVendorModalOpen] = useState(false);
  const [renewItemId, setRenewItemId] = useState<string>('');
  const [renewQty, setRenewQty] = useState<string>('10');
  const [renewActualAmount, setRenewActualAmount] = useState<string>('5000');
  const [renewPaymentType, setRenewPaymentType] = useState<'Debit' | 'Credit'>('Debit');
  const [renewAmountPaid, setRenewAmountPaid] = useState<string>('5000');

  const selectedRenewItem = inventory.find(i => i.id === renewItemId) || inventory[0];

  useEffect(() => {
    if (renewPaymentType === 'Debit') {
      setRenewAmountPaid(renewActualAmount);
    }
  }, [renewPaymentType, renewActualAmount]);

  const renewCalcActual = Number(renewActualAmount) || 0;
  const renewCalcPaid = renewPaymentType === 'Debit' ? renewCalcActual : (Number(renewAmountPaid) || 0);
  const renewRemainingAmount = Math.max(0, renewCalcActual - renewCalcPaid);

  const handleOpenRenewModal = (itemId?: string) => {
    const item = itemId ? inventory.find(i => i.id === itemId) : (inventory[0] || null);
    if (item) {
      setRenewItemId(item.id);
      setRenewQty('10');
      setRenewActualAmount(String(item.price * 10 || 5000));
      setRenewAmountPaid(String(item.price * 10 || 5000));
      setRenewPaymentType('Debit');
    }
    setIsRenewVendorModalOpen(true);
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorName.trim() || !productName.trim()) {
      showToast("Vendor Name and Product Name are required", "error");
      return;
    }

    if (category === 'custom' && !customCategory.trim()) {
      showToast("Please specify a custom category name", "error");
      return;
    }

    // 1. Immediately close modal to confirm action
    setIsAddVendorModalOpen(false);

    const qtyNum = Number(quantity) || 1;
    const actAmtNum = Number(actualAmount) || 0;
    const pdAmtNum = paymentType === 'Debit' ? actAmtNum : (Number(amountPaid) || 0);
    const remAmtNum = Math.max(0, actAmtNum - pdAmtNum);
    const isFullyPaid = remAmtNum === 0;

    const activeUser = userEmail || role || 'Admin/Partner';
    const unitPrice = actAmtNum > 0 ? Math.round(actAmtNum / qtyNum) : 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const nowFormatStr = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const vName = vendorName;
    const pName = productName;
    const pCat = category === 'custom' ? (customCategory.trim() || 'General') : category;
    const pType = paymentType;
    const targetBranchId = vendorBranchId || filterBranchId || selectedBranchId || userBranchId || (branches.length > 0 ? branches[0].id : undefined);

    // Reset Form State
    setVendorName('');
    setProductName('');
    setCustomCategory('');
    setQuantity('10');
    setActualAmount('5000');
    setAmountPaid('5000');
    setPaymentType('Debit');

    showToast(`Vendor '${vName}' added successfully!`);

    try {
      // Save or update inventory product
      await addInventoryItem({
        itemName: pName,
        category: pCat,
        quantity: qtyNum,
        minStock: 10,
        supplier: vName,
        price: unitPrice,
        lastRestocked: todayStr,
        branchId: targetBranchId
      });

      // Log vendor purchase into Expenses / Vendor Dues
      await addExpense({
        title: `Vendor Purchase: ${pName} (${vName})`,
        category: 'Products',
        amount: actAmtNum,
        actualAmount: actAmtNum,
        amountPaid: pdAmtNum,
        remainingAmount: remAmtNum,
        paymentType: pType,
        vendorName: vName,
        productName: pName,
        date: todayStr,
        status: isFullyPaid ? 'Paid' : 'Pending',
        paymentMethod: 'Cash',
        notes: `Vendor: ${vName} | Product: ${pName} | Qty: ${qtyNum} | Payment: ${pType}`,
        addedBy: activeUser,
        paidBy: activeUser,
        branchId: targetBranchId,
        paymentLogs: pdAmtNum > 0 ? [
          {
            id: `PAYLOG-${Date.now()}`,
            amount: pdAmtNum,
            paidBy: activeUser,
            date: nowFormatStr,
            paymentMethod: 'Cash',
            notes: pType === 'Debit' ? 'Full Debit Payment' : 'Initial Credit Advance'
          }
        ] : []
      });
    } catch (err: any) {
      console.error("Failed to persist vendor purchase:", err);
      showToast("Error persisting vendor purchase", "error");
    }
  };

  const handleRenewVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetItem = inventory.find(i => i.id === renewItemId);
    if (!targetItem) {
      showToast("Please select an item / vendor to renew", "error");
      return;
    }

    setIsRenewVendorModalOpen(false);

    const qtyNum = Number(renewQty) || 1;
    const actAmtNum = Number(renewActualAmount) || 0;
    const pdAmtNum = renewPaymentType === 'Debit' ? actAmtNum : (Number(renewAmountPaid) || 0);
    const remAmtNum = Math.max(0, actAmtNum - pdAmtNum);
    const isFullyPaid = remAmtNum === 0;

    const activeUser = userEmail || role || 'Admin/Partner';
    const todayStr = new Date().toISOString().split('T')[0];
    const nowFormatStr = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const vName = targetItem.supplier;
    const pName = targetItem.itemName;
    const targetBranchId = targetItem.branchId || filterBranchId || selectedBranchId || userBranchId || (branches.length > 0 ? branches[0].id : undefined);

    showToast(`Renewing vendor order for '${vName}'...`);

    try {
      await updateInventoryQuantity(targetItem.id, qtyNum);

      await addExpense({
        title: `Vendor Renewal: ${pName} (${vName})`,
        category: 'Products',
        amount: actAmtNum,
        actualAmount: actAmtNum,
        amountPaid: pdAmtNum,
        remainingAmount: remAmtNum,
        paymentType: renewPaymentType,
        vendorName: vName,
        productName: pName,
        date: todayStr,
        status: isFullyPaid ? 'Paid' : 'Pending',
        paymentMethod: 'Cash',
        notes: `Vendor Renewal | Supplier: ${vName} | Product: ${pName} | Restocked Qty: +${qtyNum} | Payment: ${renewPaymentType}`,
        addedBy: activeUser,
        paidBy: activeUser,
        branchId: targetBranchId,
        paymentLogs: pdAmtNum > 0 ? [
          {
            id: `PAYLOG-${Date.now()}`,
            amount: pdAmtNum,
            paidBy: activeUser,
            date: nowFormatStr,
            paymentMethod: 'Cash',
            notes: renewPaymentType === 'Debit' ? 'Full Debit Payment on Renewal' : 'Credit Advance on Renewal'
          }
        ] : []
      });

      showToast(`Vendor order for '${vName}' (${pName}) renewed successfully with +${qtyNum} units!`);
    } catch (err: any) {
      console.error("Failed to renew vendor order:", err);
      showToast("Error renewing vendor order", "error");
    }
  };

  const handleReduceStock = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(reduceAmount) || 0;
    if (!reduceModalItemId || amount <= 0) return;
    updateInventoryQuantity(reduceModalItemId, -amount);
    setReduceModalItemId(null);
    setReduceAmount('1');
  };

  const reduceItem = inventory.find(i => i.id === reduceModalItemId);

  if (isLoading || role === 'staff') {
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Loading inventory permissions...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white transition-all flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Inventory & Vendor Purchasing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage vendor shipments, stock inventory, and credit/debit vendor dues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {branches.length > 0 && (
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
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
          <Button onClick={() => handleOpenRenewModal()} variant="outline" icon={<RotateCw className="w-4 h-4" />}>
            Renew Vendor
          </Button>
          <Button onClick={() => setIsAddVendorModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Input
          placeholder="Search by item name or vendor supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="w-full md:w-80"
        />

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            options={[
              { label: 'All Stock Statuses', value: 'All' },
              { label: 'In Stock', value: 'In Stock' },
              { label: 'Low Stock Alerts', value: 'Low Stock' },
              { label: 'Out of Stock', value: 'Out of Stock' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-60"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="luxury-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Vendor Supplier</th>
                <th className="py-3.5 px-4">Unit Cost</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredInventory.map((item) => {
                const percent = Math.min(100, Math.round((item.quantity / (item.minStock * 2)) * 100));

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.itemName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ID: {item.id} • Restocked: {item.lastRestocked}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.quantity} / {item.minStock} min
                        </span>
                      </div>
                      <div className="w-32 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.status === 'Low Stock'
                              ? 'bg-amber-500'
                              : item.status === 'Out of Stock'
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">
                      {item.supplier}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatPKR(item.price, { decimals: false })}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          item.status === 'In Stock'
                            ? 'success'
                            : item.status === 'Low Stock'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenRenewModal(item.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          Renew Vendor
                        </button>
                        <button
                          onClick={() => { setReduceModalItemId(item.id); setReduceAmount('1'); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                        >
                          − Reduce Stock
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Purchase Modal */}
      <Modal
        isOpen={isAddVendorModalOpen}
        onClose={() => setIsAddVendorModalOpen(false)}
        title="Add Vendor & Stock Purchase"
        description="Record vendor details, purchased stock, and credit/debit payments"
        maxWidth="lg"
      >
        <form onSubmit={handleAddVendor} className="space-y-4">
          {branches.length > 0 && (
            <Select
              label="Branch"
              options={branches.map((b) => ({ label: b.name, value: b.id }))}
              value={vendorBranchId || filterBranchId || selectedBranchId || branches[0]?.id || ''}
              onChange={(e) => setVendorBranchId(e.target.value)}
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Vendor Name"
              placeholder="e.g. Allergan Aesthetics / Medispa Supplies"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
            <Input
              label="Product Purchased"
              placeholder="e.g. Juvederm Ultra 3 (2x1ml)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { label: 'Injectables & Toxins', value: 'Injectables & Toxins' },
                { label: 'Dermal Fillers', value: 'Dermal Fillers' },
                { label: 'Facial Serums & Solutions', value: 'Facial Serums & Solutions' },
                { label: 'PRP & Blood Kits', value: 'PRP & Blood Kits' },
                { label: 'Disposables & Needles', value: 'Disposables & Needles' },
                { label: 'Skincare Products', value: 'Skincare Products' },
                { label: 'Post-Care Creams', value: 'Post-Care Creams' },
                { label: '+ Add Custom Category...', value: 'custom' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            />
            <Input
              label="Quantity Purchased"
              type="text"
              placeholder="10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          {category === 'custom' && (
            <Input
              label="Custom Category Name"
              placeholder="e.g. Laser Accessories"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              required
            />
          )}

          {/* Payment Type Selection: Credit or Debit? */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Payment Terms (Credit or Debit?)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('Debit')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  paymentType === 'Debit'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Debit (Instant Full Payment)
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('Credit')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  paymentType === 'Credit'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Credit (Deferred / Installments)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Actual Amount (Rs)"
              type="text"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              label={paymentType === 'Debit' ? "Amount Paid (Same as Actual)" : "Initial Amount Paid (Rs)"}
              type="text"
              value={amountPaid}
              disabled={paymentType === 'Debit'}
              onChange={(e) => setAmountPaid(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          {/* Balance calculation banner */}
          <div className={`p-4 rounded-xl text-xs flex justify-between items-center ${
            remainingAmount > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60'
          }`}>
            <div>
              <span className="font-bold">Remaining Balance Due to Vendor: </span>
              <span className="font-mono font-black text-sm">{formatPKR(remainingAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddVendorModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Vendor & Record Purchase
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reduce Stock Modal */}
      <Modal
        isOpen={!!reduceModalItemId}
        onClose={() => setReduceModalItemId(null)}
        title="Reduce Stock Quantity"
        description={reduceItem ? `Current stock: ${reduceItem.quantity} units — ${reduceItem.itemName}` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleReduceStock} className="space-y-4">
          <Input
            label="Quantity to Remove"
            type="text"
            value={reduceAmount}
            onChange={(e) => setReduceAmount(e.target.value.replace(/\D/g, ''))}
            required
          />
          <p className="text-xs text-slate-500">
            Use this when stock is used during treatments or disposed. Stock cannot go below zero.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setReduceModalItemId(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Minus className="w-4 h-4" />}>
              Confirm Reduction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Renew Vendor Order Modal */}
      <Modal
        isOpen={isRenewVendorModalOpen}
        onClose={() => setIsRenewVendorModalOpen(false)}
        title="Renew Vendor Order & Restock"
        description="Select an existing vendor supplier/product to restock inventory and log financial payments"
        maxWidth="lg"
      >
        <form onSubmit={handleRenewVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Select Item / Vendor Supplier
            </label>
            <select
              value={renewItemId}
              onChange={(e) => {
                const id = e.target.value;
                setRenewItemId(id);
                const item = inventory.find(i => i.id === id);
                if (item) {
                  setRenewActualAmount(String(item.price * Number(renewQty || 10)));
                }
              }}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} — Supplier: {item.supplier} (Current Stock: {item.quantity} units)
                </option>
              ))}
            </select>
          </div>

          {selectedRenewItem && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Current Vendor: </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedRenewItem.supplier}</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Current Stock: </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedRenewItem.quantity} units</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Restock Quantity (+Units)"
              type="text"
              value={renewQty}
              onChange={(e) => {
                const q = e.target.value.replace(/\D/g, '');
                setRenewQty(q);
                if (selectedRenewItem) {
                  setRenewActualAmount(String(selectedRenewItem.price * (Number(q) || 0)));
                }
              }}
              required
            />

            <Input
              label="Total Order Cost (PKR)"
              type="text"
              value={renewActualAmount}
              onChange={(e) => setRenewActualAmount(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Vendor Payment Terms
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRenewPaymentType('Debit')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  renewPaymentType === 'Debit'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Debit (Instant Full Payment)
              </button>
              <button
                type="button"
                onClick={() => setRenewPaymentType('Credit')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  renewPaymentType === 'Credit'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Credit (Deferred / Installments)
              </button>
            </div>
          </div>

          {renewPaymentType === 'Credit' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pt-2"
            >
              <Input
                label="Initial Amount Paid Now (PKR)"
                type="text"
                value={renewAmountPaid}
                onChange={(e) => setRenewAmountPaid(e.target.value.replace(/\D/g, ''))}
                required
              />
            </motion.div>
          )}

          {/* Dues summary */}
          <div className={`p-4 rounded-xl text-xs flex justify-between items-center ${
            renewRemainingAmount > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60'
          }`}>
            <div>
              <span className="font-bold">Remaining Dues to Vendor: </span>
              <span className="font-mono font-black text-sm">{formatPKR(renewRemainingAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRenewVendorModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<RotateCw className="w-4 h-4" />}>
              Confirm Vendor Renewal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
