// src/app/inventory/daily/kitchen/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { initialKitchenStockData } from '@/data/kitchenStockItems';
import { KitchenItem } from '@/types/inventory';
import { ProductionBatch } from '@/types/production';
import { Save, RefreshCw, Calendar, FileSpreadsheet, ArrowRight, Package, CookingPot, Plus, Minus, AlertCircle } from 'lucide-react';
import { saveKitchenDaily, loadKitchenDaily, getNextDayOpeningStock } from './actions';
import { getAvailableProduction, issueToKitchen } from '@/app/production/daily/actions';
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

// ============================================================
// PRODUCTION TO KITCHEN MAPPING - BASED ON ACTUAL DATA
// ============================================================
const PRODUCTION_TO_KITCHEN_MAP: Record<string, string> = {
  // === FROM YOUR CSV DATA ===
  'Mozzarella Portions': 'Mozzarella Cheese',
  'Chicken Assorted': 'Shredded Chicken Breast - Assorted',
  'Chicken Bites': 'Chicken Breast',
  'Portion Chicken Breast': 'Chicken Breast',
  'Lamb Chops Portions': 'Lamb Chops (0.33/ptn)',
  
  // === FROM productionMapping.ts (not yet in CSV) ===
  // Patties - Chicken
  'Chicken Patty (Large)': 'Large Chicken Patty',
  'Chicken Patty (Medium)': 'Medium Chicken Patty',
  'Chicken Patty (Small)': 'Small Chicken Patty',
  
  // Patties - Beef
  'Meat Patty (Large)': 'Large Beef Patty',
  'Meat Patty (Medium)': 'Medium Beef Patty',
  'Meat Patty (Small)': 'Small Beef Patty',
  
  // Chicken Products
  'Chicken Shawarma': 'Chicken Thigh - Shredded Shawarma Fillet',
  'Chicken Khebab': 'Chicken Khebab',
  'Chicken Wings Portions': 'Chicken Wings Portion',
  
  // Beef Products
  'Beef Shawarma': 'Skewer Shawarma Back Fillet',
  'Beef Assorted': 'Assorted Shredded Beef',
  'Beef Khebab': 'Beef Khebab',
  
  // Chops
  'Pork Chops Portions': 'Pork Chops (0.33/ptn)',
  
  // Potato Fries - HOLDING FOR NOW
  // 'Potato Fries Portions': 'Potato Chips (200g)',
};

// Build reverse mapping: which production products map to each kitchen item
const buildKitchenToProductionMap = (): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const [prod, kitchen] of Object.entries(PRODUCTION_TO_KITCHEN_MAP)) {
    if (!map[kitchen]) {
      map[kitchen] = [];
    }
    map[kitchen].push(prod);
  }
  return map;
};

const KITCHEN_TO_PRODUCTION_MAP = buildKitchenToProductionMap();

// Helper: Find kitchen item name from production name
const findKitchenItemName = (productionName: string): string => {
  // 1. Direct match
  if (PRODUCTION_TO_KITCHEN_MAP[productionName]) {
    return PRODUCTION_TO_KITCHEN_MAP[productionName];
  }
  
  // 2. Try to find by checking if production name contains any mapped product name
  for (const [prodName, kitchenName] of Object.entries(PRODUCTION_TO_KITCHEN_MAP)) {
    if (productionName.toLowerCase().includes(prodName.toLowerCase()) || 
        prodName.toLowerCase().includes(productionName.toLowerCase())) {
      return kitchenName;
    }
  }
  
  // 3. Return as-is if no match found (fallback)
  return productionName;
};

export default function KitchenDailyInventoryPage() {
  const [items, setItems] = useState<KitchenItem[]>(initialKitchenStockData);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [tomorrowOpening, setTomorrowOpening] = useState<Record<string, number>>({});
  const [availableProduction, setAvailableProduction] = useState<ProductionBatch[]>([]);
  const [showProductionPicker, setShowProductionPicker] = useState<string | null>(null);
  const [selectedProductionBatch, setSelectedProductionBatch] = useState<ProductionBatch | null>(null);
  const [issueQuantity, setIssueQuantity] = useState<number>(1);
  const [productionLimits, setProductionLimits] = useState<Record<string, number>>({});
  const [productionBatchMap, setProductionBatchMap] = useState<Record<string, ProductionBatch[]>>({});

  // Load data when date changes
  useEffect(() => {
    loadDataForDate(selectedDate);
    loadTomorrowOpening(selectedDate);
    loadAvailableProduction(selectedDate);
  }, [selectedDate]);

  const loadDataForDate = async (date: string) => {
    setIsLoading(true);
    setSaveMessage(null);
    
    try {
      const result = await loadKitchenDaily(date);
      
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
        
        setItems(initialKitchenStockData.map(item => ({
          ...item,
          morningStock: 0,
          receivedFromStock: 0,
          totalStock: 0,
          closingStock: 0,
          actualClosingStock: 0,
          salesDeduction: 0,
          waste: 0,
          variance: 0,
        })));
        setHasLoadedData(false);
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
          openingMap[row.item_id] = Number(row.morning_stock);
        });
        setTomorrowOpening(openingMap);
      }
    } catch (err) {
      console.error('Error loading tomorrow opening:', err);
    }
  };

  const loadAvailableProduction = async (date: string) => {
    try {
      const result = await getAvailableProduction(date);
      if (result.success && result.data) {
        const production = result.data as ProductionBatch[];
        setAvailableProduction(production);
        
        // Build production limits map with correct mapping
        const limits: Record<string, number> = {};
        const batchMap: Record<string, ProductionBatch[]> = {};
        
        production.forEach((p: ProductionBatch) => {
          const productName = p.outputProductName || '';
          const remaining = Number(p.remaining) || 0;
          
          // Skip if no remaining quantity
          if (remaining <= 0) return;
          
          // Find which kitchen item this production maps to
          const kitchenItemName = findKitchenItemName(productName);
          
          console.log(`[Production Mapping] "${productName}" (${remaining}) → "${kitchenItemName}"`);
          
          // Add to limits (sum if multiple batches/products map to same kitchen item)
          if (limits[kitchenItemName]) {
            limits[kitchenItemName] += remaining;
          } else {
            limits[kitchenItemName] = remaining;
          }
          
          // Store batch references
          if (!batchMap[kitchenItemName]) {
            batchMap[kitchenItemName] = [];
          }
          batchMap[kitchenItemName].push(p);
        });
        
        setProductionLimits(limits);
        setProductionBatchMap(batchMap);
        
        console.log('Production Limits (aggregated by kitchen item):', limits);
        console.log('Batch Map Keys:', Object.keys(batchMap));
      } else {
        setAvailableProduction([]);
        setProductionLimits({});
        setProductionBatchMap({});
      }
    } catch (err) {
      console.error('Error loading available production:', err);
      setAvailableProduction([]);
      setProductionLimits({});
      setProductionBatchMap({});
    }
  };

  const handleInputChange = (
    id: string,
    field: keyof Pick<KitchenItem, 'morningStock' | 'receivedFromStock' | 'actualClosingStock' | 'waste'>,
    value: number
  ) => {
    const safeValue = Math.max(0, value);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // If changing the "Add" field, check production limits
          if (field === 'receivedFromStock') {
            const productionLimit = productionLimits[item.name] || 0;
            
            // If trying to add more than production limit, show error and restrict
            if (productionLimit > 0 && safeValue > productionLimit) {
              setSaveMessage({
                type: 'error',
                text: `Cannot add ${safeValue} of ${item.name}. Only ${productionLimit} available from production.`
              });
              // Don't update the value, keep it at the limit
              const updated = { ...item };
              const total = (updated.morningStock || 0) + (updated.receivedFromStock || 0);
              updated.totalStock = total;
              updated.salesDeduction = Math.max(0, 
                total - (updated.actualClosingStock || 0) - (updated.waste || 0)
              );
              updated.closingStock = total - updated.salesDeduction - (updated.waste || 0);
              updated.variance = (updated.closingStock || 0) - (updated.actualClosingStock || 0);
              return updated;
            }
          }
          
          const updated = { ...item, [field]: safeValue };
          const total = (updated.morningStock || 0) + (updated.receivedFromStock || 0);
          updated.totalStock = total;
          updated.salesDeduction = Math.max(0, 
            total - (updated.actualClosingStock || 0) - (updated.waste || 0)
          );
          updated.closingStock = total - updated.salesDeduction - (updated.waste || 0);
          updated.variance = (updated.closingStock || 0) - (updated.actualClosingStock || 0);
          return updated;
        }
        return item;
      })
    );
  };

  const handleIssueFromProduction = async (itemId: string, batchId: number, quantity: number) => {
    setSaveMessage(null);
    
    try {
      const result = await issueToKitchen(batchId, quantity, itemId);
      
      if (result.success) {
        setSaveMessage({ type: 'success', text: result.message });
        // Reload available production
        await loadAvailableProduction(selectedDate);
        // Reload kitchen data
        await loadDataForDate(selectedDate);
        setShowProductionPicker(null);
        setSelectedProductionBatch(null);
        setIssueQuantity(1);
      } else {
        setSaveMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Error issuing to kitchen:', err);
      setSaveMessage({ 
        type: 'error', 
        text: 'Failed to issue production to kitchen.' 
      });
    }
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const today = getTodayDate();
    const tomorrow = getTomorrowDate(today);
    const isToday = selectedDate === today;

    setIsSaving(true);
    try {
      const result = await saveKitchenDaily({ 
        items: items.map(item => ({
          ...item,
          morningStock: Number(item.morningStock),
          receivedFromStock: Number(item.receivedFromStock),
          actualClosingStock: Number(item.actualClosingStock),
          waste: Number(item.waste) || 0,
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
      setItems(initialKitchenStockData.map(item => ({
        ...item,
        morningStock: 0,
        receivedFromStock: 0,
        totalStock: 0,
        closingStock: 0,
        actualClosingStock: 0,
        salesDeduction: 0,
        waste: 0,
        variance: 0,
      })));
      setHasLoadedData(false);
      setSaveMessage({ 
        type: 'success', 
        text: 'Fields reset. You can start fresh.' 
      });
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const groupedItems = filteredItems.reduce<Record<string, KitchenItem[]>>((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const isToday = selectedDate === getTodayDate();
  const tomorrow = getTomorrowDate(selectedDate);

  // Calculate summary statistics
  const totalItems = items.length;
  const totalSales = items.reduce((sum, item) => sum + (item.salesDeduction || 0), 0);
  const totalWaste = items.reduce((sum, item) => sum + (item.waste || 0), 0);
  const itemsWithVariance = items.filter(item => Math.abs(item.variance || 0) > 0);

  // Get total production available for an item (sum of all mapped production products)
  const getTotalProductionAvailable = (itemName: string): number => {
    // Check direct limit
    if (productionLimits[itemName]) {
      return productionLimits[itemName];
    }
    
    // Check if any production maps to this item
    if (KITCHEN_TO_PRODUCTION_MAP[itemName]) {
      let total = 0;
      for (const prodName of KITCHEN_TO_PRODUCTION_MAP[itemName]) {
        // Find the kitchen name this production maps to
        const kitchenName = findKitchenItemName(prodName);
        if (productionLimits[kitchenName]) {
          total += productionLimits[kitchenName];
        }
      }
      return total;
    }
    
    return 0;
  };

  // Get matching production batches for an item (all batches that map to this kitchen item)
  const getMatchingProductionBatches = (itemName: string): ProductionBatch[] => {
    // Check direct batch map
    if (productionBatchMap[itemName]) {
      return productionBatchMap[itemName];
    }
    
    // Check if this item has production mapped to it
    if (KITCHEN_TO_PRODUCTION_MAP[itemName]) {
      const batches: ProductionBatch[] = [];
      for (const prodName of KITCHEN_TO_PRODUCTION_MAP[itemName]) {
        const kitchenName = findKitchenItemName(prodName);
        if (productionBatchMap[kitchenName]) {
          batches.push(...productionBatchMap[kitchenName]);
        }
      }
      return batches;
    }
    
    return [];
  };

  // Get the production products that map to a kitchen item (for display)
  const getProductionProductsForItem = (itemName: string): string[] => {
    if (KITCHEN_TO_PRODUCTION_MAP[itemName]) {
      return KITCHEN_TO_PRODUCTION_MAP[itemName];
    }
    return [];
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kitchen Daily Inventory</h1>
          
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
          
          {/* Production Available Badge */}
          {availableProduction.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
              <CookingPot className="h-3 w-3" />
              {availableProduction.length} Production Available
            </span>
          )}
          
          <Link href="/inventory/kitchen/daily/export">
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
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">K</span>
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
              <p className="text-xs sm:text-sm text-gray-500">Total Waste</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{totalWaste}</p>
            </div>
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">W</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">With Variance</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{itemsWithVariance.length}</p>
            </div>
            <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-amber-600 font-bold">Δ</span>
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
          <div className="flex items-start gap-2">
            {saveMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            <span>{saveMessage.text}</span>
          </div>
        </div>
      )}

      {/* Available Production Section - Shows aggregated by kitchen item */}
      {availableProduction.length > 0 && isToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <CookingPot className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-amber-800">Available Production</span>
            <span className="text-xs text-amber-600">({availableProduction.length} batches ready)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(productionBatchMap).map(([kitchenItemName, batches]) => {
              const totalAvailable = batches.reduce((sum, b) => sum + Number(b.remaining || 0), 0);
              
              // Find the actual kitchen item
              const matchedKitchenItem = items.find(item => 
                item.name === kitchenItemName ||
                item.name.toLowerCase().includes(kitchenItemName.toLowerCase()) ||
                kitchenItemName.toLowerCase().includes(item.name.toLowerCase())
              );
              
              if (!matchedKitchenItem) return null;
              
              // Get the production product names for display
              const productNames = batches.map(b => b.outputProductName).join(', ');
              
              return (
                <div 
                  key={kitchenItemName} 
                  className="bg-white rounded-md px-3 py-1.5 text-sm border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-50"
                  onClick={() => {
                    // Show picker with the first batch
                    setSelectedProductionBatch(batches[0]);
                    setShowProductionPicker(kitchenItemName);
                    setIssueQuantity(1);
                  }}
                >
                  <span className="font-medium">{kitchenItemName}</span>
                  <span className="ml-2 text-amber-600 font-bold">{totalAvailable}</span>
                  <span className="text-xs text-gray-500 ml-1">available</span>
                  <Plus className="h-3 w-3 inline ml-1 text-amber-600" />
                  {batches.length > 1 && (
                    <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                      {batches.length} batches
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-2">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'patties', label: 'Patties' },
          { id: 'poultry', label: 'Chicken & Poultry' },
          { id: 'shawarma', label: 'Shawarma Fillets' },
          { id: 'khebabs_meats', label: 'Khebabs & Shredded' },
          { id: 'steaks_sides', label: 'Steaks, Fish & Sides' },
          { id: 'starters_bakery', label: 'Buns, Dairy & Starters' },
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

      {/* Inventory Table */}
      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 sm:p-3">Item Name</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Open</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Add</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 font-bold">Total</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Closing</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24">Waste</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 font-bold text-blue-600">Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {Object.entries(groupedItems).map(([categoryKey, categoryItems]) => (
              <React.Fragment key={categoryKey}>
                <tr className="bg-gray-100 border-y">
                  <td colSpan={8} className="p-2 font-bold text-xs uppercase tracking-wider text-gray-700">
                    {CATEGORY_NAMES[categoryKey] || categoryKey} ({categoryItems.length})
                    {isToday && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        → Tomorrow's opening: {categoryItems.filter(item => tomorrowOpening[item.id] !== undefined).length} items set
                      </span>
                    )}
                  </td>
                </tr>

                {categoryItems.map((item) => {
                  const total = (item.morningStock || 0) + (item.receivedFromStock || 0);
                  const hasVariance = Math.abs(item.variance || 0) > 0;
                  const tomorrowOpen = tomorrowOpening[item.id] || 0;
                  const productionAvailable = getTotalProductionAvailable(item.name);
                  const hasProduction = productionAvailable > 0;
                  const isAtProductionLimit = hasProduction && item.receivedFromStock >= productionAvailable;
                  const matchingBatches = getMatchingProductionBatches(item.name);
                  const productionProducts = getProductionProductsForItem(item.name);
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${hasVariance ? 'bg-amber-50' : ''}`}>
                      <td className="p-2 sm:p-3 font-medium text-gray-900 pl-6">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {hasProduction && isToday && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              📦 {productionAvailable} available
                            </span>
                          )}
                          {productionProducts.length > 0 && isToday && (
                            <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                              From: {productionProducts.join(', ')}
                            </span>
                          )}
                          {hasVariance && (
                            <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Var: {item.variance}
                            </span>
                          )}
                          {isToday && tomorrowOpen > 0 && (
                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                              Tomorrow: {tomorrowOpen}
                            </span>
                          )}
                          {isAtProductionLimit && isToday && (
                            <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">
                              ✅ Limit Reached
                            </span>
                          )}
                          {matchingBatches.length > 0 && isToday && (
                            <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-medium cursor-pointer hover:bg-purple-200"
                              onClick={() => {
                                setSelectedProductionBatch(matchingBatches[0]);
                                setShowProductionPicker(item.name);
                                setIssueQuantity(1);
                              }}
                            >
                              📋 {matchingBatches.length} batch(es)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 hidden sm:table-cell">{item.unit}</td>
                      <td className="p-1 sm:p-2">
                        <input
                          type="number"
                          step="1"
                          value={item.morningStock || ''}
                          onChange={(e) => handleInputChange(item.id, 'morningStock', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 sm:p-2">
                        <input
                          type="number"
                          step="1"
                          value={item.receivedFromStock || ''}
                          onChange={(e) => handleInputChange(item.id, 'receivedFromStock', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none ${
                            hasProduction && isToday && item.receivedFromStock >= productionAvailable
                              ? 'bg-green-50 border-green-400'
                              : hasProduction && isToday
                              ? 'bg-amber-50'
                              : ''
                          }`}
                          placeholder="0"
                          title={hasProduction ? `Max: ${productionAvailable}` : ''}
                        />
                        {hasProduction && isToday && (
                          <div className="text-[8px] text-amber-600 text-right mt-0.5">
                            Max: {productionAvailable}
                          </div>
                        )}
                      </td>
                      <td className="p-2 sm:p-3 font-semibold text-right bg-gray-50 text-sm">
                        {total}
                      </td>
                      <td className="p-1 sm:p-2">
                        <input
                          type="number"
                          step="1"
                          value={item.actualClosingStock || ''}
                          onChange={(e) => handleInputChange(item.id, 'actualClosingStock', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 sm:p-2">
                        <input
                          type="number"
                          step="1"
                          value={item.waste || ''}
                          onChange={(e) => handleInputChange(item.id, 'waste', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-1 sm:px-2 py-1 text-right text-xs sm:text-sm text-red-600 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 sm:p-3 font-bold text-right text-blue-600 bg-blue-50 text-sm">
                        {item.salesDeduction}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Production Picker Modal */}
      {showProductionPicker && selectedProductionBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add from Production</h3>
              <button
                onClick={() => {
                  setShowProductionPicker(null);
                  setSelectedProductionBatch(null);
                  setIssueQuantity(1);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <p className="font-medium text-amber-800">Adding to: {showProductionPicker}</p>
                <p className="text-sm text-amber-700 mt-1">
                  From: <span className="font-medium">{selectedProductionBatch.outputProductName}</span>
                </p>
                <p className="text-sm text-amber-700">
                  Batch: {selectedProductionBatch.batchNumber} | 
                  Available: <span className="font-bold">{selectedProductionBatch.remaining}</span>
                </p>
                {productionBatchMap[showProductionPicker]?.length > 1 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Multiple batches available ({productionBatchMap[showProductionPicker].length})
                  </p>
                )}
              </div>

              {productionBatchMap[showProductionPicker]?.length > 1 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Select Batch:</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    value={selectedProductionBatch.id || ''}
                    onChange={(e) => {
                      const batch = productionBatchMap[showProductionPicker]?.find(
                        b => b.id === Number(e.target.value)
                      );
                      if (batch) {
                        setSelectedProductionBatch(batch);
                        setIssueQuantity(1);
                      }
                    }}
                  >
                    {productionBatchMap[showProductionPicker]?.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.remaining} available ({batch.outputProductName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => setIssueQuantity(Math.max(1, issueQuantity - 1))}
                    className="p-1 border rounded hover:bg-gray-50"
                    disabled={issueQuantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={selectedProductionBatch.remaining}
                    value={issueQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setIssueQuantity(Math.min(Math.max(1, val), selectedProductionBatch.remaining || 1));
                    }}
                    className="w-20 text-center border rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => setIssueQuantity(Math.min(issueQuantity + 1, selectedProductionBatch.remaining || 1))}
                    className="p-1 border rounded hover:bg-gray-50"
                    disabled={issueQuantity >= (selectedProductionBatch.remaining || 0)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Find the kitchen item that matches
                    const matchedKitchenItem = items.find(item => 
                      item.name === showProductionPicker ||
                      item.name.toLowerCase().includes(showProductionPicker.toLowerCase()) ||
                      showProductionPicker.toLowerCase().includes(item.name.toLowerCase())
                    );
                    
                    if (matchedKitchenItem) {
                      // Check if adding this would exceed the production limit
                      const currentAdd = matchedKitchenItem.receivedFromStock || 0;
                      const totalAfterAdd = currentAdd + issueQuantity;
                      const productionAvailable = getTotalProductionAvailable(matchedKitchenItem.name);
                      
                      if (productionAvailable > 0 && totalAfterAdd > productionAvailable) {
                        alert(`Cannot add ${issueQuantity}. Only ${productionAvailable - currentAdd} more available from production.`);
                        return;
                      }
                      
                      handleIssueFromProduction(
                        matchedKitchenItem.id, 
                        selectedProductionBatch.id || 0, 
                        issueQuantity
                      );
                    } else {
                      alert(`No matching kitchen item found for ${showProductionPicker}`);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add to Kitchen
                </button>
                <button
                  onClick={() => {
                    setShowProductionPicker(null);
                    setSelectedProductionBatch(null);
                    setIssueQuantity(1);
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p>Variance = Closing Stock - Actual Closing Stock. Items with variance are highlighted.</p>
        <p>Sales = Opening + Received - Closing - Waste</p>
        <p className="text-amber-600">📦 Production available shown next to item names. Add field is limited to production available.</p>
        <p className="text-blue-600">✅ Green "Limit Reached" tag appears when you've used all production.</p>
        <p className="text-purple-600">📋 Click the batch(es) tag to see and select from multiple production batches.</p>
        <p className="text-purple-600">📌 Production items are mapped to kitchen items based on the production configuration.</p>
        {isToday && (
          <p className="text-blue-600 font-medium">
            Note: Today's closing stock will automatically become tomorrow's opening stock when you save.
          </p>
        )}
      </div>
    </div>
  );
}