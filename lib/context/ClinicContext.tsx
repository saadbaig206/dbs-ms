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
  POSCartItem
} from '../types/clinic';
import { apiFetch, authClient } from '../api/client';

interface ClinicContextType {
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
  staff: Staff[];
  addStaff: (newStaff: Omit<Staff, 'id'>) => Promise<void>;
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

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status'>) => Promise<void>;
  updateInventoryQuantity: (id: string, delta: number) => Promise<void>;

  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => Promise<void>;
  removeExpensesByStaffId: (staffId: string) => Promise<void>;

  transactions: FinancialTransaction[];
  addTransaction: (txn: Omit<FinancialTransaction, 'id'>) => Promise<void>;

  attendance: AttendanceRecord[];
  markAttendance: (staffId: string, status: AttendanceRecord['status'], notes?: string) => Promise<void>;

  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // POS State
  posCart: POSCartItem[];
  addToPosCart: (service: ServiceItem) => void;
  removeFromPosCart: (serviceId: string) => void;
  updatePosQuantity: (serviceId: string, delta: number) => void;
  clearPosCart: () => void;
  completePosCheckout: (clientName: string, paymentMethod: FinancialTransaction['paymentMethod'], discountPercent: number, taxPercent: number) => Promise<FinancialTransaction>;

  // Loading & error states
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('admin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [printData, setPrintData] = useState<{ title: string; type: 'invoice' | 'slip' | 'client'; data: any } | null>(null);

  // Collections state
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
    const nextRole = role === 'admin' ? 'staff' : 'admin';
    setRole(nextRole);
  };

  // Main fetch function to load all backend data
  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch current user profile to establish correct role on refresh
      try {
        const user = await authClient.me();
        if (user && user.role) {
          setRoleState(user.role as UserRole);
        }
      } catch (e) {
        // Not logged in or session expired
        setIsLoading(false);
        return;
      }

      // 2. Fetch resource collections
      const [
        staffData,
        servicesData,
        clientsData,
        appointmentsData,
        inventoryData,
        attendanceData,
        notificationsData
      ] = await Promise.all([
        apiFetch<Staff[]>('/staff'),
        apiFetch<ServiceItem[]>('/services'),
        apiFetch<Client[]>('/clients'),
        apiFetch<Appointment[]>('/appointments'),
        apiFetch<InventoryItem[]>('/inventory'),
        apiFetch<AttendanceRecord[]>('/attendance'),
        apiFetch<NotificationItem[]>('/notifications')
      ]);

      setStaff(staffData);
      setServices(servicesData);
      setClients(clientsData);
      setAppointments(appointmentsData);
      setInventory(inventoryData);
      setAttendance(attendanceData);
      setNotifications(notificationsData);

      // Financial data restricted to admin
      if (document.cookie.includes('user_role=admin')) {
        const [expensesData, transactionsData] = await Promise.all([
          apiFetch<ExpenseItem[]>('/expenses'),
          apiFetch<FinancialTransaction[]>('/transactions')
        ]);
        setExpenses(expensesData);
        setTransactions(transactionsData);
      } else {
        setExpenses([]);
        setTransactions([]);
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
    refreshData();
  }, []);

  // Staff CRUD
  const addStaff = async (newStaff: Omit<Staff, 'id'>) => {
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
      body: JSON.stringify(newApt),
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

  // Inventory CRUD
  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'status'>) => {
    await apiFetch('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
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
      body: JSON.stringify(expense),
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

  // Attendance
  const markAttendance = async (staffId: string, status: AttendanceRecord['status'], notes?: string) => {
    await apiFetch('/attendance', {
      method: 'POST',
      body: JSON.stringify({ staffId, status, notes }),
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
    taxPercent: number
  ): Promise<FinancialTransaction> => {
    const txn = await apiFetch<FinancialTransaction>('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify({
        clientName,
        paymentMethod,
        discountPercent,
        taxPercent,
        cartItems: posCart
      })
    });

    clearPosCart();
    await refreshData();
    return txn;
  };

  return (
    <ClinicContext.Provider
      value={{
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

        inventory,
        addInventoryItem,
        updateInventoryQuantity,

        expenses,
        addExpense,
        removeExpensesByStaffId,

        transactions,
        addTransaction,

        attendance,
        markAttendance,

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
        refreshData
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
