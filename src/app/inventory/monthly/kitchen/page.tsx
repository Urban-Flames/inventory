// src/app/inventory/monthly/kitchen/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { initialKitchenStockData } from '@/data/kitchenStockItems';
import { 
  generateMonthlyKitchenSummary, 
  loadMonthlyKitchenSummary,
  getMonthRange
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
  Utensils,
  CookingPot,
  Package
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_NAMES: Record<string, string> = {
  patties: 'Patties',
  poultry: 'Chicken & Poultry',
  shawarma: 'Shawarma Fillets',
  khebabs_meats: 'Khebabs & Shredded Meats',
  steaks_sides: 'Steaks, Fish & Sides',
  starters_bakery: 'Buns, Dairy & Starters',
};

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

// Format short date for daily breakdown
const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export default function MonthlyKitchenPage() {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<Record<string, any[]>>({});
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [monthStart, setMonthStart] = useState<string>('');
  const [monthEnd, setMonthEnd] = useState<string>('');
  const [monthName, setMonthName] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Navigation functions
  const goToPreviousMonth = () => {
    const current = new Date(selectedDate);
    current.setMonth(current.getMonth() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToNextMonth = () => {
    const current = new Date(selectedDate);
    current.setMonth(current.getMonth() + 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToCurrentMonth = () => {
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
      const result = await loadMonthlyKitchenSummary(selectedDate);
      
      if (result.success && result.data) {
        setMonthlyData(result.data);
        setDailyData(result.dailyData || {});
        setMonthDates(result.monthDates || []);
        setMonthStart(result.monthStart || '');
        setMonthEnd(result.monthEnd || '');
        setMonthName(result.monthName || '');
      } else {
        setMonthlyData([]);
        const range = await getMonthRange(selectedDate);
        setMonthStart(range.monthStart);
        setMonthEnd(range.monthEnd);
        setMonthName(range.monthName);
        setMessage({
          type: 'info',
          text: `No monthly summary found for ${range.monthName}. Click "Generate Report" to create one.`
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load monthly data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const result = await generateMonthlyKitchenSummary(selectedDate);
      
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
      console.error('Error generating monthly summary:', error);
      setMessage({
        type: 'error',
        text: 'Failed to generate monthly summary.'
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
  const categories = ['All', ...new Set(monthlyData.map(item => item.category))];

  // Filter data by category
  const filteredData = monthlyData.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  );

  // Calculate summary statistics
  const totalItems = monthlyData.length;
  const totalSales = monthlyData.reduce((sum, item) => sum + (Number(item.total_sales) || 0), 0);
  const totalWaste = monthlyData.reduce((sum, item) => sum + (Number(item.total_waste) || 0), 0);
  const totalReceived = monthlyData.reduce((sum, item) => sum + (Number(item.total_received) || 0), 0);
  const totalVariance = monthlyData.reduce((sum, item) => sum + (Number(item.total_variance) || 0), 0);
  const lowStockItems = monthlyData.filter(item => 
    (Number(item.closing_stock) || 0) <= 10 && 
    (Number(item.closing_stock) || 0) > 0
  );
  const outOfStockItems = monthlyData.filter(item => (Number(item.closing_stock) || 0) <= 0);

  // Count days in month
  const daysInMonth = monthDates.length;

  // Get category counts
  const categoryCounts = monthlyData.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link 
            href="/inventory/daily/kitchen"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Utensils className="h-6 w-6 text-blue-600" />
            <span>Monthly Kitchen Report</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 border rounded-md hover:bg-gray-50 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToCurrentMonth}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 border rounded-md hover:bg-gray-50 transition-colors"
              title="Next Month"
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
          <Link href="/inventory/monthly/kitchen/export">
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

      {/* Month Range Display */}
      {monthStart && monthEnd && monthName && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border">
          <span className="font-semibold">Month:</span> {monthName}
          <span className="ml-2 text-xs text-gray-400">
            ({formatDisplayDate(monthStart)} - {formatDisplayDate(monthEnd)})
          </span>
          <span className="ml-2 text-xs text-gray-400">
            ({daysInMonth} days)
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
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Items</p>
                <p className="text-xl sm:text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Utensils className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Sales</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalSales}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Waste</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{totalWaste}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Low/Out of Stock</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{lowStockItems.length + outOfStockItems.length}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {monthlyData.length > 0 && (
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
              All Items ({monthlyData.length})
            </button>
            {categories.filter(c => c !== 'All').map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  selectedCategory === category 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {CATEGORY_NAMES[category] || category} ({categoryCounts[category] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Report Table */}
      {monthlyData.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
              <tr>
                <th className="p-2 sm:p-3 w-8"></th>
                <th className="p-2 sm:p-3">Item Name</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Category</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
                <th className="p-2 sm:p-3">Opening</th>
                <th className="p-2 sm:p-3">Received</th>
                <th className="p-2 sm:p-3">Sales</th>
                <th className="p-2 sm:p-3">Waste</th>
                <th className="p-2 sm:p-3 font-bold">Closing</th>
                <th className="p-2 sm:p-3 hidden lg:table-cell">Avg Daily</th>
                <th className="p-2 sm:p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.map((item) => {
                const isLow = (Number(item.closing_stock) || 0) <= 10 && (Number(item.closing_stock) || 0) > 0;
                const isOut = (Number(item.closing_stock) || 0) <= 0;
                const hasVariance = (Number(item.total_variance) || 0) > 0;
                const isExpanded = expandedItems.has(item.item_id);
                const dailyDataForItem = dailyData[item.item_id] || [];

                return (
                  <React.Fragment key={item.item_id}>
                    <tr 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isOut ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''} ${hasVariance ? 'border-l-4 border-amber-400' : ''}`}
                      onClick={() => toggleItemExpansion(item.item_id)}
                    >
                      <td className="p-2 sm:p-3">
                        {dailyDataForItem.length > 0 && (
                          isExpanded ? 
                            <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                      <td className="p-2 sm:p-3">
                        <div>
                          <span className="font-medium text-gray-900">{item.item_name}</span>
                          {hasVariance && (
                            <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Var: {Number(item.total_variance).toFixed(2)}
                            </span>
                          )}
                          <div className="md:hidden text-xs text-gray-500 mt-0.5">
                            {CATEGORY_NAMES[item.category] || item.category} • {item.unit}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell text-gray-500 text-xs">
                        {CATEGORY_NAMES[item.category] || item.category}
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>
                      <td className="p-2 sm:p-3 font-medium">{Number(item.opening_stock) || 0}</td>
                      <td className="p-2 sm:p-3 text-green-600">+{Number(item.total_received) || 0}</td>
                      <td className="p-2 sm:p-3 text-blue-600">-{Number(item.total_sales) || 0}</td>
                      <td className="p-2 sm:p-3 text-red-600">-{Number(item.total_waste) || 0}</td>
                      <td className="p-2 sm:p-3 font-bold">
                        <span className={isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}>
                          {Number(item.closing_stock) || 0}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 hidden lg:table-cell text-gray-600">
                        {Number(item.avg_daily_sales) || 0}
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
                        {Number(item.stock_cover_days) > 0 && (
                          <span className="ml-1 text-[9px] text-gray-400">
                            ({item.stock_cover_days}d)
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded Daily Breakdown */}
                    {isExpanded && dailyDataForItem.length > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={11} className="p-0">
                          <div className="p-3 sm:p-4 border-t">
                            <h5 className="text-xs font-semibold text-gray-600 mb-2">Daily Breakdown</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="p-2 text-left">Day</th>
                                    <th className="p-2 text-center">Opening</th>
                                    <th className="p-2 text-center">Received</th>
                                    <th className="p-2 text-center">Total</th>
                                    <th className="p-2 text-center">Closing</th>
                                    <th className="p-2 text-center">Waste</th>
                                    <th className="p-2 text-center font-bold">Sales</th>
                                    <th className="p-2 text-center">Variance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dailyDataForItem.map((day: any) => (
                                    <tr key={day.date} className="border-t border-gray-200">
                                      <td className="p-2 text-gray-600">
                                        {formatShortDate(day.date)}
                                      </td>
                                      <td className="p-2 text-center">{day.morningStock}</td>
                                      <td className="p-2 text-center text-green-600">+{day.received}</td>
                                      <td className="p-2 text-center">{day.totalStock}</td>
                                      <td className="p-2 text-center">{day.closing}</td>
                                      <td className="p-2 text-center text-red-600">-{day.waste}</td>
                                      <td className="p-2 text-center font-bold text-blue-600">{day.sales}</td>
                                      <td className="p-2 text-center text-amber-600">{day.variance}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                                    <td className="p-2 text-gray-700">Total</td>
                                    <td className="p-2 text-center">-</td>
                                    <td className="p-2 text-center text-green-700">+{Number(item.total_received) || 0}</td>
                                    <td className="p-2 text-center">-</td>
                                    <td className="p-2 text-center">-</td>
                                    <td className="p-2 text-center text-red-700">-{Number(item.total_waste) || 0}</td>
                                    <td className="p-2 text-center font-bold text-blue-600">{Number(item.total_sales) || 0}</td>
                                    <td className="p-2 text-center text-amber-600">{Number(item.total_variance) || 0}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            {/* Stock Insights */}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Avg Daily Sales:</span>
                                <span className="font-medium">{Number(item.avg_daily_sales) || 0} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Stock Cover Days:</span>
                                <span className={`font-medium ${Number(item.stock_cover_days) < 3 ? 'text-red-600' : Number(item.stock_cover_days) < 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {Number(item.stock_cover_days) || 0} days
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Total Waste:</span>
                                <span className="font-medium text-red-600">{Number(item.total_waste) || 0} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Total Variance:</span>
                                <span className={`font-medium ${Number(item.total_variance) > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                                  {Number(item.total_variance) || 0} {item.unit}
                                </span>
                              </div>
                              {Number(item.stock_cover_days) < 3 && Number(item.closing_stock) > 0 && (
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
          <div className="text-4xl mb-4 text-gray-300">🍳</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Monthly Data Available</h3>
          <p className="text-sm text-gray-500">
            {message?.text || 'Select a date and click "Generate Report" to create a monthly summary.'}
          </p>
        </div>
      )}

      {/* Footer Note */}
      {monthlyData.length > 0 && (
        <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
          <p>Month Summary: Opening + Received - Sales - Waste = Closing</p>
          <p>Avg Daily Sales = Total Sales ÷ Days with Sales</p>
          <p>Stock Cover Days = Closing Stock ÷ Avg Daily Sales</p>
          <p className="text-amber-600">Items with variance show a variance tag. Click to see daily details.</p>
          <p className="text-amber-600">Items with stock cover less than 3 days need immediate reordering</p>
        </div>
      )}
    </div>
  );
}