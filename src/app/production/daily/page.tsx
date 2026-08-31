// src/app/production/daily/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { productionMappingData } from '@/data/productionMapping';
import { ProductionBatch } from '@/types/production';
import { 
  Save, RefreshCw, Calendar, FileSpreadsheet, 
  ArrowRight, Search, Plus, Trash2, AlertCircle,
  Package, Factory, CookingPot, TrendingUp, 
  UtensilsCrossed, Building2, History
} from 'lucide-react';
import { 
  saveProductionDaily, 
  loadProductionDaily, 
  getAvailableProduction, 
  issueToKitchen, 
  logWaste,
  carryOverProductionToNextDay,
  getProductionIssuanceHistory
} from './actions';
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

// Generate batch number
const generateBatchNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `PROD-${year}${month}${day}-${random}`;
};

export default function DailyProductionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<{ batchId: number; productName: string; remaining: number } | null>(null);
  const [showWasteModal, setShowWasteModal] = useState<{ batchId: number; productName: string; remaining: number } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<{ batchId: number; productName: string } | null>(null);
  const [issuanceHistory, setIssuanceHistory] = useState<any[]>([]);

  // Load data when date changes
  useEffect(() => {
    loadDataForDate(selectedDate);
  }, [selectedDate]);

  const loadDataForDate = async (date: string) => {
    setIsLoading(true);
    setSaveMessage(null);

    try {
      const result = await loadProductionDaily(date);

      if (result.success && result.data) {
        setBatches(result.data);
        setHasLoadedData(true);
        setSaveMessage({ 
          type: 'success', 
          text: `Loaded ${result.data.length} production batches for ${formatDisplayDate(date)}` 
        });
      } else if (result.success && !result.data) {
        setBatches([]);
        setHasLoadedData(false);
        setSaveMessage({ 
          type: 'info', 
          text: `No production records found for ${formatDisplayDate(date)}. Create a new batch below.` 
        });
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

  const handleAddBatch = () => {
    const newBatch: ProductionBatch = {
      batchNumber: generateBatchNumber(),
      mainStockItemId: '',
      mainStockItemName: '',
      outputProductKey: '',
      outputProductName: '',
      quantityProcessed: 0,
      unit: '',
      expectedYield: 0,
      actualYield: 0,
      kitchenIssued: 0,
      remaining: 0,
      status: 'active',
      notes: '',
      processedBy: '',
      logDate: selectedDate,
    };
    setBatches([newBatch, ...batches]);
  };

  const handleRemoveBatch = (index: number) => {
    if (confirm('Are you sure you want to remove this production batch?')) {
      const newBatches = [...batches];
      newBatches.splice(index, 1);
      setBatches(newBatches);
    }
  };

  const handleBatchChange = (index: number, field: keyof ProductionBatch, value: any) => {
    const newBatches = [...batches];
    const batch = { ...newBatches[index] };

    if (field === 'mainStockItemId') {
      const mapping = productionMappingData.find(m => m.mainStockItemId === value);
      if (mapping) {
        batch.mainStockItemName = mapping.mainStockItemName;
        batch.outputProductKey = mapping.outputProductKey;
        batch.outputProductName = mapping.outputProductName;
        batch.unit = mapping.unit;
        batch.expectedYield = mapping.yieldPerUnit;
        if (batch.quantityProcessed > 0) {
          batch.actualYield = batch.quantityProcessed * mapping.yieldPerUnit;
          batch.remaining = batch.actualYield - batch.kitchenIssued;
        }
      }
    }

    if (field === 'quantityProcessed') {
      const qty = Number(value) || 0;
      batch.quantityProcessed = qty;
      const mapping = productionMappingData.find(m => m.mainStockItemId === batch.mainStockItemId);
      if (mapping) {
        batch.actualYield = qty * mapping.yieldPerUnit;
        batch.remaining = batch.actualYield - batch.kitchenIssued;
      }
    }

    if (field === 'kitchenIssued') {
      const issued = Number(value) || 0;
      batch.kitchenIssued = issued;
      batch.remaining = batch.actualYield - issued;
    }

    if (field !== 'status' && batch.actualYield > 0) {
      if (batch.remaining === 0) {
        batch.status = 'completed';
      } else if (batch.remaining > 0) {
        batch.status = 'active';
      }
    }

    newBatches[index] = batch;
    setBatches(newBatches);
  };

  const handleIssueToKitchen = async (batchId: number, quantity: number, kitchenItemId: string) => {
    setSaveMessage(null);
    
    try {
      const result = await issueToKitchen(batchId, quantity, kitchenItemId);
      
      if (result.success) {
        setSaveMessage({ type: 'success', text: result.message });
        // Force reload the data to show updated remaining
        await loadDataForDate(selectedDate);
        setShowIssueModal(null);
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

  const handleLogWaste = async (batchId: number, quantity: number, wasteReason?: string) => {
    setSaveMessage(null);
    
    try {
      const result = await logWaste(batchId, quantity, wasteReason);
      
      if (result.success) {
        setSaveMessage({ type: 'success', text: result.message });
        // Force reload the data to show updated remaining
        await loadDataForDate(selectedDate);
        setShowWasteModal(null);
      } else {
        setSaveMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Error logging waste:', err);
      setSaveMessage({ 
        type: 'error', 
        text: 'Failed to log waste.' 
      });
    }
  };

  const handleViewHistory = async (batchId: number) => {
    try {
      const result = await getProductionIssuanceHistory(batchId);
      if (result.success && result.data) {
        setIssuanceHistory(result.data);
        setShowHistoryModal({ batchId, productName: '' });
      } else {
        setIssuanceHistory([]);
        setShowHistoryModal({ batchId, productName: '' });
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setIssuanceHistory([]);
    }
  };

  const handleCarryOver = async () => {
    if (confirm('This will carry over remaining production to tomorrow. Continue?')) {
      setSaveMessage(null);
      try {
        const result = await carryOverProductionToNextDay(selectedDate);
        setSaveMessage({ 
          type: result.success ? 'success' : 'error', 
          text: result.message 
        });
        await loadDataForDate(selectedDate);
      } catch (err) {
        console.error('Error carrying over:', err);
        setSaveMessage({ 
          type: 'error', 
          text: 'Failed to carry over production.' 
        });
      }
    }
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const invalidBatches = batches.filter(b => !b.mainStockItemId || b.quantityProcessed <= 0);
    if (invalidBatches.length > 0) {
      setSaveMessage({
        type: 'error',
        text: 'Please fill in all required fields (Main Stock Item and Quantity Processed) for all batches.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveProductionDaily({ 
        batches: batches.map(b => ({
          ...b,
          quantityProcessed: Number(b.quantityProcessed),
          expectedYield: Number(b.expectedYield),
          actualYield: Number(b.actualYield),
          kitchenIssued: Number(b.kitchenIssued) || 0,
          remaining: Number(b.remaining) || 0,
        })),
        logDate: selectedDate
      });

      if (result.success) {
        setSaveMessage({ type: 'success', text: `${result.message} for ${formatDisplayDate(selectedDate)}` });
        setHasLoadedData(true);
        await loadDataForDate(selectedDate);
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
    if (confirm('Are you sure you want to clear all production batches?')) {
      setBatches([]);
      setHasLoadedData(false);
      setSaveMessage({ 
        type: 'success', 
        text: 'Batches cleared. You can start fresh.' 
      });
    }
  };

  const filteredBatches = batches.filter((batch) => {
    const search = searchTerm.toLowerCase();
    return (
      batch.mainStockItemName?.toLowerCase().includes(search) ||
      batch.outputProductName?.toLowerCase().includes(search) ||
      batch.batchNumber?.toLowerCase().includes(search)
    );
  });

  const isToday = selectedDate === getTodayDate();

  const totalBatches = batches.length;
  const totalProcessed = batches.reduce((sum, b) => sum + (b.quantityProcessed || 0), 0);
  const totalYield = batches.reduce((sum, b) => sum + (b.actualYield || 0), 0);
  const totalIssued = batches.reduce((sum, b) => sum + (b.kitchenIssued || 0), 0);
  const totalRemaining = batches.reduce((sum, b) => sum + (b.remaining || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Daily</h1>

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
            {hasLoadedData ? `${totalBatches} batches` : 'No batches'}
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none w-32 sm:w-48"
            />
          </div>

          <button
            onClick={handleAddBatch}
            disabled={isSaving || isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-amber-600 text-white font-medium rounded-md hover:bg-amber-700 disabled:opacity-50"
            title="Add new production batch"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Batch</span>
          </button>

          {/* Carry Over Button */}
          {isToday && totalRemaining > 0 && (
            <button
              onClick={handleCarryOver}
              disabled={isSaving || isLoading}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 disabled:opacity-50"
              title="Carry over remaining to tomorrow"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Carry Over</span>
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50"
            title="Clear all batches"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
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

      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border">
        <span className="font-semibold">Production Date:</span> {formatDisplayDate(selectedDate)}
        {!isToday && (
          <span className="ml-2 text-amber-600 text-xs">
            Editing historical data
          </span>
        )}
        {isToday && (
          <span className="ml-2 text-blue-600 text-xs flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Today's production
          </span>
        )}
        {totalRemaining > 0 && (
          <span className="ml-4 text-amber-600 text-xs font-medium">
            📦 {totalRemaining} total remaining
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Batches</p>
              <p className="text-xl sm:text-2xl font-bold">{totalBatches}</p>
            </div>
            <CookingPot className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Processed</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalProcessed}</p>
            </div>
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Yield</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{totalYield}</p>
            </div>
            <Factory className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Remaining</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{totalRemaining}</p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
          </div>
        </div>
      </div>

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

      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 sm:p-3">Batch #</th>
              <th className="p-2 sm:p-3">Source</th>
              <th className="p-2 sm:p-3">Main Stock Item</th>
              <th className="p-2 sm:p-3">Output Product</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 text-center">Qty</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 text-center">Unit</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 text-center">Expected</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 text-center">Actual</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 text-center">Issued</th>
              <th className="p-2 sm:p-3 w-20 sm:w-24 text-center">Remaining</th>
              <th className="p-2 sm:p-3 w-24 text-center">Status</th>
              <th className="p-2 sm:p-3 w-28 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-gray-300" />
                    <p>No production batches found</p>
                    <button
                      onClick={handleAddBatch}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add your first batch
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBatches.map((batch, index) => {
                const isComplete = batch.status === 'completed';
                const isWasted = batch.status === 'wasted';
                const hasError = batch.actualYield < batch.kitchenIssued;
                const isFromMainStock = !!batch.mainStockItemId;

                return (
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${hasError ? 'bg-red-50' : isComplete ? 'bg-green-50' : ''}`}>
                    <td className="p-2 sm:p-3 font-mono text-xs">
                      {batch.batchNumber}
                    </td>
                    <td className="p-2 sm:p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                        isFromMainStock 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isFromMainStock ? (
                          <>
                            <Building2 className="h-3 w-3" />
                            Main Stock
                          </>
                        ) : (
                          <>
                            <UtensilsCrossed className="h-3 w-3" />
                            Manual
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3">
                      <select
                        value={batch.mainStockItemId}
                        onChange={(e) => handleBatchChange(index, 'mainStockItemId', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Item</option>
                        {productionMappingData
                          .filter((m, i, arr) => arr.findIndex(t => t.mainStockItemId === m.mainStockItemId) === i)
                          .map((m) => (
                            <option key={m.mainStockItemId} value={m.mainStockItemId}>
                              {m.mainStockItemName} ({m.unit})
                            </option>
                          ))
                        }
                      </select>
                    </td>
                    <td className="p-2 sm:p-3">
                      <select
                        value={batch.outputProductKey}
                        onChange={(e) => {
                          const mapping = productionMappingData.find(m => m.outputProductKey === e.target.value);
                          if (mapping) {
                            handleBatchChange(index, 'outputProductKey', e.target.value);
                            handleBatchChange(index, 'outputProductName', mapping.outputProductName);
                          }
                        }}
                        className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Product</option>
                        {productionMappingData
                          .filter(m => m.mainStockItemId === batch.mainStockItemId || !batch.mainStockItemId)
                          .map((m) => (
                            <option key={m.outputProductKey} value={m.outputProductKey}>
                              {m.outputProductName}
                            </option>
                          ))
                        }
                      </select>
                    </td>
                    <td className="p-1 sm:p-2 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={batch.quantityProcessed || ''}
                        onChange={(e) => handleBatchChange(index, 'quantityProcessed', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 sm:p-3 text-center text-gray-500 text-xs">
                      {batch.unit}
                    </td>
                    <td className="p-2 sm:p-3 text-center font-semibold text-blue-600 text-xs">
                      {batch.expectedYield}
                    </td>
                    <td className="p-2 sm:p-3 text-center font-bold text-green-600 text-xs">
                      {batch.actualYield}
                    </td>
                    <td className="p-1 sm:p-2 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={batch.kitchenIssued || ''}
                        onChange={(e) => handleBatchChange(index, 'kitchenIssued', parseFloat(e.target.value) || 0)}
                        className={`w-full border rounded px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 outline-none ${hasError ? 'border-red-500 bg-red-100' : ''}`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 sm:p-3 text-center font-bold text-amber-600 text-xs">
                      {batch.remaining}
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        isWasted ? 'bg-red-100 text-red-700' :
                        isComplete ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {batch.status || 'active'}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {batch.remaining > 0 && batch.status !== 'wasted' && isToday && batch.id && (
                          <button
                            onClick={() => {
                              const batchId = batch.id ?? 0;
                              setShowIssueModal({
                                batchId: batchId,
                                productName: batch.outputProductName,
                                remaining: batch.remaining
                              });
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Issue to Kitchen"
                          >
                            <UtensilsCrossed className="h-4 w-4" />
                          </button>
                        )}
                        {batch.remaining > 0 && batch.status !== 'wasted' && isToday && batch.id && (
                          <button
                            onClick={() => {
                              const batchId = batch.id ?? 0;
                              setShowWasteModal({
                                batchId: batchId,
                                productName: batch.outputProductName,
                                remaining: batch.remaining
                              });
                            }}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Log Waste"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {batch.id && (
                          <button
                            onClick={() => {
                              const batchId = batch.id ?? 0;
                              handleViewHistory(batchId);
                            }}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        )}
                        {!batch.id && (
                          <button
                            onClick={() => handleRemoveBatch(index)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove batch"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Issue to Kitchen Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Issue to Kitchen</h3>
            <p className="text-sm text-gray-600 mb-2">
              Product: <span className="font-medium">{showIssueModal.productName}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Available: <span className="font-medium text-amber-600">{showIssueModal.remaining}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                id="issueQuantity"
                defaultValue={1}
                min={1}
                max={showIssueModal.remaining}
                className="flex-1 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Quantity"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('issueQuantity') as HTMLInputElement;
                  const qty = parseFloat(input.value);
                  if (qty > 0 && qty <= showIssueModal.remaining) {
                    const batchId = showIssueModal.batchId ?? 0;
                    const kitchenItemId = showIssueModal.productName.toLowerCase().replace(/\s/g, '_');
                    handleIssueToKitchen(batchId, qty, kitchenItemId);
                  } else {
                    alert(`Please enter a quantity between 1 and ${showIssueModal.remaining}`);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Issue
              </button>
              <button
                onClick={() => setShowIssueModal(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Log Waste</h3>
            <p className="text-sm text-gray-600 mb-2">
              Product: <span className="font-medium">{showWasteModal.productName}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Available: <span className="font-medium text-amber-600">{showWasteModal.remaining}</span>
            </p>
            <div className="space-y-3">
              <input
                type="number"
                id="wasteQuantity"
                defaultValue={1}
                min={1}
                max={showWasteModal.remaining}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Quantity to waste"
              />
              <input
                type="text"
                id="wasteReason"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Reason (optional)"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const input = document.getElementById('wasteQuantity') as HTMLInputElement;
                    const reasonInput = document.getElementById('wasteReason') as HTMLInputElement;
                    const qty = parseFloat(input.value);
                    if (qty > 0 && qty <= showWasteModal.remaining) {
                      const batchId = showWasteModal.batchId ?? 0;
                      handleLogWaste(batchId, qty, reasonInput.value || undefined);
                    } else {
                      alert(`Please enter a quantity between 1 and ${showWasteModal.remaining}`);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Log Waste
                </button>
                <button
                  onClick={() => setShowWasteModal(null)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Issuance History</h3>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            {issuanceHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No issuance history found.</p>
            ) : (
              <div className="space-y-2">
                {issuanceHistory.map((item: any) => (
                  <div key={item.id} className="border rounded-md p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Quantity: {item.quantity_issued}</span>
                      <span className="text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    {item.issued_by && (
                      <p className="text-xs text-gray-500">Issued by: {item.issued_by}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p><strong>Production Formula:</strong> Actual Yield = Quantity Processed × Yield per Unit</p>
        <p><strong>Remaining =</strong> Actual Yield - Kitchen Issued - Waste</p>
        <p className="text-amber-600">⚠️ Kitchen Issued cannot exceed Actual Yield</p>
        <p className="text-blue-600">📦 Batches from Main Stock are auto-created when you save main stock with production details.</p>
        <p className="text-purple-600">🔄 Use "Carry Over" button to move remaining production to the next day.</p>
        {isToday && (
          <p className="text-blue-600 font-medium">
            Note: Today's production will be available for kitchen issuance.
          </p>
        )}
      </div>
    </div>
  );
}