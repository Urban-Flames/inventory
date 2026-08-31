// src/app/inventory/daily/main-stock/export/page.tsx
'use client';

import { useState } from 'react';
import { exportToExcel } from '@/lib/exportUtils';
import { loadDailyMainStock } from '../actions';
import { Calendar, Download, Loader2, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function ExportPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await loadDailyMainStock(selectedDate);
      
      if (result.success && result.data) {
        exportToExcel({
          items: result.data.items,
          productionDetails: result.data.productionDetails || {},
          date: selectedDate,
        });
        
        setMessage({
          type: 'success',
          text: `Excel report for ${formatDisplayDate(selectedDate)} exported successfully!`
        });
      } else if (result.success && !result.data) {
        setMessage({
          type: 'info',
          text: `No data found for ${formatDisplayDate(selectedDate)}. Please enter stock data first.`
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

  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link 
        href="/inventory/daily/main-stock"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Daily Stock Entry
      </Link>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold">Export Daily Stock Report</h1>
            <p className="text-sm text-gray-500">Generate Excel report for any date</p>
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
                <span>Complete stock list with opening, added, issued, and closing stock</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Production batches with weights and waste tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Derived portions for each production batch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Summary statistics including out of stock and low stock items</span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Tip:</span> The Excel file will be downloaded with the filename 
              <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1 text-xs">
                Daily_Stock_Report_{new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.xlsx
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}