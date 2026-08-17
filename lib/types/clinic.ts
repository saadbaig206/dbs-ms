export type UserRole = 'admin' | 'staff';

export type AppointmentStatus = 'Confirmed' | 'In-Progress' | 'Completed' | 'Cancelled' | 'Pending';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  time: string;
  status: AppointmentStatus;
  notes?: string;
  price: number;
  branchId?: string;
}

export interface ClientHistoryItem {
  id: string;
  date: string;
  serviceName: string;
  staffName: string;
  amount: number;
  status: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  cnic?: string;
  gender: 'Female' | 'Male' | 'Other';
  age: number;
  address: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  preferredService?: string;
  totalSpent: number;
  visitsCount: number;
  notes?: string;
  history: ClientHistoryItem[];
  joinedDate: string;
  branchId?: string;
}

export type StaffRole = 
  | 'Medical Director' 
  | 'Senior Dermatologist' 
  | 'Aesthetic Physician' 
  | 'Hydrafacial Specialist' 
  | 'Laser Specialist' 
  | 'Cosmetic Nurse' 
  | 'Clinic Manager' 
  | 'Receptionist';

export interface Staff {
  id: string;
  photo: string;
  name: string;
  role: StaffRole;
  salary: number;
  phone: string;
  email: string;
  joiningDate: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  performanceRating: number; // 1 to 5
  assignedServices: string[];
  attendanceRate: number; // percentage
  branchId?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export type ServiceCategory = 
  | 'Facial & Skin Care' 
  | 'Laser Treatments' 
  | 'Injectables & Anti-Aging' 
  | 'Body Contouring' 
  | 'IV Therapy' 
  | 'Rejuvenation'
  | 'Packages';

export interface RequiredInventoryItem {
  inventoryItemId: string;
  itemName: string;
  quantityUsed: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  assignedStaffIds: string[];
  assignedStaffNames: string[];
  status: 'Active' | 'Inactive' | 'Out of Stock';
  image: string;
  description: string;
  requiredInventory?: RequiredInventoryItem[];
}

export type InventoryCategory = 
  | 'Injectables & Toxins' 
  | 'Dermal Fillers' 
  | 'Facial Serums & Solutions' 
  | 'PRP & Blood Kits' 
  | 'Disposables & Needles' 
  | 'Skincare Products' 
  | 'Post-Care Creams';

export interface InventoryItem {
  id: string;
  itemName: string;
  category: InventoryCategory;
  quantity: number;
  minStock: number;
  supplier: string;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastRestocked: string;
  branchId?: string;
}

export type ExpenseCategory = 
  | 'Salary' 
  | 'Electric Bill' 
  | 'Water Bill' 
  | 'Rent' 
  | 'Products' 
  | 'Machines' 
  | 'Marketing' 
  | 'Other';

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending';
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';
  notes?: string;
  staffId?: string;
  branchId?: string;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Bank' | 'Online';

export interface InvoiceLineItem {
  name: string;
  price: number;
  quantity: number;
}

export interface FinancialTransaction {
  id: string;
  invoiceId: string;
  clientName: string;
  serviceName: string;
  amount: number;
  discount: number;
  tax: number;
  taxPercent?: number;
  grandTotal: number;
  date: string;
  paymentMethod: PaymentMethod;
  status: 'Paid' | 'Refunded' | 'Pending';
  items?: InvoiceLineItem[];
  branchId?: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Leave' | 'Absent' | 'Checked Out';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'appointment' | 'payment' | 'inventory' | 'staff' | 'schedule';
  read: boolean;
}

export interface POSCartItem {
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}
