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
  Percent
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { ServiceItem, PaymentMethod } from '../../lib/types/clinic';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

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
    setPrintData
  } = useClinic();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [clientName, setClientName] = useState(clients[0]?.name || 'Victoria Beckham');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(10);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  const categories = ['All', 'Facial & Skin Care', 'Laser Treatments', 'Injectables & Anti-Aging', 'Body Contouring', 'IV Therapy', 'Rejuvenation'];

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const subtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleCheckout = () => {
    if (posCart.length === 0) return;
    const txn = completePosCheckout(clientName, paymentMethod, discountPercent, taxPercent);
    setIsPaidSuccess(true);
    setTimeout(() => {
      setIsPaidSuccess(false);
      setPrintData({ title: `Invoice ${txn.invoiceId}`, type: 'invoice', data: txn });
    }, 800);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Point-of-Sale Billing Terminal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Instant invoice checkout, service billing, and payment processing.
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

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredServices.map((srv) => (
              <motion.div
                key={srv.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => addToPosCart(srv)}
                className="luxury-card p-4 flex flex-col justify-between cursor-pointer group hover:border-blue-500 dark:hover:border-blue-500 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="primary" size="sm">{srv.category}</Badge>
                    <span className="text-xs font-mono font-bold text-slate-400">{srv.durationMinutes} min</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {srv.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{srv.description}</p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                    ${srv.price}
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
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

            {/* Client Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Client Name
              </label>
              <Select
                options={clients.map((c) => ({ label: `${c.name} (${c.phone})`, value: c.name }))}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
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
                      <span className="text-xs font-mono text-slate-400">${item.price} x {item.quantity}</span>
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
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Discount (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-16 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-16 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-800 pt-3">
                <span>Grand Total</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">${grandTotal.toFixed(2)}</span>
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
                {isPaidSuccess ? 'Payment Processed!' : `Complete Payment ($${grandTotal.toFixed(2)})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
