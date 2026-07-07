export interface Employee {
  _id: string;
  name: string;
  percentage: number;
  active: boolean;
}

export interface ExpenseItem {
  _id?: string;
  description: string;
  amount: number;
}

export interface EmployeeShare {
  employeeId: string;
  employeeName: string;
  percentageApplied: number;
  amount: number;
}

export interface FixedExpenseItem {
  name: string;
  amount: number;
}

export interface AccountingPeriod {
  _id: string;
  periodStartDate: string;
  periodEndDate: string;
  periodNumber: number;
  income: number;
  expenseItems: ExpenseItem[];
  expenses: number;
  fixedExpenses: FixedExpenseItem[];
  dddg: number;
  companyProfit: number;
  netToDistribute: number;
  employeeDistribution: EmployeeShare[];
  bossAmount: number;
  closed: boolean;
}

export interface QuincenaGroup {
  periodStartDate: string;
  periodEndDate: string;
  periodNumber: number;
  label: string;
  jobs: CarJob[];
  totalJobs: number;
  totalPayment: number;
}

export interface CarJob {
  _id: string;
  date: string;
  vin: string;
  description: string;
  payment: number;
  closed: boolean;
  paperTypes: string[];
  paymentMethod?: string;
  cardSurcharge: number;
  employeeShares: Array<{
    employeeId: string;
    employeeName: string;
    percentage: number;
  }>;
}

export interface AdminUser {
  _id: string;
  email: string;
  fullName: string;
  createdAt: string;
  lastLogin: string | null;
  lockedUntil: string | null;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  carJobId?: string;
  paperTypes?: string[];
  date?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  notes: string;
}
