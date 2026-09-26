'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Minus, DollarSign, RotateCw, ShoppingBag } from 'lucide-react';
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
    updateInventoryItem,
    branches,
    selectedBranchId,
    userBranchId,
    role,
    isLoading,
    refreshInventory
  } = useClinic();

  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshInventory?.().catch(() => {});
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshInventory?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const [filterBranchId, setFilterBranchId] = useState<string>('');

  useEffect(() => {
    if (userBranchId) {
      setFilterBranchId(userBranchId);
    } else if (selectedBranchId) {
      setFilterBranchId(selectedBranchId);
    }
  }, [userBranchId, selectedBranchId]);

  const inventory = filterBranchId 
    ? allInventory.filter(i => !i.branchId || i.branchId === filterBranchId)
    : allInventory;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<InventoryCategory | 'custom'>('Injectables & Toxins');
  const [customCategory, setCustomCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [sellingPrice, setSellingPrice] = useState('');
  const [productBranchId, setProductBranchId] = useState('');

  // Auto-sync product branch default
  useEffect(() => {
    if (!productBranchId && branches.length > 0) {
      setProductBranchId(filterBranchId || selectedBranchId || userBranchId || branches[0].id);
    }
  }, [filterBranchId, selectedBranchId, userBranchId, branches, productBranchId]);

  // Adjust / Add Stock Modal State
  const [adjustStockItem, setAdjustStockItem] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustReason, setAdjustReason] = useState('Stock count adjustment / replenishment');

  // Reduce Stock Modal State
  const [reduceModalItemId, setReduceModalItemId] = useState<string | null>(null);
  const [reduceAmount, setReduceAmount] = useState<string>('1');
  const [reduceReason, setReduceReason] = useState<string>('Treatment consumption / Clinic usage');

  // Edit Selling Price Modal State
  const [editPriceModalItem, setEditPriceModalItem] = useState<any>(null);
  const [newSellingPrice, setNewSellingPrice] = useState('');

  const handleOpenEditPriceModal = (item: any) => {
    setEditPriceModalItem(item);
    setNewSellingPrice(String(item.price || 0));
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPriceModalItem) return;
    const priceNum = Number(newSellingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("Selling price cannot be negative", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateInventoryItem(editPriceModalItem.id, { price: priceNum });
      showToast(`Updated retail selling price for '${editPriceModalItem.itemName}' to Rs. ${priceNum}`);
      setEditPriceModalItem(null);
    } catch (err: any) {
      showToast("Failed to update price: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!productName.trim()) {
      showToast("Product name is required", "error");
      return;
    }

    if (category === 'custom' && !customCategory.trim()) {
      showToast("Please specify a custom category name", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const qtyNum = Number(quantity) || 0;
      const minStockNum = Number(minStock) || 5;
      const priceNum = Number(sellingPrice) || 0;
      const finalCategory = category === 'custom' ? (customCategory.trim() || 'General') : category;
      const todayStr = new Date().toISOString().split('T')[0];
      const targetBranchId = productBranchId || filterBranchId || selectedBranchId || userBranchId || (branches.length > 0 ? branches[0].id : undefined);

      await addInventoryItem({
        itemName: productName.trim(),
        category: finalCategory as any,
        quantity: qtyNum,
        minStock: minStockNum,
        supplier: supplier.trim() || 'In-House / Direct',
        price: priceNum,
        lastRestocked: todayStr,
        branchId: targetBranchId
      });

      showToast(`Product '${productName.trim()}' added to inventory successfully!`);
      setIsAddProductModalOpen(false);
      setProductName('');
      setCategory('Injectables & Toxins');
      setCustomCategory('');
      setSupplier('');
      setQuantity('');
      setMinStock('5');
      setSellingPrice('');
    } catch (err: any) {
      showToast("Failed to add product: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !adjustStockItem) return;
    const amount = Number(adjustQuantity) || 0;
    if (amount <= 0) {
      showToast("Quantity must be greater than zero", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateInventoryQuantity(adjustStockItem.id, amount, adjustReason.trim() || 'Manual stock adjustment');
      showToast(`Added ${amount} unit(s) to '${adjustStockItem.itemName}'`);
      setAdjustStockItem(null);
      setAdjustQuantity('1');
      setAdjustReason('Stock count adjustment / replenishment');
    } catch (err: any) {
      showToast("Failed to adjust stock: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReduceStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amount = Number(reduceAmount) || 0;
    if (!reduceModalItemId || amount <= 0) return;
    const currentItem = inventory.find(i => i.id === reduceModalItemId);
    if (!currentItem) return;
    if (amount > currentItem.quantity) {
      showToast(`Cannot reduce by ${amount}. Only ${currentItem.quantity} units currently in stock.`, "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateInventoryQuantity(reduceModalItemId, -amount, reduceReason.trim() || 'Treatment consumption');
      setReduceModalItemId(null);
      setReduceAmount('1');
      setReduceReason('Treatment consumption / Clinic usage');
      showToast("Stock reduced successfully");
    } catch (err: any) {
      showToast("Failed to reduce stock: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const reduceItem = inventory.find(i => i.id === reduceModalItemId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Loading inventory...
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
            Inventory Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track stock levels, retail pricing, and clinic usage. For vendor bills and supplier orders, visit Purchases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            disabled={isRefreshing}
            icon={<RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => router.push('/purchases')} 
            variant="outline" 
            icon={<ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          >
            Purchases & Orders
          </Button>
          <Button 
            onClick={() => setIsAddProductModalOpen(true)} 
            variant="primary" 
            icon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Input
          placeholder="Search by product name or supplier..."
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
              { label: role === 'partner' ? 'Low Stock' : 'Low Stock Alerts', value: 'Low Stock' },
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
        <div className="responsive-table-wrapper">
          <table className="w-full min-w-[680px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Supplier / Brand</th>
                <th className="py-3.5 px-4">Retail Price</th>
                <th className={`py-3.5 px-4 ${role === 'partner' ? 'text-right rounded-r-xl' : ''}`}>Status</th>
                {role !== 'partner' && (
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={role === 'partner' ? 6 : 7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {search || statusFilter !== 'All'
                          ? 'No inventory items match your search or filter.'
                          : filterBranchId && allInventory.length > 0
                          ? 'No items found for this branch.'
                          : 'No inventory items recorded yet.'}
                      </p>
                      {filterBranchId && allInventory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterBranchId('')}
                          className="text-xs text-blue-500 hover:text-blue-600 font-semibold underline mt-1"
                        >
                          Show all {allInventory.length} items across all branches
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
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
                      <td className={`py-3.5 px-4 ${role === 'partner' ? 'text-right' : ''}`}>
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
                      {role !== 'partner' && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenEditPriceModal(item)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1"
                              title="Set or Edit Retail Selling Price"
                            >
                              <DollarSign className="w-3 h-3" />
                              Set Price
                            </button>
                            <button
                              onClick={() => {
                                setAdjustStockItem(item);
                                setAdjustQuantity('1');
                                setAdjustReason('Stock count adjustment / replenishment');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              title="Add or Adjust Stock Quantity"
                            >
                              <Plus className="w-3 h-3" />
                              + Add Stock
                            </button>
                            <button
                              onClick={() => { setReduceModalItemId(item.id); setReduceAmount('1'); }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition-colors flex items-center gap-1"
                              title="Reduce Stock for Treatment / Consumption"
                            >
                              <Minus className="w-3 h-3" />
                              − Reduce Stock
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Inventory Product Modal */}
      <Modal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        title="Add Inventory Product"
        description="Register a new product in the inventory catalog. To log vendor purchase orders with bills, use the Purchases tab."
        maxWidth="lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          {branches.length > 0 && (
            <Select
              label="Branch"
              options={branches.map((b) => ({ label: b.name, value: b.id }))}
              value={productBranchId || filterBranchId || selectedBranchId || branches[0]?.id || ''}
              onChange={(e) => setProductBranchId(e.target.value)}
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              placeholder="e.g. Juvederm Ultra 3 (2x1ml)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <Input
              label="Supplier / Brand"
              placeholder="e.g. Allergan Aesthetics / Medispa"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Category"
              labelClassName="min-h-[2.25rem] flex items-end pb-0.5"
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
              label="Initial Stock Quantity"
              labelClassName="min-h-[2.25rem] flex items-end pb-0.5"
              type="text"
              placeholder="10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              label="Min Stock Alert Level"
              labelClassName="min-h-[2.25rem] flex items-end pb-0.5"
              type="text"
              placeholder="5"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ''))}
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

          <Input
            label="Retail Selling Price (PKR)"
            type="number"
            min="0"
            placeholder="e.g. 8500 (POS checkout price)"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddProductModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Product to Inventory'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust / Add Stock Modal */}
      <Modal
        isOpen={!!adjustStockItem}
        onClose={() => setAdjustStockItem(null)}
        title="Add / Adjust Stock"
        description={adjustStockItem ? `Current stock: ${adjustStockItem.quantity} units — ${adjustStockItem.itemName}` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <Input
            label="Quantity to Add"
            type="text"
            value={adjustQuantity}
            onChange={(e) => setAdjustQuantity(e.target.value.replace(/\D/g, ''))}
            required
          />
          <Input
            label="Reason / Note"
            placeholder="e.g. Stock recount, bonus sample, replenishment"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500">
            For regular vendor supplier orders and invoices, use the <strong>Purchases</strong> tab to keep billing and dues synchronized.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setAdjustStockItem(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Plus className="w-4 h-4" />} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Confirm Stock Addition'}
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
          <Input
            label="Reason / Audit Note"
            placeholder="e.g. Treatment consumption, damaged, expired"
            value={reduceReason}
            onChange={(e) => setReduceReason(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500">
            Use this when stock is used during treatments, damaged, or disposed. Stock cannot go below zero.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setReduceModalItemId(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Minus className="w-4 h-4" />} disabled={isSubmitting}>
              {isSubmitting ? 'Reducing...' : 'Confirm Reduction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Selling Price Modal */}
      <Modal
        isOpen={!!editPriceModalItem}
        onClose={() => setEditPriceModalItem(null)}
        title="Set Product Selling Price"
        description="Configure standard retail selling price for client checkout"
        maxWidth="md"
      >
        {editPriceModalItem && (
          <form onSubmit={handleSavePrice} className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editPriceModalItem.itemName}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Category: <strong>{editPriceModalItem.category}</strong></span>
                <span>•</span>
                <span>Stock: <strong>{editPriceModalItem.quantity} units</strong></span>
              </div>
            </div>

            <Input
              label="Retail Selling Price (PKR)"
              type="number"
              value={newSellingPrice}
              onChange={(e) => setNewSellingPrice(e.target.value)}
              placeholder="e.g. 4500"
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEditPriceModalItem(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Selling Price'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
