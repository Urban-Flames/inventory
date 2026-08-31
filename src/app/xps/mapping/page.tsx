// src/app/xps/mapping/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  getXPSMappings, 
  createXPSMapping, 
  updateXPSMapping, 
  deleteXPSMapping,
  getUnmappedXPSItems,
  getKitchenItems,
  getBarItems
} from './actions';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  RefreshCw, 
  Search, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Link2,
  Package,
  Utensils,
  GlassWater,
  ArrowRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface XPSMapping {
  id: number;
  xps_item_name: string;
  mapped_to: string | null;
  mapped_item_id: string | null;
  mapped_item_name: string | null;
  unit_conversion: number;
  is_combo: boolean;
  combo_items: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  category?: string;
}

export default function XPSMappingPage() {
  const [mappings, setMappings] = useState<XPSMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<XPSMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [unmappedItems, setUnmappedItems] = useState<string[]>([]);
  const [kitchenItems, setKitchenItems] = useState<InventoryItem[]>([]);
  const [barItems, setBarItems] = useState<InventoryItem[]>([]);
  const [selectedType, setSelectedType] = useState<'kitchen' | 'bar'>('kitchen');
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    xpsItemName: '',
    mappedTo: '',
    mappedItemId: '',
    mappedItemName: '',
    unitConversion: 1,
    isCombo: false,
    comboItems: ''
  });

  // Load data
  useEffect(() => {
    loadData();
    loadUnmappedItems();
    loadInventoryItems();
  }, []);

  // Filter mappings
  useEffect(() => {
    filterMappings();
  }, [mappings, searchTerm, selectedFilter]);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await getXPSMappings();
      if (result.success && result.data) {
        const mappedData: XPSMapping[] = result.data.map((item: any) => ({
          id: item.id,
          xps_item_name: item.xps_item_name,
          mapped_to: item.mapped_to,
          mapped_item_id: item.mapped_item_id,
          mapped_item_name: item.mapped_item_name,
          unit_conversion: Number(item.unit_conversion) || 1,
          is_combo: item.is_combo || false,
          combo_items: item.combo_items,
          is_active: item.is_active !== undefined ? item.is_active : true,
          created_at: item.created_at || '',
          updated_at: item.updated_at || ''
        }));
        setMappings(mappedData);
        setFilteredMappings(mappedData);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to load mappings.'
        });
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load mappings.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnmappedItems = async () => {
    try {
      const result = await getUnmappedXPSItems();
      if (result.success && result.data) {
        setUnmappedItems(result.data.map((item: any) => item.item_name));
      }
    } catch (error) {
      console.error('Error loading unmapped items:', error);
    }
  };

  const loadInventoryItems = async () => {
    setIsLoadingItems(true);
    try {
      const [kitchenResult, barResult] = await Promise.all([
        getKitchenItems(),
        getBarItems()
      ]);
      
      console.log('Kitchen items result:', kitchenResult);
      console.log('Bar items result:', barResult);
      
      if (kitchenResult.success && kitchenResult.data) {
        const items: InventoryItem[] = kitchenResult.data.map((item: any, index: number) => ({
          id: item.id || `kitchen-${index}`,
          name: item.name || 'Unknown',
          unit: item.unit || 'pcs',
          category: item.category || 'kitchen'
        }));
        setKitchenItems(items);
        console.log('Kitchen items set:', items.length);
      } else {
        console.log('Kitchen items error:', kitchenResult.message);
      }
      
      if (barResult.success && barResult.data) {
        const items: InventoryItem[] = barResult.data.map((item: any, index: number) => ({
          id: item.id || `bar-${index}`,
          name: item.name || 'Unknown',
          unit: item.unit || 'pcs',
          category: item.category || 'bar'
        }));
        setBarItems(items);
        console.log('Bar items set:', items.length);
      } else {
        console.log('Bar items error:', barResult.message);
      }
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const filterMappings = () => {
    let filtered = [...mappings];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.xps_item_name.toLowerCase().includes(search) ||
        (m.mapped_item_name && m.mapped_item_name.toLowerCase().includes(search))
      );
    }

    if (selectedFilter === 'mapped') {
      filtered = filtered.filter(m => m.mapped_to !== null);
    } else if (selectedFilter === 'unmapped') {
      filtered = filtered.filter(m => m.mapped_to === null);
    } else if (selectedFilter === 'kitchen') {
      filtered = filtered.filter(m => m.mapped_to === 'kitchen');
    } else if (selectedFilter === 'bar') {
      filtered = filtered.filter(m => m.mapped_to === 'bar');
    }

    setFilteredMappings(filtered);
  };

  const resetForm = () => {
    setFormData({
      xpsItemName: '',
      mappedTo: '',
      mappedItemId: '',
      mappedItemName: '',
      unitConversion: 1,
      isCombo: false,
      comboItems: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEdit = (mapping: XPSMapping) => {
    setFormData({
      xpsItemName: mapping.xps_item_name,
      mappedTo: mapping.mapped_to || '',
      mappedItemId: mapping.mapped_item_id || '',
      mappedItemName: mapping.mapped_item_name || '',
      unitConversion: mapping.unit_conversion || 1,
      isCombo: mapping.is_combo || false,
      comboItems: mapping.combo_items ? JSON.stringify(mapping.combo_items) : ''
    });
    setEditingId(mapping.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the mapping for "${name}"?`)) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const result = await deleteXPSMapping(id);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
        await loadUnmappedItems();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      setMessage({
        type: 'error',
        text: 'Failed to delete mapping.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // Validate form
    if (!formData.xpsItemName || !formData.mappedTo || !formData.mappedItemId) {
      setMessage({
        type: 'error',
        text: 'Please fill in all required fields (XPS Item, Map To, and Inventory Item).'
      });
      setIsSaving(false);
      return;
    }

    if (formData.unitConversion <= 0) {
      setMessage({
        type: 'error',
        text: 'Unit conversion must be greater than 0.'
      });
      setIsSaving(false);
      return;
    }

    try {
      let result;
      if (editingId) {
        result = await updateXPSMapping(editingId, {
          xpsItemName: formData.xpsItemName,
          mappedTo: formData.mappedTo,
          mappedItemId: formData.mappedItemId,
          mappedItemName: formData.mappedItemName,
          unitConversion: formData.unitConversion,
          isCombo: formData.isCombo,
          comboItems: formData.isCombo ? JSON.parse(formData.comboItems || '{}') : null
        });
      } else {
        result = await createXPSMapping({
          xpsItemName: formData.xpsItemName,
          mappedTo: formData.mappedTo,
          mappedItemId: formData.mappedItemId,
          mappedItemName: formData.mappedItemName,
          unitConversion: formData.unitConversion,
          isCombo: formData.isCombo,
          comboItems: formData.isCombo ? JSON.parse(formData.comboItems || '{}') : null
        });
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        resetForm();
        await loadData();
        await loadUnmappedItems();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save mapping.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleXpsItemSelect = (itemName: string) => {
    const existing = mappings.find(m => m.xps_item_name === itemName);
    if (existing && existing.mapped_to) {
      setMessage({
        type: 'error',
        text: `"${itemName}" is already mapped to ${existing.mapped_item_name}.`
      });
      return;
    }
    setFormData({ ...formData, xpsItemName: itemName });
  };

  const handleMappedToChange = (value: string) => {
    setSelectedType(value as 'kitchen' | 'bar');
    setFormData({ ...formData, mappedTo: value, mappedItemId: '', mappedItemName: '' });
  };

  const getInventoryItems = () => {
    if (formData.mappedTo === 'kitchen') return kitchenItems;
    if (formData.mappedTo === 'bar') return barItems;
    return [];
  };

  const getStatusBadge = (mapping: XPSMapping) => {
    if (!mapping.mapped_to) {
      return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unmapped</span>;
    }
    if (mapping.is_active) {
      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>;
    }
    return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>;
  };

  const getLocationBadge = (mapping: XPSMapping) => {
    if (!mapping.mapped_to) return null;
    if (mapping.mapped_to === 'kitchen') {
      return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Utensils className="h-3 w-3" /> Kitchen</span>;
    }
    return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><GlassWater className="h-3 w-3" /> Bar</span>;
  };

  // Statistics
  const totalMappings = mappings.length;
  const mappedCount = mappings.filter(m => m.mapped_to !== null).length;
  const unmappedCount = mappings.filter(m => m.mapped_to === null).length;
  const kitchenMapped = mappings.filter(m => m.mapped_to === 'kitchen').length;
  const barMapped = mappings.filter(m => m.mapped_to === 'bar').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="h-6 w-6 text-amber-600" />
            XPS Item Mapping
          </h1>
          <p className="text-sm text-gray-500">
            Map XPS sales items to Kitchen and Bar inventory items for reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/xps/daily">
            <button className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
              ← Back to Reconciliation
            </button>
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 sm:p-4 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {message.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            {message.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Unmapped Items Warning */}
      {unmappedItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Unmapped Items Detected</p>
              <p className="text-sm text-amber-700">
                {unmappedItems.length} XPS items have no mapping to inventory.
                {unmappedItems.length > 0 && (
                  <span className="block mt-1 text-xs text-amber-600">
                    Items: {unmappedItems.slice(0, 10).join(', ')}
                    {unmappedItems.length > 10 && ` and ${unmappedItems.length - 10} more...`}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Items</p>
              <p className="text-xl sm:text-2xl font-bold">{totalMappings}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Mapped</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{mappedCount}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Unmapped</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{unmappedCount}</p>
            </div>
            <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Kitchen</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{kitchenMapped}</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Utensils className="h-4 w-4 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Bar</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{barMapped}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <GlassWater className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search XPS items or mapped items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedFilter === 'all'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All ({totalMappings})
          </button>
          <button
            onClick={() => setSelectedFilter('mapped')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedFilter === 'mapped'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Mapped ({mappedCount})
          </button>
          <button
            onClick={() => setSelectedFilter('unmapped')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedFilter === 'unmapped'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Unmapped ({unmappedCount})
          </button>
          <button
            onClick={() => setSelectedFilter('kitchen')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedFilter === 'kitchen'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Kitchen ({kitchenMapped})
          </button>
          <button
            onClick={() => setSelectedFilter('bar')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedFilter === 'bar'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Bar ({barMapped})
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Add Mapping Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add New Mapping
      </button>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 sm:p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit XPS Mapping' : 'Add New XPS Mapping'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* XPS Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                XPS Item Name *
              </label>
              {editingId ? (
                <input
                  type="text"
                  value={formData.xpsItemName}
                  onChange={(e) => setFormData({ ...formData, xpsItemName: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
                  disabled
                />
              ) : (
                <select
                  value={formData.xpsItemName}
                  onChange={(e) => handleXpsItemSelect(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select XPS Item</option>
                  {unmappedItems.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              )}
              {!editingId && unmappedItems.length === 0 && (
                <p className="text-xs text-green-600 mt-1">All XPS items are already mapped!</p>
              )}
            </div>

            {/* Map To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Map To *
              </label>
              <select
                value={formData.mappedTo}
                onChange={(e) => handleMappedToChange(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Location</option>
                <option value="kitchen">Kitchen</option>
                <option value="bar">Bar</option>
              </select>
            </div>

            {/* Inventory Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventory Item *
              </label>
              {isLoadingItems ? (
                <div className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-gray-400">Loading items...</span>
                </div>
              ) : (
                <select
                  value={formData.mappedItemId}
                  onChange={(e) => {
                    const item = getInventoryItems().find(i => i.id === e.target.value);
                    setFormData({
                      ...formData,
                      mappedItemId: e.target.value,
                      mappedItemName: item?.name || ''
                    });
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                  disabled={!formData.mappedTo}
                >
                  <option value="">Select Inventory Item</option>
                  {getInventoryItems().map((item) => (
                    <option key={item.id || `item-${Math.random()}`} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              )}
              {!formData.mappedTo && (
                <p className="text-xs text-amber-600 mt-1">Please select a location first</p>
              )}
              {formData.mappedTo && getInventoryItems().length === 0 && !isLoadingItems && (
                <p className="text-xs text-amber-600 mt-1">No items found for this location</p>
              )}
            </div>

            {/* Unit Conversion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Conversion
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.unitConversion}
                onChange={(e) => setFormData({ ...formData, unitConversion: parseFloat(e.target.value) || 1 })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">e.g., 6 for wings (6 wings = 1 portion)</p>
            </div>

            {/* Is Combo */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <input
                  type="checkbox"
                  checked={formData.isCombo}
                  onChange={(e) => setFormData({ ...formData, isCombo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Is Combo Item
              </label>
              {formData.isCombo && (
                <input
                  type="text"
                  value={formData.comboItems}
                  onChange={(e) => setFormData({ ...formData, comboItems: e.target.value })}
                  placeholder='{"fries": "Potato Chips", "drink": "Coca Cola"}'
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none mt-1"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">JSON format for combo items</p>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : editingId ? 'Update Mapping' : 'Save Mapping'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mappings Table */}
      <div className="border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 sm:p-3">XPS Item Name</th>
              <th className="p-2 sm:p-3">Mapped To</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Inventory Item</th>
              <th className="p-2 sm:p-3 text-center hidden sm:table-cell">Conversion</th>
              <th className="p-2 sm:p-3 text-center">Status</th>
              <th className="p-2 sm:p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMappings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Link2 className="h-8 w-8 text-gray-300" />
                    <p>No mappings found</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-sm text-amber-600 hover:text-amber-800 font-medium"
                    >
                      + Add your first mapping
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-2 sm:p-3 font-medium">
                    {mapping.xps_item_name}
                  </td>
                  <td className="p-2 sm:p-3">
                    {getLocationBadge(mapping)}
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell">
                    {mapping.mapped_item_name ? (
                      <span className="text-green-600">{mapping.mapped_item_name}</span>
                    ) : (
                      <span className="text-amber-600">Not mapped</span>
                    )}
                  </td>
                  <td className="p-2 sm:p-3 text-center hidden sm:table-cell">
                    {mapping.unit_conversion !== 1 ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {mapping.unit_conversion}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">1:1</span>
                    )}
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    {getStatusBadge(mapping)}
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(mapping)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Edit mapping"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(mapping.id, mapping.xps_item_name)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p><strong>XPS Item Mapping</strong> connects XPS sales items to kitchen and bar inventory items.</p>
        <p><strong>Unit Conversion</strong> - e.g., 6 wings = 1 portion. Set to 6 for wings items.</p>
        <p><strong>Combo Items</strong> - JSON format for items that include multiple products.</p>
        <p className="text-amber-600">⚠️ Unmapped items will appear as red flags in reconciliation.</p>
      </div>
    </div>
  );
}