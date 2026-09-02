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
  Phone, Mail, MapPin
} from 'lucide-react';
import {
  getExpenseSuppliers,
  getExpenseTransactions,
  getStaffExpenseSummary,
  getExpenseSupplierSummary,
  saveExpenseTransaction,
  initializeExpenseSuppliers,
  addExpenseSupplier,
  addExpenseItem
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
          <span className="text-gray-500">Paid</span>
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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [filterStaff, setFilterStaff] = useState<string>('');

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

  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    totalAmount: 0,
    amountPaid: 0,
    balance: 0,
    paymentMethod: 'cheque' as 'cash' | 'cheque' | 'credit',
    chequeNumber: '',
    chequeIssueDate: '',
    chequeClearingDate: '',
    chequeBank: '',
    purchasedBy: '',
    salesDate: '',
    notes: ''
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

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

      // Load all transactions
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

    try {
      const totalAmount = newTransaction.quantity * newTransaction.unitPrice;
      const balance = totalAmount - newTransaction.amountPaid;
      
      let status: TransactionStatus = 'pending';
      if (newTransaction.paymentMethod === 'cheque') {
        status = 'pending';
      } else if (newTransaction.amountPaid === 0) {
        status = 'pending';
      } else if (newTransaction.amountPaid >= totalAmount) {
        status = 'completed';
      } else {
        status = 'partial';
      }

      const result = await saveExpenseTransaction({
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        transactionDate: new Date().toISOString().split('T')[0],
        ...newTransaction,
        totalAmount: totalAmount,
        balance: balance,
        status: status
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Expense added successfully' });
        setShowAddTransaction(false);
        setNewTransaction({
          itemName: '',
          quantity: 1,
          unit: '',
          unitPrice: 0,
          totalAmount: 0,
          amountPaid: 0,
          balance: 0,
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
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to add expense' });
      }
    } catch (error) {
      console.error('Error adding expense:', error);
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

  const totalBalance = supplierSummary.reduce((sum, s) => sum + s.balance, 0);
  const totalPurchases = supplierSummary.reduce((sum, s) => sum + s.totalPurchases, 0);
  const totalPaid = supplierSummary.reduce((sum, s) => sum + s.totalPaid, 0);

  // Staff summary total
  const staffTotalBalance = staffSummary.reduce((sum, s) => sum + s.balance, 0);

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

      {/* Staff Summary */}
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
                <th className="px-3 py-2 text-right">Total Purchases</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-center">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staffSummary.map((staff) => (
                <tr key={staff.staffName}>
                  <td className="px-3 py-2 font-medium">{staff.staffName}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(staff.totalPurchases)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{formatCurrency(staff.totalPaid)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${staff.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(staff.balance)}
                  </td>
                  <td className="px-3 py-2 text-center">{staff.transactionCount}</td>
                </tr>
              ))}
              {staffSummary.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
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
                onClick={() => setShowAddTransaction(true)}
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

  // Add Expense Modal (from previous code - keeping it the same)
  const renderAddExpenseModal = () => {
    if (!selectedSupplier) return null;

    const items = selectedSupplier.items || [];
    const selectedItem = items.find((i: ExpenseItem) => i.itemName === newTransaction.itemName);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">New Expense - {selectedSupplier.name}</h3>
            <button onClick={() => setShowAddTransaction(false)}>
              <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item</label>
              <select
                value={newTransaction.itemName}
                onChange={(e) => {
                  const selected = items.find((i: ExpenseItem) => i.itemName === e.target.value);
                  setNewTransaction({
                    ...newTransaction,
                    itemName: e.target.value,
                    unit: selected?.unit || '',
                    unitPrice: selected?.unitPrice || 0
                  });
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Item</option>
                {items.map((i: ExpenseItem) => (
                  <option key={i.itemName} value={i.itemName}>
                    {i.itemName} ({formatCurrency(i.unitPrice)}/{i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.quantity}
                  onChange={(e) => {
                    const qty = parseFloat(e.target.value) || 0;
                    setNewTransaction({
                      ...newTransaction,
                      quantity: qty,
                      totalAmount: qty * newTransaction.unitPrice,
                      balance: (qty * newTransaction.unitPrice) - newTransaction.amountPaid
                    });
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <input
                  type="text"
                  value={newTransaction.unit}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unit Price (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.unitPrice}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    setNewTransaction({
                      ...newTransaction,
                      unitPrice: price,
                      totalAmount: newTransaction.quantity * price,
                      balance: (newTransaction.quantity * price) - newTransaction.amountPaid
                    });
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total (GH₵)</label>
                <input
                  type="text"
                  value={formatCurrency(newTransaction.totalAmount)}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 font-semibold"
                />
              </div>
            </div>

            {/* Payment Method and Cheque Details */}
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select
                value={newTransaction.paymentMethod}
                onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value as any })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {newTransaction.paymentMethod === 'cheque' && (
              <div className="border-l-4 border-purple-500 pl-4 space-y-4">
                <h4 className="font-medium text-sm text-purple-700">Cheque Details</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cheque Number *</label>
                    <input
                      type="text"
                      value={newTransaction.chequeNumber}
                      onChange={(e) => setNewTransaction({ ...newTransaction, chequeNumber: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g., CHQ-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank</label>
                    <input
                      type="text"
                      value={newTransaction.chequeBank}
                      onChange={(e) => setNewTransaction({ ...newTransaction, chequeBank: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Stanbic Bank"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Issue Date *</label>
                    <input
                      type="date"
                      value={newTransaction.chequeIssueDate}
                      onChange={(e) => setNewTransaction({ ...newTransaction, chequeIssueDate: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Clearing Date</label>
                    <input
                      type="date"
                      value={newTransaction.chequeClearingDate}
                      onChange={(e) => setNewTransaction({ ...newTransaction, chequeClearingDate: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Purchased By</label>
                <select
                  value={newTransaction.purchasedBy}
                  onChange={(e) => setNewTransaction({ ...newTransaction, purchasedBy: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Staff</option>
                  <option value="Simon">Simon</option>
                  <option value="Fred">Fred</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sales Date</label>
                <input
                  type="date"
                  value={newTransaction.salesDate}
                  onChange={(e) => setNewTransaction({ ...newTransaction, salesDate: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Date of sales this expense is for</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Any additional notes"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleAddTransaction}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Expense
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

      {viewMode === 'list' ? renderDashboard() : renderSupplierDetail()}

      {showAddVendor && renderAddVendorModal()}
      {showAddItem && renderAddItemModal()}
      {showAddTransaction && renderAddExpenseModal()}
    </div>
  );
}