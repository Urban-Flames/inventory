// src/app/production/mapping/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  loadProductionMappings, 
  createProductionMapping, 
  updateProductionMapping, 
  deleteProductionMapping,
  getMainStockItems
} from './actions';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  RefreshCw, 
  Search, 
  FileSpreadsheet,
  Package,
  Factory,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  chicken: '🐔 Chicken',
  meat: '🥩 Meat',
  bakery_dairy: '🍞 Bakery & Dairy',
  frozen_dry: '❄️ Frozen & Dry'
};

const CATEGORY_COLORS: Record<string, string> = {
  chicken: 'bg-blue-100 text-blue-800 border-blue-200',
  meat: 'bg-red-100 text-red-800 border-red-200',
  bakery_dairy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  frozen_dry: 'bg-purple-100 text-purple-800 border-purple-200'
};

const UNIT_OPTIONS = ['ctns', 'kg', 'blocks', 'bags', 'packs', 'pcs'];

// Define the Mapping interface to match the database schema
interface Mapping {
  id: number;
  main_stock_item_id: string;
  main_stock_item_name: string;
  output_product_key: string;
  output_product_name: string;
  unit: string;
  yield_per_unit: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProductionMappingPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<Mapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [mainStockItems, setMainStockItems] = useState<{ id: string; name: string }[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    mainStockItemId: '',
    mainStockItemName: '',
    outputProductKey: '',
    outputProductName: '',
    unit: '',
    yieldPerUnit: 0,
    category: ''
  });

  // Load data
  useEffect(() => {
    loadData();
    loadMainStockItems();
  }, []);

  // Filter mappings when search or category changes
  useEffect(() => {
    filterMappings();
  }, [mappings, searchTerm, selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await loadProductionMappings();
      if (result.success && result.data) {
        // Map the data to the Mapping interface
        const mappedData: Mapping[] = result.data.map((item: any) => ({
          id: item.id,
          main_stock_item_id: item.main_stock_item_id,
          main_stock_item_name: item.main_stock_item_name,
          output_product_key: item.output_product_key,
          output_product_name: item.output_product_name,
          unit: item.unit,
          yield_per_unit: Number(item.yield_per_unit),
          category: item.category,
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

  const loadMainStockItems = async () => {
    try {
      const result = await getMainStockItems();
      if (result.success && result.data) {
        setMainStockItems(result.data);
      }
    } catch (error) {
      console.error('Error loading main stock items:', error);
    }
  };

  const filterMappings = () => {
    let filtered = [...mappings];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.main_stock_item_name.toLowerCase().includes(search) ||
        m.output_product_name.toLowerCase().includes(search) ||
        m.output_product_key.toLowerCase().includes(search)
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    setFilteredMappings(filtered);
  };

  const resetForm = () => {
    setFormData({
      mainStockItemId: '',
      mainStockItemName: '',
      outputProductKey: '',
      outputProductName: '',
      unit: '',
      yieldPerUnit: 0,
      category: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEdit = (mapping: Mapping) => {
    setFormData({
      mainStockItemId: mapping.main_stock_item_id,
      mainStockItemName: mapping.main_stock_item_name,
      outputProductKey: mapping.output_product_key,
      outputProductName: mapping.output_product_name,
      unit: mapping.unit,
      yieldPerUnit: mapping.yield_per_unit,
      category: mapping.category
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
      const result = await deleteProductionMapping(id);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
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
    if (!formData.mainStockItemId || !formData.outputProductName || !formData.unit || formData.yieldPerUnit <= 0 || !formData.category) {
      setMessage({
        type: 'error',
        text: 'Please fill in all required fields and ensure yield per unit is greater than 0.'
      });
      setIsSaving(false);
      return;
    }

    // Generate output product key from name
    const outputKey = formData.outputProductName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    try {
      let result;
      if (editingId) {
        // Update existing mapping
        result = await updateProductionMapping(editingId, {
          mainStockItemId: formData.mainStockItemId,
          mainStockItemName: formData.mainStockItemName,
          outputProductKey: outputKey,
          outputProductName: formData.outputProductName,
          unit: formData.unit,
          yieldPerUnit: formData.yieldPerUnit,
          category: formData.category as any
        });
      } else {
        // Create new mapping
        result = await createProductionMapping({
          mainStockItemId: formData.mainStockItemId,
          mainStockItemName: formData.mainStockItemName,
          outputProductKey: outputKey,
          outputProductName: formData.outputProductName,
          unit: formData.unit,
          yieldPerUnit: formData.yieldPerUnit,
          category: formData.category as any
        });
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        resetForm();
        await loadData();
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

  const handleMainStockChange = (id: string) => {
    const selected = mainStockItems.find(item => item.id === id);
    setFormData({
      ...formData,
      mainStockItemId: id,
      mainStockItemName: selected?.name || ''
    });
  };

  const getCategoryCount = (category: string): number => {
    return mappings.filter(m => m.category === category).length;
  };

  // Get unique categories
  const categories = ['All', ...new Set(mappings.map(m => m.category))];

  // Calculate summary statistics
  const totalMappings = mappings.length;
  const activeMappings = mappings.filter(m => m.is_active !== false).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link 
            href="/production/daily"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Production
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-6 w-6 text-amber-600" />
            <span>Production Mappings</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-amber-600 text-white font-medium rounded-md hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Mapping</span>
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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
            {message.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            {message.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Mappings</p>
              <p className="text-xl sm:text-2xl font-bold">{totalMappings}</p>
            </div>
            <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Factory className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{activeMappings}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Categories</p>
              <p className="text-xl sm:text-2xl font-bold">{categories.length - 1}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Source Items</p>
              <p className="text-xl sm:text-2xl font-bold">
                {new Set(mappings.map(m => m.main_stock_item_id)).size}
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Package className="h-4 w-4 text-purple-600" />
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
            placeholder="Search by source or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category === 'All' ? 'All' : CATEGORY_LABELS[category] || category}
              {category !== 'All' && (
                <span className="ml-1 text-[10px] opacity-60">
                  ({getCategoryCount(category)})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 sm:p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Production Mapping' : 'Add New Production Mapping'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Item *
              </label>
              <select
                value={formData.mainStockItemId}
                onChange={(e) => handleMainStockChange(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Source Item</option>
                {mainStockItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Product Name *
              </label>
              <input
                type="text"
                value={formData.outputProductName}
                onChange={(e) => setFormData({ ...formData, outputProductName: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., Chicken Shawarma"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Key will be auto-generated: {formData.outputProductName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Unit</option>
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yield per Unit *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.yieldPerUnit || ''}
                onChange={(e) => setFormData({ ...formData, yieldPerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., 25"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Category</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
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
              <th className="p-2 sm:p-3">Source Item</th>
              <th className="p-2 sm:p-3">Output Product</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Unit</th>
              <th className="p-2 sm:p-3 text-center">Yield/Unit</th>
              <th className="p-2 sm:p-3 hidden sm:table-cell">Category</th>
              <th className="p-2 sm:p-3 text-center">Status</th>
              <th className="p-2 sm:p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMappings.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Factory className="h-8 w-8 text-gray-300" />
                    <p>No production mappings found</p>
                    <button
                      onClick={() => {
                        resetForm();
                        setShowAddForm(true);
                      }}
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
                    {mapping.main_stock_item_name}
                  </td>
                  <td className="p-2 sm:p-3">
                    <div>
                      <span className="font-medium">{mapping.output_product_name}</span>
                      <div className="text-[10px] text-gray-400 sm:hidden">
                        {mapping.unit} • {mapping.yield_per_unit} per unit
                      </div>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell text-gray-600">
                    {mapping.unit}
                  </td>
                  <td className="p-2 sm:p-3 text-center font-bold text-blue-600">
                    {mapping.yield_per_unit}
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${CATEGORY_COLORS[mapping.category] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                      {CATEGORY_LABELS[mapping.category] || mapping.category}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${mapping.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {mapping.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
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
                        onClick={() => handleDelete(mapping.id, mapping.output_product_name)}
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
        <p><strong>Production Mappings</strong> define how main stock items convert to production outputs.</p>
        <p>Yield per Unit determines how many portions/items are produced from one unit of source material.</p>
        <p className="text-amber-600">⚠️ Changes to mappings affect production calculations. Please verify yields are accurate.</p>
        <p className="text-blue-600">💡 Mappings are used in the Production Daily page to auto-calculate yields.</p>
      </div>
    </div>
  );
}