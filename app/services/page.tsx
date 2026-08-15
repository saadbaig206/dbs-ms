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
  const { services, addService, updateService, role } = useClinic();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editPrice, setEditPrice] = useState<string>('0');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Facial & Skin Care');
  const [price, setPrice] = useState<string>('350');
  const [durationMinutes, setDurationMinutes] = useState<string>('60');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=500');

  const categories = ['All', 'Facial & Skin Care', 'Laser Treatments', 'Injectables & Anti-Aging', 'Body Contouring', 'IV Therapy', 'Rejuvenation', 'Packages'];

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    addService({
      name,
      category,
      price: Number(price) || 0,
      durationMinutes: Number(durationMinutes) || 0,
      assignedStaffIds: ['STF-101'],
      assignedStaffNames: ['Dr. Elena Rostova'],
      status: 'Active',
      image,
      description
    });

    setIsAddModalOpen(false);
    setName('');
    setDescription('');
  };

  const handleEditPrice = (srv: ServiceItem) => {
    setEditingService(srv);
    setEditPrice(String(srv.price));
    setEditStatus(srv.status);
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

        {role === 'admin' && (
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
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
                      {role === 'admin' && (
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => handleEditPrice(srv)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Edit Price
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
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Treatment Service"
        description="Expand clinic service catalog with high-end aesthetic therapies"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateService} className="space-y-4">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Service
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={editingService !== null}
        onClose={() => setEditingService(null)}
        title={`Edit Service: ${editingService?.name}`}
        description="Update service pricing and active status"
        maxWidth="md"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (editingService) {
            const numericPrice = Number(editPrice);
            updateService(editingService.id, { price: isNaN(numericPrice) ? 0 : numericPrice, status: editStatus });
            setEditingService(null);
          }
        }} className="space-y-4">
          <Input
            label="Service Price (Rs)"
            type="text"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ''))}
            required
          />

          <Select
            label="Service Status"
            options={[
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' }
            ]}
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as any)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEditingService(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
