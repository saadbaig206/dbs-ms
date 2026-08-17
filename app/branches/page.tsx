'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Phone, Trash2, Edit2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Badge } from '../../components/ui/Badge';

export default function BranchesPage() {
  const { branches, addBranch, updateBranch, deleteBranch, role, isLoading } = useClinic();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 animate-pulse font-bold">Loading...</div>
      </div>
    );
  }

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        showToast("GPS coordinates loaded successfully!");
      },
      (error) => {
        showToast("Failed to retrieve GPS location: " + error.message, "error");
      }
    );
  };

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;
    try {
      await addBranch({ 
        name, 
        location, 
        phone,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined
      });
      setIsAddModalOpen(false);
      setName('');
      setLocation('');
      setPhone('');
      setLatitude('');
      setLongitude('');
      showToast("Branch created successfully!");
    } catch (err: any) {
      showToast("Failed to create branch: " + err.message, "error");
    }
  };

  const handleOpenEditModal = (branch: any) => {
    setSelectedBranchId(branch.id);
    setName(branch.name);
    setLocation(branch.location);
    setPhone(branch.phone || '');
    setLatitude(branch.latitude !== null && branch.latitude !== undefined ? String(branch.latitude) : '');
    setLongitude(branch.longitude !== null && branch.longitude !== undefined ? String(branch.longitude) : '');
    setIsEditModalOpen(true);
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;
    try {
      await updateBranch(selectedBranchId, { 
        name, 
        location, 
        phone,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined
      });
      setIsEditModalOpen(false);
      setSelectedBranchId('');
      setName('');
      setLocation('');
      setPhone('');
      setLatitude('');
      setLongitude('');
      showToast("Branch updated successfully!");
    } catch (err: any) {
      showToast("Failed to update branch: " + err.message, "error");
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this branch? All linked staff and clients might lose their branch mapping.")) return;
    try {
      await deleteBranch(id);
      showToast("Branch deleted successfully!");
    } catch (err: any) {
      showToast("Failed to delete branch: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Branches Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure clinic branch locations and operational details.
          </p>
        </div>

        {role === 'admin' && (
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Branch Location
          </Button>
        )}
      </div>

      {(role as string) === 'staff' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Role Restriction Active:</strong> Creating, modifying, or deleting branch locations is restricted in Staff Mode. Switch to Admin mode to unlock full controls.
          </span>
        </div>
      )}

      {/* Grid of branch cards */}
      {branches.length === 0 ? (
        <div className="text-center py-20 luxury-card">
          <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Branch Locations</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Get started by adding your clinic's physical branches (e.g. Lahore, Karachi, Islamabad).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <motion.div
              key={branch.id}
              whileHover={{ y: -4 }}
              className="luxury-card p-6 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{branch.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {branch.id}</span>
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">Active</Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[200px] truncate">{branch.location}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {branch.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {role === 'admin' && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenEditModal(branch)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Location"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Location"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Branch Location"
        description="Register a new physical clinic branch"
        maxWidth="md"
      >
        <form onSubmit={handleAddBranch} className="space-y-4">
          <Input
            label="Branch Name"
            placeholder="e.g. DBS Lahore (DHA)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Address / Location"
            placeholder="e.g. Sector Z, DHA Phase 3, Lahore"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            placeholder="e.g. +92 (42) 111-222-333"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              placeholder="e.g. 31.5204"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <Input
              label="Longitude"
              placeholder="e.g. 74.3587"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <div className="pt-1">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleFetchCurrentLocation}
              className="w-full text-[11px] font-bold py-1.5"
            >
              Detect Current GPS Location
            </Button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Branch Location"
        description="Modify details for the selected branch"
        maxWidth="md"
      >
        <form onSubmit={handleEditBranch} className="space-y-4">
          <Input
            label="Branch Name"
            placeholder="e.g. DBS Lahore (DHA)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Address / Location"
            placeholder="e.g. Sector Z, DHA Phase 3, Lahore"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            placeholder="e.g. +92 (42) 111-222-333"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              placeholder="e.g. 31.5204"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <Input
              label="Longitude"
              placeholder="e.g. 74.3587"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <div className="pt-1">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleFetchCurrentLocation}
              className="w-full text-[11px] font-bold py-1.5"
            >
              Detect Current GPS Location
            </Button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span className="text-xs font-semibold">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
