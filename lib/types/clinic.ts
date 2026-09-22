export type UserRole = 'admin' | 'staff' | 'partner';

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
  reminderStatus?: 'Pending' | 'Sent' | 'Rejected';
  notes?: string;
  price: number;
  branchId?: string;
  category?: 'treatment' | 'consultation';
  transactionId?: string;
  paymentStatus?: 'Unpaid' | 'Billed' | 'Paid' | 'Complimentary';
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
  outstandingBalance?: number;
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
  email?: string;
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
  | 'Post-Care Creams'
  | string;

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

export interface PaymentLog {
  id: string;
  amount: number;
  paidBy: string;
  date: string;
  paymentMethod: string;
  notes?: string;
}

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
  addedBy?: string;
  paidBy?: string;
  vendorName?: string;
  productName?: string;
  paymentType?: 'Credit' | 'Debit';
  actualAmount?: number;
  amountPaid?: number;
  remainingAmount?: number;
  paymentLogs?: PaymentLog[];
  deletionApprovals?: string[];
  deletionRequestedBy?: string;
}



export type PaymentMethod = 'Cash' | 'Card' | 'Online' | 'Split';

export interface InvoiceLineItem {
  name: string;
  price: number;
  quantity: number;
  isProduct?: boolean;
  staffId?: string;
  staffName?: string;
  packageId?: string;
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
  amountPaid?: number;
  remainingDue?: number;
  cashReceived?: number;
  cashReturned?: number;
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid';
  paymentSplits?: any[];
  packageId?: string;
  date: string;
  time?: string;
  paymentMethod: PaymentMethod;
  status: 'Paid' | 'Refunded' | 'Pending';
  items?: InvoiceLineItem[];
  branchId?: string;
  transactionType?: 'Sale' | 'Debt_Settlement' | 'Package_Redemption';
  auditLogs?: Array<{
    timestamp: string;
    updated_by: string;
    changes: Record<string, { from: any; to: any }>;
    reason?: string;
  }>;
  reprintCount?: number;
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
  type: 'appointment' | 'payment' | 'inventory' | 'staff' | 'schedule' | 'vendor_approval' | 'vendor';
  read: boolean;
}

export interface POSCartItem {
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  isPackage?: boolean;
  sessions?: number;
  isProduct?: boolean;
  inventoryItemId?: string;
  stockAvailable?: number;
  staffId?: string;
  staffName?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  vendorName: string;
  itemName: string;
  category: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: string;
  date: string;
  branchId?: string;
}

export interface PurchaseBill {
  id: string;
  vendorName: string;
  billNumber?: string;
  date: string;
  totalAmount: number;
  amountPaid: number;
  remainingDue: number;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  notes?: string;
  branchId?: string;
  createdBy?: string;
}

export interface PartnerEquityReportItem {
  id: string;
  partnerName: string;
  equityPercentage: number;
  initialInvestment: number;
  profitShare: number;
  totalWithdrawn: number;
  netCapitalBalance: number;
  marketBrandStake: number;
  drawingsCount: number;
}

export interface PartnerDrawing {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdBy?: string;
}

export interface PartnerEquityOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  estimatedBrandValuation: number;
  partners: PartnerEquityReportItem[];
  recentDrawings: PartnerDrawing[];
}

export interface ClientPackage {
  id: string;
  clientId: string;
  clientName: string;
  packageName: string;
  serviceId: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  totalAmountPaid: number;
  pricePerSession: number;
  status: 'Active' | 'Completed' | 'Expired';
  branchId?: string;
  purchaseDate: string;
  notes?: string;
}

export interface PackageRedemptionLog {
  id: string;
  packageId: string;
  clientName: string;
  sessionNumber: number;
  date: string;
  time?: string;
  staffName?: string;
  notes?: string;
}

export interface PurchaseReturnItem {
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  batchNumber?: string;
  reason?: string;
}

export interface PurchaseReturn {
  id: string;
  debitNoteNumber: string;
  vendorName: string;
  totalRefundAmount: number;
  settlementType: 'Deduct_From_Payable' | 'Cash_Refund' | 'Store_Credit';
  status: 'Issued' | 'Settled' | 'Rejected';
  reason?: string;
  date: string;
  items: PurchaseReturnItem[];
  branchId?: string;
  notes?: string;
}

