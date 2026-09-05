// src/app/inventory/daily/main-stock/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { initialMainStockData } from '@/data/mainStockItems';
import { MainStockItem, ProductionDetail } from '@/types/inventory';
import { 
  Factory, AlertCircle, RefreshCw, Save, ArrowRightLeft, 
  Scale, Utensils, Package, TrendingDown, Calendar, FileSpreadsheet,
  ArrowRight, CookingPot
} from 'lucide-react';
import { saveDailyMainStock, loadDailyMainStock, getNextDayOpeningStock } from './actions';
import { getProductionConfig } from '@/config/productionConfigs';
import Link from 'next/link';

// Helper to determine if a unit should show decimals
const shouldShowDecimals = (unit: string): boolean => {
  return unit === 'kg' || unit === 'grams' || unit === 'liters';
};

// Helper to format number based on unit
const formatNumber = (value: number, unit: string): string => {
  if (shouldShowDecimals(unit)) {
    return value.toFixed(2);
  }
  return Math.round(value).toString();
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

export default function DailyMainStockPage() {
  const [items, setItems] = useState<MainStockItem[]>(initialMainStockData);
  const [filter, setFilter] = useState<string>('all');
  const [productionDetails, setProductionDetails] = useState<Record<string, ProductionDetail>>({});
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
      const result = await loadDailyMainStock(date);
      
      if (result.success && result.data) {
        // Debug: log the loaded items
        console.log('Loaded items:', result.data.items.map((i: any) => ({ 
          name: i.name, 
          usageType: i.usageType,
          id: i.id 
        })));
        setItems(result.data.items);
        setProductionDetails(result.data.productionDetails || {});
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
        
        setItems(initialMainStockData.map(item => ({
          ...item,
          openingStock: 0,
          addedStock: 0,
          issuedToProduction: 0,
          issuedToKitchen: 0,
          closingStock: 0,
          quantityInStock: 0,
        })));
        setProductionDetails({});
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
      const result = await getNextDayOpeningStock(date);
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
    field: keyof Pick<MainStockItem, 'openingStock' | 'addedStock' | 'issuedToProduction' | 'issuedToKitchen'>,
    value: number
  ) => {
    const numericValue = Math.max(0, value);
    console.log('handleInputChange:', { id, field, value: numericValue });

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: numericValue };
          updated.closingStock =
            updated.openingStock +
            updated.addedStock -
            (updated.issuedToProduction + updated.issuedToKitchen);

          updated.quantityInStock = updated.closingStock;

          if (field === 'issuedToProduction') {
            setProductionDetails((prev) => {
              const newDetails = { ...prev };

              if (numericValue > 0) {
                const existing = newDetails[id] || {
                  itemId: id,
                  itemName: item.name,
                  cartonsIssued: numericValue,
                  totalWeightKg: 0,
                  wasteWeightKg: 0,
                  portions: {},
                };

                newDetails[id] = {
                  ...existing,
                  cartonsIssued: numericValue,
                };
              } else {
                delete newDetails[id];
              }

              return newDetails;
            });
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Helper function to increment/decrement production value
  const incrementProdValue = (id: string, amount: number) => {
    console.log('incrementProdValue called:', { id, amount });
    const item = items.find(i => i.id === id);
    console.log('Found item:', item);
    
    if (!item) {
      console.log('Item not found!');
      return;
    }
    
    console.log('Item usageType:', item.usageType);
    
    if (item.usageType === 'direct_sale') {
      console.log('Item is direct_sale, cannot increment');
      return;
    }
    
    const currentValue = Number(item.issuedToProduction) || 0;
    const step = shouldShowDecimals(item.unit) ? 0.01 : 1;
    const newValue = Math.max(0, currentValue + (amount * step));
    console.log('New value:', newValue);
    handleInputChange(id, 'issuedToProduction', newValue);
  };

  const handleProductionWeightChange = (
    itemId: string,
    field: 'totalWeightKg' | 'wasteWeightKg',
    val: number
  ) => {
    setProductionDetails((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: Math.max(0, val),
      },
    }));
  };

  const handlePortionChange = (itemId: string, portionKey: string, val: number) => {
    setProductionDetails((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        portions: {
          ...prev[itemId].portions,
          [portionKey]: Math.max(0, val),
        },
      },
    }));
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
      const result = await saveDailyMainStock({ 
        items: items.map(item => ({
          ...item,
          openingStock: Number(item.openingStock),
          addedStock: Number(item.addedStock),
          issuedToProduction: Number(item.issuedToProduction),
          issuedToKitchen: Number(item.issuedToKitchen),
          closingStock: Number(item.closingStock),
        })),
        productionDetails,
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
      setItems(initialMainStockData.map(item => ({
        ...item,
        openingStock: 0,
        addedStock: 0,
        issuedToProduction: 0,
        issuedToKitchen: 0,
        closingStock: 0,
        quantityInStock: 0,
      })));
      setProductionDetails({});
      setHasLoadedData(false);
      setSaveMessage({ 
        type: 'success', 
        text: 'Fields reset. You can start fresh.' 
      });
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'production') return item.usageType === 'production_raw' || item.usageType === 'both';
    if (filter === 'chicken') return item.category === 'chicken';
    if (filter === 'meat') return item.category === 'meat';
    if (filter === 'bakery_dairy') return item.category === 'bakery_dairy';
    if (filter === 'frozen_dry') return item.category === 'frozen_dry';
    return true;
  });

  const activeProductionList = Object.values(productionDetails);

  const totalItems = items.length;
  const lowStockItems = items.filter(item => 
    item.closingStock <= item.reorderLevel && item.closingStock > 0
  );
  const outOfStockItems = items.filter(item => item.closingStock <= 0);

  const isToday = selectedDate === getTodayDate();
  const tomorrow = getTomorrowDate(selectedDate);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Main Stock</h1>
          
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
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 hidden sm:block">
            {hasLoadedData ? 'Data exists' : 'New entry'}
          </div>
          
          <Link href="/production/daily">
            <button
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-amber-600 text-white font-medium rounded-md hover:bg-amber-700"
              title="Go to Production"
            >
              <CookingPot className="h-4 w-4" />
              <span className="hidden sm:inline">Production</span>
            </button>
          </Link>
          
          <Link href="/inventory/daily/main-stock/export">
            <button
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
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
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Record'}</span>
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
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">In Production</p>
              <p className="text-xl sm:text-2xl font-bold">{activeProductionList.length}</p>
            </div>
            <Factory className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Low Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
            </div>
            <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Out of Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
            </div>
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'production', label: 'Production' },
          { id: 'chicken', label: 'Chicken' },
          { id: 'meat', label: 'Meat' },
          { id: 'bakery_dairy', label: 'Bakery' },
          { id: 'frozen_dry', label: 'Frozen' },
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

      {/* Main Table */}
      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 sm:p-3">Item</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
              <th className="p-2 sm:p-3 w-20 sm:w-28">Opening</th>
              <th className="p-2 sm:p-3 w-20 sm:w-28">Added</th>
              <th className="p-2 sm:p-3 w-28 sm:w-32">Prod</th>
              <th className="p-2 sm:p-3 w-20 sm:w-28">Kitchen</th>
              <th className="p-2 sm:p-3 w-20 sm:w-28">Closing</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.map((item) => {
              const totalAvailable = (item.openingStock || 0) + (item.addedStock || 0);
              const totalIssued = (item.issuedToProduction || 0) + (item.issuedToKitchen || 0);

              const isOverIssued = totalIssued > totalAvailable;
              const isNegativeClosing = item.closingStock < 0;
              const isLow = item.closingStock <= item.reorderLevel && item.closingStock > 0;
              const isOut = item.closingStock <= 0 && !isNegativeClosing;
              const tomorrowOpen = tomorrowOpening[item.id] || 0;
              const currentProdValue = Number(item.issuedToProduction) || 0;
              const isProdEnabled = item.usageType !== 'direct_sale';

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
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-gray-900">{item.name}</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {isProdEnabled && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-medium">
                            <Factory className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="hidden sm:inline">Prod</span>
                          </span>
                        )}
                        {item.substituteFor && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium">
                            <ArrowRightLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="hidden sm:inline">Sub</span>
                          </span>
                        )}
                        {isToday && tomorrowOpen > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium">
                            Tomorrow: {formatNumber(tomorrowOpen, item.unit)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>

                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step={shouldShowDecimals(item.unit) ? "0.01" : "1"}
                      value={item.openingStock || ''}
                      onChange={(e) => handleInputChange(item.id, 'openingStock', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step={shouldShowDecimals(item.unit) ? "0.01" : "1"}
                      value={item.addedStock || ''}
                      onChange={(e) => handleInputChange(item.id, 'addedStock', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1 sm:p-2">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => incrementProdValue(item.id, -1)}
                        disabled={!isProdEnabled || currentProdValue <= 0}
                        className={`w-6 h-7 flex items-center justify-center rounded-l border text-sm font-bold ${
                          !isProdEnabled || currentProdValue <= 0
                            ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'hover:bg-gray-200 bg-white'
                        }`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        step={shouldShowDecimals(item.unit) ? "0.01" : "1"}
                        disabled={!isProdEnabled}
                        value={item.issuedToProduction || ''}
                        onChange={(e) => handleInputChange(item.id, 'issuedToProduction', parseFloat(e.target.value) || 0)}
                        className={`w-14 sm:w-20 border-y px-1 py-1 text-right text-xs sm:text-sm outline-none transition-colors ${
                          !isProdEnabled 
                            ? 'bg-gray-100 cursor-not-allowed text-gray-400' 
                            : isOverIssued
                            ? 'border-red-500 bg-red-100 text-red-900 font-bold focus:ring-1 focus:ring-red-500' 
                            : 'focus:ring-1 focus:ring-blue-500'
                        }`}
                        placeholder="0"
                      />
                      <button
                        onClick={() => incrementProdValue(item.id, 1)}
                        disabled={!isProdEnabled}
                        className={`w-6 h-7 flex items-center justify-center rounded-r border text-sm font-bold ${
                          !isProdEnabled
                            ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'hover:bg-gray-200 bg-white'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="p-1 sm:p-2">
                    <input
                      type="number"
                      step={shouldShowDecimals(item.unit) ? "0.01" : "1"}
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
                      {formatNumber(item.closingStock || 0, item.unit)}
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

      {/* Active Production Section */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Active Production</h2>
          <Link href="/production/daily">
            <button className="text-xs text-amber-600 hover:text-amber-800 font-medium underline">
              View All Production →
            </button>
          </Link>
        </div>

        {activeProductionList.length === 0 ? (
          <div className="p-6 sm:p-8 text-center border rounded-lg bg-gray-50 text-gray-500 text-sm">
            No items currently issued for production. Enter a value in the <strong>Prod</strong> column above.
          </div>
        ) : (
          <div className="space-y-6">
            {activeProductionList.map((batch) => {
              const netWeight = Math.max(0, batch.totalWeightKg - batch.wasteWeightKg);
              const portionConfig = getProductionConfig(batch.itemName);

              return (
                <div key={batch.itemId} className="border rounded-lg p-4 sm:p-5 bg-white space-y-4 shadow-sm border-amber-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">{batch.itemName}</span>
                      <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded font-semibold">
                        {formatNumber(batch.cartonsIssued, 'ctns')} Issued
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600 text-xs sm:text-sm">Net: </span>
                      <span className="font-bold text-sm sm:text-base text-emerald-600">
                        {netWeight.toFixed(2)} kg
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">
                        Total Raw Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={batch.totalWeightKg || ''}
                        onChange={(e) =>
                          handleProductionWeightChange(batch.itemId, 'totalWeightKg', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border rounded-md px-2 sm:px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">
                        Waste (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={batch.wasteWeightKg || ''}
                        onChange={(e) =>
                          handleProductionWeightChange(batch.itemId, 'wasteWeightKg', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border rounded-md px-2 sm:px-3 py-1.5 text-sm text-red-600 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">
                        Net Weight
                      </label>
                      <div className="w-full border rounded-md px-2 sm:px-3 py-1.5 text-sm bg-gray-50 font-bold text-right text-gray-900">
                        {netWeight.toFixed(2)} kg
                      </div>
                    </div>
                  </div>

                  {portionConfig.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600">
                        <Utensils className="h-3.5 w-3.5" /> Derived Products
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-gray-50 p-3 rounded-md border">
                        {portionConfig.map((portion) => (
                          <div key={portion.key} className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">{portion.label}</label>
                            <input
                              type="number"
                              step="1"
                              value={batch.portions[portion.key] || ''}
                              onChange={(e) =>
                                handlePortionChange(
                                  batch.itemId,
                                  portion.key,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full border rounded-md px-2 sm:px-3 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p>Stock Formula: Closing = Opening + Added - Issued (Production + Kitchen)</p>
        <p className="text-amber-600">Production items go to the Production page for processing.</p>
        {isToday && (
          <p className="text-blue-600 font-medium">
            Note: Today's closing stock will automatically become tomorrow's opening stock when you save.
          </p>
        )}
      </div>
    </div>
  );
}