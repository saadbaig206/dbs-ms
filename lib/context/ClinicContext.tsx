'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserRole,
  Appointment,
  Client,
  Staff,
  ServiceItem,
  InventoryItem,
  ExpenseItem,
  FinancialTransaction,
  AttendanceRecord,
  NotificationItem,
  POSCartItem,
  Branch,
  PurchaseItem,
  PurchaseBill,
  PartnerEquityOverview,
  PartnerDrawing,
  ClientPackage,
  PackageRedemptionLog,
  PurchaseReturn
} from '../types/clinic';
import { apiFetch, authClient } from '../api/client';
import { CLINIC_INFO } from '../constants/clinic';
import { getLocalDateString, getLocalTimeString } from '../utils/date';

interface ClinicContextType {
  // Clinic General Info
  clinicInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    currency: string;
    language: string;
    operatingHours?: string;
  };
  updateClinicInfo: (info: {
    name: string;
    phone: string;
    email: string;
    address: string;
    currency: string;
    language: string;
    operatingHours?: string;
  }) => void;

  // Role & User
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Search & Command Palette
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;

  // Print System
  printData: { title: string; type: 'invoice' | 'slip' | 'client' | 'z-report'; data: any } | null;
  setPrintData: (data: { title: string; type: 'invoice' | 'slip' | 'client' | 'z-report'; data: any } | null) => void;

  // Collections & CRUD
  branches: Branch[];
  addBranch: (newBranch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (id: string, updated: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  staff: Staff[];
  addStaff: (newStaff: Omit<Staff, 'id'> & { password?: string }) => Promise<void>;
  updateStaff: (id: string, updated: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;

  services: ServiceItem[];
  addService: (newService: Omit<ServiceItem, 'id'>) => Promise<void>;
  updateService: (id: string, updated: Partial<ServiceItem>) => Promise<void>;

  clients: Client[];
  addClient: (newClient: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>) => Promise<Client | undefined>;
  updateClient: (id: string, updated: Partial<Client>) => Promise<void>;

  appointments: Appointment[];
  addAppointment: (newApt: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  sendAppointmentReminder: (id: string) => Promise<void>;
  rejectAppointmentReminder: (id: string) => Promise<void>;
  markAppointmentReminderSent: (id: string) => Promise<void>;

  inventory: InventoryItem[];
  refreshInventory: () => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status'>) => Promise<void>;
  updateInventoryQuantity: (id: string, delta: number, reason?: string) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;

  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => Promise<void>;
  updateExpense: (id: string, updated: Partial<ExpenseItem>) => Promise<void>;
  deleteExpense: (id: string) => Promise<any>;
  removeExpensesByStaffId: (staffId: string) => Promise<void>;

  transactions: FinancialTransaction[];
  addTransaction: (txn: Omit<FinancialTransaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updated: Partial<FinancialTransaction>) => Promise<void>;

  attendance: AttendanceRecord[];
  markAttendance: (
    staffId: string,
    status: AttendanceRecord['status'],
    notes?: string,
    latitude?: number,
    longitude?: number
  ) => Promise<void>;
  revertAttendance: (id: string) => Promise<void>;

  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // POS State
  posCart: POSCartItem[];
  addToPosCart: (item: ServiceItem | InventoryItem, isPackage?: boolean, sessions?: number, customPrice?: number) => void;
  removeFromPosCart: (serviceId: string) => void;
  updatePosQuantity: (serviceId: string, delta: number) => void;
  updatePosItemPrice: (serviceId: string, newPrice: number) => void;
  updatePosItemStaff: (serviceId: string, staffId: string, staffName: string) => void;
  clearPosCart: () => void;
  completePosCheckout: (
    clientName: string,
    paymentMethod: FinancialTransaction['paymentMethod'],
    discountPercent: number,
    taxPercent: number,
    cardDetails?: { cardLastFour?: string; cardType?: string; bankTxnId?: string },
    additionalDetails?: {
      amountPaid?: number;
      remainingDue?: number;
      cashReceived?: number;
      cashReturned?: number;
      paymentSplits?: any[];
      packageId?: string;
      clientId?: string;
      clientPhone?: string;
      appointmentId?: string;
    }
  ) => Promise<FinancialTransaction>;

  // Purchases
  purchaseItems: PurchaseItem[];
  purchaseBills: PurchaseBill[];
  refreshPurchases: () => Promise<void>;
  addPurchase: (data: any) => Promise<void>;
  payPurchaseBill: (id: string, amount: number, paymentMethod: string, notes?: string) => Promise<void>;
  returns: PurchaseReturn[];
  refreshReturns: () => Promise<void>;
  createPurchaseReturn: (data: any) => Promise<PurchaseReturn>;

  // Partner Equity
  partnerEquity: PartnerEquityOverview | null;
  refreshPartnerEquity: () => Promise<void>;
  recordPartnerDrawing: (data: any) => Promise<void>;
  updatePartnerProfile: (data: { partnerName: string; equityPercentage: number; initialInvestment: number; notes?: string }) => Promise<void>;

  // Packages & Prepaid Sessions
  packages: ClientPackage[];
  refreshPackages: () => Promise<void>;
  redeemPackageSession: (packageId: string, staffName?: string, notes?: string) => Promise<void>;

  // Client Dues Settlement
  settleClientDue: (clientId: string, amount: number, paymentMethod: string, notes?: string) => Promise<void>;

  // Loading & error states
  isLoading: boolean;
  error: string | null;
  refreshData: (showSpinner?: boolean) => Promise<void>;

  // Selected Branch for Dashboard/List filtering
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  userBranchId: string | null;
  userId: string | null;
  userEmail: string | null;

  partners: { id: number; username: string }[];
  addPartner: (username: string, password: string) => Promise<void>;
  deletePartner: (id: number) => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('staff');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clinicInfo, setClinicInfoState] = useState<ClinicContextType['clinicInfo']>({
    name: CLINIC_INFO.name,
    phone: CLINIC_INFO.phone,
    email: CLINIC_INFO.email,
    address: CLINIC_INFO.address,
    currency: 'PKR (Rs)',
    language: 'English (US)',
    operatingHours: CLINIC_INFO.operatingHours || '11:00 AM - 08:00 PM (Mon-Sat)',
  });

  const updateClinicInfo = (info: ClinicContextType['clinicInfo']) => {
    setClinicInfoState(info);
    localStorage.setItem('clinic_info', JSON.stringify(info));
  };

  function loadCachedData<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`clinic_cache_${key}`);
      if (!item) return fallback;
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === undefined) return fallback;
      return parsed;
    } catch (e) {
      return fallback;
    }
  }

  function saveCachedData(key: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`clinic_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }

  const [theme] = useState<'light' | 'dark'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [printData, setPrintData] = useState<{ title: string; type: 'invoice' | 'slip' | 'client' | 'z-report'; data: any } | null>(null);

  // Collections state initialized with empty arrays to guarantee identical SSR and initial client hydration
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [partners, setPartners] = useState<{ id: number; username: string }[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [partnerEquity, setPartnerEquity] = useState<PartnerEquityOverview | null>(null);
  const [packages, setPackages] = useState<ClientPackage[]>([]);

  // POS
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);

  // Loading state starts false to guarantee identical server and initial client hydration
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force dark mode globally
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('clinic_theme', 'dark');
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('clinic_theme', 'dark');
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_role', newRole);
    }
    // Write cookie
    document.cookie = `user_role=${newRole}; path=/; max-age=${60 * 60 * 24 * 8}; SameSite=Lax`;
  };

  const toggleRole = () => {
    let nextRole: UserRole = 'admin';
    if (role === 'admin') nextRole = 'staff';
    else if (role === 'staff') nextRole = 'partner';
    else if (role === 'partner') nextRole = 'admin';
    setRole(nextRole);
  };

  // Safe API fetcher with fallback
  const fetchSafe = async <T,>(url: string, fallback: T): Promise<T> => {
    try {
      return await apiFetch<T>(url);
    } catch (e) {
      return fallback;
    }
  };

  // Main fetch function to load all backend data in a single ultra-fast /bootstrap request
  const refreshData = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      const bootstrapRes = await fetchSafe<any>('/bootstrap', null);
      if (bootstrapRes && bootstrapRes.user) {
        const activeUser = bootstrapRes.user;
        const activeRole = (activeUser.role || 'staff') as UserRole;
        const finalEmail = activeUser.email || userEmail || (typeof window !== 'undefined' ? localStorage.getItem('user_email') : null);
        setRoleState(activeRole);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_role', activeRole);
          if (finalEmail) {
            localStorage.setItem('user_email', finalEmail);
          }
        }
        document.cookie = `user_role=${activeRole}; path=/; max-age=${60 * 60 * 24 * 8}; SameSite=Lax`;
        setUserId(activeUser.id || null);
        setUserEmail(finalEmail || null);
        const bId = activeUser.branch_id || activeUser.branchId || null;
        setUserBranchId(bId);
        if (activeRole === 'staff' && bId) {
          setSelectedBranchId(prev => prev || bId);
        }

        const safeSet = (setter: any, key: string, data: any[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setter(data);
            saveCachedData(key, data);
          } else {
            const cached = loadCachedData(key, []);
            if (cached.length > 0) {
              setter(cached);
            } else if (Array.isArray(data)) {
              setter(data);
            }
          }
        };

        if (bootstrapRes.branches) safeSet(setBranches, 'branches', bootstrapRes.branches);
        if (bootstrapRes.staff) safeSet(setStaff, 'staff', bootstrapRes.staff);
        if (bootstrapRes.services) safeSet(setServices, 'services', bootstrapRes.services);
        if (bootstrapRes.clients) safeSet(setClients, 'clients', bootstrapRes.clients);
        if (bootstrapRes.appointments) safeSet(setAppointments, 'appointments', bootstrapRes.appointments);
        if (bootstrapRes.inventory) safeSet(setInventory, 'inventory', bootstrapRes.inventory);
        if (bootstrapRes.attendance) safeSet(setAttendance, 'attendance', bootstrapRes.attendance);
        if (bootstrapRes.notifications) safeSet(setNotifications, 'notifications', bootstrapRes.notifications);
        if (bootstrapRes.expenses) safeSet(setExpenses, 'expenses', bootstrapRes.expenses);
        if (bootstrapRes.transactions) safeSet(setTransactions, 'transactions', bootstrapRes.transactions);
        if (bootstrapRes.partners) safeSet(setPartners, 'partners', bootstrapRes.partners);
        if (bootstrapRes.packages) safeSet(setPackages, 'packages', bootstrapRes.packages);
        if (bootstrapRes.purchaseBills) safeSet(setPurchaseBills, 'purchase_bills', bootstrapRes.purchaseBills);
        if (bootstrapRes.purchaseItems) safeSet(setPurchaseItems, 'purchase_items', bootstrapRes.purchaseItems);
        if (activeRole === 'admin' || activeRole === 'partner') {
          refreshPartnerEquity();
        }
        return;
      }

      // Fallback if bootstrap endpoint is unavailable
      const localRole = (typeof window !== 'undefined'
        ? (localStorage.getItem('user_role') || (document.cookie.match(/(?:^|; )user_role=([^;]*)/)?.[1]))
        : null) as UserRole | null;
      const initialRole = localRole || role || 'staff';

      const mePromise = authClient.me().catch(() => null);
      const expensesPromise = (initialRole === 'admin' || initialRole === 'partner')
        ? fetchSafe<ExpenseItem[]>('/expenses', [])
        : Promise.resolve([]);
      const transactionsPromise = (initialRole === 'admin' || initialRole === 'partner')
        ? fetchSafe<FinancialTransaction[]>('/transactions', [])
        : Promise.resolve([]);
      const partnersPromise = (initialRole === 'admin')
        ? fetchSafe<{ id: number; username: string }[]>('/auth/partners', [])
        : Promise.resolve([]);

      const [
        fetchedUser,
        branchesData,
        staffData,
        servicesData,
        clientsData,
        appointmentsData,
        inventoryData,
        attendanceData,
        notificationsData,
        expensesData,
        transactionsData,
        partnersData
      ] = await Promise.all([
        mePromise,
        fetchSafe<Branch[]>('/branches', []),
        fetchSafe<Staff[]>('/staff', []),
        fetchSafe<ServiceItem[]>('/services', []),
        fetchSafe<Client[]>('/clients', []),
        fetchSafe<Appointment[]>('/appointments', []),
        fetchSafe<InventoryItem[]>('/inventory', []),
        fetchSafe<AttendanceRecord[]>('/attendance', []),
        fetchSafe<NotificationItem[]>('/notifications', []),
        expensesPromise,
        transactionsPromise,
        partnersPromise
      ]);

      let activeUser = fetchedUser;
      if (!activeUser && typeof window !== 'undefined') {
        const localToken = localStorage.getItem('access_token') || (document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1]);
        const localEmail = localStorage.getItem('user_email');
        if (localToken && initialRole) {
          activeUser = {
            id: localEmail || 'user',
            email: localEmail || initialRole,
            role: initialRole
          };
        }
      }

      if (!activeUser) {
        setIsLoading(false);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/') {
          await authClient.logout();
          window.location.href = '/login';
        }
        return;
      }

      const finalEmail = activeUser.email || userEmail || (typeof window !== 'undefined' ? localStorage.getItem('user_email') : null);
      const activeRole = (activeUser.role || initialRole || (finalEmail && (finalEmail.toLowerCase().includes('drzaini') || finalEmail.toLowerCase().includes('admin')) ? 'admin' : 'staff')) as UserRole;
      setRoleState(activeRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', activeRole);
        if (finalEmail) {
          localStorage.setItem('user_email', finalEmail);
        }
      }
      document.cookie = `user_role=${activeRole}; path=/; max-age=${60 * 60 * 24 * 8}; SameSite=Lax`;
      setUserId(activeUser.id || null);
      setUserEmail(finalEmail || null);
      const bId = (activeUser as any).branch_id || (activeUser as any).branchId || null;
      setUserBranchId(bId);
      if (activeRole === 'staff' && bId) {
        setSelectedBranchId(prev => prev || bId);
      }

      const safeSetFallback = (setter: any, key: string, data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setter(data);
          saveCachedData(key, data);
        } else {
          const cached = loadCachedData(key, []);
          if (cached.length > 0) {
            setter(cached);
          } else if (Array.isArray(data)) {
            setter(data);
          }
        }
      };

      safeSetFallback(setBranches, 'branches', branchesData);
      safeSetFallback(setStaff, 'staff', staffData);
      safeSetFallback(setServices, 'services', servicesData);
      safeSetFallback(setClients, 'clients', clientsData);
      safeSetFallback(setAppointments, 'appointments', appointmentsData);
      safeSetFallback(setInventory, 'inventory', inventoryData);
      safeSetFallback(setAttendance, 'attendance', attendanceData);
      safeSetFallback(setNotifications, 'notifications', notificationsData);
      safeSetFallback(setExpenses, 'expenses', expensesData);
      safeSetFallback(setTransactions, 'transactions', transactionsData);
      safeSetFallback(setPartners, 'partners', partnersData);
    } catch (err: any) {
      console.error('Failed to load clinic data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  // Targeted Refetch Helpers
  const refreshBranches = async () => { const data = await fetchSafe('/branches', []); setBranches(data); saveCachedData('branches', data); };
  const refreshStaff = async () => { const data = await fetchSafe('/staff', []); setStaff(data); saveCachedData('staff', data); };
  const refreshServices = async () => { const data = await fetchSafe('/services', []); setServices(data); saveCachedData('services', data); };
  const refreshClients = async () => { const data = await fetchSafe('/clients', []); setClients(data); saveCachedData('clients', data); };
  const refreshAppointments = async () => { const data = await fetchSafe('/appointments', []); setAppointments(data); saveCachedData('appointments', data); };
  const refreshInventory = async () => { const data = await fetchSafe('/inventory', []); setInventory(data); saveCachedData('inventory', data); };
  const refreshAttendance = async () => { const data = await fetchSafe('/attendance', []); setAttendance(data); saveCachedData('attendance', data); };
  const refreshNotifications = async () => { const data = await fetchSafe('/notifications', []); setNotifications(data); saveCachedData('notifications', data); };
  const refreshExpenses = async () => {
    if (role === 'admin' || role === 'partner') {
      const data = await fetchSafe('/expenses', []);
      setExpenses(data);
      saveCachedData('expenses', data);
    }
  };
  const refreshTransactions = async () => {
    if (role === 'admin' || role === 'partner') {
      const data = await fetchSafe('/transactions', []);
      setTransactions(data);
      saveCachedData('transactions', data);
    }
  };
  const refreshPartners = async () => {
    if (role === 'admin') {
      const data = await fetchSafe('/auth/partners', []);
      setPartners(data);
      saveCachedData('partners', data);
    }
  };

  // Fetch data and hydrate client storage safely after initial mount without hydration mismatch
  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem('user_email');
      if (storedEmail) {
        setUserEmail(storedEmail);
      }
      const storedRole = localStorage.getItem('user_role') || (document.cookie.match(/(?:^|; )user_role=([^;]*)/)?.[1]);
      if (storedRole === 'admin' || storedRole === 'staff' || storedRole === 'partner') {
        setRoleState(storedRole as UserRole);
      } else if (storedEmail) {
        const lower = storedEmail.toLowerCase().replace(/[\.\s_]/g, '');
        if (lower.includes('drzaini') || lower.includes('admin')) {
          setRoleState('admin');
        }
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('clinic_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name && !parsed.name.includes('Aura')) {
          setClinicInfoState(parsed);
        } else if (parsed?.name?.includes('Aura')) {
          const updated = { ...parsed, name: CLINIC_INFO.name };
          localStorage.setItem('clinic_info', JSON.stringify(updated));
          setClinicInfoState(updated);
        }
      }
    } catch (e) {}

    // Load cached collections for instant offline display
    const b = loadCachedData<Branch[]>('branches', []);
    if (b.length > 0) setBranches(b);
    const s = loadCachedData<Staff[]>('staff', []);
    if (s.length > 0) setStaff(s);
    const srv = loadCachedData<ServiceItem[]>('services', []);
    if (srv.length > 0) setServices(srv);
    const c = loadCachedData<Client[]>('clients', []);
    if (c.length > 0) setClients(c);
    const a = loadCachedData<Appointment[]>('appointments', []);
    if (a.length > 0) setAppointments(a);
    const inv = loadCachedData<InventoryItem[]>('inventory', []);
    if (inv.length > 0) setInventory(inv);
    const exp = loadCachedData<ExpenseItem[]>('expenses', []);
    if (exp.length > 0) setExpenses(exp);
    const tx = loadCachedData<FinancialTransaction[]>('transactions', []);
    if (tx.length > 0) setTransactions(tx);
    const att = loadCachedData<AttendanceRecord[]>('attendance', []);
    if (att.length > 0) setAttendance(att);
    const notif = loadCachedData<NotificationItem[]>('notifications', []);
    if (notif.length > 0) setNotifications(notif);
    const prt = loadCachedData<{ id: number; username: string }[]>('partners', []);
    if (prt.length > 0) setPartners(prt);
    const pi = loadCachedData<PurchaseItem[]>('purchase_items', []);
    if (pi.length > 0) setPurchaseItems(pi);
    const pb = loadCachedData<PurchaseBill[]>('purchase_bills', []);
    if (pb.length > 0) setPurchaseBills(pb);
    const ret = loadCachedData<PurchaseReturn[]>('returns', []);
    if (ret.length > 0) setReturns(ret);
    const pkg = loadCachedData<ClientPackage[]>('packages', []);
    if (pkg.length > 0) setPackages(pkg);

    refreshData(false);
  }, []);

  // Branches CRUD
  const addBranch = async (newBranch: Omit<Branch, 'id'>) => {
    const created: Branch = { ...newBranch, id: `BR-${Math.floor(Math.random() * 900) + 100}` };
    try {
      await apiFetch('/branches', {
        method: 'POST',
        body: JSON.stringify(newBranch),
      });
      await refreshBranches();
    } catch (e) {
      setBranches(prev => { const next = [created, ...prev]; saveCachedData('branches', next); return next; });
    }
  };

  const updateBranch = async (id: string, updated: Partial<Branch>) => {
    try {
      await apiFetch(`/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      await refreshBranches();
    } catch (e) {
      setBranches(prev => { const next = prev.map(b => b.id === id ? { ...b, ...updated } : b); saveCachedData('branches', next); return next; });
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      await apiFetch(`/branches/${id}`, {
        method: 'DELETE',
      });
      await refreshBranches();
    } catch (e) {
      setBranches(prev => { const next = prev.filter(b => b.id !== id); saveCachedData('branches', next); return next; });
    }
  };

  // Staff CRUD
  const addStaff = async (newStaff: Omit<Staff, 'id'> & { password?: string }) => {
    try {
      const savedStaff = await apiFetch<Staff>('/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      if (savedStaff && savedStaff.id) {
        setStaff(prev => {
          const next = [savedStaff, ...prev.filter(s => s.id !== savedStaff.id)];
          saveCachedData('staff', next);
          return next;
        });
      }
      await refreshStaff();
    } catch (e: any) {
      console.error('Failed to add staff member on backend:', e);
      throw e;
    }
  };

  const updateStaff = async (id: string, updated: Partial<Staff>) => {
    try {
      const saved = await apiFetch<Staff>(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      setStaff(prev => {
        const next = prev.map(s => s.id === id ? { ...s, ...(saved || updated) } : s);
        saveCachedData('staff', next);
        return next;
      });
      await refreshStaff();
    } catch (e) {
      console.error('Failed to update staff member on backend:', e);
      throw e;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await apiFetch(`/staff/${id}`, {
        method: 'DELETE',
      });
      setStaff(prev => {
        const next = prev.filter(s => s.id !== id);
        saveCachedData('staff', next);
        return next;
      });
      await refreshStaff();
    } catch (e) {
      console.error('Failed to delete staff member on backend:', e);
      throw e;
    }
  };

  // Services CRUD
  const addService = async (newService: Omit<ServiceItem, 'id'>) => {
    try {
      await apiFetch('/services', {
        method: 'POST',
        body: JSON.stringify(newService),
      });
      await refreshServices();
    } catch (e) {
      console.error('Failed to create service on backend:', e);
      throw e;
    }
  };

  const updateService = async (id: string, updated: Partial<ServiceItem>) => {
    try {
      await apiFetch(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      await refreshServices();
    } catch (e) {
      console.error('Failed to update service on backend:', e);
      throw e;
    }
  };

  const recentAddAptRef = useRef<{ key: string; timestamp: number }[]>([]);
  const recentAddClientRef = useRef<{ key: string; timestamp: number }[]>([]);

  // Clients CRUD
  const addClient = async (newClientData: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>): Promise<Client | undefined> => {
    const key = `${newClientData.name.trim().toLowerCase()}-${newClientData.phone.trim()}`;
    const now = Date.now();
    recentAddClientRef.current = recentAddClientRef.current.filter(item => now - item.timestamp < 3000);
    if (recentAddClientRef.current.some(item => item.key === key)) {
      const existing = (clients || []).find(c => c.phone && c.phone.trim() === newClientData.phone.trim());
      return existing;
    }
    recentAddClientRef.current.push({ key, timestamp: now });

    try {
      const created = await apiFetch<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(newClientData),
      });
      await refreshClients();
      return created;
    } catch (e) {
      console.error('Failed to create client on backend:', e);
      throw e;
    }
  };

  const updateClient = async (id: string, updated: Partial<Client>) => {
    try {
      await apiFetch(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      await refreshClients();
    } catch (e) {
      console.error('Failed to update client on backend:', e);
      throw e;
    }
  };

  // Appointments CRUD
  const addAppointment = async (newApt: Omit<Appointment, 'id'>) => {
    const key = `${newApt.clientName.trim().toLowerCase()}-${newApt.serviceId}-${newApt.date}-${newApt.time}`;
    const now = Date.now();
    recentAddAptRef.current = recentAddAptRef.current.filter(item => now - item.timestamp < 3000);
    if (recentAddAptRef.current.some(item => item.key === key)) {
      return;
    }
    recentAddAptRef.current.push({ key, timestamp: now });

    const created: Appointment = {
      ...newApt,
      id: `APT-${Math.floor(Math.random() * 900) + 100}`,
      status: newApt.status || 'Confirmed',
      reminderStatus: newApt.reminderStatus || 'Pending'
    };
    // Optimistic UI update for instant feedback
    setAppointments(prev => {
      const next = [created, ...prev];
      saveCachedData('appointments', next);
      return next;
    });

    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...newApt,
          branchId: newApt.branchId || selectedBranchId || userBranchId || undefined
        }),
      });
      refreshAppointments().catch(() => {});
    } catch (e) {
      // Revert optimistic appointment on backend rejection/conflict
      setAppointments(prev => {
        const next = prev.filter(a => a.id !== created.id);
        saveCachedData('appointments', next);
        return next;
      });
      throw e;
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
      await apiFetch(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await refreshAppointments();
    } catch (e) {
      setAppointments(prev => { const next = prev.map(a => a.id === id ? { ...a, status } : a); saveCachedData('appointments', next); return next; });
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await apiFetch(`/appointments/${id}`, {
        method: 'DELETE',
      });
      await refreshAppointments();
    } catch (e) {
      setAppointments(prev => { const next = prev.filter(a => a.id !== id); saveCachedData('appointments', next); return next; });
    }
  };

  const sendAppointmentReminder = async (id: string) => {
    try {
      await apiFetch(`/appointments/${id}/reminder/send`, {
        method: 'POST',
      });
      await refreshAppointments();
    } catch (e) {
      setAppointments(prev => {
        const next = prev.map(a => a.id === id ? { ...a, reminderStatus: 'Sent' as const } : a);
        saveCachedData('appointments', next);
        return next;
      });
    }
  };

  const rejectAppointmentReminder = async (id: string) => {
    try {
      await apiFetch(`/appointments/${id}/reminder/reject`, {
        method: 'POST',
      });
      await refreshAppointments();
    } catch (e) {
      setAppointments(prev => {
        const next = prev.map(a => a.id === id ? { ...a, reminderStatus: 'Rejected' as const } : a);
        saveCachedData('appointments', next);
        return next;
      });
    }
  };

  const markAppointmentReminderSent = async (id: string) => {
    try {
      await apiFetch(`/appointments/${id}/reminder/mark-sent`, {
        method: 'POST',
      });
      await refreshAppointments();
    } catch (e) {
      setAppointments(prev => {
        const next = prev.map(a => a.id === id ? { ...a, reminderStatus: 'Sent' as const } : a);
        saveCachedData('appointments', next);
        return next;
      });
    }
  };

  // Inventory CRUD
  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'status'>) => {
    try {
      await apiFetch('/inventory', {
        method: 'POST',
        body: JSON.stringify({
          ...item,
          branchId: item.branchId || selectedBranchId || userBranchId || undefined
        }),
      });
      await refreshInventory();
    } catch (e) {
      console.error('Failed to add inventory item:', e);
      throw e;
    }
  };

  const updateInventoryQuantity = async (id: string, delta: number, reason?: string) => {
    try {
      const queryParams = new URLSearchParams({ delta: String(delta) });
      if (reason) {
        queryParams.set('reason', reason);
      }
      await apiFetch(`/inventory/${id}/quantity?${queryParams.toString()}`, {
        method: 'PATCH',
      });
      await refreshInventory();
    } catch (e) {
      console.error('Failed to update inventory quantity:', e);
      throw e;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      await apiFetch(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await refreshInventory();
    } catch (e) {
      console.error('Failed to update inventory item:', e);
      throw e;
    }
  };

  // Expenses CRUD
  const addExpense = async (expense: Omit<ExpenseItem, 'id'>) => {
    const activeUser = userEmail || (role === 'staff' ? 'Staff' : 'Admin/Partner');
    const newExp: ExpenseItem = {
      ...expense,
      id: `EXP-${Math.floor(Math.random() * 900) + 100}`,
      addedBy: expense.addedBy || activeUser,
      paidBy: expense.paidBy || activeUser
    };
    try {
      await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...expense,
          addedBy: expense.addedBy || activeUser,
          paidBy: expense.paidBy || activeUser,
          branchId: expense.branchId || selectedBranchId || userBranchId || undefined
        }),
      });
      if (role === 'admin' || role === 'partner') {
        await refreshExpenses();
      }
    } catch (e) {
      if (role === 'admin' || role === 'partner') {
        setExpenses(prev => { const next = [newExp, ...prev]; saveCachedData('expenses', next); return next; });
      }
    }
  };

  const updateExpense = async (id: string, updated: Partial<ExpenseItem>) => {
    const activeUser = userEmail || role || 'Admin/Partner';
    try {
      await apiFetch(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...updated,
          paidBy: updated.paidBy || activeUser
        }),
      });
      await refreshExpenses();
    } catch (e) {
      setExpenses(prev => {
        const next = prev.map(exp => exp.id === id ? { ...exp, ...updated } : exp);
        saveCachedData('expenses', next);
        return next;
      });
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const res = await apiFetch<any>(`/expenses/${id}`, {
        method: 'DELETE',
      });
      await refreshExpenses();
      return res;
    } catch (e) {
      setExpenses(prev => {
        const next = prev.filter(exp => exp.id !== id);
        saveCachedData('expenses', next);
        return next;
      });
      return { success: true };
    }
  };

  const removeExpensesByStaffId = async (staffId: string) => {
    await refreshExpenses();
  };

  // Transactions
  const addTransaction = async (txn: Omit<FinancialTransaction, 'id'>) => {
    await refreshTransactions();
  };

  const updateTransaction = async (id: string, updated: Partial<FinancialTransaction>) => {
    try {
      await apiFetch(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      await refreshTransactions();
    } catch (e) {
      setTransactions(prev => {
        const next = prev.map(t => t.id === id ? { ...t, ...updated } : t);
        saveCachedData('transactions', next);
        return next;
      });
    }
  };

  const addPartner = async (username: string, password: string) => {
    const newPartner = { id: Date.now(), username };
    try {
      await apiFetch('/auth/partners', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      await refreshPartners();
    } catch (e) {
      setPartners(prev => { const next = [newPartner, ...prev]; saveCachedData('partners', next); return next; });
    }
  };

  const deletePartner = async (id: number) => {
    try {
      await apiFetch(`/auth/partners/${id}`, {
        method: 'DELETE',
      });
      await refreshPartners();
    } catch (e) {
      setPartners(prev => { const next = prev.filter(p => p.id !== id); saveCachedData('partners', next); return next; });
    }
  };

  const markAttendance = async (
    staffId: string,
    status: AttendanceRecord['status'],
    notes?: string,
    latitude?: number,
    longitude?: number
  ) => {
    const staffMember = staff.find(s => s.id === staffId);
    const clientTime = getLocalTimeString();
    const isCheckout = status === 'Checked Out';
    const rec: AttendanceRecord = {
      id: `ATT-${Math.floor(Math.random() * 900) + 100}`,
      staffId,
      staffName: staffMember?.name || 'Staff Member',
      role: staffMember?.role || 'Staff',
      date: getLocalDateString(),
      status,
      checkInTime: isCheckout ? undefined : clientTime,
      checkOutTime: isCheckout ? clientTime : undefined,
      notes
    };
    try {
      await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staffId,
          status,
          notes,
          latitude,
          longitude,
          clientTime,
          checkInTime: isCheckout ? undefined : clientTime,
          checkOutTime: isCheckout ? clientTime : undefined
        }),
      });
      await refreshAttendance();
    } catch (e) {
      setAttendance(prev => { const next = [rec, ...prev]; saveCachedData('attendance', next); return next; });
    }
  };

  const revertAttendance = async (id: string) => {
    try {
      await apiFetch(`/attendance/${id}`, {
        method: 'DELETE',
      });
      await refreshAttendance();
    } catch (e) {
      setAttendance(prev => {
        const next = prev.filter(a => a.id !== id);
        saveCachedData('attendance', next);
        return next;
      });
    }
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      setNotifications(prev => {
        const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
        saveCachedData('notifications', next);
        return next;
      });
    } catch (e) {
      setNotifications(prev => {
        const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
        saveCachedData('notifications', next);
        return next;
      });
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', {
        method: 'POST',
      });
      setNotifications(prev => {
        const next = prev.map(n => ({ ...n, read: true }));
        saveCachedData('notifications', next);
        return next;
      });
    } catch (e) {
      setNotifications(prev => {
        const next = prev.map(n => ({ ...n, read: true }));
        saveCachedData('notifications', next);
        return next;
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}`, {
        method: 'DELETE',
      });
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        saveCachedData('notifications', next);
        return next;
      });
    } catch (e) {
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        saveCachedData('notifications', next);
        return next;
      });
    }
  };

  // POS Cart logic (local client side cart)
  const addToPosCart = (item: ServiceItem | InventoryItem, isPackage?: boolean, sessions?: number, customPrice?: number) => {
    setPosCart(prev => {
      const isProduct = 'itemName' in item || (item as any).category === 'Products' || 'minStock' in item;
      const itemId = item.id;
      const itemName = 'itemName' in item ? (item as InventoryItem).itemName : (item as ServiceItem).name;
      const itemPrice = customPrice !== undefined ? customPrice : item.price;
      const stockAvail = 'quantity' in item ? (item as InventoryItem).quantity : undefined;

      const existing = prev.find(cartItem => cartItem.serviceId === itemId && !!cartItem.isPackage === !!isPackage);
      if (existing) {
        return prev.map(cartItem => (cartItem.serviceId === itemId && !!cartItem.isPackage === !!isPackage) 
          ? { ...cartItem, quantity: cartItem.quantity + 1, price: customPrice !== undefined ? customPrice : cartItem.price } 
          : cartItem
        );
      }
      return [...prev, {
        serviceId: itemId,
        name: isPackage ? `${itemName} (${sessions || 3} Sessions Bundle)` : itemName,
        price: isPackage ? itemPrice * (sessions || 3) * 0.9 : itemPrice,
        quantity: 1,
        category: item.category,
        isPackage,
        sessions: isPackage ? (sessions || 3) : undefined,
        isProduct,
        inventoryItemId: isProduct ? itemId : undefined,
        stockAvailable: stockAvail
      }];
    });
  };

  const updatePosItemPrice = (serviceId: string, newPrice: number) => {
    setPosCart(prev => prev.map(item => item.serviceId === serviceId ? { ...item, price: Math.max(0, newPrice) } : item));
  };

  const updatePosItemStaff = (serviceId: string, staffId: string, staffName: string) => {
    setPosCart(prev => prev.map(item => item.serviceId === serviceId ? { ...item, staffId, staffName } : item));
  };

  const removeFromPosCart = (serviceId: string) => {
    setPosCart(prev => prev.filter(item => item.serviceId !== serviceId));
  };

  const updatePosQuantity = (serviceId: string, delta: number) => {
    setPosCart(prev => prev.map(item => {
      if (item.serviceId === serviceId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as POSCartItem[]);
  };

  const clearPosCart = () => setPosCart([]);

  const completePosCheckout = async (
    clientName: string,
    paymentMethod: FinancialTransaction['paymentMethod'],
    discountPercent: number,
    taxPercent: number,
    cardDetails?: { cardLastFour?: string; cardType?: string; bankTxnId?: string },
    additionalDetails?: {
      amountPaid?: number;
      remainingDue?: number;
      cashReceived?: number;
      cashReturned?: number;
      paymentSplits?: any[];
      packageId?: string;
      clientId?: string;
      clientPhone?: string;
      appointmentId?: string;
    }
  ): Promise<FinancialTransaction> => {
    try {
      const clientTime = getLocalTimeString();
      const clientDate = getLocalDateString();
      const txn = await apiFetch<FinancialTransaction>('/pos/checkout', {
        method: 'POST',
        body: JSON.stringify({
          clientName,
          paymentMethod,
          discountPercent,
          taxPercent,
          cartItems: posCart,
          cardLastFour: cardDetails?.cardLastFour,
          cardType: cardDetails?.cardType,
          bankTxnId: cardDetails?.bankTxnId,
          branchId: selectedBranchId || userBranchId || undefined,
          clientTime,
          clientDate,
          amountPaid: additionalDetails?.amountPaid,
          remainingDue: additionalDetails?.remainingDue,
          cashReceived: additionalDetails?.cashReceived,
          cashReturned: additionalDetails?.cashReturned,
          paymentSplits: additionalDetails?.paymentSplits,
          packageId: additionalDetails?.packageId,
          clientId: additionalDetails?.clientId,
          clientPhone: additionalDetails?.clientPhone,
          appointmentId: additionalDetails?.appointmentId
        })
      });

      clearPosCart();
      Promise.all([
        refreshTransactions(),
        refreshClients(),
        refreshInventory(),
        refreshPackages(),
        refreshAppointments()
      ]).catch(err => console.error(err));
      return {
        ...txn,
        time: txn?.time || clientTime,
        date: txn?.date || clientDate
      };
    } catch (e: any) {
      console.error('POS Checkout failed:', e);
      throw e;
    }
  };

  // Purchases
  const refreshPurchases = async () => {
    try {
      const [items, bills] = await Promise.all([
        fetchSafe<PurchaseItem[]>('/purchases/items', []),
        fetchSafe<PurchaseBill[]>('/purchases/bills', [])
      ]);
      setPurchaseItems(items);
      setPurchaseBills(bills);
      saveCachedData('purchase_items', items);
      saveCachedData('purchase_bills', bills);
    } catch (e) {
      console.error('Failed to refresh purchases:', e);
    }
  };

  const addPurchase = async (data: any) => {
    try {
      await apiFetch('/purchases', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await Promise.all([
        refreshPurchases(),
        refreshInventory(),
        refreshExpenses()
      ]);
    } catch (e) {
      console.error('Failed to add purchase:', e);
      throw e;
    }
  };

  const payPurchaseBill = async (id: string, amount: number, paymentMethod: string, notes?: string) => {
    try {
      await apiFetch(`/purchases/bills/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount, paymentMethod, notes })
      });
      await Promise.all([
        refreshPurchases(),
        refreshExpenses()
      ]);
    } catch (e) {
      console.error('Failed to pay purchase bill:', e);
      throw e;
    }
  };

  // Vendor Returns & Debit Notes
  const refreshReturns = async () => {
    try {
      const data = await fetchSafe<PurchaseReturn[]>('/returns', []);
      setReturns(data);
      saveCachedData('returns', data);
    } catch (e) {
      console.error('Failed to fetch returns:', e);
    }
  };

  const createPurchaseReturn = async (data: any): Promise<PurchaseReturn> => {
    try {
      const res = await apiFetch<PurchaseReturn>('/returns', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await Promise.all([
        refreshReturns(),
        refreshPurchases(),
        refreshInventory(),
        refreshTransactions()
      ]);
      return res;
    } catch (e) {
      console.error('Failed to create return:', e);
      throw e;
    }
  };

  // Partner Equity
  const refreshPartnerEquity = async () => {
    try {
      const data = await fetchSafe<PartnerEquityOverview | null>('/partners/equity', null);
      if (data) {
        setPartnerEquity(data);
      }
    } catch (e) {
      console.error('Failed to fetch partner equity:', e);
    }
  };

  const recordPartnerDrawing = async (data: any) => {
    try {
      await apiFetch('/partners/drawings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await Promise.all([
        refreshPartnerEquity(),
        refreshExpenses()
      ]);
    } catch (e) {
      console.error('Failed to record drawing:', e);
      throw e;
    }
  };

  const updatePartnerProfile = async (data: { partnerName: string; equityPercentage: number; initialInvestment: number; notes?: string }) => {
    try {
      await apiFetch('/partners/profiles', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await refreshPartnerEquity();
    } catch (e) {
      console.error('Failed to update partner profile:', e);
      throw e;
    }
  };

  // Packages & Prepaid Sessions
  const refreshPackages = async () => {
    try {
      const pkgs = await fetchSafe<ClientPackage[]>('/packages', []);
      setPackages(pkgs);
      saveCachedData('packages', pkgs);
    } catch (e) {
      console.error('Failed to fetch packages:', e);
    }
  };

  const redeemPackageSession = async (packageId: string, staffName?: string, notes?: string) => {
    try {
      await apiFetch(`/packages/${packageId}/redeem`, {
        method: 'POST',
        body: JSON.stringify({ staffName, notes })
      });
      await Promise.all([
        refreshPackages(),
        refreshTransactions(),
        refreshClients(),
        refreshInventory()
      ]);
    } catch (e) {
      console.error('Failed to redeem package session:', e);
      throw e;
    }
  };

  // Client Dues Settlement
  const settleClientDue = async (clientId: string, amount: number, paymentMethod: string, notes?: string) => {
    try {
      await apiFetch(`/clients/${clientId}/settle-dues`, {
        method: 'POST',
        body: JSON.stringify({ amount, paymentMethod, notes })
      });
      await Promise.all([
        refreshClients(),
        refreshTransactions()
      ]);
    } catch (e) {
      console.error('Failed to settle client due:', e);
      throw e;
    }
  };

  return (
    <ClinicContext.Provider
      value={{
        clinicInfo,
        updateClinicInfo,
        role,
        setRole,
        toggleRole,
        theme,
        toggleTheme,
        searchQuery,
        setSearchQuery,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        printData,
        setPrintData,

        branches,
        addBranch,
        updateBranch,
        deleteBranch,

        staff,
        addStaff,
        updateStaff,
        deleteStaff,

        services,
        addService,
        updateService,

        clients,
        addClient,
        updateClient,

        appointments,
        addAppointment,
        updateAppointmentStatus,
        deleteAppointment,
        sendAppointmentReminder,
        rejectAppointmentReminder,
        markAppointmentReminderSent,

        inventory,
        refreshInventory,
        addInventoryItem,
        updateInventoryQuantity,
        updateInventoryItem,

        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        removeExpensesByStaffId,

        transactions,
        addTransaction,
        updateTransaction,

        attendance,
        markAttendance,
        revertAttendance,

        partners,
        addPartner,
        deletePartner,

        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,

        posCart,
        addToPosCart,
        removeFromPosCart,
        updatePosQuantity,
        updatePosItemPrice,
        updatePosItemStaff,
        clearPosCart,
        completePosCheckout,

        purchaseItems: Array.isArray(purchaseItems) ? purchaseItems : [],
        purchaseBills: Array.isArray(purchaseBills) ? purchaseBills : [],
        refreshPurchases,
        addPurchase,
        payPurchaseBill,
        returns: Array.isArray(returns) ? returns : [],
        refreshReturns,
        createPurchaseReturn,

        partnerEquity,
        refreshPartnerEquity,
        recordPartnerDrawing,
        updatePartnerProfile,

        packages,
        refreshPackages,
        redeemPackageSession,

        settleClientDue,

        isLoading,
        error,
        refreshData,

        selectedBranchId,
        setSelectedBranchId,
        userBranchId,
        userId,
        userEmail
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
