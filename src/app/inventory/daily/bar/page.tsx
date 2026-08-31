// src/app/inventory/daily/bar/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { initialBarStockData } from '@/data/barStockItems';
import { BarDailyItem, BarCategory } from '@/types/inventory';
import { 
  Save, RefreshCw, AlertCircle, Calendar, FileSpreadsheet, 
  ArrowRight, Search, ArrowDown 
} from 'lucide-react';
import { saveBarDaily, loadBarDaily, getNextDayBarOpening } from './actions';
import Link from 'next/link';

const BAR_CATEGORIES: Record<BarCategory, string> = {
  soft_drinks: 'Soft Drinks & Water',
  beers: 'Beers, Ciders & Ready-to-Drink',
  spirits: 'Spirits & Liquors',
  wines_syrups: 'Wines & Syrups',
  ice_mixers: 'Ice, Mixers & Juices',
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

export default function BarDailyInventoryPage() {
  const [items, setItems] = useState<BarDailyItem[]>(initialBarStockData);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [tomorrowOpening, setTomorrowOpening] = useState<Record<string, { downOpen: number; fridgeOpen: number }>>({});

  // Load data when date changes
  useEffect(() => {
    loadDataForDate(selectedDate);
    loadTomorrowOpening(selectedDate);
  }, [selectedDate]);

  const loadDataForDate = async (date: string) => {
    setIsLoading(true);
    setSaveMessage(null);
    
    try {
      const result = await loadBarDaily(date);
      
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
        
        setItems(initialBarStockData.map(item => ({
          ...item,
          downOpen: 0,
          downAdd: 0,
          downClose: 0,
          fridgeOpen: 0,
          fridgeAdd: 0,
          fridgeClose: 0,
          waste: 0,
          totalStock: 0,
          totalSales: 0,
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
      const result = await getNextDayBarOpening(date);
      if (result.success && result.data) {
        const openingMap: Record<string, { downOpen: number; fridgeOpen: number }> = {};
        result.data.forEach((row: any) => {
          openingMap[row.item_id] = {
            downOpen: Number(row.down_open),
            fridgeOpen: Number(row.fridge_open)
          };
        });
        setTomorrowOpening(openingMap);
      }
    } catch (err) {
      console.error('Error loading tomorrow opening:', err);
    }
  };

  const handleInputChange = (
    id: string,
    field: keyof Pick<
      BarDailyItem,
      'downOpen' | 'downAdd' | 'downClose' | 'fridgeOpen' | 'fridgeAdd' | 'fridgeClose' | 'waste'
    >,
    value: number
  ) => {
    const safeValue = Math.max(0, value);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: safeValue };

        // 1. Calculate Stock
        // Down (Storage): Close = Open + Add - Fridge Add (transfer to fridge)
        const downAvailable = updated.downOpen + updated.downAdd;
        
        // Auto-calculate based on what field was changed
        if (field === 'fridgeAdd') {
          // When adding to fridge, it comes FROM down
          updated.downClose = Math.max(0, downAvailable - safeValue);
        }
        
        if (field === 'downClose') {
          // When changing down close, calculate how much was transferred to fridge
          updated.fridgeAdd = Math.max(0, downAvailable - safeValue);
        }
        
        if (field === 'downOpen' || field === 'downAdd') {
          // When changing down open or add, recalculate down close based on existing fridge add
          updated.downClose = Math.max(0, (updated.downOpen + updated.downAdd) - updated.fridgeAdd);
        }

        // 2. Fridge Logic
        // Fridge: Close = Open + Add (from down) - Sales - Waste
        // But we calculate Sales from the difference
        const fridgeAvailable = updated.fridgeOpen + updated.fridgeAdd;
        
        // Calculate Sales = Fridge Available - Fridge Close - Waste
        if (field === 'fridgeClose' || field === 'fridgeAdd' || field === 'fridgeOpen' || field === 'waste') {
          updated.totalSales = Math.max(0, fridgeAvailable - updated.fridgeClose - updated.waste);
        }

        // 3. Total Stock = Down Close + Fridge Close
        updated.totalStock = updated.downClose + updated.fridgeClose;

        // 4. Validate
        let downError = "";
        let fridgeError = "";
        let transferError = "";

        // Down Close cannot be negative
        if (updated.downClose < 0) {
          downError = `Storage closing cannot be negative. Available: ${downAvailable}`;
        }

        // Fridge Close cannot exceed fridge available
        if (updated.fridgeClose > fridgeAvailable) {
          fridgeError = `Fridge closing (${updated.fridgeClose}) cannot exceed available stock (${fridgeAvailable}). Add stock from storage first.`;
        }

        // Transfer cannot exceed down available
        if (updated.fridgeAdd > downAvailable) {
          transferError = `Cannot transfer ${updated.fridgeAdd} to fridge. Only ${downAvailable} available in storage.`;
        }

        // Update validation errors state
        setErrors((prevErrors) => {
          const next = { ...prevErrors };
          if (downError) next[`${id}-down`] = downError;
          else delete next[`${id}-down`];

          if (fridgeError) next[`${id}-fridge`] = fridgeError;
          else delete next[`${id}-fridge`];

          if (transferError) next[`${id}-transfer`] = transferError;
          else delete next[`${id}-transfer`];

          return next;
        });

        return updated;
      })
    );
  };

  // Helper to get transfer amount from Down (storage) to Fridge (serving)
  const getTransferToFridge = (item: BarDailyItem): number => {
    return Math.max(0, item.fridgeAdd || 0);
  };

  // Helper to check if Down Close = Down Open + Down Add - Fridge Add
  const isRelationshipValid = (item: BarDailyItem): boolean => {
    const downAvailable = item.downOpen + item.downAdd;
    const expectedDownClose = Math.max(0, downAvailable - item.fridgeAdd);
    return Math.abs(item.downClose - expectedDownClose) < 0.01;
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setSaveMessage({
        type: 'error',
        text: 'Please resolve the stock calculation errors highlighted in red before saving.'
      });
      return;
    }

    const today = getTodayDate();
    const tomorrow = getTomorrowDate(today);
    const isToday = selectedDate === today;

    setIsSaving(true);
    try {
      const result = await saveBarDaily({ 
        items: items.map(item => ({
          ...item,
          downOpen: Number(item.downOpen),
          downAdd: Number(item.downAdd),
          downClose: Number(item.downClose),
          fridgeOpen: Number(item.fridgeOpen),
          fridgeAdd: Number(item.fridgeAdd),
          fridgeClose: Number(item.fridgeClose),
          waste: Number(item.waste) || 0,
          totalStock: Number(item.totalStock),
          totalSales: Number(item.totalSales),
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
      setItems(initialBarStockData.map(item => ({
        ...item,
        downOpen: 0,
        downAdd: 0,
        downClose: 0,
        fridgeOpen: 0,
        fridgeAdd: 0,
        fridgeClose: 0,
        waste: 0,
        totalStock: 0,
        totalSales: 0,
      })));
      setHasLoadedData(false);
      setErrors({});
      setSaveMessage({ 
        type: 'success', 
        text: 'Fields reset. You can start fresh.' 
      });
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedItems = filteredItems.reduce<Record<string, BarDailyItem[]>>((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const isToday = selectedDate === getTodayDate();

  // Calculate summary statistics
  const totalItems = items.length;
  const totalSales = items.reduce((sum, item) => sum + (item.totalSales || 0), 0);
  const totalWaste = items.reduce((sum, item) => sum + (item.waste || 0), 0);
  const totalTransferredToFridge = items.reduce((sum, item) => sum + (getTransferToFridge(item) || 0), 0);
  const invalidRelationships = items.filter(item => !isRelationshipValid(item)).length;

  // Calculate total stock across all items
  const totalStockValue = items.reduce((sum, item) => sum + (item.totalStock || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bar Daily Inventory</h1>
          
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
          <Link href="/inventory/daily/bar/export">
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
              <span className="text-blue-600 font-bold">B</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalStockValue}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">📦</span>
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
              <span className="text-green-600 font-bold">$</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Errors</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{Object.keys(errors).length}</p>
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

      {/* Relationship Error Warning */}
      {invalidRelationships > 0 && (
        <div className="p-3 sm:p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">⚠️ Stock Flow Violation:</span>
              <p className="mt-1">The relationship <strong>Down Close = Down Open + Down Add - Fridge Add</strong> is not satisfied.</p>
              <p className="text-xs mt-1 text-red-600">
                Example: If Storage has 10 (Open 5 + Add 5) and you transfer 3 to fridge, Storage Close should be 7.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-2">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'soft_drinks', label: 'Soft Drinks & Water' },
          { id: 'beers', label: 'Beers & Ciders' },
          { id: 'spirits', label: 'Spirits & Liquors' },
          { id: 'wines_syrups', label: 'Wines & Syrups' },
          { id: 'ice_mixers', label: 'Ice, Mixers & Juices' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeCategory === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flow Diagram Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-blue-800">📦 Stock Flow:</span>
          <span className="text-blue-700">Main Stock →</span>
          <span className="text-blue-700 font-medium">Down Add</span>
          <span className="text-blue-700">→ Down (Storage) →</span>
          <span className="text-blue-700 font-medium">Fridge Add</span>
          <span className="text-blue-700">→ Fridge (Serving) →</span>
          <span className="text-blue-700 font-medium">Sales</span>
        </div>
        <div className="text-blue-600 mt-1 text-[10px]">
          ⚡ Fridge Add comes FROM Down (Storage). Total Stock = Down Close + Fridge Close
        </div>
        <div className="text-amber-600 mt-1 text-[10px] font-medium">
          🔗 Rule: Down Close = Down Open + Down Add - Fridge Add
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th rowSpan={2} className="p-2 sm:p-3 border-r">Item Name</th>
              <th rowSpan={2} className="p-2 sm:p-3 border-r w-16 hidden sm:table-cell">Unit</th>
              <th colSpan={3} className="p-2 text-center border-r bg-blue-50/50">Bar Down (Storage)</th>
              <th colSpan={3} className="p-2 text-center border-r bg-emerald-50/50">Bar Fridge (Serving)</th>
              <th rowSpan={2} className="p-2 sm:p-3 border-r w-20 font-bold text-center">Total Stock</th>
              <th rowSpan={2} className="p-2 sm:p-3 border-r w-20 text-center">Waste</th>
              <th rowSpan={2} className="p-2 sm:p-3 w-20 font-bold text-center text-blue-600 bg-blue-50">Sales</th>
            </tr>
            <tr className="border-t">
              <th className="p-2 w-16 text-center border-r">Open</th>
              <th className="p-2 w-16 text-center border-r">Add</th>
              <th className="p-2 w-16 text-center border-r">Close</th>
              <th className="p-2 w-16 text-center border-r">Open</th>
              <th className="p-2 w-16 text-center border-r">Add</th>
              <th className="p-2 w-16 text-center border-r">Close</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {Object.entries(groupedItems).map(([categoryKey, categoryItems]) => (
              <React.Fragment key={categoryKey}>
                <tr className="bg-gray-100 border-y">
                  <td colSpan={11} className="p-2 font-bold text-xs uppercase tracking-wider text-gray-700">
                    {BAR_CATEGORIES[categoryKey as BarCategory] || categoryKey} ({categoryItems.length})
                  </td>
                </tr>
                {categoryItems.map((item) => {
                  const hasDownErr = !!errors[`${item.id}-down`];
                  const hasFridgeErr = !!errors[`${item.id}-fridge`];
                  const hasTransferErr = !!errors[`${item.id}-transfer`];
                  const tomorrowData = tomorrowOpening[item.id];
                  const transferredToFridge = getTransferToFridge(item);
                  const downAvailable = item.downOpen + item.downAdd;
                  const isValid = isRelationshipValid(item);
                  const totalStock = item.downClose + item.fridgeClose;

                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${(!isValid || hasDownErr || hasFridgeErr || hasTransferErr) ? 'bg-red-50' : ''}`}>
                      <td className="p-2 sm:p-3 font-medium border-r">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.name}</span>
                          {(!isValid || hasDownErr || hasFridgeErr || hasTransferErr) && (
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          {isToday && tomorrowData && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium hidden sm:inline">
                              Tom: {tomorrowData.downOpen + tomorrowData.fridgeOpen}
                            </span>
                          )}
                          {transferredToFridge > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium hidden sm:inline">
                              → Fridge: {transferredToFridge}
                            </span>
                          )}
                          {!isValid && (
                            <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium hidden sm:inline">
                              ⚠️ {downAvailable} - {item.fridgeAdd} ≠ {item.downClose}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 border-r hidden sm:table-cell">{item.unit}</td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.downOpen || ''}
                          onChange={(e) => handleInputChange(item.id, 'downOpen', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.downAdd || ''}
                          onChange={(e) => handleInputChange(item.id, 'downAdd', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 py-1 text-right text-xs bg-blue-50 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                          title="Restock from main stock"
                        />
                      </td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.downClose || ''}
                          title={errors[`${item.id}-down`] || `Available: ${downAvailable}, Fridge Add: ${item.fridgeAdd}`}
                          onChange={(e) => handleInputChange(item.id, 'downClose', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded px-1 py-1 text-right text-xs outline-none focus:ring-1 ${
                            hasDownErr || !isValid
                              ? 'border-red-500 ring-1 ring-red-500 bg-red-100 text-red-700 font-semibold'
                              : 'focus:ring-blue-500'
                          }`}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.fridgeOpen || ''}
                          onChange={(e) => handleInputChange(item.id, 'fridgeOpen', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.fridgeAdd || ''}
                          title={errors[`${item.id}-transfer`] || `Available: ${downAvailable}, Storage Close: ${item.downClose}`}
                          onChange={(e) => handleInputChange(item.id, 'fridgeAdd', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded px-1 py-1 text-right text-xs outline-none focus:ring-1 ${
                            hasTransferErr || !isValid
                              ? 'border-red-500 ring-1 ring-red-500 bg-red-100 text-red-700 font-semibold'
                              : 'bg-amber-50 focus:ring-1 focus:ring-amber-500'
                          }`}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.fridgeClose || ''}
                          title={errors[`${item.id}-fridge`] || ''}
                          onChange={(e) => handleInputChange(item.id, 'fridgeClose', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded px-1 py-1 text-right text-xs outline-none focus:ring-1 ${
                            hasFridgeErr
                              ? 'border-red-500 ring-1 ring-red-500 bg-red-100 text-red-700 font-semibold'
                              : 'focus:ring-blue-500'
                          }`}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 sm:p-3 font-bold text-right border-r bg-blue-50 text-sm text-blue-600">
                        {totalStock}
                      </td>
                      <td className="p-1 sm:p-2 border-r">
                        <input
                          type="number"
                          step="1"
                          value={item.waste || ''}
                          onChange={(e) => handleInputChange(item.id, 'waste', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 py-1 text-right text-xs text-red-600 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 sm:p-3 font-bold text-right text-green-600 bg-green-50 text-sm">
                        {item.totalSales}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p><strong>Total Stock</strong> = Down Close + Fridge Close</p>
        <p><strong>Sales</strong> = (Down Open + Down Add + Fridge Open + Fridge Add) - (Down Close + Fridge Close) - Waste</p>
        <p className="text-blue-600">Storage Add = Restock from main stock | Fridge Add = Transfer from Storage to Fridge</p>
        <p className="text-amber-600 font-bold">🔗 Rule: Down Close = Down Open + Down Add - Fridge Add</p>
        <p className="text-amber-600 text-[10px]">Example: Storage Open 5 + Add 5 = 10, Transfer 3 to Fridge, Storage Close = 7</p>
        {isToday && (
          <p className="text-blue-600 font-medium">
            Note: Today's closing stock will automatically become tomorrow's opening stock when you save.
          </p>
        )}
      </div>
    </div>
  );
}