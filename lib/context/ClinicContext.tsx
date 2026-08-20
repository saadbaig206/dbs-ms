'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface ClinicContextType {
  // Clinic General Info
  clinicInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    currency: string;
    language: string;
  };
  updateClinicInfo: (info: {
    name: string;
    phone: string;
    email: string;
    address: string;
    currency: string;
    language: string;
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

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status'>) => Promise<void>;
  updateInventoryQuantity: (id: string, delta: number) => Promise<void>;

  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => Promise<void>;
  updateExpense: (id: string, updated: Partial<ExpenseItem>) => Promise<void>;
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

  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

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
  refreshData: () => Promise<void>;

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
      language: 'English (US)'
    };
  });

  const updateClinicInfo = (info: typeof clinicInfo) => {
    setClinicInfoState(info);
    localStorage.setItem('clinic_info', JSON.stringify(info));
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [printData, setPrintData] = useState<{ title: string; type: 'invoice' | 'slip' | 'client'; data: any } | null>(null);

  // Collections state
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

  // POS
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);

  // Loading / Error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('clinic_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('clinic_theme', next);
      return next;
    });
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

  // Main fetch function to load all backend data
  const refreshData = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      let activeRole: UserRole = 'staff';
      try {
        const user = await authClient.me();
        if (user && user.role) {
          activeRole = user.role as UserRole;
          setRoleState(activeRole);
          setUserId(user.id || null);
          setUserEmail(user.email || null);
          const bId = user.branch_id || user.branchId || null;
          setUserBranchId(bId);
          if (activeRole === 'staff' && bId) {
            setSelectedBranchId(prev => prev || bId);
          }
        }
      } catch (e) {
        // Not logged in or session expired
        setIsLoading(false);
        return;
      }

      // 2. Fetch resource collections
      const fetchSafe = async <T,>(url: string, fallback: T): Promise<T> => {
        try {
          return await apiFetch<T>(url);
        } catch (e) {
          console.error(`Failed to fetch ${url}:`, e);
          return fallback;
        }
      };

      const [
        branchesData,
        staffData,
        servicesData,
        clientsData,
        appointmentsData,
        inventoryData,
        attendanceData,
        notificationsData
      ] = await Promise.all([
        fetchSafe<Branch[]>('/branches', []),
        fetchSafe<Staff[]>('/staff', []),
        fetchSafe<ServiceItem[]>('/services', []),
        fetchSafe<Client[]>('/clients', []),
        fetchSafe<Appointment[]>('/appointments', []),
        fetchSafe<InventoryItem[]>('/inventory', []),
        fetchSafe<AttendanceRecord[]>('/attendance', []),
        fetchSafe<NotificationItem[]>('/notifications', [])
      ]);

      setBranches(branchesData);
      setStaff(staffData);
      setServices(servicesData);
      setClients(clientsData);
      setAppointments(appointmentsData);
      setInventory(inventoryData);
      setAttendance(attendanceData);
      setNotifications(notificationsData);

      // Financial data restricted to admin or partner
      if (activeRole === 'admin' || activeRole === 'partner') {
        const [expensesData, transactionsData] = await Promise.all([
          fetchSafe<ExpenseItem[]>('/expenses', []),
          fetchSafe<FinancialTransaction[]>('/transactions', [])
        ]);
        setExpenses(expensesData);
        setTransactions(transactionsData);
      } else {
        setExpenses([]);
        setTransactions([]);
      }

      // Load partners only if admin
      if (activeRole === 'admin') {
        const partnersData = await fetchSafe<{ id: number; username: string }[]>('/auth/partners', []);
        setPartners(partnersData);
      } else {
        setPartners([]);
      }
    } catch (err: any) {
      console.error('Failed to load clinic data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on load
  useEffect(() => {
    refreshData(true);
  }, []);

  // Branches CRUD
  const addBranch = async (newBranch: Omit<Branch, 'id'>) => {
    await apiFetch('/branches', {
      method: 'POST',
      body: JSON.stringify(newBranch),
    });
    await refreshData();
  };

  const updateBranch = async (id: string, updated: Partial<Branch>) => {
    await apiFetch(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    await refreshData();
  };

  const deleteBranch = async (id: string) => {
    await apiFetch(`/branches/${id}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  // Staff CRUD
  const addStaff = async (newStaff: Omit<Staff, 'id'> & { password?: string }) => {
    await apiFetch('/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
    });
    await refreshData();
  };

  const updateStaff = async (id: string, updated: Partial<Staff>) => {
    await apiFetch(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    await refreshData();
  };

  const deleteStaff = async (id: string) => {
    await apiFetch(`/staff/${id}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  // Services CRUD
  const addService = async (newService: Omit<ServiceItem, 'id'>) => {
    await apiFetch('/services', {
      method: 'POST',
      body: JSON.stringify(newService),
    });
    await refreshData();
  };

  const updateService = async (id: string, updated: Partial<ServiceItem>) => {
    await apiFetch(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    await refreshData();
  };

  // Clients CRUD
  const addClient = async (newClientData: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>) => {
    await apiFetch('/clients', {
      method: 'POST',
      body: JSON.stringify(newClientData),
    });
    await refreshData();
  };

  const updateClient = async (id: string, updated: Partial<Client>) => {
    await apiFetch(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    await refreshData();
  };

  // Appointments CRUD
  const addAppointment = async (newApt: Omit<Appointment, 'id'>) => {
    await apiFetch('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        ...newApt,
        branchId: newApt.branchId || selectedBranchId || userBranchId || undefined
      }),
    });
    await refreshData();
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    await refreshData();
  };

  const deleteAppointment = async (id: string) => {
    await apiFetch(`/appointments/${id}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const sendAppointmentReminder = async (id: string) => {
    await apiFetch(`/appointments/${id}/reminder/send`, {
      method: 'POST',
    });
    await refreshData();
  };

  const rejectAppointmentReminder = async (id: string) => {
    await apiFetch(`/appointments/${id}/reminder/reject`, {
      method: 'POST',
    });
    await refreshData();
  };

  // Inventory CRUD
  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'status'>) => {
    await apiFetch('/inventory', {
      method: 'POST',
      body: JSON.stringify({
        ...item,
        branchId: item.branchId || selectedBranchId || userBranchId || undefined
      }),
    });
    await refreshData();
  };

  const updateInventoryQuantity = async (id: string, delta: number) => {
    await apiFetch(`/inventory/${id}/quantity?delta=${delta}`, {
      method: 'PATCH',
    });
    await refreshData();
  };

  // Expenses CRUD
  const addExpense = async (expense: Omit<ExpenseItem, 'id'>) => {
    await apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        ...expense,
        branchId: expense.branchId || selectedBranchId || userBranchId || undefined
      }),
    });
    await refreshData();
  };

  const updateExpense = async (id: string, updated: Partial<ExpenseItem>) => {
    await apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    await refreshData();
  };

  const removeExpensesByStaffId = async (staffId: string) => {
    // Handled automatically by backend when staff is updated/deleted, but we can verify
    await refreshData();
  };

  // Transactions
  const addTransaction = async (txn: Omit<FinancialTransaction, 'id'>) => {
    // Add transaction directly (if needed, though mostly done via POS checkout)
    await refreshData();
  };

  const updateTransaction = async (id: string, updated: Partial<FinancialTransaction>) => {
    await apiFetch(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    await refreshData();
  };

  const addPartner = async (username: string, password: string) => {
    await apiFetch('/auth/partners', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await refreshData();
  };

  const deletePartner = async (id: number) => {
    await apiFetch(`/auth/partners/${id}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const markAttendance = async (
    staffId: string, 
    status: AttendanceRecord['status'], 
    notes?: string,
    latitude?: number,
    longitude?: number
  ) => {
    await apiFetch('/attendance', {
      method: 'POST',
      body: JSON.stringify({ staffId, status, notes, latitude, longitude }),
    });
    await refreshData();
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    await apiFetch(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    await refreshData();
  };

  const markAllNotificationsRead = async () => {
    await apiFetch('/notifications/read-all', {
      method: 'POST',
    });
    await refreshData();
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
    refreshData().catch(err => console.error(err));
    return txn;
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

        inventory,
        addInventoryItem,
        updateInventoryQuantity,

        expenses,
        addExpense,
        updateExpense,
        removeExpensesByStaffId,

        transactions,
        addTransaction,
        updateTransaction,

        attendance,
        markAttendance,

        partners,
        addPartner,
        deletePartner,

        notifications,
        markNotificationRead,
        markAllNotificationsRead,

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
