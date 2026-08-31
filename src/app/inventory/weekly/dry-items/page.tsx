// src/app/inventory/weekly/dry-items/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { dryItemsData } from '@/data/dry-items';
import { 
  generateWeeklyDryItemsSummary, 
  loadWeeklyDryItemsSummary,
  getWeekRange,
  getWeekDates 
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
  BarChart3
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
    weekday: 'long',
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

export default function WeeklyDryItemsPage() {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<Record<string, any[]>>({});
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [weekStart, setWeekStart] = useState<string>('');
  const [weekEnd, setWeekEnd] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Navigation functions
  const goToPreviousWeek = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 7);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 7);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToCurrentWeek = () => {
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
      const result = await loadWeeklyDryItemsSummary(selectedDate);
      
      if (result.success && result.data) {
        setWeeklyData(result.data);
        setDailyData(result.dailyData || {});
        setWeekDates(result.weekDates || []);
        setWeekStart(result.weekStart || '');
        setWeekEnd(result.weekEnd || '');
      } else {
        setWeeklyData([]);
        const range = await getWeekRange(selectedDate);
        setWeekStart(range.weekStart);
        setWeekEnd(range.weekEnd);
        setMessage({
          type: 'info',
          text: `No weekly summary found for ${formatDisplayDate(range.weekStart)} to ${formatDisplayDate(range.weekEnd)}. Click "Generate Report" to create one.`
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load weekly data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const result = await generateWeeklyDryItemsSummary(selectedDate);
      
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
      console.error('Error generating weekly summary:', error);
      setMessage({
        type: 'error',
        text: 'Failed to generate weekly summary.'
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
  const totalItems = weeklyData.length;
  const totalAdded = weeklyData.reduce((sum, item) => sum + (Number(item.total_added) || 0), 0);
  const totalUsed = weeklyData.reduce((sum, item) => sum + (Number(item.total_used) || 0), 0);
  const lowStockItems = weeklyData.filter(item => 
    (Number(item.closing_stock) || 0) <= (Number(item.reorder_level) || 0) && 
    (Number(item.closing_stock) || 0) > 0
  );
  const outOfStockItems = weeklyData.filter(item => (Number(item.closing_stock) || 0) <= 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link 
            href="/inventory/daily/dry-items"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Weekly Dry Items Report</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 border rounded-md hover:bg-gray-50 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1.5 border rounded-md hover:bg-gray-50 transition-colors"
              title="Next Week"
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
          <Link href="/inventory/weekly/dry-items/export">
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

      {/* Week Range Display */}
      {weekStart && weekEnd && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border">
          <span className="font-semibold">Week:</span> {formatDisplayDate(weekStart)} - {formatDisplayDate(weekEnd)}
          <span className="ml-2 text-xs text-gray-400">
            ({Math.ceil((new Date(weekEnd).getTime() - new Date(weekStart).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)
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
      {weeklyData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Items</p>
                <p className="text-xl sm:text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">D</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Added</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalAdded}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Used</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{totalUsed}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-orange-600" />
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

      {/* Weekly Report Table */}
      {weeklyData.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
              <tr>
                <th className="p-2 sm:p-3 w-8"></th>
                <th className="p-2 sm:p-3">Item Name</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
                <th className="p-2 sm:p-3">Opening</th>
                <th className="p-2 sm:p-3">Added</th>
                <th className="p-2 sm:p-3">Used</th>
                <th className="p-2 sm:p-3 font-bold">Closing</th>
                <th className="p-2 sm:p-3 hidden lg:table-cell">Avg Daily</th>
                <th className="p-2 sm:p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {weeklyData.map((item) => {
                const isLow = (Number(item.closing_stock) || 0) <= (Number(item.reorder_level) || 0) && (Number(item.closing_stock) || 0) > 0;
                const isOut = (Number(item.closing_stock) || 0) <= 0;
                const isExpanded = expandedItems.has(item.item_id);
                const dailyDataForItem = dailyData[item.item_id] || [];

                return (
                  <React.Fragment key={item.item_id}>
                    <tr 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isOut ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''}`}
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
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>
                      <td className="p-2 sm:p-3 font-medium">{Number(item.opening_stock) || 0}</td>
                      <td className="p-2 sm:p-3 text-green-600">+{Number(item.total_added) || 0}</td>
                      <td className="p-2 sm:p-3 text-orange-600">-{Number(item.total_used) || 0}</td>
                      <td className="p-2 sm:p-3 font-bold">
                        <span className={isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}>
                          {Number(item.closing_stock) || 0}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 hidden lg:table-cell text-gray-600">
                        {Number(item.avg_daily_usage) || 0}
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
                        <td colSpan={9} className="p-0">
                          <div className="p-3 sm:p-4 border-t">
                            <h5 className="text-xs font-semibold text-gray-600 mb-2">Daily Breakdown</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="p-2 text-left">Day</th>
                                    <th className="p-2 text-center">Opening</th>
                                    <th className="p-2 text-center">Added</th>
                                    <th className="p-2 text-center">Kitchen</th>
                                    <th className="p-2 text-center">Bar</th>
                                    <th className="p-2 text-center font-bold">Closing</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dailyDataForItem.map((day: any) => (
                                    <tr key={day.date} className="border-t border-gray-200">
                                      <td className="p-2 text-gray-600">
                                        {formatShortDate(day.date)}
                                      </td>
                                      <td className="p-2 text-center">{day.opening}</td>
                                      <td className="p-2 text-center text-green-600">+{day.added}</td>
                                      <td className="p-2 text-center text-orange-600">-{day.kitchen}</td>
                                      <td className="p-2 text-center text-purple-600">-{day.bar}</td>
                                      <td className="p-2 text-center font-bold">{day.closing}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                                    <td className="p-2 text-gray-700">Total</td>
                                    <td className="p-2 text-center">-</td>
                                    <td className="p-2 text-center text-green-700">+{Number(item.total_added) || 0}</td>
                                    <td className="p-2 text-center text-orange-700">-{Number(item.total_kitchen) || 0}</td>
                                    <td className="p-2 text-center text-purple-700">-{Number(item.total_bar) || 0}</td>
                                    <td className="p-2 text-center font-bold text-blue-600">{Number(item.closing_stock) || 0}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            {/* Stock Insights */}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Avg Daily Usage:</span>
                                <span className="font-medium">{Number(item.avg_daily_usage) || 0} {item.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Stock Cover Days:</span>
                                <span className={`font-medium ${Number(item.stock_cover_days) < 3 ? 'text-red-600' : Number(item.stock_cover_days) < 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {Number(item.stock_cover_days) || 0} days
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Reorder Level:</span>
                                <span className="font-medium">{Number(item.reorder_level) || 0} {item.unit}</span>
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
          <div className="text-4xl mb-4 text-gray-300">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Weekly Data Available</h3>
          <p className="text-sm text-gray-500">
            {message?.text || 'Select a date and click "Generate Report" to create a weekly summary.'}
          </p>
        </div>
      )}

      {/* Footer Note */}
      {weeklyData.length > 0 && (
        <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
          <p>Week Summary: Opening + Added - Used = Closing</p>
          <p>Avg Daily Usage = Total Used ÷ Days with Usage</p>
          <p>Stock Cover Days = Closing Stock ÷ Avg Daily Usage</p>
          <p className="text-amber-600">Items with stock cover less than 3 days need immediate reordering</p>
        </div>
      )}
    </div>
  );
}