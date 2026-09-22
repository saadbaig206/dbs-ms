'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Search, Clock, DollarSign, Users, Edit, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { ServiceCategory, ServiceItem } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export default function ServicesPage() {
  const { services, addService, updateService, role, inventory, staff } = useClinic();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Edit Service Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ServiceCategory>('Facial & Skin Care');
  const [editPrice, setEditPrice] = useState<string>('0');
  const [editDuration, setEditDuration] = useState<string>('60');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive' | 'Out of Stock'>('Active');
  const [editRequiredInventory, setEditRequiredInventory] = useState<{ inventoryItemId: string; itemName: string; quantityUsed: number }[]>([]);
  const [editProductToAdd, setEditProductToAdd] = useState('');
  const [editQtyToAdd, setEditQtyToAdd] = useState('1');

  // Error state
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Facial & Skin Care');
  const [price, setPrice] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  // Mapping state
  const [requiredInventory, setRequiredInventory] = useState<{ inventoryItemId: string; itemName: string; quantityUsed: number }[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState('1');

  const categories = ['All', 'Facial & Skin Care', 'Laser Treatments', 'Injectables & Anti-Aging', 'Body Contouring', 'IV Therapy', 'Rejuvenation', 'Packages'];

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const activeStaff = staff && staff.length > 0 ? staff : [];
    try {
      setIsSubmitting(true);
      setServiceError(null);
      await addService({
        name: name.trim(),
        category,
        price: Number(price) || 0,
        durationMinutes: Number(durationMinutes) || 0,
        assignedStaffIds: activeStaff.map(s => s.id),
        assignedStaffNames: activeStaff.map(s => s.name),
        status: 'Active',
        image: image.trim() || '',
        description: description.trim(),
        requiredInventory
      });

      setIsAddModalOpen(false);
      setName('');
      setPrice('');
      setDurationMinutes('');
      setImage('');
      setDescription('');
      setRequiredInventory([]);
    } catch (err: any) {
      setServiceError(err.message || "Failed to save service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (srv: ServiceItem) => {
    setEditingService(srv);
    setEditName(srv.name);
    setEditCategory(srv.category as ServiceCategory);
    setEditPrice(String(srv.price));
    setEditDuration(String(srv.durationMinutes || 60));
    setEditDescription(srv.description || '');
    setEditStatus(srv.status);
    setEditRequiredInventory(srv.requiredInventory || []);
    setEditProductToAdd('');
    setEditQtyToAdd('1');
    setEditError(null);
  };

  const handleUpdateServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !editingService) return;

    try {
      setIsSubmitting(true);
      setEditError(null);
      const numPrice = Number(editPrice);
      const numDuration = Number(editDuration);
      await updateService(editingService.id, {
        name: editName.trim(),
        category: editCategory,
        price: isNaN(numPrice) ? 0 : numPrice,
        durationMinutes: isNaN(numDuration) ? 0 : numDuration,
        description: editDescription.trim(),
        status: editStatus,
        requiredInventory: editRequiredInventory
      });
      setEditingService(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Services
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            View and manage clinic services and pricing.
          </p>
        </div>

        {role !== 'partner' && (
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add New Service
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="luxury-card p-4 space-y-3">
        <Input
          placeholder="Search treatments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="max-w-md"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Table View */}
      <div className="luxury-card p-6">
        <div className="responsive-table-wrapper">
          <table className="w-full min-w-[650px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">ID</th>
                <th className="py-3.5 px-4">Service Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Assigned Specialists</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    No services found matching your search.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                      {srv.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{srv.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal leading-relaxed">{srv.description}</div>
                      {srv.requiredInventory && srv.requiredInventory.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {srv.requiredInventory.map((item, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold border border-slate-200 dark:border-slate-800">
                              {item.itemName} ({item.quantityUsed})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="primary">{srv.category}</Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {srv.durationMinutes} mins
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-slate-100">
                      {formatPKR(srv.price, { decimals: false })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {srv.assignedStaffNames.join(', ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={srv.status === 'Active' ? 'success' : 'neutral'}>
                        {srv.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {role !== 'partner' && (
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => handleOpenEditModal(srv)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit Service
                          </button>
                          <button
                            onClick={() => updateService(srv.id, { status: srv.status === 'Active' ? 'Inactive' : 'Active' })}
                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline"
                          >
                            Toggle Status
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Service Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setServiceError(null);
        }}
        title="Add New Treatment Service"
        description="Expand clinic service catalog with high-end aesthetic therapies"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateService} className="space-y-4">
          {serviceError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {serviceError}
            </div>
          )}

          <Input
            label="Service Title"
            placeholder="e.g. Diamond Microdermabrasion Glow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Category"
              options={[
                { label: 'Facial & Skin Care', value: 'Facial & Skin Care' },
                { label: 'Laser Treatments', value: 'Laser Treatments' },
                { label: 'Injectables & Anti-Aging', value: 'Injectables & Anti-Aging' },
                { label: 'Body Contouring', value: 'Body Contouring' },
                { label: 'IV Therapy', value: 'IV Therapy' },
                { label: 'Rejuvenation', value: 'Rejuvenation' },
                { label: 'Packages', value: 'Packages' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            />
            <Input
              label="Price (Rs)"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              label="Duration (mins)"
              type="text"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <Input
            label="Description"
            placeholder="Detailed clinical procedure summary..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Inventory Mapping Section */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Required Inventory Items</label>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {requiredInventory.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic">No inventory consumption mapped yet.</div>
              ) : (
                requiredInventory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{item.itemName}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 font-semibold">Qty: {item.quantityUsed}</span>
                      <button
                        type="button"
                        onClick={() => setRequiredInventory(prev => prev.filter((_, i) => i !== idx))}
                        className="text-[11px] text-rose-500 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex-1">
                <Select
                  label="Map Product / Consumable"
                  options={[
                    { label: '-- Select Inventory Product --', value: '' },
                    ...(inventory || []).map(item => ({ label: `${item.itemName} (Stock: ${item.quantity})`, value: item.id }))
                  ]}
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                />
              </div>
              <div className="w-24">
                <Input
                  label="Qty Consumed"
                  type="number"
                  min="1"
                  value={qtyToAdd}
                  onChange={(e) => setQtyToAdd(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!selectedProductToAdd) return;
                  const item = inventory.find(i => i.id === selectedProductToAdd);
                  if (item) {
                    if (requiredInventory.some(r => r.inventoryItemId === item.id)) return;
                    setRequiredInventory(prev => [
                      ...prev,
                      { inventoryItemId: item.id, itemName: item.itemName, quantityUsed: Number(qtyToAdd) || 1 }
                    ]);
                    setSelectedProductToAdd('');
                    setQtyToAdd('1');
                  }
                }}
              >
                Add Link
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={editingService !== null}
        onClose={() => {
          setEditingService(null);
          setEditError(null);
        }}
        title={`Edit Service: ${editingService?.name}`}
        description="Update service details, pricing, duration, and consumable linkages"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateServiceSubmit} className="space-y-4">
          {editError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {editError}
            </div>
          )}

          <Input
            label="Service Title"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Category"
                options={[
                  { label: 'Facial & Skin Care', value: 'Facial & Skin Care' },
                  { label: 'Laser Treatments', value: 'Laser Treatments' },
                  { label: 'Injectables & Anti-Aging', value: 'Injectables & Anti-Aging' },
                  { label: 'Body Contouring', value: 'Body Contouring' },
                  { label: 'IV Therapy', value: 'IV Therapy' },
                  { label: 'Rejuvenation', value: 'Rejuvenation' },
                  { label: 'Packages', value: 'Packages' }
                ]}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
              />
            </div>
            <Input
              label="Price (Rs)"
              type="text"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              label="Duration (mins)"
              type="text"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Description"
                placeholder="Detailed clinical procedure summary..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <Select
              label="Service Status"
              options={[
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
                { label: 'Out of Stock', value: 'Out of Stock' }
              ]}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
            />
          </div>

          {/* Edit Inventory Mapping Section */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Linked Consumable Inventory</label>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {editRequiredInventory.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic">No inventory consumption mapped for this service.</div>
              ) : (
                editRequiredInventory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{item.itemName}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 font-semibold">Qty: {item.quantityUsed}</span>
                      <button
                        type="button"
                        onClick={() => setEditRequiredInventory(prev => prev.filter((_, i) => i !== idx))}
                        className="text-[11px] text-rose-500 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex-1">
                <Select
                  label="Map Product / Consumable"
                  options={[
                    { label: '-- Select Inventory Product --', value: '' },
                    ...(inventory || []).map(item => ({ label: `${item.itemName} (Stock: ${item.quantity})`, value: item.id }))
                  ]}
                  value={editProductToAdd}
                  onChange={(e) => setEditProductToAdd(e.target.value)}
                />
              </div>
              <div className="w-24">
                <Input
                  label="Qty Consumed"
                  type="number"
                  min="1"
                  value={editQtyToAdd}
                  onChange={(e) => setEditQtyToAdd(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!editProductToAdd) return;
                  const item = inventory.find(i => i.id === editProductToAdd);
                  if (item) {
                    if (editRequiredInventory.some(r => r.inventoryItemId === item.id)) return;
                    setEditRequiredInventory(prev => [
                      ...prev,
                      { inventoryItemId: item.id, itemName: item.itemName, quantityUsed: Number(editQtyToAdd) || 1 }
                    ]);
                    setEditProductToAdd('');
                    setEditQtyToAdd('1');
                  }
                }}
              >
                Add Link
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEditingService(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
