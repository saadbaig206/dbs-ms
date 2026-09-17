'use client';

import React, { useState } from 'react';
import { DollarSign, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Modal } from './Modal';
import { Input, Select } from './Input';
import { Button } from './Button';
import { ExpenseCategory } from '../../lib/types/clinic';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranchId?: string | null;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultBranchId
}) => {
  const { addExpense, branches, selectedBranchId, userBranchId, userEmail, role } = useClinic();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [notes, setNotes] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [branchId, setBranchId] = useState<string>(defaultBranchId || selectedBranchId || userBranchId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setCategory('Other');
    setAmount('');
    setPaymentMethod('Cash');
    setNotes('');
    setVendorName('');
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const activeBranch = branchId || defaultBranchId || selectedBranchId || userBranchId || undefined;
      const today = new Date().toISOString().split('T')[0];
      const activeUser = userEmail || (role === 'staff' ? 'Staff' : 'Admin');

      await addExpense({
        title: title.trim(),
        category,
        amount: parsedAmount,
        date: today,
        status: 'Paid',
        paymentMethod,
        notes: notes.trim() || undefined,
        vendorName: vendorName.trim() || undefined,
        branchId: activeBranch,
        addedBy: activeUser,
        paidBy: activeUser
      });

      setSuccessMsg(`Expense of Rs ${parsedAmount.toLocaleString()} recorded successfully!`);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      alert('Failed to save expense: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Clinic Expense"
      description="Quickly record petty cash or operational expense"
      maxWidth="lg"
    >
      {successMsg ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Expense Logged</h3>
          <p className="text-sm text-slate-400">{successMsg}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Tea & Refreshments, Cleaning Supplies, Courier"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { label: 'Other / Miscellaneous', value: 'Other' },
                { label: 'Products & Consumables', value: 'Products' },
                { label: 'Marketing', value: 'Marketing' },
                { label: 'Electric Bill', value: 'Electric Bill' },
                { label: 'Water Bill', value: 'Water Bill' },
                { label: 'Rent', value: 'Rent' },
                { label: 'Salary', value: 'Salary' },
                { label: 'Machines & Maintenance', value: 'Machines' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            />

            <Input
              label="Amount (PKR)"
              type="text"
              placeholder="e.g. 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              options={[
                { label: 'Cash (Drawer / Petty Cash)', value: 'Cash' },
                { label: 'Card', value: 'Card' },
                { label: 'Bank Transfer', value: 'Bank Transfer' },
                { label: 'Cheque', value: 'Cheque' }
              ]}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            />

            {branches && branches.length > 1 ? (
              <Select
                label="Branch"
                options={branches.map(b => ({ label: b.name, value: b.id }))}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
            ) : (
              <Input
                label="Vendor / Person Paid To"
                placeholder="e.g. Rider, Mart, Cleaners"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            )}
          </div>

          <Input
            label="Notes / Description (Optional)"
            placeholder="Optional notes or receipt reference..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} icon={<DollarSign className="w-4 h-4" />}>
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
