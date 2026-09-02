// src/types/expenses.ts
export interface ExpenseSupplier {
  id: string;
  name: string;
  code: string;
  category: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: 'cash' | 'cheque' | 'credit';
  creditDays?: number;
  items?: ExpenseItem[];
  isCustom?: boolean; // Flag to identify custom added suppliers
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseItem {
  id?: number;
  supplierId: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  category?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseTransaction {
  id?: number;
  supplierId: string;
  supplierName: string;
  transactionDate: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentMethod: 'cash' | 'cheque' | 'credit' | 'partial';
  // Cheque fields
  chequeNumber?: string;
  chequeIssueDate?: string;
  chequeClearingDate?: string;
  chequeBank?: string;
  // Staff fields (for purchases made by staff)
  purchasedBy?: string; // 'Simon' | 'Fred' | 'Other'
  salesDate?: string; // Date of sales this expense is for
  notes?: string;
  status: 'pending' | 'partial' | 'completed' | 'overdue' | 'cleared';
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpensePayment {
  id?: number;
  supplierId: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer';
  chequeNumber?: string;
  chequeIssueDate?: string;
  chequeClearingDate?: string;
  chequeBank?: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
}

export interface StaffExpenseSummary {
  staffName: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  transactionCount: number;
  lastTransactionDate?: string;
}

export interface ExpenseSummary {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  transactionCount: number;
  lastTransactionDate?: string;
}