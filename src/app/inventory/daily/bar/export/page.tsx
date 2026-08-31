// src/app/inventory/daily/bar/export/page.tsx
'use client';

import { useState } from 'react';
import { loadBarDaily } from '../actions';
import { Calendar, Download, Loader2, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

interface ExportRow {
  'Item Name': string;
  'Category': string;
  'Unit': string;
  'Counter Open': number;
  'Counter Add': number;
  'Counter Close': number;
  'Fridge Open': number;
  'Fridge Add': number;
  'Fridge Close': number;
  'Waste': number;
  'Total Stock': number;
  'Total Sales': number;
}

export default function BarExportPage() {
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
      const result = await loadBarDaily(selectedDate);
      
      if (result.success && result.data) {
        const exportData: ExportRow[] = result.data.map((item: any) => ({
          'Item Name': item.name || '',
          'Category': item.category || '',
          'Unit': item.unit || '',
          'Counter Open': Number(item.downOpen) || 0,
          'Counter Add': Number(item.downAdd) || 0,
          'Counter Close': Number(item.downClose) || 0,
          'Fridge Open': Number(item.fridgeOpen) || 0,
          'Fridge Add': Number(item.fridgeAdd) || 0,
          'Fridge Close': Number(item.fridgeClose) || 0,
          'Waste': Number(item.waste) || 0,
          'Total Stock': Number(item.totalStock) || 0,
          'Total Sales': Number(item.totalSales) || 0,
        }));

        const headers = Object.keys(exportData[0]) as (keyof ExportRow)[];
        const csvRows = [];
        
        csvRows.push(headers.join(','));
        
        for (const row of exportData) {
          const values = headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          });
          csvRows.push(values.join(','));
        }

        const csvContent = csvRows.join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, '-');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Bar_Report_${formattedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setMessage({
          type: 'success',
          text: `✅ Bar report for ${formatDisplayDate(selectedDate)} exported successfully!`
        });
      } else if (result.success && !result.data) {
        setMessage({
          type: 'info',
          text: `ℹ️ No data found for ${formatDisplayDate(selectedDate)}. Please enter bar data first.`
        });
      } else {
        setMessage({
          type: 'error',
          text: `❌ Failed to load data: ${result.message}`
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      setMessage({
        type: 'error',
        text: '❌ An error occurred during export.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link 
        href="/inventory/daily/bar"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bar Inventory
      </Link>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Export Bar Report</h1>
            <p className="text-sm text-gray-500">Generate CSV report for bar inventory</p>
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
                    Export CSV
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
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{message.type === 'success' ? '✅' : message.type === 'info' ? 'ℹ️' : '❌'}</span>
                <span>{message.text}</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="font-semibold text-blue-800 mb-2">📊 What gets exported:</p>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>All bar items with Counter and Fridge split tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>Opening, additions, and closing for both locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>Waste tracking and calculated sales</span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              <span className="font-medium">📁 File format:</span> CSV with UTF-8 BOM for Excel compatibility
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">💡 Tip:</span> File will be downloaded as 
              <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1 text-xs">
                Bar_Report_{new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.csv
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}