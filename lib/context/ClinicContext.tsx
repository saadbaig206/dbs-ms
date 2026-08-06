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

import {
  INITIAL_STAFF,
  INITIAL_SERVICES,
  INITIAL_CLIENTS,
  INITIAL_INVENTORY,
  INITIAL_EXPENSES,
  INITIAL_TRANSACTIONS,
  INITIAL_APPOINTMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ATTENDANCE
} from '../dummy-data';
import { formatPKR } from '../utils/currency';

function buildStaffSalaryExpenses(staffList: Staff[]): ExpenseItem[] {
  const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().split('T')[0];
  return staffList
    .filter(s => s.status === 'Active')
    .map(member => ({
      id: `EXP-SAL-${member.id}`,
      title: `Salary - ${member.name} (${monthLabel})`,
      category: 'Salary' as const,
      amount: member.salary,
      date: today,
      status: 'Pending' as const,
      paymentMethod: 'Bank Transfer' as const,
      notes: `Monthly salary for ${member.role}`,
      staffId: member.id,
    }));
}

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
  addStaff: (newStaff: Omit<Staff, 'id'>) => void;
  updateStaff: (id: string, updated: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  services: ServiceItem[];
  addService: (newService: Omit<ServiceItem, 'id'>) => void;
  updateService: (id: string, updated: Partial<ServiceItem>) => void;

  clients: Client[];
  addClient: (newClient: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>) => void;
  updateClient: (id: string, updated: Partial<Client>) => void;

  appointments: Appointment[];
  addAppointment: (newApt: Omit<Appointment, 'id'>) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  deleteAppointment: (id: string) => void;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status'>) => void;
  updateInventoryQuantity: (id: string, delta: number) => void;

  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  removeExpensesByStaffId: (staffId: string) => void;

  transactions: FinancialTransaction[];
  addTransaction: (txn: Omit<FinancialTransaction, 'id'>) => void;

  attendance: AttendanceRecord[];
  markAttendance: (staffId: string, status: AttendanceRecord['status'], notes?: string) => void;

  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // POS State
  posCart: POSCartItem[];
  addToPosCart: (service: ServiceItem) => void;
  removeFromPosCart: (serviceId: string) => void;
  updatePosQuantity: (serviceId: string, delta: number) => void;
  clearPosCart: () => void;
  completePosCheckout: (clientName: string, paymentMethod: FinancialTransaction['paymentMethod'], discountPercent: number, taxPercent: number) => FinancialTransaction;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [printData, setPrintData] = useState<{ title: string; type: 'invoice' | 'slip' | 'client'; data: any } | null>(null);

  // Collections
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    ...buildStaffSalaryExpenses(INITIAL_STAFF),
    ...INITIAL_EXPENSES,
  ]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(INITIAL_TRANSACTIONS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // POS
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleRole = () => setRole(prev => prev === 'admin' ? 'staff' : 'admin');

  const getCurrentMonthLabel = () => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const syncStaffSalaryExpense = (member: Staff) => {
    if (member.status !== 'Active') return;
    const monthLabel = getCurrentMonthLabel();
    setExpenses(prev => {
      const existingIdx = prev.findIndex(e => e.staffId === member.id && e.category === 'Salary');
      const salaryExpense: ExpenseItem = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `EXP-SAL-${member.id}`,
        title: `Salary - ${member.name} (${monthLabel})`,
        category: 'Salary',
        amount: member.salary,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        paymentMethod: 'Bank Transfer',
        notes: `Monthly salary for ${member.role}`,
        staffId: member.id,
      };
      if (existingIdx >= 0) {
        const list = [...prev];
        list[existingIdx] = salaryExpense;
        return list;
      }
      return [salaryExpense, ...prev];
    });
  };

  // Sync salary expenses for all active staff on initial load — handled via buildStaffSalaryExpenses in useState

  // Staff CRUD
  const addStaff = (newStaff: Omit<Staff, 'id'>) => {
    const id = `STF-${100 + staff.length + 1}`;
    const member = { id, ...newStaff };
    setStaff(prev => [member, ...prev]);
    if (member.status === 'Active') {
      syncStaffSalaryExpense(member);
    }
    setNotifications(prev => [{
      id: `NOT-${Date.now()}`,
      title: 'New Staff Added',
      message: `${member.name} joined as ${member.role}. Salary expense auto-tracked.`,
      time: 'Just now',
      type: 'staff',
      read: false,
    }, ...prev]);
  };

  const updateStaff = (id: string, updated: Partial<Staff>) => {
    let updatedMember: Staff | undefined;
    setStaff(prev => prev.map(s => {
      if (s.id === id) {
        updatedMember = { ...s, ...updated };
        return updatedMember;
      }
      return s;
    }));
    if (updatedMember) {
      if (updatedMember.status === 'Active') {
        syncStaffSalaryExpense(updatedMember);
      } else {
        removeExpensesByStaffId(id);
      }
    }
  };

  const removeExpensesByStaffId = (staffId: string) => {
    setExpenses(prev => prev.filter(e => !(e.staffId === staffId && e.category === 'Salary')));
  };

  const deleteStaff = (id: string) => {
    const member = staff.find(s => s.id === id);
    setStaff(prev => prev.filter(s => s.id !== id));
    removeExpensesByStaffId(id);
    setAttendance(prev => prev.filter(a => a.staffId !== id));
    if (member) {
      setNotifications(prev => [{
        id: `NOT-${Date.now()}`,
        title: 'Staff Terminated',
        message: `${member.name} removed. Salary expense automatically cleared from records.`,
        time: 'Just now',
        type: 'staff',
        read: false,
      }, ...prev]);
    }
  };

  // Services CRUD
  const addService = (newService: Omit<ServiceItem, 'id'>) => {
    const id = `SRV-${String(services.length + 1).padStart(2, '0')}`;
    setServices(prev => [ { id, ...newService }, ...prev ]);
  };

  const updateService = (id: string, updated: Partial<ServiceItem>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  // Clients CRUD
  const addClient = (newClientData: Omit<Client, 'id' | 'totalSpent' | 'visitsCount' | 'history' | 'joinedDate'>) => {
    const id = `CLT-${800 + clients.length + 1}`;
    const newClient: Client = {
      id,
      ...newClientData,
      totalSpent: 0,
      visitsCount: 1,
      history: [],
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setClients(prev => [ newClient, ...prev ]);
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  // Appointments CRUD
  const addAppointment = (newApt: Omit<Appointment, 'id'>) => {
    const id = `APT-${1000 + appointments.length + 1}`;
    const created = { id, ...newApt };
    setAppointments(prev => [ created, ...prev ]);
    
    // Trigger notification
    setNotifications(prev => [
      {
        id: `NOT-${Date.now()}`,
        title: 'New Booking Created',
        message: `${newApt.clientName} booked ${newApt.serviceName} with ${newApt.staffName} for ${newApt.date} at ${newApt.time}.`,
        time: 'Just now',
        type: 'appointment',
        read: false
      },
      ...prev
    ]);
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  // Inventory CRUD
  const addInventoryItem = (item: Omit<InventoryItem, 'id' | 'status'>) => {
    const id = `INV-${String(inventory.length + 1).padStart(2, '0')}`;
    const status = item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.minStock ? 'Low Stock' : 'In Stock';
    setInventory(prev => [ { id, ...item, status }, ...prev ]);
  };

  const updateInventoryQuantity = (id: string, delta: number) => {
    setInventory(prev => prev.map(inv => {
      if (inv.id === id) {
        const newQty = Math.max(0, inv.quantity + delta);
        const status = newQty === 0 ? 'Out of Stock' : newQty <= inv.minStock ? 'Low Stock' : 'In Stock';
        return { ...inv, quantity: newQty, status, lastRestocked: delta > 0 ? new Date().toISOString().split('T')[0] : inv.lastRestocked };
      }
      return inv;
    }));
  };

  // Expenses CRUD
  const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
    const id = `EXP-${400 + expenses.length + 1}`;
    setExpenses(prev => [ { id, ...expense }, ...prev ]);
  };

  // Transactions
  const addTransaction = (txn: Omit<FinancialTransaction, 'id'>) => {
    const id = `TXN-${900 + transactions.length + 1}`;
    setTransactions(prev => [ { id, ...txn }, ...prev ]);
  };

  // Attendance
  const markAttendance = (staffId: string, status: AttendanceRecord['status'], notes?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetStaff = staff.find(s => s.id === staffId);
    if (!targetStaff) return;

    setAttendance(prev => {
      const existingIdx = prev.findIndex(a => a.staffId === staffId && a.date === todayStr);
      const updatedRecord: AttendanceRecord = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `ATT-${prev.length + 1}`,
        staffId,
        staffName: targetStaff.name,
        role: targetStaff.role,
        date: todayStr,
        status,
        checkInTime: status === 'Present' || status === 'Late' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        checkOutTime: status === 'Present' ? '05:30 PM' : undefined,
        notes
      };

      if (existingIdx >= 0) {
        const list = [...prev];
        list[existingIdx] = updatedRecord;
        return list;
      }
      return [updatedRecord, ...prev];
    });
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // POS Cart logic
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

  const completePosCheckout = (
    clientName: string, 
    paymentMethod: FinancialTransaction['paymentMethod'], 
    discountPercent: number, 
    taxPercent: number
  ): FinancialTransaction => {
    const subtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discount = (subtotal * discountPercent) / 100;
    const taxable = subtotal - discount;
    const tax = (taxable * taxPercent) / 100;
    const grandTotal = Math.round((taxable + tax) * 100) / 100;

    const invoiceId = `INV-${new Date().getFullYear()}-${String(transactions.length + 1).padStart(3, '0')}`;
    const cartItems = posCart.map(c => ({ name: c.name, price: c.price, quantity: c.quantity }));
    const txn: FinancialTransaction = {
      id: `TXN-${900 + transactions.length + 1}`,
      invoiceId,
      clientName,
      serviceName: posCart.map(c => c.name).join(', '),
      amount: subtotal,
      discount,
      tax,
      taxPercent,
      grandTotal,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      status: 'Paid',
      items: cartItems,
    };

    setTransactions(prev => [txn, ...prev]);

    // Push notification
    setNotifications(prev => [
      {
        id: `NOT-${Date.now()}`,
        title: `Payment Received (${formatPKR(grandTotal)})`,
        message: `Invoice ${invoiceId} processed via ${paymentMethod} for ${clientName}.`,
        time: 'Just now',
        type: 'payment',
        read: false
      },
      ...prev
    ]);

    clearPosCart();
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
        completePosCheckout
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
