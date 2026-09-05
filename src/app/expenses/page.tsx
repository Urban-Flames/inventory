// src/app/expenses/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Calendar, DollarSign, 
  CheckCircle, Clock, AlertCircle, Trash2, 
  Eye, Edit, Printer, Download, X,
  ChevronDown, ChevronUp, Building2, Package,
  CreditCard, Banknote, Wallet, Users,
  TrendingUp, TrendingDown, FileText, ShoppingBag,
  Store, User, CalendarDays, Building, PlusCircle,
  Phone, Mail, MapPin, Minus, Receipt, UserCircle
} from 'lucide-react';
import {
  getExpenseSuppliers,
  getExpenseTransactions,
  getStaffExpenseSummary,
  getExpenseSupplierSummary,
  saveExpenseTransaction,
  initializeExpenseSuppliers,
  addExpenseSupplier,
  addExpenseItem,
  updateStaffRefund,
  getStaffTransactions
} from './actions';
import { expenseSuppliers } from '@/data/expenseSuppliers';
import { ExpenseSupplier, ExpenseTransaction, ExpenseItem } from '@/types/expenses';

// Helper functions
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatCurrency = (amount: number) => {
  return `GH₵ ${amount.toFixed(2)}`;
};

type TransactionStatus = 'pending' | 'partial' | 'completed' | 'overdue' | 'cleared';

// Transaction Card for mobile
const TransactionCard = ({ transaction }: { transaction: ExpenseTransaction }) => {
  const [expanded, setExpanded] = useState(false);
  
  const statusColors: Record<TransactionStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cleared: 'bg-purple-100 text-purple-800'
  };

  const status = (transaction.status || 'pending') as TransactionStatus;

  return (
    <div className="border rounded-lg p-3 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold">{transaction.itemName}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[status]}`}>
              {status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(transaction.transactionDate)}
          </div>
          {transaction.purchasedBy && (
            <div className="text-xs text-gray-500">
              By: {transaction.purchasedBy}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
        <div>
          <span className="text-gray-500">Total</span>
          <p className="font-medium">{formatCurrency(transaction.totalAmount)}</p>
        </div>
        <div>
          <span className="text-gray-500">Refunded</span>
          <p className="font-medium text-green-600">{formatCurrency(transaction.amountPaid)}</p>
        </div>
        <div>
          <span className="text-gray-500">Balance</span>
          <p className="font-medium text-red-600">{formatCurrency(transaction.balance)}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Quantity</span>
              <p className="font-medium">{transaction.quantity} {transaction.unit}</p>
            </div>
            <div>
              <span className="text-gray-500">Unit Price</span>
              <p className="font-medium">{formatCurrency(transaction.unitPrice)}</p>
            </div>
          </div>
          <div>
            <span className="text-gray-500">Payment Method</span>
            <p className="font-medium capitalize">{transaction.paymentMethod || 'cheque'}</p>
          </div>
          {transaction.chequeNumber && (
            <div>
              <span className="text-gray-500">Cheque Number</span>
              <p className="font-medium">{transaction.chequeNumber}</p>
            </div>
          )}
          {transaction.salesDate && (
            <div>
              <span className="text-gray-500">Sales Date</span>
              <p className="font-medium">{formatDate(transaction.salesDate)}</p>
            </div>
          )}
          {transaction.notes && (
            <div>
              <span className="text-gray-500">Notes</span>
              <p className="text-gray-600">{transaction.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Individual expense item entry
interface ExpenseItemEntry {
  id: string;
  itemName: string;
  quantity: number;
  amount: number;
  notes?: string;
}

export default function ExpensesPage() {
  const [suppliers, setSuppliers] = useState<ExpenseSupplier[]>([]);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [staffSummary, setStaffSummary] = useState<any[]>([]);
  const [supplierSummary, setSupplierSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<ExpenseSupplier | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedStaffForRefund, setSelectedStaffForRefund] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundNote, setRefundNote] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [filterStaff, setFilterStaff] = useState<string>('');

  // Staff views
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffTransactions, setStaffTransactions] = useState<ExpenseTransaction[]>([]);

  // Expense items for the transaction
  const [expenseItems, setExpenseItems] = useState<ExpenseItemEntry[]>([
    { id: '1', itemName: '', quantity: 1, amount: 0 }
  ]);
  const [grandTotal, setGrandTotal] = useState<number>(0);

  // Payment details
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMethod: 'cheque' as 'cash' | 'cheque' | 'credit',
    chequeNumber: '',
    chequeIssueDate: '',
    chequeClearingDate: '',
    chequeBank: '',
    purchasedBy: '',
    salesDate: '',
    notes: ''
  });

  // New Vendor Form
  const [newVendor, setNewVendor] = useState({
    name: '',
    category: 'Other',
    contactPerson: '',
    phone: '',
    email: '',
    paymentTerms: 'cheque' as 'cash' | 'cheque' | 'credit',
    creditDays: 0
  });

  // New Item Form
  const [newItem, setNewItem] = useState({
    itemName: '',
    unit: '',
    unitPrice: 0,
    category: '',
    notes: ''
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Calculate grand total whenever expense items change
  useEffect(() => {
    const total = expenseItems.reduce((sum, item) => sum + (item.quantity * item.amount), 0);
    setGrandTotal(total);
  }, [expenseItems]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await initializeExpenseSuppliers();

      const supplierResult = await getExpenseSuppliers();
      if (supplierResult.success && supplierResult.data) {
        setSuppliers(supplierResult.data);
      }

      const staffResult = await getStaffExpenseSummary();
      if (staffResult.success && staffResult.data) {
        setStaffSummary(staffResult.data);
      }

      const supplierSummaryResult = await getExpenseSupplierSummary();
      if (supplierSummaryResult.success && supplierSummaryResult.data) {
        setSupplierSummary(supplierSummaryResult.data);
      }

      const transactionResult = await getExpenseTransactions();
      if (transactionResult.success && transactionResult.data) {
        setTransactions(transactionResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load expense data' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupplierDetails = async (supplierId: string) => {
    setIsLoading(true);
    try {
      const transactionResult = await getExpenseTransactions(
        supplierId,
        undefined,
        dateFilter.start || undefined,
        dateFilter.end || undefined
      );
      if (transactionResult.success && transactionResult.data) {
        setTransactions(transactionResult.data);
      }

      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        setSelectedSupplier(supplier);
        setViewMode('detail');
      }
    } catch (error) {
      console.error('Error loading supplier details:', error);
      setMessage({ type: 'error', text: 'Failed to load supplier details' });
    } finally {
      setIsLoading(false);
    }
  };

  // Load staff transactions
  const loadStaffTransactions = async (staffName: string) => {
    setIsLoading(true);
    try {
      const result = await getStaffTransactions(staffName);
      if (result.success && result.data) {
        setStaffTransactions(result.data);
        setSelectedStaff(staffName);
      }
    } catch (error) {
      console.error('Error loading staff transactions:', error);
      setMessage({ type: 'error', text: 'Failed to load staff transactions' });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new expense item row
  const addExpenseItemRow = () => {
    const newId = (Math.max(...expenseItems.map(i => parseInt(i.id))) + 1).toString();
    setExpenseItems([...expenseItems, { id: newId, itemName: '', quantity: 1, amount: 0 }]);
  };

  // Remove an expense item row
  const removeExpenseItemRow = (id: string) => {
    if (expenseItems.length <= 1) {
      setMessage({ type: 'error', text: 'You must have at least one expense item' });
      return;
    }
    setExpenseItems(expenseItems.filter(item => item.id !== id));
  };

  // Update expense item field
  const updateExpenseItem = (id: string, field: keyof ExpenseItemEntry, value: any) => {
    setExpenseItems(expenseItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleAddVendor = async () => {
    try {
      const result = await addExpenseSupplier(newVendor);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setShowAddVendor(false);
        setNewVendor({
          name: '',
          category: 'Other',
          contactPerson: '',
          phone: '',
          email: '',
          paymentTerms: 'cheque',
          creditDays: 0
        });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to add vendor' });
      }
    } catch (error) {
      console.error('Error adding vendor:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const handleAddItem = async () => {
    if (!selectedSupplier) return;

    try {
      const result = await addExpenseItem(selectedSupplier.id, newItem);
      if (result.success) {
        setMessage({ type: 'success', text: 'Item added successfully' });
        setShowAddItem(false);
        setNewItem({
          itemName: '',
          unit: '',
          unitPrice: 0,
          category: '',
          notes: ''
        });
        await loadData();
        if (selectedSupplier) {
          await loadSupplierDetails(selectedSupplier.id);
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to add item' });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedSupplier) return;

    // Validate that all items have names
    const emptyItems = expenseItems.filter(item => !item.itemName.trim());
    if (emptyItems.length > 0) {
      setMessage({ type: 'error', text: 'Please enter item names for all rows' });
      return;
    }

    // Validate that all items have quantity > 0
    const invalidQty = expenseItems.filter(item => item.quantity <= 0);
    if (invalidQty.length > 0) {
      setMessage({ type: 'error', text: 'Quantity must be greater than 0 for all items' });
      return;
    }

    // Validate that all items have amount > 0
    const invalidAmount = expenseItems.filter(item => item.amount <= 0);
    if (invalidAmount.length > 0) {
      setMessage({ type: 'error', text: 'Amount must be greater than 0 for all items' });
      return;
    }

    try {
      // Save each item as a separate transaction
      for (const item of expenseItems) {
        const totalAmount = item.quantity * item.amount;
        
        const result = await saveExpenseTransaction({
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          transactionDate: new Date().toISOString().split('T')[0],
          itemName: item.itemName,
          quantity: item.quantity,
          unit: 'unit',
          unitPrice: item.amount,
          totalAmount: totalAmount,
          amountPaid: 0, // Start with 0 paid
          balance: totalAmount, // Full amount is balance
          paymentMethod: paymentDetails.paymentMethod || 'cheque',
          chequeNumber: paymentDetails.chequeNumber || null,
          chequeIssueDate: paymentDetails.chequeIssueDate || null,
          chequeClearingDate: paymentDetails.chequeClearingDate || null,
          chequeBank: paymentDetails.chequeBank || null,
          purchasedBy: paymentDetails.purchasedBy || null,
          salesDate: paymentDetails.salesDate || null,
          notes: item.notes || paymentDetails.notes || null,
          status: 'pending'
        });

        if (!result.success) {
          setMessage({ type: 'error', text: `Failed to save item: ${item.itemName}` });
          return;
        }
      }

      setMessage({ type: 'success', text: `All ${expenseItems.length} expense items saved successfully` });
      setShowAddTransaction(false);
      
      // Reset expense items
      setExpenseItems([{ id: '1', itemName: '', quantity: 1, amount: 0 }]);
      setPaymentDetails({
        paymentMethod: 'cheque',
        chequeNumber: '',
        chequeIssueDate: '',
        chequeClearingDate: '',
        chequeBank: '',
        purchasedBy: '',
        salesDate: '',
        notes: ''
      });
      
      await loadData();
      if (selectedSupplier) {
        await loadSupplierDetails(selectedSupplier.id);
      }
    } catch (error) {
      console.error('Error adding expenses:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  // Handle refund for a staff member
  const handleRefund = async () => {
    if (!selectedStaffForRefund) return;
    
    if (refundAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid refund amount' });
      return;
    }

    // Get the total balance for this staff member
    const staffTotal = staffSummary.find(s => s.staffName === selectedStaffForRefund);
    if (!staffTotal) {
      setMessage({ type: 'error', text: 'Staff member not found' });
      return;
    }

    if (refundAmount > staffTotal.balance) {
      setMessage({ type: 'error', text: `Refund amount cannot exceed balance of ${formatCurrency(staffTotal.balance)}` });
      return;
    }

    try {
      const result = await updateStaffRefund(
        selectedStaffForRefund,
        refundAmount,
        refundNote || `Refund to ${selectedStaffForRefund}`
      );

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setShowRefundModal(false);
        setSelectedStaffForRefund(null);
        setRefundAmount(0);
        setRefundNote('');
        await loadData();
        if (selectedStaff) {
          await loadStaffTransactions(selectedStaff);
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to process refund' });
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterStaff && t.purchasedBy !== filterStaff) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        t.itemName.toLowerCase().includes(search) ||
        t.supplierName.toLowerCase().includes(search) ||
        (t.purchasedBy && t.purchasedBy.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Calculate totals
  const totalBalance = supplierSummary.reduce((sum, s) => sum + s.balance, 0);
  const totalPurchases = supplierSummary.reduce((sum, s) => sum + s.totalPurchases, 0);
  const totalPaid = supplierSummary.reduce((sum, s) => sum + s.totalPaid, 0);

  // Staff summary totals
  const staffTotalBalance = staffSummary.reduce((sum, s) => sum + s.balance, 0);
  const staffTotalPurchases = staffSummary.reduce((sum, s) => sum + s.totalPurchases, 0);
  const staffTotalPaid = staffSummary.reduce((sum, s) => sum + s.totalPaid, 0);

  // Get staff totals for Simon and Fred
  const getStaffTotals = (name: string) => {
    const staff = staffSummary.find(s => s.staffName === name);
    return staff || { totalPurchases: 0, totalPaid: 0, balance: 0, transactionCount: 0 };
  };

  const simonTotals = getStaffTotals('Simon');
  const fredTotals = getStaffTotals('Fred');

  // Render main dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Add Vendor Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddVendor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          <PlusCircle className="h-4 w-4" />
          Add New Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <p className="text-xs text-gray-500">Total Purchases</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(totalPurchases)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <p className="text-xs text-gray-500">Total Balance</p>
          <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <p className="text-xs text-gray-500">Staff Balance</p>
          <p className={`text-lg font-bold ${staffTotalBalance > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
            {formatCurrency(staffTotalBalance)}
          </p>
        </div>
      </div>

      {/* Staff Tabs - Simon & Fred */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Simon Card */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Simon</h3>
              <p className="text-xs text-gray-500">Click to view details</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500">Spent</p>
              <p className="text-sm font-semibold text-blue-600">{formatCurrency(simonTotals.totalPurchases)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Refunded</p>
              <p className="text-sm font-semibold text-green-600">{formatCurrency(simonTotals.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`text-sm font-bold ${simonTotals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(simonTotals.balance)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => loadStaffTransactions('Simon')}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Details
            </button>
            {simonTotals.balance > 0 && (
              <button
                onClick={() => {
                  setSelectedStaffForRefund('Simon');
                  setRefundAmount(0);
                  setRefundNote('');
                  setShowRefundModal(true);
                }}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Wallet className="h-4 w-4 inline mr-1" />
                Refund
              </button>
            )}
          </div>
          {simonTotals.balance > 0 && (
            <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Company owes {formatCurrency(simonTotals.balance)}</span>
            </div>
          )}
        </div>

        {/* Fred Card */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Fred</h3>
              <p className="text-xs text-gray-500">Click to view details</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500">Spent</p>
              <p className="text-sm font-semibold text-blue-600">{formatCurrency(fredTotals.totalPurchases)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Refunded</p>
              <p className="text-sm font-semibold text-green-600">{formatCurrency(fredTotals.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`text-sm font-bold ${fredTotals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(fredTotals.balance)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => loadStaffTransactions('Fred')}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Details
            </button>
            {fredTotals.balance > 0 && (
              <button
                onClick={() => {
                  setSelectedStaffForRefund('Fred');
                  setRefundAmount(0);
                  setRefundNote('');
                  setShowRefundModal(true);
                }}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Wallet className="h-4 w-4 inline mr-1" />
                Refund
              </button>
            )}
          </div>
          {fredTotals.balance > 0 && (
            <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Company owes {formatCurrency(fredTotals.balance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Staff Summary Table */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Staff Expense Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-right">Total Spent</th>
                <th className="px-3 py-2 text-right">Refunded</th>
                <th className="px-3 py-2 text-right">Balance (Owed)</th>
                <th className="px-3 py-2 text-center">Transactions</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staffSummary.map((staff) => (
                <tr 
                  key={staff.staffName}
                  className="hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium">{staff.staffName}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(staff.totalPurchases)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{formatCurrency(staff.totalPaid)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${staff.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(staff.balance)}
                  </td>
                  <td className="px-3 py-2 text-center">{staff.transactionCount}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => loadStaffTransactions(staff.staffName)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 mr-1"
                    >
                      View
                    </button>
                    {staff.balance > 0 && (
                      <button
                        onClick={() => {
                          setSelectedStaffForRefund(staff.staffName);
                          setRefundAmount(0);
                          setRefundNote('');
                          setShowRefundModal(true);
                        }}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {staffSummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                    No staff expense records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Store className="h-4 w-4" />
          Expense Suppliers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers.map((supplier) => {
            const summary = supplierSummary.find(s => s.supplierId === supplier.id);
            return (
              <div
                key={supplier.id}
                onClick={() => loadSupplierDetails(supplier.id)}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{supplier.name}</h4>
                    <p className="text-xs text-gray-500">{supplier.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{supplier.code}</span>
                    {supplier.isCustom && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm">
                    <span className="text-gray-500">Balance: </span>
                    <span className={`font-semibold ${summary?.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {summary ? formatCurrency(summary.balance) : 'GH₵ 0.00'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {summary?.transactionCount || 0} transactions
                  </p>
                </div>
                {summary?.balance > 0 && (
                  <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Due: {formatCurrency(summary.balance)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render staff detail view
  const renderStaffDetail = () => {
    if (!selectedStaff) return null;

    const staffTrans = staffTransactions;
    const totalBalance = staffTrans.reduce((sum, t) => sum + t.balance, 0);
    const totalAmount = staffTrans.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalPaid = staffTrans.reduce((sum, t) => sum + t.amountPaid, 0);

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            setSelectedStaff(null);
            setStaffTransactions([]);
            loadData();
          }}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Expenses
        </button>

        {/* Staff Header */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{selectedStaff}</h2>
              <p className="text-sm text-gray-500">Staff Expenses</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-500">Total Spent</span>
                <p className="font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <span className="text-gray-500">Refunded</span>
                <p className="font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <span className="text-gray-500">Balance Owed</span>
                <p className={`font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>
          {totalBalance > 0 && (
            <div className="mt-3">
              <button
                onClick={() => {
                  setSelectedStaffForRefund(selectedStaff);
                  setRefundAmount(0);
                  setRefundNote('');
                  setShowRefundModal(true);
                }}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Wallet className="h-4 w-4 inline mr-1" />
                Process Refund for {selectedStaff}
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Transactions</h3>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Refunded</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffTrans.map((t) => {
                  const status = (t.status || 'pending') as TransactionStatus;
                  const statusColors: Record<TransactionStatus, string> = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    partial: 'bg-blue-100 text-blue-700',
                    completed: 'bg-green-100 text-green-700',
                    overdue: 'bg-red-100 text-red-700',
                    cleared: 'bg-purple-100 text-purple-700'
                  };
                  
                  return (
                    <tr key={t.id}>
                      <td className="px-3 py-2 text-sm">{formatDate(t.transactionDate)}</td>
                      <td className="px-3 py-2 text-sm">{t.itemName}</td>
                      <td className="px-3 py-2 text-center">{t.quantity} {t.unit}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(t.totalAmount)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(t.amountPaid)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(t.balance)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {staffTrans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                      No transactions found for {selectedStaff}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {staffTrans.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
            {staffTrans.length === 0 && (
              <p className="text-center text-gray-500 py-4">No transactions found</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render supplier detail view
  const renderSupplierDetail = () => {
    if (!selectedSupplier) return null;

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            setViewMode('list');
            setSelectedSupplier(null);
          }}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Expenses
        </button>

        {/* Supplier Header */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{selectedSupplier.name}</h2>
              <p className="text-sm text-gray-500">{selectedSupplier.category}</p>
              {selectedSupplier.isCustom && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom Vendor</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowAddItem(true)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Package className="h-4 w-4 inline mr-1" />
                Add Item
              </button>
              <button
                onClick={() => {
                  setExpenseItems([{ id: '1', itemName: '', quantity: 1, amount: 0 }]);
                  setPaymentDetails({
                    paymentMethod: 'cheque',
                    chequeNumber: '',
                    chequeIssueDate: '',
                    chequeClearingDate: '',
                    chequeBank: '',
                    purchasedBy: '',
                    salesDate: '',
                    notes: ''
                  });
                  setShowAddTransaction(true);
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                New Expense
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-3 rounded-lg border">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-auto"
          />
          <div className="flex items-center gap-2 text-sm w-full sm:w-auto">
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              className="border rounded px-2 py-1 text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              className="border rounded px-2 py-1 text-xs"
            />
            <button
              onClick={() => {
                setDateFilter({ start: '', end: '' });
                if (selectedSupplier) {
                  loadSupplierDetails(selectedSupplier.id);
                }
              }}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Transactions</h3>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-center">Method</th>
                  <th className="px-3 py-2 text-center">By</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((t) => {
                  const status = (t.status || 'pending') as TransactionStatus;
                  const statusColors: Record<TransactionStatus, string> = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    partial: 'bg-blue-100 text-blue-700',
                    completed: 'bg-green-100 text-green-700',
                    overdue: 'bg-red-100 text-red-700',
                    cleared: 'bg-purple-100 text-purple-700'
                  };
                  
                  return (
                    <tr key={t.id}>
                      <td className="px-3 py-2 text-sm">{formatDate(t.transactionDate)}</td>
                      <td className="px-3 py-2 text-sm">{t.itemName}</td>
                      <td className="px-3 py-2 text-center">{t.quantity} {t.unit}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(t.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(t.totalAmount)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(t.amountPaid)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(t.balance)}</td>
                      <td className="px-3 py-2 text-center text-xs capitalize">{t.paymentMethod || 'cheque'}</td>
                      <td className="px-3 py-2 text-center text-xs">{t.purchasedBy || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredTransactions.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
            {filteredTransactions.length === 0 && (
              <p className="text-center text-gray-500 py-4">No transactions found</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add Vendor Modal
  const renderAddVendorModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Add New Vendor</h3>
          <button onClick={() => setShowAddVendor(false)}>
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vendor Name *</label>
            <input
              type="text"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g., ABC Supermarket"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={newVendor.category}
              onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="Supermarket">Supermarket</option>
              <option value="Market">Market</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Retail">Retail</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Person</label>
            <input
              type="text"
              value={newVendor.contactPerson}
              onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Contact person name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={newVendor.phone}
                onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={newVendor.email}
                onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <select
                value={newVendor.paymentTerms}
                onChange={(e) => setNewVendor({ ...newVendor, paymentTerms: e.target.value as any })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credit Days</label>
              <input
                type="number"
                value={newVendor.creditDays}
                onChange={(e) => setNewVendor({ ...newVendor, creditDays: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="30"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700">
            <p>💡 The vendor will be added with a custom tag and you can start adding items and expenses immediately.</p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleAddVendor}
              disabled={!newVendor.name.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Add Vendor
            </button>
            <button
              onClick={() => setShowAddVendor(false)}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Add Item Modal
  const renderAddItemModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Add Item - {selectedSupplier?.name}</h3>
          <button onClick={() => setShowAddItem(false)}>
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name *</label>
            <input
              type="text"
              value={newItem.itemName}
              onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g., Cooking Oil"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                type="text"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., litre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Price (GH₵)</label>
              <input
                type="number"
                step="0.01"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g., Groceries"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Any additional notes"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleAddItem}
              disabled={!newItem.itemName.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Add Item
            </button>
            <button
              onClick={() => setShowAddItem(false)}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Add Expense Modal
  const renderAddExpenseModal = () => {
    if (!selectedSupplier) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">New Expenses - {selectedSupplier.name}</h3>
            <button onClick={() => setShowAddTransaction(false)}>
              <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Expense Items Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-gray-700">Expense Items</h4>
                <button
                  onClick={addExpenseItemRow}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {expenseItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => updateExpenseItem(item.id, 'itemName', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder={`Item ${index + 1} name`}
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => updateExpenseItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded-md px-2 py-2 text-sm text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.amount}
                        onChange={(e) => updateExpenseItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded-md px-2 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Amount"
                      />
                    </div>
                    <div className="w-28 text-sm font-medium text-blue-600 text-right">
                      {formatCurrency(item.quantity * item.amount)}
                    </div>
                    <button
                      onClick={() => removeExpenseItemRow(item.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="flex justify-end mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Grand Total</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Payment Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentMethod: e.target.value as any })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purchased By</label>
                  <select
                    value={paymentDetails.purchasedBy}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, purchasedBy: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Staff</option>
                    <option value="Simon">Simon</option>
                    <option value="Fred">Fred</option>
                    <option value="Other">Sales</option>
                  </select>
                </div>
              </div>

              {paymentDetails.paymentMethod === 'cheque' && (
                <div className="border-l-4 border-purple-500 pl-4 mt-4 space-y-4">
                  <h4 className="font-medium text-sm text-purple-700">Cheque Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cheque Number</label>
                      <input
                        type="text"
                        value={paymentDetails.chequeNumber}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, chequeNumber: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="e.g., CHQ-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bank</label>
                      <input
                        type="text"
                        value={paymentDetails.chequeBank}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, chequeBank: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="e.g., Stanbic Bank"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={paymentDetails.chequeIssueDate}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, chequeIssueDate: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Clearing Date</label>
                      <input
                        type="date"
                        value={paymentDetails.chequeClearingDate}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, chequeClearingDate: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Sales Date</label>
                <input
                  type="date"
                  value={paymentDetails.salesDate}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, salesDate: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Date of sales this expense is for</p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={paymentDetails.notes}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, notes: e.target.value })}
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Any additional notes"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={handleAddTransaction}
                disabled={expenseItems.some(item => !item.itemName.trim()) || grandTotal === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save All Expenses ({expenseItems.length} items)
              </button>
              <button
                onClick={() => setShowAddTransaction(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Refund Modal
  const renderRefundModal = () => {
    if (!selectedStaffForRefund) return null;

    const staffTotal = staffSummary.find(s => s.staffName === selectedStaffForRefund);
    const maxRefund = staffTotal?.balance || 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Process Refund - {selectedStaffForRefund}</h3>
            <button onClick={() => setShowRefundModal(false)}>
              <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">
                <span className="text-gray-500">Staff Member:</span> {selectedStaffForRefund}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Total Spent:</span> {formatCurrency(staffTotal?.totalPurchases || 0)}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Already Refunded:</span> {formatCurrency(staffTotal?.totalPaid || 0)}
              </p>
              <p className="text-sm font-semibold">
                <span className="text-gray-500">Balance Owed:</span> {formatCurrency(maxRefund)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Refund Amount (GH₵)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefund}
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Enter amount to refund"
              />
              <p className="text-xs text-gray-500 mt-1">Max: {formatCurrency(maxRefund)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Note (Optional)</label>
              <input
                type="text"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., Cash refund to Simon"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleRefund}
                disabled={refundAmount <= 0 || refundAmount > maxRefund}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Process Refund
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Expenses</h1>
        </div>
        <div className="text-sm text-gray-500">
          {viewMode === 'list' ? `${suppliers.length} suppliers` : selectedSupplier?.name}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
          'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {selectedStaff ? renderStaffDetail() : viewMode === 'list' ? renderDashboard() : renderSupplierDetail()}

      {showAddVendor && renderAddVendorModal()}
      {showAddItem && renderAddItemModal()}
      {showAddTransaction && renderAddExpenseModal()}
      {showRefundModal && renderRefundModal()}
    </div>
  );
}