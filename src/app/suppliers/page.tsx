// src/app/suppliers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Calendar, DollarSign, 
  CheckCircle, Clock, AlertCircle, Trash2, 
  Eye, Edit, Printer, Download, X,
  ChevronDown, ChevronUp, Building2, Package,
  CreditCard, Banknote, Wallet, Users,
  TrendingUp, TrendingDown, FileText, CalendarDays
} from 'lucide-react';
import {
  getSuppliers,
  getSupplierTransactions,
  getSupplierSummary,
  saveTransaction,
  recordPayment,
  addSupplierProduct,
  deleteSupplierProduct,
  getAllSupplierSummaries,
  initializeSuppliers
} from './actions';
import { supplierData } from '@/data/suppliers';
import { Supplier, SupplierTransaction, SupplierProduct } from '@/types/supplier';
import { ChequeManager } from './components/ChequeManager';

// Format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format currency
const formatCurrency = (amount: number) => {
  return `GH₵ ${amount.toFixed(2)}`;
};

// Generate transaction number
const generateTransactionNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `TRX-${year}${month}${day}-${random}`;
};

// Type for status
type TransactionStatus = 'pending' | 'partial' | 'completed' | 'overdue' | 'cleared';

// Mobile card component for transactions
const TransactionCard = ({ transaction, onView, onEdit }: { 
  transaction: SupplierTransaction; 
  onView?: (id: number) => void; 
  onEdit?: (id: number) => void;
}) => {
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
            <span className="font-mono text-xs font-semibold">{transaction.productName}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
              {status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(transaction.transactionDate)}
          </div>
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
            <p className="font-medium capitalize">{transaction.paymentMethod || 'cash'}</p>
          </div>
          {transaction.chequeNumber && (
            <div>
              <span className="text-gray-500">Cheque Number</span>
              <p className="font-medium">{transaction.chequeNumber}</p>
              {transaction.chequeClearingDate && (
                <p className="text-gray-500 text-[10px]">Clearing: {formatDate(transaction.chequeClearingDate)}</p>
              )}
            </div>
          )}
          {transaction.dueDate && (
            <div>
              <span className="text-gray-500">Due Date</span>
              <p className="font-medium">{formatDate(transaction.dueDate)}</p>
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

// Main component
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [allSummaries, setAllSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [isMobileView, setIsMobileView] = useState(false);

  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    productName: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    totalAmount: 0,
    amountPaid: 0,
    balance: 0,
    paymentMethod: 'credit' as 'cash' | 'cheque' | 'credit' | 'bank_transfer',
    chequeNumber: '',
    chequeIssueDate: '',
    chequeClearingDate: '',
    chequeBank: '',
    notes: ''
  });

  // New product form
  const [newProduct, setNewProduct] = useState({
    productName: '',
    unit: '',
    unitPrice: 0,
    notes: ''
  });

  // Payment form
  const [payment, setPayment] = useState({
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'cheque' | 'bank_transfer',
    chequeNumber: '',
    chequeIssueDate: '',
    chequeClearingDate: '',
    chequeBank: '',
    notes: ''
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Initialize suppliers if needed
      await initializeSuppliers();

      const supplierResult = await getSuppliers();
      if (supplierResult.success && supplierResult.data) {
        setSuppliers(supplierResult.data);
      }

      const summaryResult = await getAllSupplierSummaries();
      if (summaryResult.success && summaryResult.data) {
        setAllSummaries(summaryResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load supplier data' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupplierDetails = async (supplierId: string) => {
    setIsLoading(true);
    try {
      const summaryResult = await getSupplierSummary(supplierId);
      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }

      const transactionResult = await getSupplierTransactions(
        supplierId,
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
        setShowSupplierDetails(true);
      }
    } catch (error) {
      console.error('Error loading supplier details:', error);
      setMessage({ type: 'error', text: 'Failed to load supplier details' });
    } finally {
      setIsLoading(false);
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
      } else if (newTransaction.paymentMethod === 'credit') {
        status = 'pending';
      } else if (newTransaction.amountPaid === 0) {
        status = 'pending';
      } else if (newTransaction.amountPaid >= totalAmount) {
        status = 'completed';
      } else {
        status = 'partial';
      }

      const result = await saveTransaction({
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        transactionDate: new Date().toISOString().split('T')[0],
        ...newTransaction,
        totalAmount: totalAmount,
        balance: balance,
        status: status
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Transaction added successfully' });
        setShowAddTransaction(false);
        setNewTransaction({
          productName: '',
          quantity: 1,
          unit: '',
          unitPrice: 0,
          totalAmount: 0,
          amountPaid: 0,
          balance: 0,
          paymentMethod: 'credit',
          chequeNumber: '',
          chequeIssueDate: '',
          chequeClearingDate: '',
          chequeBank: '',
          notes: ''
        });
        await loadSupplierDetails(selectedSupplier.id);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to add transaction' });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const handleAddProduct = async () => {
    if (!selectedSupplier) return;

    try {
      const result = await addSupplierProduct(selectedSupplier.id, newProduct);
      if (result.success) {
        setMessage({ type: 'success', text: 'Product added successfully' });
        setShowAddProduct(false);
        setNewProduct({ productName: '', unit: '', unitPrice: 0, notes: '' });
        await loadSupplierDetails(selectedSupplier.id);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to add product' });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedSupplier) return;

    try {
      const result = await recordPayment({
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        paymentDate: new Date().toISOString().split('T')[0],
        ...payment
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Payment recorded successfully' });
        setShowPayment(false);
        setPayment({ amount: 0, paymentMethod: 'cash', chequeNumber: '', chequeIssueDate: '', chequeClearingDate: '', chequeBank: '', notes: '' });
        await loadSupplierDetails(selectedSupplier.id);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to record payment' });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBalance = allSummaries.reduce((sum, s) => sum + s.balance, 0);
  const totalPaid = allSummaries.reduce((sum, s) => sum + s.totalPaid, 0);
  const totalPurchases = allSummaries.reduce((sum, s) => sum + s.totalPurchases, 0);

  // Render supplier list view
  const renderSupplierList = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => loadData()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
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
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => {
          const summary = allSummaries.find(s => s.supplierId === supplier.id);
          const isChequeSupplier = supplier.paymentTerms === 'cheque';
          
          return (
            <div
              key={supplier.id}
              onClick={() => loadSupplierDetails(supplier.id)}
              className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  <p className="text-sm text-gray-500">{supplier.category}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{supplier.code}</span>
              </div>

              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isChequeSupplier ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isChequeSupplier ? 'Cheque Payment' : `Credit (${supplier.creditDays || 30} days)`}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Balance</p>
                  <p className={`font-semibold ${summary?.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {summary ? formatCurrency(summary.balance) : 'GH₵ 0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Transactions</p>
                  <p className="font-semibold">{summary?.transactionCount || 0}</p>
                </div>
              </div>

              {summary?.balance > 0 && (
                <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Balance due: {formatCurrency(summary.balance)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render supplier detail view
  const renderSupplierDetail = () => {
    if (!selectedSupplier) return null;

    const isChequeSupplier = selectedSupplier.paymentTerms === 'cheque';

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            setViewMode('list');
            setShowSupplierDetails(false);
            setSelectedSupplier(null);
          }}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Suppliers
        </button>

        {/* Supplier Header */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{selectedSupplier.name}</h2>
              <p className="text-sm text-gray-500">{selectedSupplier.category}</p>
              {selectedSupplier.contactPerson && (
                <p className="text-sm text-gray-600">Contact: {selectedSupplier.contactPerson}</p>
              )}
              <div className="mt-1">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isChequeSupplier ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isChequeSupplier ? 'Cheque Payment' : `Credit (${selectedSupplier.creditDays || 30} days)`}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                New Purchase
              </button>
              <button
                onClick={() => setShowAddProduct(true)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Package className="h-4 w-4 inline mr-1" />
                Add Product
              </button>
              {summary?.balance > 0 && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Record Payment
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Purchases</p>
              <p className="font-bold text-blue-600">{formatCurrency(summary?.totalPurchases || 0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="font-bold text-green-600">{formatCurrency(summary?.totalPaid || 0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`font-bold ${summary?.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(summary?.balance || 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="font-bold">{summary?.transactionCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedSupplier.products.map((product, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{product.productName}</td>
                    <td className="px-3 py-2">{product.unit}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(product.unitPrice)}</td>
                  </tr>
                ))}
                {selectedSupplier.products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                      No products available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cheque Manager - Only show for cheque suppliers */}
        {isChequeSupplier && (
          <div className="bg-white border rounded-lg p-4">
            <ChequeManager 
              supplierId={selectedSupplier.id} 
              supplierName={selectedSupplier.name} 
            />
          </div>
        )}

        {/* Transactions */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Transaction History</h3>
            <div className="flex items-center gap-2 text-sm">
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
                  loadSupplierDetails(selectedSupplier.id);
                }}
                className="text-blue-600 hover:text-blue-800 text-xs"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-center">Method</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((transaction) => {
                  const status = (transaction.status || 'pending') as TransactionStatus;
                  const statusColors: Record<TransactionStatus, string> = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    partial: 'bg-blue-100 text-blue-700',
                    completed: 'bg-green-100 text-green-700',
                    overdue: 'bg-red-100 text-red-700',
                    cleared: 'bg-purple-100 text-purple-700'
                  };
                  
                  return (
                    <tr key={transaction.id}>
                      <td className="px-3 py-2 text-sm">{formatDate(transaction.transactionDate)}</td>
                      <td className="px-3 py-2 text-sm">{transaction.productName}</td>
                      <td className="px-3 py-2 text-center">{transaction.quantity} {transaction.unit}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(transaction.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(transaction.totalAmount)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(transaction.amountPaid)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(transaction.balance)}</td>
                      <td className="px-3 py-2 text-center text-xs capitalize">{transaction.paymentMethod || 'cash'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
              />
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 py-4">No transactions found</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add Transaction Modal
  const renderAddTransactionModal = () => {
    if (!selectedSupplier) return null;

    const product = selectedSupplier.products.find(p => p.productName === newTransaction.productName);
    const isChequeSupplier = selectedSupplier.paymentTerms === 'cheque';
    const isCreditSupplier = selectedSupplier.paymentTerms === 'credit';

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">New Purchase</h3>
            <button onClick={() => setShowAddTransaction(false)}>
              <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Supplier info */}
            <div className={`p-3 rounded-md ${isChequeSupplier ? 'bg-purple-50' : 'bg-blue-50'}`}>
              <p className="text-sm font-medium">Supplier: {selectedSupplier.name}</p>
              <p className="text-xs text-gray-600">
                Payment Terms: {isChequeSupplier ? 'Cheque Payment' : isCreditSupplier ? `Credit (${selectedSupplier.creditDays || 30} days)` : 'Mixed'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <select
                value={newTransaction.productName}
                onChange={(e) => {
                  const selected = selectedSupplier.products.find(p => p.productName === e.target.value);
                  setNewTransaction({
                    ...newTransaction,
                    productName: e.target.value,
                    unit: selected?.unit || '',
                    unitPrice: selected?.unitPrice || 0
                  });
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Product</option>
                {selectedSupplier.products.map((p) => (
                  <option key={p.productName} value={p.productName}>
                    {p.productName} ({formatCurrency(p.unitPrice)}/{p.unit})
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
                <label className="block text-sm font-medium mb-1">Total Amount (GH₵)</label>
                <input
                  type="text"
                  value={formatCurrency(newTransaction.totalAmount)}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select
                value={newTransaction.paymentMethod}
                onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value as any })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {isChequeSupplier && (
                  <>
                    <option value="cheque">Cheque (Issue Now)</option>
                    <option value="credit">Credit (Pay Later)</option>
                  </>
                )}
                {isCreditSupplier && (
                  <>
                    <option value="credit">Credit ({selectedSupplier.creditDays || 30} days)</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </>
                )}
                {!isChequeSupplier && !isCreditSupplier && (
                  <>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit">Credit</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </>
                )}
              </select>
            </div>

            {/* Cheque Details */}
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
                    <p className="text-xs text-gray-500 mt-1">When the cheque is expected to clear</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.amountPaid || newTransaction.totalAmount}
                    onChange={(e) => {
                      const paid = parseFloat(e.target.value) || 0;
                      setNewTransaction({
                        ...newTransaction,
                        amountPaid: paid,
                        balance: newTransaction.totalAmount - paid
                      });
                    }}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Usually the full amount for cheque payments</p>
                </div>
              </div>
            )}

            {/* Credit Details */}
            {newTransaction.paymentMethod === 'credit' && (
              <div className="border-l-4 border-blue-500 pl-4 space-y-4">
                <h4 className="font-medium text-sm text-blue-700">Credit Details</h4>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Due Date:</span>{' '}
                    {selectedSupplier?.creditDays 
                      ? `${selectedSupplier.creditDays} days from today`
                      : '30 days from today'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    You'll need to pay this amount by the due date
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount to Pay Later (GH₵)</label>
                  <input
                    type="text"
                    value={formatCurrency(newTransaction.totalAmount)}
                    readOnly
                    className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleAddTransaction}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Transaction
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

  // Add Product Modal
  const renderAddProductModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Add Product</h3>
          <button onClick={() => setShowAddProduct(false)}>
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name</label>
            <input
              type="text"
              value={newProduct.productName}
              onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g., Chicken Breast"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                type="text"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Price (GH₵)</label>
              <input
                type="number"
                step="0.01"
                value={newProduct.unitPrice}
                onChange={(e) => setNewProduct({ ...newProduct, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <input
              type="text"
              value={newProduct.notes}
              onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Any additional info"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleAddProduct}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Product
            </button>
            <button
              onClick={() => setShowAddProduct(false)}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Payment Modal
  const renderPaymentModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Record Payment</h3>
          <button onClick={() => setShowPayment(false)}>
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (GH₵)</label>
            <input
              type="number"
              step="0.01"
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: parseFloat(e.target.value) || 0 })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={payment.paymentMethod}
              onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value as any })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {payment.paymentMethod === 'cheque' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cheque Number</label>
                  <input
                    type="text"
                    value={payment.chequeNumber}
                    onChange={(e) => setPayment({ ...payment, chequeNumber: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank</label>
                  <input
                    type="text"
                    value={payment.chequeBank}
                    onChange={(e) => setPayment({ ...payment, chequeBank: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={payment.chequeIssueDate}
                    onChange={(e) => setPayment({ ...payment, chequeIssueDate: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Clearing Date</label>
                  <input
                    type="date"
                    value={payment.chequeClearingDate}
                    onChange={(e) => setPayment({ ...payment, chequeClearingDate: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={payment.notes}
              onChange={(e) => setPayment({ ...payment, notes: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Any additional info"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleRecordPayment}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Record Payment
            </button>
            <button
              onClick={() => setShowPayment(false)}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Suppliers</h1>
        </div>
        <div className="text-sm text-gray-500">
          {viewMode === 'list' ? `${filteredSuppliers.length} suppliers` : selectedSupplier?.name}
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

      {viewMode === 'list' ? renderSupplierList() : renderSupplierDetail()}

      {showAddTransaction && renderAddTransactionModal()}
      {showAddProduct && renderAddProductModal()}
      {showPayment && renderPaymentModal()}
    </div>
  );
}