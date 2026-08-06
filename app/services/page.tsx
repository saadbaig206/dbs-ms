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
  const { services, addService, updateService, staff } = useClinic();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Facial & Skin Care');
  const [price, setPrice] = useState<number>(350);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=500');

  const categories = ['All', 'Facial & Skin Care', 'Laser Treatments', 'Injectables & Anti-Aging', 'Body Contouring', 'IV Therapy', 'Rejuvenation'];

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
      price,
      durationMinutes,
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

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Treatment Services Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Curated list of premium aesthetic medical treatments, injectables, and therapies.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add New Treatment
        </Button>
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

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((srv) => (
          <motion.div
            key={srv.id}
            whileHover={{ y: -4 }}
            className="luxury-card overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="h-44 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={srv.image}
                  alt={srv.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="primary">{srv.category}</Badge>
                </div>
                <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                  {formatPKR(srv.price, { decimals: false })}
                </div>
              </div>

              <div className="p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {srv.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {srv.description}
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" /> Duration:
                    </span>
                    <span className="font-semibold font-mono">{srv.durationMinutes} mins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" /> Practitioners:
                    </span>
                    <span className="font-semibold truncate max-w-[150px]">{srv.assignedStaffNames.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Badge variant={srv.status === 'Active' ? 'success' : 'neutral'}>
                {srv.status}
              </Badge>
              <button
                onClick={() => updateService(srv.id, { status: srv.status === 'Active' ? 'Inactive' : 'Active' })}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Toggle Status
              </button>
            </div>
          </motion.div>
        ))}
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
                { label: 'Rejuvenation', value: 'Rejuvenation' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            />
            <Input
              label="Price (Rs)"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
            <Input
              label="Duration (mins)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
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
    </div>
  );
}
