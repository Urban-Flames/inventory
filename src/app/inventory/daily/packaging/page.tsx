// src/app/inventory/daily/packaging/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { packagingItemsData } from '@/data/packaging-items';
import { PackagingItem } from '@/types/inventory';
import { Save, RefreshCw, Calendar, FileSpreadsheet, ArrowRight, Search, Filter } from 'lucide-react';
import { savePackagingItems, loadPackagingItems, getNextDayPackagingItemsOpening } from './actions';
import Link from 'next/link';

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

// Get category icon
const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'Food Packaging': '📦',
    'Disposables': '🧻',
    'Cleaning Supplies': '🧹',
    'Kitchen Supplies': '🔧'
  };
  return icons[category] || '📋';
};

// Get category badge color
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Food Packaging': 'bg-blue-100 text-blue-800 border-blue-200',
    'Disposables': 'bg-green-100 text-green-800 border-green-200',
    'Cleaning Supplies': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Kitchen Supplies': 'bg-purple-100 text-purple-800 border-purple-200'
  };
  return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function PackagingInventoryPage() {
  const [items, setItems] = useState<PackagingItem[]>(packagingItemsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [tomorrowOpening, setTomorrowOpening] = useState<Record<string, number>>({});

  // Get unique categories
  const categories = ['All', ...new Set(packagingItemsData.map(item => item.category))];

  // Load data when date changes
  useEffect(() => {
    loadDataForDate(selectedDate);
    loadTomorrowOpening(selectedDate);
  }, [selectedDate]);

  const loadDataForDate = async (date: string) => {
    setIsLoading(true);
    setSaveMessage(null);
    
    try {
      const result = await loadPackagingItems(date);
      
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
        
        setItems(packagingItemsData.map(item => ({
          ...item,
          openingStock: 0,
          addedStock: 0,
          issuedToKitchen: 0,
          issuedToProduction: 0,
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
      const result = await getNextDayPackagingItemsOpening(date);
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
    field: keyof Pick<PackagingItem, 'openingStock' | 'addedStock' | 'issuedToKitchen' | 'issuedToProduction'>,
    value: number
  ) => {
    const numericValue = Math.max(0, value);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: numericValue };
          // Recalculate closing stock
          updated.closingStock = 
            (updated.openingStock || 0) + (updated.addedStock || 0) - 
            ((updated.issuedToKitchen || 0) + (updated.issuedToProduction || 0));
          return updated;
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const today = getTodayDate();
    const tomorrow = getTomorrowDate(today);
    const isToday = selectedDate === today;

    setIsSaving(true);
    try {
      const result = await savePackagingItems({ 
        items: items.map(item => ({
          ...item,
          openingStock: Number(item.openingStock),
          addedStock: Number(item.addedStock),
          issuedToKitchen: Number(item.issuedToKitchen),
          issuedToProduction: Number(item.issuedToProduction),
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
      setItems(packagingItemsData.map(item => ({
        ...item,
        openingStock: 0,
        addedStock: 0,
        issuedToKitchen: 0,
        issuedToProduction: 0,
        closingStock: 0,
      })));
      setHasLoadedData(false);
      setSaveMessage({ 
        type: 'success', 
        text: 'Fields reset. You can start fresh.' 
      });
    }
  };

  // Filter items by search term and category
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isToday = selectedDate === getTodayDate();
  const tomorrow = getTomorrowDate(selectedDate);

  // Calculate summary statistics
  const totalItems = items.length;
  const totalIssuedToKitchen = items.reduce((sum, item) => sum + (item.issuedToKitchen || 0), 0);
  const totalIssuedToProduction = items.reduce((sum, item) => sum + (item.issuedToProduction || 0), 0);
  const lowStockItems = items.filter(item => (item.closingStock || 0) <= (item.reorderLevel || 0) && (item.closingStock || 0) > 0);
  const outOfStockItems = items.filter(item => (item.closingStock || 0) <= 0);

  // Calculate category counts
  const categoryCounts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Packaging Items</h1>
          
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
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none w-32 sm:w-48"
            />
          </div>
          
          {/* Export Button */}
          <Link href="/inventory/daily/packaging/export">
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
              <span className="text-blue-600 font-bold">P</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">To Kitchen</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{totalIssuedToKitchen}</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold">K</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">To Production</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{totalIssuedToProduction}</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">PR</span>
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

      {/* Category Filter Section */}
      <div className="bg-gray-50 rounded-lg border p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
          <span className="text-xs text-gray-500 ml-auto hidden sm:block">
            {filteredItems.length} items shown
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
            All Items ({items.length})
          </button>
          {categories.filter(c => c !== 'All').map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                selectedCategory === category 
                  ? `${getCategoryColor(category)} border-current` 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{getCategoryIcon(category)}</span>
              <span>{category}</span>
              <span className={`text-[10px] ${selectedCategory === category ? 'opacity-100' : 'opacity-60'}`}>
                ({categoryCounts[category] || 0})
              </span>
            </button>
          ))}
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

      {/* Inventory Table */}
      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 sm:p-3">Item Name</th>
              <th className="p-2 sm:p-3 hidden md:table-cell">Category</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Opening</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Added</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Kitchen</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Production</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 font-bold">Closing</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No items found matching your filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isLow = (item.closingStock || 0) <= (item.reorderLevel || 0) && (item.closingStock || 0) > 0;
                const isOut = (item.closingStock || 0) <= 0;
                const tomorrowOpen = tomorrowOpening[item.id] || 0;

                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isOut ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''}`}>
                    <td className="p-2 sm:p-3">
                      <div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                        {isToday && tomorrowOpen > 0 && (
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                            Tomorrow: {tomorrowOpen}
                          </span>
                        )}
                        <div className="md:hidden text-xs text-gray-500 mt-0.5">
                          {getCategoryIcon(item.category)} {item.category} • {item.unit}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${getCategoryColor(item.category)}`}>
                        <span>{getCategoryIcon(item.category)}</span>
                        <span>{item.category}</span>
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>
                    <td className="p-1 sm:p-2">
                      <input
                        type="number"
                        step="1"
                        value={item.openingStock || ''}
                        onChange={(e) => handleInputChange(item.id, 'openingStock', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-1 sm:p-2">
                      <input
                        type="number"
                        step="1"
                        value={item.addedStock || ''}
                        onChange={(e) => handleInputChange(item.id, 'addedStock', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-1 sm:p-2">
                      <input
                        type="number"
                        step="1"
                        value={item.issuedToKitchen || ''}
                        onChange={(e) => handleInputChange(item.id, 'issuedToKitchen', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-1 sm:p-2">
                      <input
                        type="number"
                        step="1"
                        value={item.issuedToProduction || ''}
                        onChange={(e) => handleInputChange(item.id, 'issuedToProduction', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 sm:p-3 font-semibold text-right text-sm">
                      <span className={isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : ''}>
                        {item.closingStock || 0}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                          Out
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Category Legend */}
      <div className="bg-gray-50 rounded-lg border p-3 sm:p-4">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Category Legend</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base">📦</span>
            <span className="text-gray-700">Food Packaging</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base">🧻</span>
            <span className="text-gray-700">Disposables</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base">🧹</span>
            <span className="text-gray-700">Cleaning Supplies</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base">🔧</span>
            <span className="text-gray-700">Kitchen Supplies</span>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p>Stock Formula: Closing = Opening + Added - (Kitchen + Production)</p>
        <p className="text-gray-500">Note: Track packaging materials, disposables, and cleaning supplies inventory.</p>
        {isToday && (
          <p className="text-blue-600 font-medium">
            Note: Today's closing stock will automatically become tomorrow's opening stock when you save.
          </p>
        )}
      </div>
    </div>
  );
}