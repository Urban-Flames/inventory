// src/app/inventory/yearly/main-stock/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { initialMainStockData } from '@/data/mainStockItems';
import { 
  generateYearlyMainStockSummary, 
  loadYearlyMainStockSummary,
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
  Package,
  Factory,
  Utensils
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

// Helper to format number with proper decimal places
const formatNumber = (value: number, unit: string, isUsageOrProduction: boolean = false): string => {
  // If it's usage or production, always show 4 decimal places
  if (isUsageOrProduction) {
    return value.toFixed(4);
  }
  
  // For other fields, check if decimals should be shown
  const shouldShowDecimals = unit === 'kg' || unit === 'grams' || unit === 'liters';
  if (shouldShowDecimals) {
    return value.toFixed(2);
  }
  return Math.round(value).toString();
};

export default function YearlyMainStockPage() {
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

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
      const result = await loadYearlyMainStockSummary(selectedDate);
      
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
      const result = await generateYearlyMainStockSummary(selectedDate);
      
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

  // Get unique categories
  const categories = ['All', ...new Set(yearlyData.map(item => item.category))];

  // Filter data by category
  const filteredData = yearlyData.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  );

  // Calculate summary statistics
  const totalItems = yearlyData.length;
  const totalAdded = yearlyData.reduce((sum, item) => sum + (Number(item.total_added) || 0), 0);
  const totalProduction = yearlyData.reduce((sum, item) => sum + (Number(item.total_production) || 0), 0);
  const totalKitchen = yearlyData.reduce((sum, item) => sum + (Number(item.total_kitchen) || 0), 0);
  const totalUsed = yearlyData.reduce((sum, item) => sum + (Number(item.total_used) || 0), 0);
  const lowStockItems = yearlyData.filter(item => 
    (Number(item.closing_stock) || 0) <= (Number(item.reorder_level) || 0) && 
    (Number(item.closing_stock) || 0) > 0
  );
  const outOfStockItems = yearlyData.filter(item => (Number(item.closing_stock) || 0) <= 0);

  // Get category counts
  const categoryCounts = yearlyData.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link 
            href="/inventory/daily/main-stock"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            <span>Yearly Main Stock Report</span>
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
          <Link href="/inventory/yearly/main-stock/export">
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
                <p className="text-xs sm:text-sm text-gray-500">Total Items</p>
                <p className="text-xl sm:text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Used</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{totalUsed.toFixed(4)}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">To Production</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{totalProduction.toFixed(4)}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Factory className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Low/Out of Stock</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{lowStockItems.length + outOfStockItems.length}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {yearlyData.length > 0 && (
        <div className="bg-gray-50 rounded-lg border p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
            <span className="text-xs text-gray-500 ml-auto hidden sm:block">
              {filteredData.length} items shown
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedCategory === 'All' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Items ({yearlyData.length})
            </button>
            {categories.filter(c => c !== 'All').map(category => {
              const categoryLabels: Record<string, string> = {
                chicken: '🐔 Chicken',
                meat: '🥩 Meat',
                bakery_dairy: '🍞 Bakery & Dairy',
                frozen_dry: '❄️ Frozen & Dry'
              };
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedCategory === category 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {categoryLabels[category] || category} ({categoryCounts[category] || 0})
                </button>
              );
            })}
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
                <th className="p-2 sm:p-3">Item Name</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Category</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
                <th className="p-2 sm:p-3">Opening</th>
                <th className="p-2 sm:p-3">Added</th>
                <th className="p-2 sm:p-3">Production</th>
                <th className="p-2 sm:p-3">Kitchen</th>
                <th className="p-2 sm:p-3">Used</th>
                <th className="p-2 sm:p-3 font-bold">Closing</th>
                <th className="p-2 sm:p-3 hidden lg:table-cell">Avg Monthly</th>
                <th className="p-2 sm:p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.map((item) => {
                const isLow = (Number(item.closing_stock) || 0) <= (Number(item.reorder_level) || 0) && (Number(item.closing_stock) || 0) > 0;
                const isOut = (Number(item.closing_stock) || 0) <= 0;
                const isExpanded = expandedItems.has(item.item_id);
                const monthlyDataForItem = monthlyData[item.item_id] || [];

                return (
                  <React.Fragment key={item.item_id}>
                    <tr 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isOut ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''}`}
                      onClick={() => toggleItemExpansion(item.item_id)}
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
                          <span className="font-medium text-gray-900">{item.item_name}</span>
                          {item.usage_type === 'production_raw' && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Prod
                            </span>
                          )}
                          {item.usage_type === 'both' && (
                            <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                              Both
                            </span>
                          )}
                          <div className="md:hidden text-xs text-gray-500 mt-0.5">
                            {item.category} • {item.unit}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell text-gray-500 text-xs">
                        {item.category}
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>
                      <td className="p-2 sm:p-3 font-medium">{formatNumber(Number(item.opening_stock) || 0, item.unit)}</td>
                      <td className="p-2 sm:p-3 text-green-600">+{formatNumber(Number(item.total_added) || 0, item.unit)}</td>
                      <td className="p-2 sm:p-3 text-purple-600">{formatNumber(Number(item.total_production) || 0, item.unit, true)}</td>
                      <td className="p-2 sm:p-3 text-blue-600">{formatNumber(Number(item.total_kitchen) || 0, item.unit)}</td>
                      <td className="p-2 sm:p-3 text-orange-600">{formatNumber(Number(item.total_used) || 0, item.unit, true)}</td>
                      <td className="p-2 sm:p-3 font-bold">
                        <span className={isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}>
                          {formatNumber(Number(item.closing_stock) || 0, item.unit)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 hidden lg:table-cell text-gray-600">
                        {formatNumber(Number(item.avg_monthly_usage) || 0, item.unit, true)}
                      </td>
                      <td className="p-2 sm:p-3">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                            Out
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                            <CheckCircle className="h-3 w-3" />
                            OK
                          </span>
                        )}
                        {Number(item.stock_cover_months) > 0 && (
                          <span className="ml-1 text-[9px] text-gray-400">
                            ({item.stock_cover_months}m)
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded Monthly Breakdown */}
                    {isExpanded && monthlyDataForItem.length > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={12} className="p-0">
                          <div className="p-3 sm:p-4 border-t">
                            <h5 className="text-xs font-semibold text-gray-600 mb-2">Monthly Breakdown</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="p-2 text-left">Month</th>
                                    <th className="p-2 text-center">Opening</th>
                                    <th className="p-2 text-center">Added</th>
                                    <th className="p-2 text-center">Production</th>
                                    <th className="p-2 text-center">Kitchen</th>
                                    <th className="p-2 text-center">Used</th>
                                    <th className="p-2 text-center font-bold">Closing</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {monthlyDataForItem.map((month: any) => (
                                    <tr key={month.monthStart} className="border-t border-gray-200">
                                      <td className="p-2 text-gray-600">
                                        {month.month}
                                      </td>
                                      <td className="p-2 text-center">{formatNumber(month.opening, item.unit)}</td>
                                      <td className="p-2 text-center text-green-600">+{formatNumber(month.added, item.unit)}</td>
                                      <td className="p-2 text-center text-purple-600">{formatNumber(month.production, item.unit, true)}</td>
                                      <td className="p-2 text-center text-blue-600">{formatNumber(month.kitchen, item.unit)}</td>
                                      <td className="p-2 text-center text-orange-600">{formatNumber(month.used, item.unit, true)}</td>
                                      <td className="p-2 text-center font-bold">{formatNumber(month.closing, item.unit)}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                                    <td className="p-2 text-gray-700">Total</td>
                                    <td className="p-2 text-center">-</td>
                                    <td className="p-2 text-center text-green-700">+{formatNumber(Number(item.total_added) || 0, item.unit)}</td>
                                    <td className="p-2 text-center text-purple-700">{formatNumber(Number(item.total_production) || 0, item.unit, true)}</td>
                                    <td className="p-2 text-center text-blue-700">{formatNumber(Number(item.total_kitchen) || 0, item.unit)}</td>
                                    <td className="p-2 text-center text-orange-700">{formatNumber(Number(item.total_used) || 0, item.unit, true)}</td>
                                    <td className="p-2 text-center font-bold text-blue-600">{formatNumber(Number(item.closing_stock) || 0, item.unit)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            {/* Stock Insights */}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Avg Monthly Usage:</span>
                                <span className="font-medium">{formatNumber(Number(item.avg_monthly_usage) || 0, item.unit, true)} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Stock Cover Months:</span>
                                <span className={`font-medium ${Number(item.stock_cover_months) < 1 ? 'text-red-600' : Number(item.stock_cover_months) < 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {Number(item.stock_cover_months) || 0} months
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Reorder Level:</span>
                                <span className="font-medium">{formatNumber(Number(item.reorder_level) || 0, item.unit)} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Usage Type:</span>
                                <span className="font-medium capitalize">{item.usage_type?.replace('_', ' ') || 'direct sale'}</span>
                              </div>
                              {Number(item.stock_cover_months) < 1 && Number(item.closing_stock) > 0 && (
                                <div className="flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Reorder needed!</span>
                                </div>
                              )}
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
          <div className="text-4xl mb-4 text-gray-300">📦</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Yearly Data Available</h3>
          <p className="text-sm text-gray-500">
            {message?.text || 'Select a date and click "Generate Report" to create a yearly summary.'}
          </p>
        </div>
      )}

      {/* Footer Note */}
      {yearlyData.length > 0 && (
        <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
          <p>Year Summary: Opening + Added - (Production + Kitchen) = Closing</p>
          <p>Avg Monthly Usage = Total Used ÷ Months with Usage</p>
          <p>Stock Cover Months = Closing Stock ÷ Avg Monthly Usage</p>
          <p className="text-amber-600">Items with stock cover less than 1 month need immediate reordering</p>
          <p className="text-purple-600">Production items are used in production processing</p>
          <p className="text-xs text-gray-400">Note: Production, Used, and Avg Monthly Usage values are shown with 4 decimal places</p>
        </div>
      )}
    </div>
  );
}