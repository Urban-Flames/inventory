// src/app/suppliers/components/ChequeManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getSupplierCheques, updateChequeStatus } from '../actions';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

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

interface ChequeManagerProps {
  supplierId: string;
  supplierName: string;
}

export function ChequeManager({ supplierId, supplierName }: ChequeManagerProps) {
  const [cheques, setCheques] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCheques();
  }, [supplierId]);

  const loadCheques = async () => {
    setIsLoading(true);
    try {
      const result = await getSupplierCheques(supplierId);
      if (result.success && result.data) {
        setCheques(result.data);
      }
    } catch (error) {
      console.error('Error loading cheques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCleared = async (chequeId: number) => {
    if (confirm('Mark this cheque as cleared?')) {
      const result = await updateChequeStatus(chequeId, 'cleared', new Date().toISOString().split('T')[0]);
      if (result.success) {
        await loadCheques();
        alert('Cheque marked as cleared!');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">Issued</span>;
      case 'cleared':
        return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Cleared</span>;
      case 'bounced':
        return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Bounced</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-sm text-gray-500">Loading cheques...</div>;
  }

  if (cheques.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        No cheques issued for {supplierName}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Cheque History</h4>
      {cheques.map((cheque) => (
        <div key={cheque.id} className="border rounded-lg p-3 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{cheque.chequeNumber}</p>
              <p className="text-sm text-gray-600">{formatCurrency(cheque.amount)}</p>
            </div>
            {getStatusBadge(cheque.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
              <span className="text-gray-500">Issue Date</span>
              <p className="text-xs">{formatDate(cheque.issueDate)}</p>
            </div>
            <div>
              <span className="text-gray-500">Clearing Date</span>
              <p className="text-xs">{cheque.clearingDate ? formatDate(cheque.clearingDate) : 'Not set'}</p>
            </div>
          </div>

          {cheque.bank && (
            <p className="text-xs text-gray-500 mt-1">Bank: {cheque.bank}</p>
          )}

          {cheque.status === 'issued' && (
            <button
              onClick={() => handleMarkCleared(cheque.id)}
              className="mt-2 text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark as Cleared
            </button>
          )}
        </div>
      ))}
    </div>
  );
}