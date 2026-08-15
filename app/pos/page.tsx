'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Search,
  Sparkles,
  DollarSign,
  User,
  ShoppingBag,
  Percent,
  AlertCircle
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { ServiceItem, PaymentMethod } from '../../lib/types/clinic';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';

export default function POSPage() {
  const {
    services,
    clients,
    posCart,
    addToPosCart,
    removeFromPosCart,
    updatePosQuantity,
    clearPosCart,
    completePosCheckout,
    setPrintData,
    addClient,
    transactions,
    role
  } = useClinic();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [clientName, setClientName] = useState(clients[0]?.name || 'Victoria Beckham');
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [taxPercent, setTaxPercent] = useState<string>('10');
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  
  // Card details states
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardType, setCardType] = useState('Visa');
  const [bankTxnId, setBankTxnId] = useState('');
  
  // Local recent transactions list to guarantee reprint works for staff
  const [localRecentTransactions, setLocalRecentTransactions] = useState<any[]>([]);

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize default client when client list finishes loading
  React.useEffect(() => {
    if (clients.length > 0 && (!clientName || !clients.some(c => c.name === clientName))) {
      setClientName(clients[0].name);
    }
  }, [clients]);

  // Synchronize clientSearch string with clientName
  React.useEffect(() => {
    setClientSearch(clientName);
  }, [clientName]);

  // Quick Client Registration State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientAge, setQuickClientAge] = useState<string>('30');
  const [quickClientGender, setQuickClientGender] = useState<string>('Female');

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName || !quickClientPhone) return;
    try {
      await addClient({
        name: quickClientName,
        phone: quickClientPhone,
        cnic: 'N/A',
        gender: quickClientGender as 'Female' | 'Male' | 'Other',
        age: Number(quickClientAge) || 30,
        address: 'N/A',
        notes: 'Quick POS Register'
      });
      setClientName(quickClientName);
      setIsAddClientModalOpen(false);
      setQuickClientName('');
      setQuickClientPhone('');
      setQuickClientAge('30');
      setQuickClientGender('Female');
      showToast("Client registered successfully!");
    } catch (err: any) {
      showToast("Failed to register client: " + err.message, "error");
    }
  };

  const categories = ['All', 'Facial & Skin Care', 'Laser Treatments', 'Injectables & Anti-Aging', 'Body Contouring', 'IV Therapy', 'Rejuvenation'];

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const subtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * (Number(taxPercent) || 0)) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleCheckout = async () => {
    if (posCart.length === 0) return;
    try {
      const cardDetails = paymentMethod === 'Card' ? {
        cardLastFour,
        cardType,
        bankTxnId
      } : undefined;
      const txn = await completePosCheckout(clientName, paymentMethod, Number(discountPercent) || 0, Number(taxPercent) || 0, cardDetails);
      setLocalRecentTransactions(prev => [txn, ...prev].slice(0, 5));
      setIsPaidSuccess(true);
      
      // Clear inputs
      setCardLastFour('');
      setCardType('Visa');
      setBankTxnId('');

      setTimeout(() => {
        setIsPaidSuccess(false);
        setPrintData({ title: `Invoice ${txn.invoiceId}`, type: 'invoice', data: txn });
      }, 800);
    } catch (e: any) {
      showToast("Checkout failed: " + e.message, "error");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and print client receipts.
          </p>
        </div>

        <Badge variant="gold" size="md">
          <Sparkles className="w-4 h-4 mr-1.5 inline" /> Luxury Checkout Active
        </Badge>
      </div>

      {/* POS Grid: Left Service Catalog (60%) | Right Invoice Checkout Ticket (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Service Catalog */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Tabs & Search */}
          <div className="luxury-card p-4 space-y-3">
            <Input
              placeholder="Search treatments (e.g. HydraFacial, Botox, PRP...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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

          {/* Service High Density Table */}
          <div className="luxury-card p-4 max-h-[600px] overflow-y-auto pr-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-2 px-3 rounded-l-xl">Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3 text-right rounded-r-xl">Add</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {filteredServices.map((srv) => (
                    <tr
                      key={srv.id}
                      onClick={() => addToPosCart(srv)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{srv.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{srv.durationMinutes} min</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="primary" size="sm">{srv.category}</Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                        {formatPKR(srv.price, { decimals: false })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Invoice Checkout Ticket */}
        <div className="lg:col-span-5">
          <div className="luxury-card p-6 sticky top-24 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invoice Ticket</h3>
              </div>
              {posCart.length > 0 && (
                <button
                  onClick={clearPosCart}
                  className="text-xs font-semibold text-rose-500 hover:underline"
                >
                  Clear Ticket
                </button>
              )}
            </div>

            {/* Client Picker & Quick Add */}
            <div className="flex items-end gap-2 relative">
              <div className="flex-1 relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Client Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    className="w-full rounded-[14px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all duration-200 py-2.5 px-3.5"
                    placeholder="Search or type client..."
                  />
                  {isClientDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => {
                          setIsClientDropdownOpen(false);
                          setClientSearch(clientName);
                        }} 
                      />
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-800/60">
                        {clients.filter(c => 
                          c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                          c.phone.includes(clientSearch)
                        ).length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            No clients found. Click '+' to add.
                          </div>
                        ) : (
                          clients.filter(c => 
                            c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                            c.phone.includes(clientSearch)
                          ).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setClientName(c.name);
                                setIsClientDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <div className="font-bold">{c.name}</div>
                              <div className="text-[10px] text-slate-400">{c.phone}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsAddClientModalOpen(true)}
                className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-[14px] border border-slate-200 dark:border-slate-800 transition-colors relative z-10"
                title="Register New Client Quickly"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="max-h-56 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {posCart.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No treatments selected. Click any service on the left to add to ticket.
                </div>
              ) : (
                posCart.map((item) => (
                  <div key={item.serviceId} className="pt-2 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.name}</h5>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{formatPKR(item.price, { decimals: false })} x {item.quantity}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                          onClick={() => updatePosQuantity(item.serviceId, -1)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updatePosQuantity(item.serviceId, 1)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromPosCart(item.serviceId)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculation Totals */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatPKR(subtotal)}</span>
              </div>

              <div className="flex flex-col gap-1.5 py-1 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Discount (%)</span>
                  <input
                    type="text"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value.replace(/\D/g, ''))}
                    className="w-16 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
                <div className="flex justify-end gap-1">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(String(pct))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        Number(discountPercent) === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Tax (%)</span>
                <input
                  type="text"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value.replace(/\D/g, ''))}
                  className="w-16 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-800 pt-3">
                <span>Grand Total</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{formatPKR(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Cash', 'Card', 'Bank', 'Online'] as const).map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      paymentMethod === pm
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {/* Card details sub-form */}
            {paymentMethod === 'Card' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Card Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={cardLastFour}
                      onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Card Type</label>
                    <select
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value)}
                      className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="American Express">American Express</option>
                      <option value="UnionPay">UnionPay</option>
                      <option value="PayPak">PayPak</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Transaction ID</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-129841"
                    value={bankTxnId}
                    onChange={(e) => setBankTxnId(e.target.value)}
                    className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleCheckout}
                disabled={posCart.length === 0}
                variant="primary"
                size="lg"
                className="w-full"
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                {isPaidSuccess ? 'Payment Processed!' : `Complete Payment (${formatPKR(grandTotal)})`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Client Add Modal */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        title="Quick Register Client"
        description="Create a client profile immediately without leaving the checkout page"
        maxWidth="md"
      >
        <form onSubmit={handleQuickAddClient} className="space-y-4">
          <Input
            label="Client Full Name"
            placeholder="e.g. Amanda Seyfried"
            value={quickClientName}
            onChange={(e) => setQuickClientName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            placeholder="e.g. +92 (300) 123-4567"
            value={quickClientPhone}
            onChange={(e) => setQuickClientPhone(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Age"
              type="text"
              value={quickClientAge}
              onChange={(e) => setQuickClientAge(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Select
              label="Gender"
              options={[
                { label: 'Female', value: 'Female' },
                { label: 'Male', value: 'Male' },
                { label: 'Other', value: 'Other' }
              ]}
              value={quickClientGender}
              onChange={(e) => setQuickClientGender(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddClientModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register & Select Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Recent Invoices / Reprint History */}
      <div className="luxury-card p-6 mt-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
          <Printer className="w-4 h-4 text-blue-600" />
          Recent Sales & Invoice Reprinting
        </h3>
        
        {(() => {
          const displayTxns = role === 'admin'
            ? [...localRecentTransactions, ...(transactions || [])].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 5)
            : localRecentTransactions;

          if (displayTxns.length === 0) {
            return <p className="text-xs text-slate-400 text-center py-4">No recent transactions recorded today.</p>;
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 rounded-l-xl">Invoice ID</th>
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4">Total Amount</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                  {displayTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-900 dark:text-slate-100">{txn.invoiceId}</td>
                      <td className="py-3 px-4">{txn.clientName}</td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral">{txn.paymentMethod}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">{formatPKR(txn.grandTotal)}</td>
                      <td className="py-3 px-4 text-slate-400">{txn.date}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => setPrintData({ title: `Invoice ${txn.invoiceId}`, type: 'invoice', data: txn })}
                          variant="outline"
                          size="sm"
                          icon={<Printer className="w-3.5 h-3.5" />}
                        >
                          Reprint
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

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
