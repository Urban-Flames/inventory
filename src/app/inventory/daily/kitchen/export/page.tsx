// src/app/inventory/kitchen/daily/export/page.tsx
'use client';

import { useState } from 'react';
import { loadKitchenDaily } from '../actions';
import { Calendar, Download, Loader2, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function KitchenExportPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleExport = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await loadKitchenDaily(selectedDate);
      
      if (result.success && result.data) {
        // TODO: Implement Excel export for kitchen
        setMessage({
          type: 'success',
          text: `Kitchen report for ${formatDisplayDate(selectedDate)} exported successfully! (Coming soon)`
        });
      } else if (result.success && !result.data) {
        setMessage({
          type: 'info',
          text: `No data found for ${formatDisplayDate(selectedDate)}. Please enter kitchen data first.`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Failed to load data: ${result.message}`
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred during export.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link 
        href="/inventory/kitchen/daily"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Kitchen Inventory
      </Link>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold">Export Kitchen Report</h1>
            <p className="text-sm text-gray-500">Generate Excel report for kitchen inventory</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : message.type === 'info'
                ? 'bg-blue-50 border border-blue-200 text-blue-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="font-semibold text-blue-800 mb-2">What gets exported:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>All kitchen items with morning stock, additions, and closing counts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Calculated sales deductions per item</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Waste tracking and variance analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Category-wise grouping for better reporting</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}