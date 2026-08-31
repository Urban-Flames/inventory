// src/app/inventory/daily/spices/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { initialSpiceStockData } from '@/data/dailySpicesData';
import { SpiceStockItem } from '@/types/inventory';
import { 
  AlertCircle, RefreshCw, Save, Calendar, 
  ArrowRight, Search, FileSpreadsheet
} from 'lucide-react';
import { saveSpicesDaily, loadSpicesDaily, getNextDaySpicesOpening } from './actions';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  dry_spices: 'Dry Spices & Powders',
  premixes: 'House Blends & Rubs',
  fresh_herbs: 'Fresh Herbs & Aromatics',
  sauces_oils: 'Oils, Sauces & Vinegars',
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get tomorrow's date
const getTomorrowDate = (date: string): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
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

export default function DailySpicesStockPage() {
  const [items, setItems] = useState<SpiceStockItem[]>(initialSpiceStockData);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [tomorrowOpening, setTomorrowOpening] = useState<Record<string, number>>({});

  // Load data when date changes
  useEffect(() => {
    loadDataForDate(selectedDate);
    loadTomorrowOpening(selectedDate);
  }, [selectedDate]);

  const loadDataForDate = async (date: string) => {
    setIsLoading(true);
    setSaveMessage(null);
    
    try {
      const result = await loadSpicesDaily(date);
      
      if (result.success && result.data) {
        setItems(result.data);
        setHasLoadedData(true);
        setSaveMessage({ 
          type: 'success', 
          text: `Loaded data for ${formatDisplayDate(date)}` 
        });
      } else if (result.success && !result.data) {
        const today = getTodayDate();
        const tomorrow = getTomorrowDate(today);
        
        if (date === tomorrow) {
          setSaveMessage({ 
            type: 'info', 
            text: `Tomorrow's data not yet created. Today's closing will auto-populate when you save today.` 
          });
        }
        
        setItems(initialSpiceStockData.map(item => ({
          ...item,
          openingStock: 0,
          addedStock: 0,
          issuedToProduction: 0,
          issuedToKitchen: 0,
          closingStock: 0,
        })));
        setHasLoadedData(false);
        if (date !== tomorrow) {
          setSaveMessage({ 
            type: 'success', 
            text: `New entry for ${formatDisplayDate(date)}` 
          });
        }
      } else {
        setSaveMessage({ 
          type: 'error', 
          text: `Failed to load data: ${result.message}` 
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setSaveMessage({ 
        type: 'error', 
        text: 'Error loading data for selected date' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTomorrowOpening = async (date: string) => {
    try {
      const result = await getNextDaySpicesOpening(date);
      if (result.success && result.data) {
        const openingMap: Record<string, number> = {};
        result.data.forEach((row: any) => {
          openingMap[row.item_id] = Number(row.opening_stock);
        });
        setTomorrowOpening(openingMap);
      }
    } catch (err) {
      console.error('Error loading tomorrow opening:', err);
    }
  };

  const handleInputChange = (
    id: string,
    field: keyof Pick<SpiceStockItem, 'openingStock' | 'addedStock' | 'issuedToProduction' | 'issuedToKitchen'>,
    value: number
  ) => {
    const numericValue = Math.max(0, value);

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: numericValue };
          updated.closingStock =
            updated.openingStock +
            updated.addedStock -
            (updated.issuedToProduction + updated.issuedToKitchen);
          return updated;
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const hasDeficit = items.some((item) => {
      const totalAvailable = (item.openingStock || 0) + (item.addedStock || 0);
      const totalIssued = (item.issuedToProduction || 0) + (item.issuedToKitchen || 0);
      return totalIssued > totalAvailable || item.closingStock < 0;
    });

    if (hasDeficit) {
      setSaveMessage({
        type: 'error',
        text: 'One or more items exceed available stock. Please resolve stock deficits before saving.'
      });
      return;
    }

    const today = getTodayDate();
    const tomorrow = getTomorrowDate(today);
    const isToday = selectedDate === today;

    setIsSaving(true);
    try {
      const result = await saveSpicesDaily({ 
        items: items.map(item => ({
          ...item,
          openingStock: Number(item.openingStock),
          addedStock: Number(item.addedStock),
          issuedToProduction: Number(item.issuedToProduction),
          issuedToKitchen: Number(item.issuedToKitchen),
          closingStock: Number(item.closingStock),
        })),
        logDate: selectedDate
      });
      
      if (result.success) {
        let message = `${result.message} for ${formatDisplayDate(selectedDate)}`;
        
        if (isToday) {
          message += ` Tomorrow's (${formatDisplayDate(tomorrow)}) opening stock has been auto-set to today's closing.`;
        }
        
        setSaveMessage({ type: 'success', text: message });
        setHasLoadedData(true);
        await loadTomorrowOpening(selectedDate);
      } else {
        setSaveMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred while saving records.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all fields for this date?')) {
      setItems(initialSpiceStockData.map(item => ({
        ...item,
        openingStock: 0,
        addedStock: 0,
        issuedToProduction: 0,
        issuedToKitchen: 0,
        closingStock: 0,
      })));
      setHasLoadedData(false);
      setSaveMessage({ 
        type: 'success', 
        text: 'Fields reset. You can start fresh.' 
      });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = filter === 'all' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isToday = selectedDate === getTodayDate();
  const tomorrow = getTomorrowDate(selectedDate);

  // Calculate summary statistics
  const totalItems = items.length;
  const totalIssuedToProduction = items.reduce((sum, item) => sum + (item.issuedToProduction || 0), 0);
  const totalIssuedToKitchen = items.reduce((sum, item) => sum + (item.issuedToKitchen || 0), 0);
  const lowStockItems = items.filter(item => (item.closingStock || 0) <= (item.reorderLevel || 0) && (item.closingStock || 0) > 0);
  const outOfStockItems = items.filter(item => (item.closingStock || 0) <= 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Spices</h1>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
            {isToday && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                Today
              </span>
            )}
            {isLoading && (
              <span className="text-xs text-gray-500 animate-pulse">Loading...</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs text-gray-500 hidden sm:block">
            {hasLoadedData ? 'Data exists' : 'New entry'}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none w-32 sm:w-48"
            />
          </div>
          
          {/* Export Button */}
          <Link href="/inventory/daily/spices/export">
            <button
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </Link>
          
          <button
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50"
            title="Reset all fields"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            title="Save records"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Date Display */}
      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border">
        <span className="font-semibold">Working on:</span> {formatDisplayDate(selectedDate)}
        {!isToday && (
          <span className="ml-2 text-amber-600 text-xs">
            Editing historical data
          </span>
        )}
        {isToday && (
          <span className="ml-2 text-blue-600 text-xs flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Tomorrow's opening stock will auto-populate
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Items</p>
              <p className="text-xl sm:text-2xl font-bold">{totalItems}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">S</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">To Production</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{totalIssuedToProduction}</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold">P</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">To Kitchen</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{totalIssuedToKitchen}</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">K</span>
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
              <span className="text-red-600 font-bold">!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 sm:p-4 rounded-md text-sm ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : saveMessage.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-2">
        {[
          { id: 'all', label: 'All Seasonings' },
          { id: 'dry_spices', label: 'Dry Spices & Powders' },
          { id: 'premixes', label: 'House Blends & Rubs' },
          { id: 'sauces_oils', label: 'Oils, Sauces & Vinegars' },
          { id: 'fresh_herbs', label: 'Fresh Herbs & Aromatics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Inventory Table */}
      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 sm:p-3">Item Name</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Opening</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Added</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Prep</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Kitchen</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 font-bold">Closing</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.map((item) => {
              const totalAvailable = (item.openingStock || 0) + (item.addedStock || 0);
              const totalIssued = (item.issuedToProduction || 0) + (item.issuedToKitchen || 0);

              const isOverIssued = totalIssued > totalAvailable;
              const isNegativeClosing = (item.closingStock || 0) < 0;
              const isLow = (item.closingStock || 0) <= (item.reorderLevel || 0) && (item.closingStock || 0) > 0;
              const isOut = (item.closingStock || 0) <= 0 && !isNegativeClosing;
              const tomorrowOpen = tomorrowOpening[item.id] || 0;

              return (
                <tr 
                  key={item.id} 
                  className={`transition-colors ${
                    isOverIssued || isNegativeClosing 
                      ? 'bg-red-50 hover:bg-red-100' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="p-2 sm:p-3">
                    <div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="ml-2 text-[10px] text-gray-500 hidden sm:inline">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      {isToday && tomorrowOpen > 0 && (
                        <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                          Tomorrow: {tomorrowOpen}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>
                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.openingStock || ''}
                      onChange={(e) => handleInputChange(item.id, 'openingStock', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.addedStock || ''}
                      onChange={(e) => handleInputChange(item.id, 'addedStock', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.issuedToProduction || ''}
                      onChange={(e) => handleInputChange(item.id, 'issuedToProduction', parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm outline-none transition-colors ${
                        isOverIssued
                          ? 'border-red-500 bg-red-100 text-red-900 font-bold focus:ring-1 focus:ring-red-500' 
                          : 'focus:ring-1 focus:ring-blue-500'
                      }`}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.issuedToKitchen || ''}
                      onChange={(e) => handleInputChange(item.id, 'issuedToKitchen', parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm outline-none transition-colors ${
                        isOverIssued 
                          ? 'border-red-500 bg-red-100 text-red-900 font-bold focus:ring-1 focus:ring-red-500' 
                          : 'focus:ring-1 focus:ring-blue-500'
                      }`}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2 sm:p-3 font-semibold text-right text-sm">
                    <span className={isNegativeClosing ? 'text-red-600 font-extrabold' : ''}>
                      {(item.closingStock || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell">
                    {isOverIssued || isNegativeClosing ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-semibold animate-pulse">
                        <AlertCircle className="h-3 w-3" /> Deficit!
                      </span>
                    ) : isOut ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                        <AlertCircle className="h-3 w-3" /> Out
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                        Low
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p>Stock Formula: Closing = Opening + Added - (Production + Kitchen)</p>
        {isToday && (
          <p className="text-blue-600 font-medium">
            Note: Today's closing stock will automatically become tomorrow's opening stock when you save.
          </p>
        )}
      </div>
    </div>
  );
}