'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Search, Minus } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { InventoryCategory } from '../../lib/types/clinic';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function InventoryPage() {
  const { inventory, addInventoryItem, updateInventoryQuantity } = useClinic();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reduceModalItemId, setReduceModalItemId] = useState<string | null>(null);
  const [reduceAmount, setReduceAmount] = useState<number>(1);

  // Form State
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Injectables & Toxins');
  const [quantity, setQuantity] = useState<number>(25);
  const [minStock, setMinStock] = useState<number>(15);
  const [supplier, setSupplier] = useState('Allergan Aesthetics USA');
  const [price, setPrice] = useState<number>(250);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addInventoryItem({
      itemName,
      category,
      quantity,
      minStock,
      supplier,
      price,
      lastRestocked: new Date().toISOString().split('T')[0]
    });

    setIsAddModalOpen(false);
    setItemName('');
  };

  const handleReduceStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reduceModalItemId || reduceAmount <= 0) return;
    updateInventoryQuantity(reduceModalItemId, -reduceAmount);
    setReduceModalItemId(null);
    setReduceAmount(1);
  };

  const reduceItem = inventory.find(i => i.id === reduceModalItemId);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Inventory & Medical Supplies Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Botox vials, dermal fillers, PRP centrifuges, serums, and disposable kits.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add Stock Item
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Input
          placeholder="Search by item name or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="w-full md:w-80"
        />

        <div className="flex items-center gap-3">
          <Select
            options={[
              { label: 'All Stock Statuses', value: 'All' },
              { label: 'In Stock', value: 'In Stock' },
              { label: 'Low Stock Alerts', value: 'Low Stock' },
              { label: 'Out of Stock', value: 'Out of Stock' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="luxury-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Item Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Unit Price</th>
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
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
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
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => updateInventoryQuantity(item.id, 10)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                        >
                          +10 Add
                        </button>
                        <button
                          onClick={() => { setReduceModalItemId(item.id); setReduceAmount(1); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                        >
                          − Reduce
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

      {/* Add Stock Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Inventory Item"
        description="Track new medical spa supplies, injectables, or serums"
        maxWidth="lg"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Juvederm Ultra 3 (2x1ml)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />

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
                { label: 'Post-Care Creams', value: 'Post-Care Creams' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            />
            <Input
              label="Supplier Name"
              placeholder="Allergan Aesthetics USA"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Initial Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
            <Input
              label="Min Alert Stock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              required
            />
            <Input
              label="Unit Price (Rs)"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Inventory Item
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
            type="number"
            min={1}
            max={reduceItem?.quantity ?? 1}
            value={reduceAmount}
            onChange={(e) => setReduceAmount(Math.max(1, Number(e.target.value)))}
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
    </div>
  );
}
