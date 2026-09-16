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
  Branch
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
  printData: { title: string; type: 'invoice' | 'slip' | 'client'; data: any } | null;
  setPrintData: (data: { title: string; type: 'invoice' | 'slip' | 'client'; data: any } | null) => void;

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
  addClient: (newClient: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>) => Promise<void>;
  updateClient: (id: string, updated: Partial<Client>) => Promise<void>;

  appointments: Appointment[];
  addAppointment: (newApt: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  sendAppointmentReminder: (id: string) => Promise<void>;
  rejectAppointmentReminder: (id: string) => Promise<void>;
  markAppointmentReminderSent: (id: string) => Promise<void>;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status'>) => Promise<void>;
  updateInventoryQuantity: (id: string, delta: number) => Promise<void>;

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
  addToPosCart: (service: ServiceItem) => void;
  removeFromPosCart: (serviceId: string) => void;
  updatePosQuantity: (serviceId: string, delta: number) => void;
  clearPosCart: () => void;
  completePosCheckout: (
    clientName: string,
    paymentMethod: FinancialTransaction['paymentMethod'],
    discountPercent: number,
    taxPercent: number,
    cardDetails?: { cardLastFour?: string; cardType?: string; bankTxnId?: string }
  ) => Promise<FinancialTransaction>;

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
  const [role, setRoleState] = useState<UserRole>('admin');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clinicInfo, setClinicInfoState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clinic_info');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return {
      name: CLINIC_INFO.name,
      phone: CLINIC_INFO.phone,
      email: CLINIC_INFO.email,
      address: CLINIC_INFO.address,
      currency: 'PKR (Rs)',
      language: 'English (US)',
      operatingHours: CLINIC_INFO.operatingHours || '11:00 AM - 08:00 PM (Mon-Sat)',
    };
  });

  const updateClinicInfo = (info: typeof clinicInfo) => {
    setClinicInfoState(info);
    localStorage.setItem('clinic_info', JSON.stringify(info));
  };

  function loadCachedData<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`clinic_cache_${key}`);
      return item ? JSON.parse(item) : fallback;
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
  const [printData, setPrintData] = useState<{ title: string; type: 'invoice' | 'slip' | 'client'; data: any } | null>(null);

  // Collections state initialized from instant local cache
  const [branches, setBranches] = useState<Branch[]>(() => loadCachedData('branches', []));
  const [staff, setStaff] = useState<Staff[]>(() => loadCachedData('staff', []));
  const [services, setServices] = useState<ServiceItem[]>(() => loadCachedData('services', []));
  const [clients, setClients] = useState<Client[]>(() => loadCachedData('clients', []));
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadCachedData('appointments', []));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadCachedData('inventory', []));
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => loadCachedData('expenses', []));
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => loadCachedData('transactions', []));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => loadCachedData('attendance', []));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadCachedData('notifications', []));
  const [partners, setPartners] = useState<{ id: number; username: string }[]>(() => loadCachedData('partners', []));

  // POS
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);

  // Loading state starts false IF cached data or access token exists for instant render
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const hasToken = !!localStorage.getItem('access_token') || document.cookie.includes('access_token=');
    const hasCachedData = (localStorage.getItem('clinic_cache_staff') || '[]') !== '[]' || (localStorage.getItem('clinic_cache_services') || '[]') !== '[]';
    if (hasToken && hasCachedData) {
      return false;
    }
    return true;
  });
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
    // Write cookie
    document.cookie = `user_role=${newRole}; path=/; max-age=${60 * 60 * 24 * 8}`;
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

  // Main fetch function to load all backend data
  // Main fetch function to load all backend data
  const refreshData = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      // 1. Resolve active user and role first
      let activeUser = await authClient.me().catch(() => null);
      if (!activeUser && typeof window !== 'undefined') {
        const localToken = localStorage.getItem('access_token') || (document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1]);
        const localRole = (localStorage.getItem('user_role') || (document.cookie.match(/(?:^|; )user_role=([^;]*)/)?.[1])) as UserRole | null;
        const localEmail = localStorage.getItem('user_email');
        if (localToken && localRole) {
          activeUser = {
            id: 'local-user',
            email: localEmail || (localRole === 'staff' ? 'staff@gmail.com' : 'admin@gmail.com'),
            role: localRole,
            branch_id: null
          };
        }
      }

      if (!activeUser) {
        // Not logged in or session expired
        setIsLoading(false);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/') {
          await authClient.logout();
          window.location.href = '/login';
        }
        return;
      }

      const activeRole = (activeUser.role || 'staff') as UserRole;
      setRoleState(activeRole);
      document.cookie = `user_role=${activeRole}; path=/; max-age=${60 * 60 * 24 * 8}; SameSite=Lax`;
      setUserId(activeUser.id || null);
      setUserEmail(activeUser.email || null);
      const bId = (activeUser as any).branch_id || (activeUser as any).branchId || null;
      setUserBranchId(bId);
      if (activeRole === 'staff' && bId) {
        setSelectedBranchId(prev => prev || bId);
      }

      // 2. Execute entity queries concurrently, skipping unauthorized endpoints for staff/partner
      const expensesPromise = (activeRole === 'admin' || activeRole === 'partner')
        ? fetchSafe<ExpenseItem[]>('/expenses', [])
        : Promise.resolve([]);

      const transactionsPromise = (activeRole === 'admin' || activeRole === 'partner')
        ? fetchSafe<FinancialTransaction[]>('/transactions', [])
        : Promise.resolve([]);

      const partnersPromise = (activeRole === 'admin')
        ? fetchSafe<{ id: number; username: string }[]>('/auth/partners', [])
        : Promise.resolve([]);

      const [
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

      setBranches(branchesData); saveCachedData('branches', branchesData);
      setStaff(staffData); saveCachedData('staff', staffData);
      setServices(servicesData); saveCachedData('services', servicesData);
      setClients(clientsData); saveCachedData('clients', clientsData);
      setAppointments(appointmentsData); saveCachedData('appointments', appointmentsData);
      setInventory(inventoryData); saveCachedData('inventory', inventoryData);
      setAttendance(attendanceData); saveCachedData('attendance', attendanceData);
      setNotifications(notificationsData); saveCachedData('notifications', notificationsData);
      setExpenses(expensesData); saveCachedData('expenses', expensesData);
      setTransactions(transactionsData); saveCachedData('transactions', transactionsData);
      setPartners(partnersData); saveCachedData('partners', partnersData);
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

  // Fetch data on load
  useEffect(() => {
    const hasCachedData = typeof window !== 'undefined' && 
      ((localStorage.getItem('clinic_cache_staff') || '[]') !== '[]' || (localStorage.getItem('clinic_cache_services') || '[]') !== '[]');
    refreshData(!hasCachedData);
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
    const created: Staff = {
      ...newStaff,
      id: `ST-${Math.floor(Math.random() * 900) + 100}`,
      status: newStaff.status || 'Active',
      assignedServices: newStaff.assignedServices || ['Signature Treatments'],
      joiningDate: newStaff.joiningDate || new Date().toISOString().split('T')[0]
    };
    try {
      await apiFetch('/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      await refreshStaff();
    } catch (e) {
      setStaff(prev => { const next = [created, ...prev]; saveCachedData('staff', next); return next; });
    }
  };

  const updateStaff = async (id: string, updated: Partial<Staff>) => {
    try {
      await apiFetch(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      await refreshStaff();
    } catch (e) {
      setStaff(prev => { const next = prev.map(s => s.id === id ? { ...s, ...updated } : s); saveCachedData('staff', next); return next; });
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await apiFetch(`/staff/${id}`, {
        method: 'DELETE',
      });
      await refreshStaff();
    } catch (e) {
      setStaff(prev => { const next = prev.filter(s => s.id !== id); saveCachedData('staff', next); return next; });
    }
  };

  // Services CRUD
  const addService = async (newService: Omit<ServiceItem, 'id'>) => {
    const created: ServiceItem = { ...newService, id: `SRV-${Math.floor(Math.random() * 900) + 100}` };
    try {
      await apiFetch('/services', {
        method: 'POST',
        body: JSON.stringify(newService),
      });
      await refreshServices();
    } catch (e) {
      setServices(prev => { const next = [created, ...prev]; saveCachedData('services', next); return next; });
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
      setServices(prev => { const next = prev.map(s => s.id === id ? { ...s, ...updated } : s); saveCachedData('services', next); return next; });
    }
  };

  const recentAddAptRef = useRef<{ key: string; timestamp: number }[]>([]);
  const recentAddClientRef = useRef<{ key: string; timestamp: number }[]>([]);

  // Clients CRUD
  const addClient = async (newClientData: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>) => {
    const key = `${newClientData.name.trim().toLowerCase()}-${newClientData.phone.trim()}`;
    const now = Date.now();
    recentAddClientRef.current = recentAddClientRef.current.filter(item => now - item.timestamp < 3000);
    if (recentAddClientRef.current.some(item => item.key === key)) {
      return;
    }
    recentAddClientRef.current.push({ key, timestamp: now });

    const created: Client = {
      ...newClientData,
      id: `CLT-${Math.floor(Math.random() * 900) + 100}`,
      totalSpent: 0,
      visitsCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      history: []
    };
    try {
      await apiFetch('/clients', {
        method: 'POST',
        body: JSON.stringify(newClientData),
      });
      await refreshClients();
    } catch (e) {
      setClients(prev => { const next = [created, ...prev]; saveCachedData('clients', next); return next; });
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
      setClients(prev => { const next = prev.map(c => c.id === id ? { ...c, ...updated } : c); saveCachedData('clients', next); return next; });
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
      // Optimistic state already set
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
    const newItem: InventoryItem = {
      ...item,
      id: `INV-${Math.floor(Math.random() * 900) + 100}`,
      status: item.quantity > item.minStock ? 'In Stock' : item.quantity > 0 ? 'Low Stock' : 'Out of Stock'
    };
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
      setInventory(prev => { const next = [newItem, ...prev]; saveCachedData('inventory', next); return next; });
    }
  };

  const updateInventoryQuantity = async (id: string, delta: number) => {
    try {
      await apiFetch(`/inventory/${id}/quantity?delta=${delta}`, {
        method: 'PATCH',
      });
      await refreshInventory();
    } catch (e) {
      setInventory(prev => {
        const next = prev.map(item => {
          if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            const status = newQty > item.minStock ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock';
            return { ...item, quantity: newQty, status: status as InventoryItem['status'] };
          }
          return item;
        });
        saveCachedData('inventory', next);
        return next;
      });
    }
  };

  // Expenses CRUD
  const addExpense = async (expense: Omit<ExpenseItem, 'id'>) => {
    const activeUser = userEmail || role || 'Admin/Partner';
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
      await refreshExpenses();
    } catch (e) {
      setExpenses(prev => { const next = [newExp, ...prev]; saveCachedData('expenses', next); return next; });
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
        const next = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
        saveCachedData('notifications', next);
        return next;
      });
    } catch (e) {
      setNotifications(prev => {
        const next = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
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
        const next = prev.map(n => ({ ...n, isRead: true }));
        saveCachedData('notifications', next);
        return next;
      });
    } catch (e) {
      setNotifications(prev => {
        const next = prev.map(n => ({ ...n, isRead: true }));
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
  const addToPosCart = (service: ServiceItem) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.serviceId === service.id);
      if (existing) {
        return prev.map(item => item.serviceId === service.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { serviceId: service.id, name: service.name, price: service.price, quantity: 1, category: service.category }];
    });
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
    cardDetails?: { cardLastFour?: string; cardType?: string; bankTxnId?: string }
  ): Promise<FinancialTransaction> => {
    try {
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
          branchId: selectedBranchId || userBranchId || undefined
        })
      });

      clearPosCart();
      Promise.all([
        refreshTransactions(),
        refreshClients(),
        refreshInventory()
      ]).catch(err => console.error(err));
      return txn;
    } catch (e: any) {
      console.error('POS Checkout failed:', e);
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
        addInventoryItem,
        updateInventoryQuantity,

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
        clearPosCart,
        completePosCheckout,

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
