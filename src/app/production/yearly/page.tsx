// src/app/production/yearly/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  generateYearlyProductionSummary, 
  loadYearlyProductionSummary,
  getYearRange
} from './actions';
import { 
  Calendar, 
  RefreshCw, 
  FileSpreadsheet, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Factory,
  Package,
  CookingPot,
  CalendarDays
} from 'lucide-react';
import Link from 'next/link';

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Format date for display
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format short date for monthly breakdown
const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
};

export default function YearlyProductionPage() {
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, any[]>>({});
  const [monthNames, setMonthNames] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [yearStart, setYearStart] = useState<string>('');
  const [yearEnd, setYearEnd] = useState<string>('');
  const [yearValue, setYearValue] = useState<number>(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Navigation functions
  const goToPreviousYear = () => {
    const current = new Date(selectedDate);
    current.setFullYear(current.getFullYear() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToNextYear = () => {
    const current = new Date(selectedDate);
    current.setFullYear(current.getFullYear() + 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToCurrentYear = () => {
    setSelectedDate(getTodayDate());
  };

  // Load data when date changes
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await loadYearlyProductionSummary(selectedDate);
      
      if (result.success && result.data) {
        setYearlyData(result.data);
        setMonthlyData(result.monthlyData || {});
        setMonthNames(result.monthNames || []);
        setYearStart(result.yearStart || '');
        setYearEnd(result.yearEnd || '');
        setYearValue(result.yearValue || 0);
      } else {
        setYearlyData([]);
        const range = await getYearRange(selectedDate);
        setYearStart(range.yearStart);
        setYearEnd(range.yearEnd);
        setYearValue(range.yearValue);
        setMessage({
          type: 'info',
          text: `No yearly summary found for ${range.yearValue}. Click "Generate Report" to create one.`
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load yearly data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const result = await generateYearlyProductionSummary(selectedDate);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message
        });
        await loadData();
      } else {
        setMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (error) {
      console.error('Error generating yearly summary:', error);
      setMessage({
        type: 'error',
        text: 'Failed to generate yearly summary.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate summary statistics
  const totalItems = yearlyData.length;
  const totalProcessed = yearlyData.reduce((sum, item) => sum + (Number(item.total_quantity_processed) || 0), 0);
  const totalYield = yearlyData.reduce((sum, item) => sum + (Number(item.total_actual_yield) || 0), 0);
  const totalIssued = yearlyData.reduce((sum, item) => sum + (Number(item.total_kitchen_issued) || 0), 0);
  const totalRemaining = yearlyData.reduce((sum, item) => sum + (Number(item.total_remaining) || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link 
            href="/production/daily"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-6 w-6 text-amber-600" />
            <span>Yearly Production Report</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousYear}
              className="p-1.5 border rounded-md hover:bg-gray-50 transition-colors"
              title="Previous Year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToCurrentYear}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextYear}
              className="p-1.5 border rounded-md hover:bg-gray-50 transition-colors"
              title="Next Year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {/* Export Button */}
          <Link href="/production/yearly/export">
            <button
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              title="Export to CSV"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </Link>
          
          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Generate Report'}</span>
          </button>
        </div>
      </div>

      {/* Year Range Display */}
      {yearStart && yearEnd && yearValue > 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border">
          <span className="font-semibold">Year:</span> {yearValue}
          <span className="ml-2 text-xs text-gray-400">
            ({formatDisplayDate(yearStart)} - {formatDisplayDate(yearEnd)})
          </span>
          <span className="ml-2 text-xs text-gray-400">
            (12 months)
          </span>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-3 sm:p-4 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      {yearlyData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Products</p>
                <p className="text-xl sm:text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Processed</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalProcessed.toFixed(2)}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Yield</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalYield.toFixed(2)}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Factory className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Remaining</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{totalRemaining.toFixed(2)}</p>
              </div>
              <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                <CookingPot className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yearly Report Table */}
      {yearlyData.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
              <tr>
                <th className="p-2 sm:p-3 w-8"></th>
                <th className="p-2 sm:p-3">Product Name</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Source</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
                <th className="p-2 sm:p-3 text-center">Batches</th>
                <th className="p-2 sm:p-3 text-center">Months</th>
                <th className="p-2 sm:p-3 text-center">Processed</th>
                <th className="p-2 sm:p-3 text-center">Yield</th>
                <th className="p-2 sm:p-3 text-center">Issued</th>
                <th className="p-2 sm:p-3 text-center font-bold">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {yearlyData.map((item) => {
                const isExpanded = expandedItems.has(`${item.main_stock_item_id}_${item.output_product_key}`);
                const monthlyDataForItem = monthlyData[`${item.main_stock_item_id}_${item.output_product_key}`] || [];
                const hasRemaining = Number(item.total_remaining) > 0;

                return (
                  <React.Fragment key={`${item.main_stock_item_id}_${item.output_product_key}`}>
                    <tr 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${hasRemaining ? 'bg-amber-50/30' : ''}`}
                      onClick={() => toggleItemExpansion(`${item.main_stock_item_id}_${item.output_product_key}`)}
                    >
                      <td className="p-2 sm:p-3">
                        {monthlyDataForItem.length > 0 && (
                          isExpanded ? 
                            <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                      <td className="p-2 sm:p-3">
                        <div>
                          <span className="font-medium text-gray-900">{item.output_product_name}</span>
                          {hasRemaining && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              {Number(item.total_remaining).toFixed(2)} remaining
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell text-gray-500 text-xs">
                        {item.main_stock_item_name}
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell text-gray-600">{item.unit}</td>
                      <td className="p-2 sm:p-3 text-center font-medium">{item.batch_count}</td>
                      <td className="p-2 sm:p-3 text-center font-medium">{item.months_with_production}</td>
                      <td className="p-2 sm:p-3 text-center text-blue-600">{Number(item.total_quantity_processed).toFixed(2)}</td>
                      <td className="p-2 sm:p-3 text-center text-green-600">{Number(item.total_actual_yield).toFixed(2)}</td>
                      <td className="p-2 sm:p-3 text-center text-purple-600">{Number(item.total_kitchen_issued).toFixed(2)}</td>
                      <td className="p-2 sm:p-3 text-center font-bold text-amber-600">
                        {Number(item.total_remaining).toFixed(2)}
                      </td>
                    </tr>
                    {/* Expanded Monthly Breakdown */}
                    {isExpanded && monthlyDataForItem.length > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={10} className="p-0">
                          <div className="p-3 sm:p-4 border-t">
                            <h5 className="text-xs font-semibold text-gray-600 mb-2">Monthly Breakdown</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="p-2 text-left">Month</th>
                                    <th className="p-2 text-center">Batches</th>
                                    <th className="p-2 text-center">Processed</th>
                                    <th className="p-2 text-center">Expected Yield</th>
                                    <th className="p-2 text-center">Actual Yield</th>
                                    <th className="p-2 text-center">Issued</th>
                                    <th className="p-2 text-center font-bold">Remaining</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {monthlyDataForItem.map((month: any) => (
                                    <tr key={month.monthStart} className="border-t border-gray-200">
                                      <td className="p-2 text-gray-600">
                                        {month.month}
                                      </td>
                                      <td className="p-2 text-center">{month.batch_count}</td>
                                      <td className="p-2 text-center text-blue-600">{month.quantity_processed.toFixed(2)}</td>
                                      <td className="p-2 text-center">{month.expected_yield.toFixed(2)}</td>
                                      <td className="p-2 text-center text-green-600">{month.actual_yield.toFixed(2)}</td>
                                      <td className="p-2 text-center text-purple-600">{month.kitchen_issued.toFixed(2)}</td>
                                      <td className="p-2 text-center font-bold text-amber-600">{month.remaining.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                                    <td className="p-2 text-gray-700">Total</td>
                                    <td className="p-2 text-center">{item.batch_count}</td>
                                    <td className="p-2 text-center text-blue-700">{Number(item.total_quantity_processed).toFixed(2)}</td>
                                    <td className="p-2 text-center">{Number(item.total_expected_yield).toFixed(2)}</td>
                                    <td className="p-2 text-center text-green-700">{Number(item.total_actual_yield).toFixed(2)}</td>
                                    <td className="p-2 text-center text-purple-700">{Number(item.total_kitchen_issued).toFixed(2)}</td>
                                    <td className="p-2 text-center font-bold text-amber-700">{Number(item.total_remaining).toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            {/* Production Insights */}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Avg Monthly Yield:</span>
                                <span className="font-medium">{Number(item.avg_monthly_yield).toFixed(2)} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Avg Yield per Batch:</span>
                                <span className="font-medium">{Number(item.avg_yield_per_batch).toFixed(2)} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Months with Production:</span>
                                <span className="font-medium">{item.months_with_production} / 12</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Total Batches:</span>
                                <span className="font-medium">{item.batch_count}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <div className="text-4xl mb-4 text-gray-300">🏭</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Yearly Production Data Available</h3>
          <p className="text-sm text-gray-500">
            {message?.text || 'Select a date and click "Generate Report" to create a yearly summary.'}
          </p>
        </div>
      )}

      {/* Footer Note */}
      {yearlyData.length > 0 && (
        <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
          <p>Year Production Summary: Processed → Yield → Issued → Remaining</p>
          <p>Avg Monthly Yield = Total Yield ÷ Months with Production</p>
          <p>Avg Yield per Batch = Total Yield ÷ Total Batches</p>
          <p className="text-amber-600">Items with remaining stock are highlighted. Click to see monthly breakdown.</p>
        </div>
      )}
    </div>
  );
}