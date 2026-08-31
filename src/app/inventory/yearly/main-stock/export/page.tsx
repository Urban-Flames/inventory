// src/app/inventory/yearly/main-stock/export/page.tsx
'use client';

import { useState } from 'react';
import { loadYearlyMainStockSummary, getYearRange } from '../actions';
import { Calendar, Download, Loader2, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

interface ExportRow {
  'Item Name': string;
  'Category': string;
  'Unit': string;
  'Usage Type': string;
  'Year Opening': number;
  'Total Added': number;
  'To Production': number;
  'To Kitchen': number;
  'Total Used': number;
  'Year Closing': number;
  'Reorder Level': number;
  'Avg Monthly Usage': number;
  'Stock Cover Months': number;
  'Status': string;
}

export default function YearlyMainStockExportPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStockStatus = (item: any): string => {
    const closingStock = Number(item.closing_stock) || 0;
    const reorderLevel = Number(item.reorder_level) || 0;
    
    if (closingStock <= 0) return 'Out of Stock';
    if (closingStock <= reorderLevel) return 'Low Stock';
    return 'OK';
  };

  const formatUsageType = (type: string): string => {
    if (!type) return 'Direct Sale';
    const labels: Record<string, string> = {
      production_raw: 'Production Raw',
      direct_sale: 'Direct Sale',
      both: 'Both'
    };
    return labels[type] || type;
  };

  const handleExport = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await loadYearlyMainStockSummary(selectedDate);
      
      if (result.success && result.data && result.data.length > 0) {
        const exportData: ExportRow[] = result.data.map((item: any) => ({
          'Item Name': item.item_name || '',
          'Category': item.category || '',
          'Unit': item.unit || '',
          'Usage Type': formatUsageType(item.usage_type),
          'Year Opening': Number(item.opening_stock) || 0,
          'Total Added': Number(item.total_added) || 0,
          'To Production': Number(item.total_production) || 0,
          'To Kitchen': Number(item.total_kitchen) || 0,
          'Total Used': Number(item.total_used) || 0,
          'Year Closing': Number(item.closing_stock) || 0,
          'Reorder Level': Number(item.reorder_level) || 0,
          'Avg Monthly Usage': Number(item.avg_monthly_usage) || 0,
          'Stock Cover Months': Number(item.stock_cover_months) || 0,
          'Status': getStockStatus(item)
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
        
        const { yearValue } = await getYearRange(selectedDate);
        const fileName = `Yearly_Main_Stock_Report_${yearValue}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setMessage({
          type: 'success',
          text: `Yearly main stock report for ${yearValue} exported successfully!`
        });
      } else {
        setMessage({
          type: 'info',
          text: 'No yearly data found for this year. Please generate the yearly report first.'
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
        href="/inventory/yearly/main-stock"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Yearly Report
      </Link>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Export Yearly Main Stock Report</h1>
            <p className="text-sm text-gray-500">Generate CSV report for yearly main stock summary</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Any Date in the Year
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

          {/* Message */}
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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="font-semibold text-blue-800 mb-2">What gets exported:</p>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>Yearly summary for all main stock items</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>Opening, added, production, kitchen, and closing totals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>Usage type (Production Raw / Direct Sale / Both)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">•</span>
                <span>Average monthly usage and stock cover months</span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              <span className="font-medium">File format:</span> CSV with UTF-8 BOM for Excel compatibility
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Tip:</span> The file will be downloaded with the year in the filename
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}