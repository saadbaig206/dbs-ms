'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  AlertCircle,
  Edit2,
  Package,
  Tag
} from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { ServiceItem, InventoryItem, PaymentMethod } from '../../lib/types/clinic';
import { formatPKR } from '../../lib/utils/currency';
import { formatPhoneInput } from '../../lib/utils/phone';
import { getLocalDateString, getLocalTimeString } from '../../lib/utils/date';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import { AddExpenseModal } from '../../components/ui/AddExpenseModal';
import { posClient } from '../../lib/api/client';


function POSContent() {
  const searchParams = useSearchParams();
  const clientParam = searchParams.get('client');
  const serviceIdParam = searchParams.get('serviceId');
  const serviceNameParam = searchParams.get('serviceName');
  const priceParam = searchParams.get('price');
  const appointmentIdParam = searchParams.get('appointmentId');

  const {
    services,
    inventory,
    clients,
    staff,
    posCart,
    addToPosCart,
    removeFromPosCart,
    updatePosQuantity,
    updatePosItemPrice,
    updatePosItemStaff,
    clearPosCart,
    completePosCheckout,
    setPrintData,
    addClient,
    transactions,
    updateTransaction,
    role
  } = useClinic();

  const [catalogMode, setCatalogMode] = useState<'services' | 'products'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [taxPercent, setTaxPercent] = useState<string>('0');
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'ticket'>('catalog');
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialAmountPaid, setPartialAmountPaid] = useState('');

  // Cash Tender / Change live calculation state
  const [cashReceived, setCashReceived] = useState<string>('');

  // Split tender breakdown states
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [splitOnline, setSplitOnline] = useState<string>('');

  // Cart item custom price editing state
  const [editingCartItem, setEditingCartItem] = useState<{ id: string; name: string; price: number } | null>(null);
  const [customCartPrice, setCustomCartPrice] = useState<string>('');

  // Card details states
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardType, setCardType] = useState('Visa');
  const [bankTxnId, setBankTxnId] = useState('');
  const [cvc, setCvc] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Local recent transactions list to guarantee reprint works for staff
  const [localRecentTransactions, setLocalRecentTransactions] = useState<any[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Auto-populate client and service from appointment parameters
  const autoBillProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${clientParam || ''}-${serviceIdParam || ''}-${serviceNameParam || ''}`;
    if (!clientParam && !serviceIdParam && !serviceNameParam) return;
    if (autoBillProcessedRef.current === key) return;

    if (clientParam) {
      setClientName(clientParam);
      setClientSearch(clientParam);
    }

    if (serviceIdParam || serviceNameParam) {
      let matchedService = services.find(s => s.id === serviceIdParam);
      if (!matchedService && serviceNameParam) {
        const cleanName = serviceNameParam.split('(')[0].trim().toLowerCase();
        matchedService = services.find(s => s.name.toLowerCase() === serviceNameParam.toLowerCase()) ||
          services.find(s => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase()));
      }

      if (matchedService) {
        addToPosCart(matchedService);
      } else if (serviceNameParam) {
        addToPosCart({
          id: serviceIdParam || `SRV-${Date.now()}`,
          name: serviceNameParam,
          category: 'Facial & Skin Care',
          price: Number(priceParam) || 0,
          durationMinutes: 45,
          assignedStaffIds: [],
          assignedStaffNames: [],
          status: 'Active',
          image: '',
          description: 'Custom booked treatment'
        });
      }
    }

    autoBillProcessedRef.current = key;
  }, [clientParam, serviceIdParam, serviceNameParam, priceParam, services, addToPosCart]);

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize clientSearch string with clientName when clientName is programmatically set
  React.useEffect(() => {
    setClientSearch(clientName);
  }, [clientName]);

  // Quick Client Registration State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('+92');
  const [quickClientAge, setQuickClientAge] = useState<string>('');
  const [quickClientGender, setQuickClientGender] = useState<string>('Female');
  const [quickClientError, setQuickClientError] = useState<string | null>(null);

  // Edit Transaction Modal State
  const [isEditTxnModalOpen, setIsEditTxnModalOpen] = useState(false);
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Cash');
  const [editGrandTotal, setEditGrandTotal] = useState<string>('0');
  const [editDate, setEditDate] = useState('');

  const handleOpenEditTxnModal = (txn: any) => {
    setEditingTxnId(txn.id);
    setEditClientName(txn.clientName);
    setEditPaymentMethod(txn.paymentMethod);
    setEditGrandTotal(String(txn.grandTotal));
    setEditDate(txn.date);
    setIsEditTxnModalOpen(true);
  };

  const handleSaveEditTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxnId) return;

    if (editClientName.trim().length < 3) {
      showToast("Client Name must be at least 3 characters long", "error");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(editClientName.trim())) {
      showToast("Client Name must contain only letters and spaces", "error");
      return;
    }
    if (Number(editGrandTotal) < 0) {
      showToast("Total Amount cannot be negative", "error");
      return;
    }
    if (!editDate) {
      showToast("Date is required", "error");
      return;
    }

    try {
      await updateTransaction(editingTxnId, {
        clientName: editClientName,
        paymentMethod: editPaymentMethod,
        grandTotal: Number(editGrandTotal) || 0,
        date: editDate
      });
      setIsEditTxnModalOpen(false);
      setEditingTxnId(null);
      showToast("Transaction updated successfully!");
    } catch (err: any) {
      showToast("Failed to update transaction: " + err.message, "error");
    }
  };

  // Refund Transaction Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundingTxn, setRefundingTxn] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);
  const [selectedRefundItems, setSelectedRefundItems] = useState<{ [index: number]: boolean }>({});

  const handleOpenRefundModal = (txn: any) => {
    setRefundingTxn(txn);
    setRefundReason('');
    setRefundRestock(true);
    const initialSelected: { [index: number]: boolean } = {};
    (txn.items || []).forEach((_: any, idx: number) => {
      initialSelected[idx] = true;
    });
    setSelectedRefundItems(initialSelected);
    setIsRefundModalOpen(true);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingTxn || !refundReason.trim()) return;
    try {
      setIsRefunding(true);
      const itemsList = refundingTxn.items || [];
      const hasSomeSelected = itemsList.some((_: any, idx: number) => selectedRefundItems[idx]);
      if (itemsList.length > 0 && !hasSomeSelected) {
        showToast("Please select at least one line item to refund.", "error");
        setIsRefunding(false);
        return;
      }
      const isPartial = itemsList.length > 0 && itemsList.some((_: any, idx: number) => !selectedRefundItems[idx]);
      const itemsToRefund = isPartial ? itemsList.filter((_: any, idx: number) => selectedRefundItems[idx]) : undefined;

      const updated = await posClient.refundTransaction(refundingTxn.id, refundReason.trim(), refundRestock, itemsToRefund);
      showToast(isPartial ? "Partial refund processed successfully." : "Transaction fully refunded. Stock updated.");
      setIsRefundModalOpen(false);
      setRefundingTxn(null);
      updateTransaction(refundingTxn.id, updated || { status: isPartial ? 'Partial Refund' : 'Refunded' });
    } catch (err: any) {
      showToast("Refund failed: " + err.message, "error");
    } finally {
      setIsRefunding(false);
    }
  };

  const handleReprint = async (txn: any) => {
    try {
      const res = await posClient.reprintTransaction(txn.id);
      const updatedCount = res?.reprintCount ?? ((txn.reprintCount || 0) + 1);
      const matchedClient = clients.find(c => c.name === txn.clientName);
      const txnWithPhone = {
        ...txn,
        phone: txn.phone || matchedClient?.phone,
        reprintCount: updatedCount
      };
      setPrintData({ title: `Invoice ${txnWithPhone.invoiceId}`, type: 'invoice', data: txnWithPhone });
    } catch (err) {
      const matchedClient = clients.find(c => c.name === txn.clientName);
      const txnWithPhone = {
        ...txn,
        phone: txn.phone || matchedClient?.phone,
        reprintCount: (txn.reprintCount || 0) + 1
      };
      setPrintData({ title: `Invoice ${txnWithPhone.invoiceId}`, type: 'invoice', data: txnWithPhone });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !quickClientName || !quickClientPhone) return;

    setQuickClientError(null);
    if (quickClientName.trim().length < 3) {
      setQuickClientError("Full Name must be at least 3 characters long");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(quickClientName.trim())) {
      setQuickClientError("Full Name must contain only letters and spaces");
      return;
    }
    if (!/^\+92\s?\d{9,10}$/.test(quickClientPhone)) {
      setQuickClientError("Please enter a valid Pakistani phone number (+92 followed by 9-10 digits)");
      return;
    }
    const ageNum = Number(quickClientAge);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setQuickClientError("Please enter a valid age between 1 and 120");
      return;
    }

    try {
      setIsSubmitting(true);
      await addClient({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
        cnic: 'N/A',
        gender: quickClientGender as 'Female' | 'Male' | 'Other',
        age: ageNum,
        address: 'N/A',
        notes: 'Quick POS Register'
      });
      setClientName(quickClientName.trim());
      setIsAddClientModalOpen(false);
      setQuickClientName('');
      setQuickClientPhone('+92');
      setQuickClientAge('');
      setQuickClientGender('Female');
      setQuickClientError(null);
      showToast("Client registered successfully!");
    } catch (err: any) {
      setQuickClientError(err.message || "Failed to register client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCartItemPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCartItem) return;
    if (role !== 'admin') {
      showToast("Manual price adjustments require Administrator privileges.", "error");
      return;
    }
    const newPrice = Number(customCartPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast("Please enter a valid price (0 or higher)", "error");
      return;
    }
    updatePosItemPrice(editingCartItem.id, newPrice);
    showToast(`Price updated for ${editingCartItem.name}`);
    setEditingCartItem(null);
  };

  const categories = ['All', 'Facial & Skin Care', 'Laser Treatments', 'Injectables & Anti-Aging', 'Body Contouring', 'IV Therapy', 'Rejuvenation'];

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [services, selectedCategory, search]);

  const productCategories = useMemo(() => {
    const cats = Array.from(new Set((inventory || []).map(i => i.category || 'General')));
    return ['All', ...cats];
  }, [inventory]);

  const filteredProducts = useMemo(() => {
    return (inventory || []).filter((p) => {
      const matchesCat = selectedProductCategory === 'All' || p.category === selectedProductCategory;
      const matchesSearch = p.itemName.toLowerCase().includes(search.toLowerCase()) ||
        (p.supplier && p.supplier.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [inventory, selectedProductCategory, search]);

  const { subtotal, discountAmount, taxableAmount, taxAmount, grandTotal } = useMemo(() => {
    const sub = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const disc = (sub * (Number(discountPercent) || 0)) / 100;
    const taxable = sub - disc;
    const tax = (taxable * (Number(taxPercent) || 0)) / 100;
    const grand = Math.round((taxable + tax) * 100) / 100;
    return {
      subtotal: sub,
      discountAmount: disc,
      taxableAmount: taxable,
      taxAmount: tax,
      grandTotal: grand
    };
  }, [posCart, discountPercent, taxPercent]);

  const selectedClientObj = useMemo(() => {
    const term = (clientSearch || clientName).trim().toLowerCase();
    if (!term) return null;
    return clients.find(c => c.name.toLowerCase() === term);
  }, [clients, clientSearch, clientName]);

  const handleCheckout = async () => {
    if (isSubmitting || posCart.length === 0) return;

    const paidNow = isPartialPayment ? (Number(partialAmountPaid) || 0) : grandTotal;
    const remDue = isPartialPayment ? Math.max(0, grandTotal - paidNow) : 0;

    if (paymentMethod === 'Card' && !bankTxnId.trim()) {
      showToast("Card payments require POS terminal reference / Bank Transaction ID (Slip No).", "error");
      return;
    }

    let splitsPayload: any[] | undefined = undefined;
    if (paymentMethod === 'Split') {
      const cAmt = Number(splitCash) || 0;
      const cardAmt = Number(splitCard) || 0;
      const oAmt = Number(splitOnline) || 0;
      const splitSum = Math.round((cAmt + cardAmt + oAmt) * 100) / 100;
      if (Math.abs(splitSum - paidNow) > 0.01) {
        showToast(`Split total (Rs. ${splitSum}) must exactly equal payment amount (Rs. ${paidNow}).`, "error");
        return;
      }
      if (cardAmt > 0 && !bankTxnId.trim()) {
        showToast("Card split payments require POS terminal reference / Bank Transaction ID (Slip No).", "error");
        return;
      }
      splitsPayload = [
        { method: 'Cash', amount: cAmt },
        { method: 'Card', amount: cardAmt },
        { method: 'Online', amount: oAmt }
      ].filter(s => s.amount > 0);
    }

    const cashReceivedNum = paymentMethod === 'Cash' 
      ? (Number(cashReceived) || paidNow) 
      : (paymentMethod === 'Split' ? (Number(splitCash) || undefined) : undefined);
    const cashReturnedNum = paymentMethod === 'Cash' 
      ? Math.max(0, (cashReceivedNum || 0) - paidNow)
      : undefined;

    if (paymentMethod === 'Cash' && cashReceived && Number(cashReceived) < paidNow) {
      showToast(`Cash tendered (Rs. ${Number(cashReceived)}) cannot be less than amount due (Rs. ${paidNow}).`, "error");
      return;
    }

    if (role !== 'admin' && (Number(discountPercent) || 0) > 20) {
      showToast("Staff discounts are capped at 20%. Discounts above 20% require Admin supervisor override.", "error");
      return;
    }

    const activeClient = clientSearch.trim() || clientName.trim() || 'Walk-in Client';
    try {
      setIsSubmitting(true);
      const cardDetails = (paymentMethod === 'Card' || paymentMethod === 'Online' || (paymentMethod === 'Split' && (Number(splitCard) || 0) > 0)) ? {
        cardLastFour: (paymentMethod === 'Card' || paymentMethod === 'Split') ? cardLastFour : undefined,
        cardType: (paymentMethod === 'Card' || paymentMethod === 'Split') ? cardType : undefined,
        bankTxnId
      } : undefined;

      const txn = await completePosCheckout(
        activeClient,
        paymentMethod,
        Number(discountPercent) || 0,
        Number(taxPercent) || 0,
        cardDetails,
        {
          amountPaid: paidNow,
          remainingDue: remDue,
          cashReceived: cashReceivedNum,
          cashReturned: cashReturnedNum,
          paymentSplits: splitsPayload,
          clientId: selectedClientObj?.id,
          clientPhone: selectedClientObj?.phone,
          appointmentId: appointmentIdParam || undefined
        }
      );

      // Attach client phone & tender details for print modal
      const matchedClient = selectedClientObj || clients.find(c => c.name === activeClient);
      const txnWithPhone = {
        ...txn,
        phone: (txn as any).phone || matchedClient?.phone,
        cashReceived: cashReceivedNum,
        cashReturned: cashReturnedNum,
        paymentSplits: splitsPayload,
        time: txn.time || getLocalTimeString(),
        date: txn.date || getLocalDateString()
      };

      setLocalRecentTransactions(prev => [txnWithPhone, ...prev].slice(0, 5));
      setIsPaidSuccess(true);

      // Clear inputs
      setClientName('');
      setClientSearch('');
      setCardLastFour('');
      setCardType('Visa');
      setBankTxnId('');
      setCvc('');
      setExpiryDate('');
      setCashReceived('');
      setSplitCash('');
      setSplitCard('');
      setSplitOnline('');
      setIsPartialPayment(false);
      setPartialAmountPaid('');

      setTimeout(() => {
        setIsPaidSuccess(false);
        setPrintData({ title: `Invoice ${txnWithPhone.invoiceId}`, type: 'invoice', data: txnWithPhone });
      }, 800);
    } catch (e: any) {
      showToast("Checkout failed: " + e.message, "error");
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
            Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and print client receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={<DollarSign className="w-4 h-4" />}
            onClick={() => setIsAddExpenseOpen(true)}
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg screens) */}
      <div className="flex lg:hidden items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMobilePosTab('catalog')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${mobilePosTab === 'catalog'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
        >
          Treatment Catalog
        </button>
        <button
          onClick={() => setMobilePosTab('ticket')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${mobilePosTab === 'ticket'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
        >
          <span>Invoice Ticket</span>
          {posCart.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full font-mono">
              {posCart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* POS Grid: Left Service Catalog (60%) | Right Invoice Checkout Ticket (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Service & Product Catalog */}
        <div className={`lg:col-span-7 space-y-4 ${mobilePosTab === 'ticket' ? 'hidden lg:block' : 'block'}`}>
          {/* Catalog Type Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setCatalogMode('services');
                setSearch('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                catalogMode === 'services'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Treatments & Services ({services.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCatalogMode('products');
                setSearch('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                catalogMode === 'products'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Retail Products & Serums ({inventory.length})</span>
            </button>
          </div>

          {/* Category Tabs & Search */}
          <div className="luxury-card p-4 space-y-3">
            <Input
              placeholder={catalogMode === 'services' ? "Search treatments (e.g. HydraFacial, Botox, PRP...)" : "Search products (e.g. Serum, Cleanser, Cream, Sunscreen...)"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(catalogMode === 'services' ? categories : productCategories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => catalogMode === 'services' ? setSelectedCategory(cat) : setSelectedProductCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    (catalogMode === 'services' ? selectedCategory === cat : selectedProductCategory === cat)
                      ? (catalogMode === 'services' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20')
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* High Density Table (Services or Products) */}
          <div className="luxury-card p-4 max-h-[600px] overflow-y-auto pr-1">
            <div className="overflow-x-auto">
              {catalogMode === 'services' ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-2 px-3 rounded-l-xl">Service</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Price</th>
                      <th className="py-2 px-3 text-right rounded-r-xl">Add</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No treatments found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((srv) => (
                        <tr
                          key={srv.id}
                          onClick={() => srv.status !== 'Out of Stock' && addToPosCart(srv)}
                          className={`transition-colors ${
                            srv.status === 'Out of Stock'
                              ? 'opacity-60 bg-slate-100/50 dark:bg-slate-900/40 cursor-not-allowed'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {srv.name}
                              {srv.status === 'Out of Stock' && (
                                <Badge variant="danger" size="sm">Out of Stock</Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">{srv.durationMinutes} min</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="primary" size="sm">{srv.category}</Badge>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                            {formatPKR(srv.price, { decimals: false })}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {srv.status === 'Out of Stock' ? (
                              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Empty</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  title="Sell as 3-Session Prepaid Bundle (10% off)"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToPosCart(srv, true, 3);
                                  }}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                                >
                                  3-Sessions
                                </button>
                                <button
                                  type="button"
                                  className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                                  title="Add Single Session"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-2 px-3 rounded-l-xl">Product / Formula</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Stock Available</th>
                      <th className="py-2 px-3">Retail Price</th>
                      <th className="py-2 px-3 text-right rounded-r-xl">Add</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No retail products found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const isOutOfStock = prod.quantity <= 0;
                        const isLowStock = !isOutOfStock && prod.quantity <= (prod.minStock || 5);
                        return (
                          <tr
                            key={prod.id}
                            onClick={() => !isOutOfStock && addToPosCart(prod)}
                            className={`transition-colors ${
                              isOutOfStock
                                ? 'opacity-60 bg-slate-100/50 dark:bg-slate-900/40 cursor-not-allowed'
                                : 'hover:bg-emerald-50/50 dark:hover:bg-slate-800/40 cursor-pointer'
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{prod.itemName}</span>
                              </div>
                              {prod.supplier && (
                                <div className="text-[10px] text-slate-400 font-normal">Vendor: {prod.supplier}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="neutral" size="sm">{prod.category || 'Skincare'}</Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              {isOutOfStock ? (
                                <Badge variant="danger" size="sm">0 units (Out of Stock)</Badge>
                              ) : isLowStock ? (
                                <Badge variant="warning" size="sm">Low: {prod.quantity} units</Badge>
                              ) : (
                                <Badge variant="success" size="sm">{prod.quantity} in stock</Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                              {formatPKR(prod.price, { decimals: false })}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isOutOfStock ? (
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Out</span>
                              ) : (
                                <button
                                  type="button"
                                  className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                  title="Add to Ticket"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Invoice Checkout Ticket */}
        <div className={`lg:col-span-5 ${mobilePosTab === 'catalog' ? 'hidden lg:block' : 'block'}`}>
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
                      setClientName(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    className="w-full rounded-[14px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all duration-200 py-2.5 px-3.5"
                    placeholder="Search or enter client name..."
                  />
                  {isClientDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => {
                          setIsClientDropdownOpen(false);
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
                                setClientSearch(c.name);
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

            {selectedClientObj?.outstandingBalance && selectedClientObj.outstandingBalance > 0 ? (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Client Outstanding Dues: <strong>{formatPKR(selectedClientObj.outstandingBalance)}</strong></span>
                </div>
              </div>
            ) : null}

            {/* Cart Items List */}
            <div className="max-h-56 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {posCart.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No items selected. Click treatments or retail products on the left to add to ticket.
                </div>
              ) : (
                posCart.map((item) => (
                  <div key={item.serviceId} className="pt-2.5 pb-1 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</h5>
                        {item.isProduct && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            Product
                          </span>
                        )}
                        {item.isPackage && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                            {item.sessions || 3} Srv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                          {formatPKR(item.price, { decimals: false })}
                        </span>
                        {role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCartItem({ id: item.serviceId, name: item.name, price: item.price });
                              setCustomCartPrice(String(item.price));
                            }}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                            title="Set custom selling price (Admin only)"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        <span className="text-xs text-slate-400 font-mono">× {item.quantity}</span>
                        {item.isProduct && item.stockAvailable !== undefined && (
                          <span className="text-[10px] text-slate-400">
                            (avail: {item.stockAvailable})
                          </span>
                        )}
                      </div>

                      {/* Practitioner assignment */}
                      <div className="mt-1 flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <select
                          value={item.staffId || ''}
                          onChange={(e) => {
                            const sId = e.target.value;
                            const st = (staff || []).find(s => s.id === sId);
                            updatePosItemStaff(item.serviceId, sId, st?.name || '');
                          }}
                          className="text-[10px] py-0.5 px-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px]"
                        >
                          <option value="">Assign Practitioner</option>
                          {(staff || []).filter(s => s.status === 'Active').map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                          onClick={() => updatePosQuantity(item.serviceId, -1)}
                          className="p-1 text-slate-600 hover:text-slate-900 dark:hover:text-slate-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold font-mono">{item.quantity}</span>
                        <button
                          disabled={item.isProduct && item.stockAvailable !== undefined && item.quantity >= item.stockAvailable}
                          onClick={() => updatePosQuantity(item.serviceId, 1)}
                          className={`p-1 ${
                            item.isProduct && item.stockAvailable !== undefined && item.quantity >= item.stockAvailable
                              ? 'opacity-30 cursor-not-allowed text-slate-400'
                              : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                          title={item.isProduct && item.stockAvailable !== undefined && item.quantity >= item.stockAvailable ? 'Cannot exceed branch stock' : 'Add one more'}
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400">Discount (%)</span>
                    {role !== 'admin' && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                        Max 20%
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={discountPercent}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const num = Number(val);
                      if (role !== 'admin' && num > 20) {
                        showToast("Staff discount capped at 20%. Higher discount requires Admin supervisor.", "error");
                        setDiscountPercent('20');
                      } else {
                        setDiscountPercent(val);
                      }
                    }}
                    className="w-16 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
                <div className="flex justify-end gap-1">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(String(pct))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${Number(discountPercent) === pct
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

              {/* Partial Advance / Due Payment Option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPartialPayment}
                    onChange={(e) => {
                      setIsPartialPayment(e.target.checked);
                      if (e.target.checked && !partialAmountPaid) {
                        setPartialAmountPaid(Math.floor(grandTotal / 2).toString());
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Partial / Advance (Client owes balance)</span>
                </label>

                {isPartialPayment && (
                  <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Amount Paid Now:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-slate-500">PKR</span>
                        <input
                          type="number"
                          min="0"
                          max={grandTotal}
                          value={partialAmountPaid}
                          onChange={(e) => setPartialAmountPaid(e.target.value)}
                          className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200/60 dark:border-amber-900/60">
                      <span className="font-bold text-amber-700 dark:text-amber-400">Remaining Balance Due:</span>
                      <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                        {formatPKR(Math.max(0, grandTotal - (Number(partialAmountPaid) || 0)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Cash', 'Card', 'Online', 'Split'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm);
                      if (pm === 'Cash' && !cashReceived) {
                        setCashReceived(String(isPartialPayment ? (Number(partialAmountPaid) || 0) : grandTotal));
                      }
                      if (pm === 'Split' && !splitCash && !splitCard && !splitOnline) {
                        const targetAmt = isPartialPayment ? (Number(partialAmountPaid) || 0) : grandTotal;
                        setSplitCash(String(targetAmt));
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${paymentMethod === pm
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash details with Live Tender & Change Calculation */}
            {paymentMethod === 'Cash' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-900 dark:text-emerald-300">Cash Received / Tendered</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-emerald-600 font-mono">PKR</span>
                    <input
                      type="number"
                      min="0"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={String(isPartialPayment ? (Number(partialAmountPaid) || 0) : grandTotal)}
                      className="w-28 px-2 py-1 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/60">
                  <span className="text-emerald-800 dark:text-emerald-400">Change Due to Customer</span>
                  <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300 font-black">
                    {formatPKR(Math.max(0, (Number(cashReceived) || 0) - (isPartialPayment ? (Number(partialAmountPaid) || 0) : grandTotal)))}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Split Tender Breakdown */}
            {paymentMethod === 'Split' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-2.5"
              >
                <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">
                  Split Payment Allocation
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Cash Portion:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">PKR</span>
                      <input
                        type="number"
                        min="0"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Card Portion:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">PKR</span>
                      <input
                        type="number"
                        min="0"
                        value={splitCard}
                        onChange={(e) => setSplitCard(e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Online Portion:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">PKR</span>
                      <input
                        type="number"
                        min="0"
                        value={splitOnline}
                        onChange={(e) => setSplitOnline(e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const targetAmt = isPartialPayment ? (Number(partialAmountPaid) || 0) : grandTotal;
                  const totalSplit = (Number(splitCash) || 0) + (Number(splitCard) || 0) + (Number(splitOnline) || 0);
                  const diff = Math.round((targetAmt - totalSplit) * 100) / 100;
                  return (
                    <div className="pt-2 border-t border-indigo-200/70 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-950 dark:text-indigo-200">Allocated / Target:</span>
                      <span className={`font-mono font-bold ${diff === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formatPKR(totalSplit)} / {formatPKR(targetAmt)} {diff !== 0 && `(Diff: ${formatPKR(diff)})`}
                      </span>
                    </div>
                  );
                })()}

                {Number(splitCard) > 0 && (
                  <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/40">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                      <span>Card POS Slip / Bank Txn ID</span>
                      <span className="text-[10px] text-red-500 font-bold uppercase">Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. POS-SLIP-129841"
                      value={bankTxnId}
                      onChange={(e) => setBankTxnId(e.target.value)}
                      className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}
              </motion.div>
            )}

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
                      <option value="PayPak">PayPak</option>
                      <option value="Mastercard">Mastercard</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => {
                        const inputVal = e.target.value;
                        let digits = inputVal.replace(/\D/g, '').slice(0, 4);
                        if (digits.length === 1 && parseInt(digits, 10) > 1) {
                          digits = `0${digits}`;
                        }
                        if (digits.length >= 2) {
                          if (expiryDate.endsWith('/') && inputVal.length === 2) {
                            setExpiryDate(digits.slice(0, 1));
                            return;
                          }
                          setExpiryDate(`${digits.slice(0, 2)}/${digits.slice(2)}`);
                        } else {
                          setExpiryDate(digits);
                        }
                      }}
                      className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CVC#</label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. 123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                    <span>Bank Transaction ID / Slip No</span>
                    <span className="text-[10px] text-red-500 font-bold uppercase">Required</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. POS-SLIP-129841"
                    value={bankTxnId}
                    onChange={(e) => setBankTxnId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </motion.div>
            )}

            {/* Online details sub-form */}
            {paymentMethod === 'Online' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TRXID (Online Transaction ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. TRX-987410"
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
                disabled={posCart.length === 0 || isSubmitting}
                variant="primary"
                size="lg"
                className="w-full"
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                {isSubmitting ? 'Processing Payment...' : isPaidSuccess ? 'Payment Processed!' : `Complete Payment (${formatPKR(grandTotal)})`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Client Add Modal */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setQuickClientError(null);
        }}
        title="Quick Register Client"
        description="Create a client profile immediately without leaving the checkout page"
        maxWidth="md"
      >
        <form onSubmit={handleQuickAddClient} className="space-y-4">
          {quickClientError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {quickClientError}
            </div>
          )}

          <Input
            label="Client Full Name"
            placeholder="e.g. Ayesha Khan"
            value={quickClientName}
            onChange={(e) => setQuickClientName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            placeholder="e.g. +92 3001234567"
            value={quickClientPhone}
            onChange={(e) => setQuickClientPhone(formatPhoneInput(e.target.value))}
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
            <Button type="button" variant="outline" onClick={() => setIsAddClientModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register & Select Client'}
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
                      <td className="py-3 px-4">
                        <div className="font-bold">{txn.clientName}</div>
                        {txn.status === 'Refunded' && (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50">
                            Refunded
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral">{txn.paymentMethod}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">{formatPKR(txn.grandTotal)}</td>
                      <td className="py-3 px-4 text-slate-400">{txn.date}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => handleReprint(txn)}
                            variant="outline"
                            size="sm"
                            icon={<Printer className="w-3.5 h-3.5" />}
                          >
                            {txn.reprintCount && txn.reprintCount > 0 ? `Reprint (${txn.reprintCount})` : 'Reprint'}
                          </Button>
                          {role === 'admin' && (
                            <>
                              <Button
                                onClick={() => handleOpenEditTxnModal(txn)}
                                variant="secondary"
                                size="sm"
                                icon={<Edit2 className="w-3.5 h-3.5" />}
                              >
                                Edit
                              </Button>
                              {txn.status !== 'Refunded' && (
                                <Button
                                  onClick={() => handleOpenRefundModal(txn)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/60 dark:hover:bg-red-950/40"
                                >
                                  Refund
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={isEditTxnModalOpen}
        onClose={() => {
          setIsEditTxnModalOpen(false);
          setEditingTxnId(null);
        }}
        title="Edit Transaction Details"
      >
        <form onSubmit={handleSaveEditTxn} className="space-y-4">
          <Input
            label="Client Name"
            value={editClientName}
            onChange={(e) => setEditClientName(e.target.value)}
            required
          />

          <Select
            label="Payment Method"
            options={[
              { label: 'Cash', value: 'Cash' },
              { label: 'Card', value: 'Card' },
              { label: 'Online', value: 'Online' }
            ]}
            value={editPaymentMethod}
            onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
          />

          <Input
            label="Total Amount (Rs)"
            type="number"
            value={editGrandTotal}
            onChange={(e) => setEditGrandTotal(e.target.value)}
            required
          />

          <Input
            label="Transaction Date"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditTxnModalOpen(false);
                setEditingTxnId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Cart Item Price Modal */}
      <Modal
        isOpen={!!editingCartItem}
        onClose={() => setEditingCartItem(null)}
        title="Set Item Selling Price"
        description="Adjust the unit selling price for this specific invoice ticket"
        maxWidth="sm"
      >
        {editingCartItem && (
          <form onSubmit={handleSaveCartItemPrice} className="space-y-4 pt-2">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Item Selected</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingCartItem.name}
              </div>
              <div className="text-xs text-slate-500 flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>Standard Catalog Price:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatPKR(editingCartItem.price)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Discount Presets
                </label>
                <button
                  type="button"
                  onClick={() => setCustomCartPrice(String(editingCartItem.price))}
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Reset Catalog
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((pct) => {
                  const discounted = Math.round(editingCartItem.price * (1 - pct / 100));
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCustomCartPrice(String(discounted))}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/40 rounded-xl font-bold text-xs transition cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
                    >
                      -{pct}%
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Custom Unit Price (PKR)"
              type="text"
              value={customCartPrice}
              onChange={(e) => setCustomCartPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 4500"
              required
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCartItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Apply Price
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Refund Transaction Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setRefundingTxn(null);
        }}
        title="Process Transaction Refund"
        description={refundingTxn ? `Refund invoice ${refundingTxn.invoiceId} (${formatPKR(refundingTxn.grandTotal)})` : undefined}
        maxWidth="sm"
      >
        {refundingTxn && (
          <form onSubmit={handleRefundSubmit} className="space-y-4 pt-2">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl space-y-1">
              <div className="text-[10px] text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">Refund Action</div>
              <p className="text-xs text-red-800 dark:text-red-300">
                This will mark the selected items as refunded, reverse client spend and dues, and restock inventory.
              </p>
            </div>

            {refundingTxn.items && refundingTxn.items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between items-center">
                  <span>Select Line Items to Refund</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {refundingTxn.items.filter((_: any, i: number) => selectedRefundItems[i]).length} of {refundingTxn.items.length} selected
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {refundingTxn.items.map((item: any, idx: number) => (
                    <label key={idx} className="flex items-center justify-between py-1 px-1 cursor-pointer text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!selectedRefundItems[idx]}
                          onChange={(e) => {
                            setSelectedRefundItems(prev => ({ ...prev, [idx]: e.target.checked }));
                          }}
                          className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-500">
                        {item.quantity} × {formatPKR(item.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Refund Reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Client requested return, incorrect service selected"
              required
            />

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={refundRestock}
                onChange={(e) => setRefundRestock(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>Restock returned inventory / products</span>
            </label>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRefundModalOpen(false);
                  setRefundingTxn(null);
                }}
                disabled={isRefunding}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isRefunding || !refundReason.trim()}
              >
                {isRefunding ? 'Refunding...' : 'Confirm Refund'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl ${toastMessage.type === 'success'
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
      {/* Floating Mobile Quick Checkout Bar */}
      {mobilePosTab === 'catalog' && posCart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <button
            onClick={() => setMobilePosTab('ticket')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm">
                View Ticket ({posCart.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
            </div>
            <span className="font-mono text-sm font-black bg-blue-700 px-3 py-1 rounded-xl">
              {formatPKR(subtotal)}
            </span>
          </button>
        </div>
      )}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-500 font-bold">
        Loading billing system...
      </div>
    }>
      <POSContent />
    </Suspense>
  );
}
