// src/types/supplier.ts
export interface Supplier {
  id: string;
  name: string;
  code: string;
  category: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  products: SupplierProduct[];
  paymentTerms?: 'credit' | 'cheque' | 'mixed';
  creditDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierProduct {
  id?: number;
  productName: string;
  unit: string;
  unitPrice: number;
  notes?: string;
}

export interface SupplierTransaction {
  id?: number;
  supplierId: string;
  supplierName: string;
  transactionDate: string;
  productName: string;
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
  // Credit fields
  dueDate?: string;
  notes?: string;
  status: 'pending' | 'partial' | 'completed' | 'overdue' | 'cleared';
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPayment {
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

export interface ChequeRecord {
  id?: number;
  supplierId: string;
  supplierName: string;
  chequeNumber: string;
  amount: number;
  issueDate: string;
  clearingDate?: string;
  bank?: string;
  status: 'issued' | 'cleared' | 'bounced';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Summary interfaces
export interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  paymentTerms?: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  transactionCount: number;
  lastTransactionDate?: string;
  overdueCount?: number;
  overdueAmount?: number;
  pendingChequeCount?: number;
  pendingChequeAmount?: number;
}

export interface ChequeSummary {
  totalCheques: number;
  totalAmount: number;
  pendingCheques: number;
  pendingAmount: number;
  clearedCheques: number;
  clearedAmount: number;
  bouncedCheques?: number;
  bouncedAmount?: number;
}

export interface OverdueCredit {
  id: number;
  supplierId: string;
  supplierName: string;
  transactionDate: string;
  productName: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: string;
  daysOverdue: number;
}