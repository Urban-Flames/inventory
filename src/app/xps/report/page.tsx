// src/app/xps/report/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  getXPSReconciliationReport
} from './actions';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Download,
  Calendar,
  RefreshCw,
  Printer
} from 'lucide-react';
import Link from 'next/link';

interface ReconciliationItem {
  item_name: string;
  xps_quantity: number;
  inventory_quantity: number;
  variance: number;
  location: string;
  status: 'matched' | 'yellow' | 'red';
  reason: string;
  mapped_item_name: string;
}

interface ReportData {
  total_items: number;
  matched_items: number;
  yellow_flags: number;
  red_flags: number;
  items: ReconciliationItem[];
  date: string;
  file_name?: string;
}

export default function XPSReconciliationReportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load report data
  useEffect(() => {
    if (selectedDate) {
      loadReport();
    }
  }, [selectedDate]);

  const loadReport = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await getXPSReconciliationReport(selectedDate);
      
      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        setReportData(null);
        setMessage({
          type: 'info',
          text: result.message || 'No data found for this date. Please upload an XPS file first.'
        });
      }
    } catch (error) {
      console.error('Error loading report:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load report data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Matched
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Yellow
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            Red
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'bg-green-50 hover:bg-green-100';
      case 'yellow': return 'bg-yellow-50 hover:bg-yellow-100';
      case 'red': return 'bg-red-50 hover:bg-red-100';
      default: return 'hover:bg-gray-50';
    }
  };

  const getRowBorder = (status: string) => {
    switch (status) {
      case 'matched': return 'border-l-4 border-green-500';
      case 'yellow': return 'border-l-4 border-yellow-500';
      case 'red': return 'border-l-4 border-red-500';
      default: return '';
    }
  };

  const filteredItems = reportData?.items.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  }) || [];

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const downloadCSV = () => {
    if (!reportData) return;

    const headers = ['Item Name', 'XPS Quantity', 'Inventory Quantity', 'Variance', 'Location', 'Status', 'Reason'];
    const rows = reportData.items.map(item => [
      item.item_name,
      item.xps_quantity,
      item.inventory_quantity,
      item.variance,
      item.location,
      item.status.toUpperCase(),
      item.reason
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `XPS_Reconciliation_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  // Summary statistics
  const totalItems = reportData?.total_items || 0;
  const matchedItems = reportData?.matched_items || 0;
  const yellowFlags = reportData?.yellow_flags || 0;
  const redFlags = reportData?.red_flags || 0;
  const hasIssues = (yellowFlags + redFlags) > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            XPS Reconciliation Report
          </h1>
          <p className="text-sm text-gray-500">
            View and analyze XPS sales reconciliation with kitchen and bar inventory.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/xps/daily">
            <button className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
              ← Back to Upload
            </button>
          </Link>
        </div>
      </div>

      {/* Date Selector and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <span className="text-sm text-gray-600">
            {getDayName(selectedDate)}
          </span>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {reportData && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {message.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Items</p>
                <p className="text-xl sm:text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Matched</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{matchedItems}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Yellow Flags</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{yellowFlags}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Red Flags</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{redFlags}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Stats */}
      {reportData && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All ({totalItems})
            </button>
            <button
              onClick={() => setFilterStatus('matched')}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filterStatus === 'matched'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Matched ({matchedItems})
            </button>
            <button
              onClick={() => setFilterStatus('yellow')}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filterStatus === 'yellow'
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Yellow ({yellowFlags})
            </button>
            <button
              onClick={() => setFilterStatus('red')}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filterStatus === 'red'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Red ({redFlags})
            </button>
          </div>
          {hasIssues && (
            <div className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span>{yellowFlags + redFlags} items need attention</span>
            </div>
          )}
        </div>
      )}

      {/* Report Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-300 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Loading report...</p>
        </div>
      ) : reportData && filteredItems.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600 sticky top-0">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3 text-center">XPS Qty</th>
                <th className="p-3 text-center">Inventory Qty</th>
                <th className="p-3 text-center">Variance</th>
                <th className="p-3 text-center hidden sm:table-cell">Location</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-left hidden lg:table-cell">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item, index) => {
                const isMatched = item.status === 'matched';
                const isYellow = item.status === 'yellow';
                const isRed = item.status === 'red';
                const varianceColor = isMatched ? 'text-green-600' : isYellow ? 'text-yellow-600' : 'text-red-600';
                const variancePrefix = isMatched ? '' : isYellow ? '▲ ' : '▼ ';

                return (
                  <tr 
                    key={index} 
                    className={`${getStatusColor(item.status)} ${getRowBorder(item.status)} transition-colors`}
                  >
                    <td className="p-3 font-medium">
                      <div>
                        <span>{item.item_name}</span>
                        {item.mapped_item_name && item.mapped_item_name !== item.item_name && (
                          <div className="text-xs text-gray-400">
                            → {item.mapped_item_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-medium">{item.xps_quantity}</td>
                    <td className="p-3 text-center">{item.inventory_quantity}</td>
                    <td className={`p-3 text-center font-bold ${varianceColor}`}>
                      {item.variance !== 0 ? `${variancePrefix}${Math.abs(item.variance)}` : '0'}
                    </td>
                    <td className="p-3 text-center hidden sm:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.location === 'kitchen' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.location}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="p-3 text-left hidden lg:table-cell text-xs text-gray-600">
                      {item.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : reportData && filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No Items to Display</h3>
          <p className="text-sm text-gray-500">
            {filterStatus !== 'all' 
              ? `No items with status "${filterStatus}" found.` 
              : 'No reconciliation data available for this date.'}
          </p>
        </div>
      ) : null}

      {/* Legend */}
      {reportData && (
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Legend</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600">Matched - XPS = Inventory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-gray-600">Yellow - XPS &gt; Inventory (Sold more than recorded)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600">Red - Inventory &gt; XPS (Used more than sold)</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p><strong>XPS Reconciliation Report</strong> compares POS sales (XPS) with kitchen and bar inventory sales.</p>
        <p><strong>Yellow Flag:</strong> XPS shows more sales than inventory recorded (forgotten transfer or miscount).</p>
        <p><strong>Red Flag:</strong> Inventory shows more usage than XPS sales (possible theft or unrecorded usage).</p>
        <p className="text-blue-600">💡 Click "Export CSV" to download the full report for analysis.</p>
      </div>
    </div>
  );
}