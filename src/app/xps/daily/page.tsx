// src/app/xps/daily/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  uploadXPSFile, 
  processXPSData,
  getXPSReconciliation,
  getUnmappedXPSItems
} from './actions';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Download,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  File,
  X,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface ReconciliationData {
  total_items: number;
  matched_items: number;
  red_flags: number;
  red_flag_details?: Array<{
    item_name: string;
    xps_quantity: number;
    inventory_quantity: number;
    variance: number;
    location: string;
    reason: string;
  }>;
  processed_items?: Array<{
    item_name: string;
    xps_quantity: number;
    parsed_quantity: number;
    inventory_quantity: number;
    mapped_item_name: string;
    location: string;
    has_red_flag: boolean;
    variance: number;
    reason: string;
  }>;
}

interface UploadResult {
  items: Array<{
    item_name: string;
    quantity: number;
    mapped_item_name: string | null;
    mapped_to: string | null;
  }>;
  count: number;
  file_name: string;
  file_type: string;
  date: string;
}

export default function XPSDailyPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showRedFlags, setShowRedFlags] = useState<boolean>(false);
  const [unmappedItems, setUnmappedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load reconciliation data when date changes
  useEffect(() => {
    if (selectedDate) {
      loadReconciliation(selectedDate);
      loadUnmappedItems();
    }
  }, [selectedDate]);

  const loadReconciliation = async (date: string) => {
    setIsLoading(true);
    try {
      const result = await getXPSReconciliation(date);
      if (result.success && result.data) {
        // Safely access the data
        const data = result.data as any;
        setReconciliationResult({
          total_items: data.report?.total_items || 0,
          matched_items: data.report?.matched_items || 0,
          red_flags: data.report?.red_flags || 0,
          red_flag_details: data.red_flags || [],
          processed_items: data.report?.report_data || []
        });
      } else {
        setReconciliationResult(null);
      }
    } catch (error) {
      console.error('Error loading reconciliation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnmappedItems = async () => {
    try {
      const result = await getUnmappedXPSItems();
      if (result.success && result.data) {
        setUnmappedItems(result.data);
      }
    } catch (error) {
      console.error('Error loading unmapped items:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select an XPS file first.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('date', selectedDate);

      const result = await uploadXPSFile(formData);
      
      if (result.success) {
        setUploadResult(result.data as UploadResult);
        setMessage({ 
          type: 'success', 
          text: `✅ Successfully extracted ${(result.data as any)?.items?.length || 0} items from ${selectedFile.name}` 
        });
        // Auto-process after upload
        await handleProcess();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to upload file.' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Error uploading file.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedDate) {
      setMessage({ type: 'error', text: 'Please select a date.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await processXPSData(selectedDate);
      
      if (result.success) {
        const data = result.data as ReconciliationData;
        setReconciliationResult(data);
        await loadReconciliation(selectedDate);
        setMessage({ 
          type: 'success', 
          text: `✅ Reconciliation complete! ${data?.red_flags || 0} red flags found.` 
        });
        if (data?.red_flags && data.red_flags > 0) {
          setShowRedFlags(true);
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to process data.' });
      }
    } catch (error) {
      console.error('Process error:', error);
      setMessage({ type: 'error', text: 'Error processing data.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (ext === 'csv') return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (ext === 'txt') return <File className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const downloadReport = () => {
    if (!reconciliationResult || !reconciliationResult.processed_items) return;
    
    // Create CSV report
    const headers = ['Item Name', 'XPS Quantity', 'Inventory Quantity', 'Variance', 'Location', 'Status'];
    const rows = reconciliationResult.processed_items.map((item) => [
      item.item_name,
      item.xps_quantity,
      item.inventory_quantity,
      item.variance || 0,
      item.location,
      item.has_red_flag ? '🔴 Red Flag' : '✅ Matched'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `XPS_Reconciliation_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            XPS Daily Reconciliation
          </h1>
          <p className="text-sm text-gray-500">
            Upload XPS sales file (PDF, CSV, or TXT) to reconcile with kitchen and bar inventory.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/xps/mapping">
            <button className="text-sm text-amber-600 hover:text-amber-800 px-3 py-1.5 border border-amber-200 rounded-md hover:bg-amber-50 transition-colors">
              ⚙️ Manage Mappings
            </button>
          </Link>
          <Link href="/xps/weekly">
            <button className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
              Weekly View →
            </button>
          </Link>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload XPS File
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {getDayName(selectedDate)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Format
                </label>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">PDF</span>
                  <span className="px-2 py-1 bg-green-50 text-green-600 rounded border border-green-200">CSV</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">TXT</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                XPS File
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                selectedFile ? 'border-blue-500 bg-blue-50/30' : 'border-gray-300 hover:border-blue-500'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                  id="xps-file-input"
                />
                <label htmlFor="xps-file-input" className="cursor-pointer block">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Unknown type'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="p-1 hover:bg-gray-200 rounded-full"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to select XPS file</p>
                      <p className="text-xs text-gray-400">Supports PDF, CSV, and TXT formats</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload & Reconcile
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Reconciliation Summary</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 text-gray-300 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading...</p>
            </div>
          ) : reconciliationResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Total Items</p>
                  <p className="text-2xl font-bold">{reconciliationResult.total_items || 0}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Matched</p>
                  <p className="text-2xl font-bold text-green-600">{reconciliationResult.matched_items || 0}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg text-center ${(reconciliationResult.red_flags || 0) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-xs text-gray-500">Red Flags</p>
                  <p className={`text-2xl font-bold ${(reconciliationResult.red_flags || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {reconciliationResult.red_flags || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-bold">{selectedDate}</p>
                </div>
              </div>

              {(reconciliationResult.red_flags || 0) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">{reconciliationResult.red_flags} red flags detected!</span>
                  </div>
                  <button
                    onClick={() => setShowRedFlags(!showRedFlags)}
                    className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                  >
                    {showRedFlags ? 'Hide details' : 'View details'}
                  </button>
                </div>
              )}

              {reconciliationResult.red_flags === 0 && reconciliationResult.total_items > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">All items reconciled successfully!</span>
                  </div>
                </div>
              )}

              {reconciliationResult.total_items > 0 && (
                <button
                  onClick={downloadReport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Report (CSV)
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p>No reconciliation data yet.</p>
              <p className="text-sm">Upload an XPS file to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {message.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Unmapped Items Warning */}
      {unmappedItems && unmappedItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Unmapped Items Detected</p>
              <p className="text-sm text-amber-700">
                {unmappedItems.length} items from XPS have no mapping to inventory.
              </p>
              <Link href="/xps/mapping">
                <button className="mt-2 text-sm text-amber-800 hover:text-amber-900 underline font-medium">
                  Manage Mappings →
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Items Preview */}
      {uploadResult && uploadResult.items && uploadResult.items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              Extracted Items ({uploadResult.items.length})
            </h3>
            <span className="text-xs text-gray-500 flex items-center gap-2">
              {getFileIcon(uploadResult.file_name)}
              {uploadResult.file_name}
            </span>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mapped To</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {uploadResult.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5">{item.item_name}</td>
                    <td className="px-3 py-1.5 text-right font-medium">{item.quantity}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {item.mapped_item_name ? (
                        <span className="text-green-600">{item.mapped_item_name}</span>
                      ) : (
                        <span className="text-amber-600">⚠️ Unmapped</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {item.mapped_item_name ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Mapped</span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unmapped</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Red Flags Details */}
      {showRedFlags && reconciliationResult && reconciliationResult.red_flags > 0 && reconciliationResult.red_flag_details && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Red Flags ({reconciliationResult.red_flags})
            </h3>
            <button
              onClick={() => setShowRedFlags(false)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-red-700 uppercase">XPS Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-red-700 uppercase">Inventory Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-red-700 uppercase">Variance</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase">Location</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reconciliationResult.red_flag_details.map((flag, index) => (
                  <tr key={index} className="hover:bg-red-50">
                    <td className="px-3 py-2 font-medium">{flag.item_name}</td>
                    <td className="px-3 py-2 text-right">{flag.xps_quantity}</td>
                    <td className="px-3 py-2 text-right text-red-600">{flag.inventory_quantity}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">-{flag.variance}</td>
                    <td className="px-3 py-2 text-xs capitalize">{flag.location}</td>
                    <td className="px-3 py-2 text-xs text-red-600">{flag.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-xs text-gray-500 border-t pt-4 space-y-1">
        <p><strong>XPS Reconciliation</strong> compares POS sales with kitchen and bar inventory.</p>
        <p>Items with <span className="text-red-600 font-medium">red flags</span> indicate discrepancies that need investigation.</p>
        <p className="text-amber-600">⚠️ Wings: 6 wings = 1 portion. Combos include sides and drinks based on daily specials.</p>
        <p className="text-blue-600">💡 Unmapped items need to be mapped in the <Link href="/xps/mapping" className="underline hover:text-blue-800">Mapping Management</Link> page.</p>
      </div>
    </div>
  );
}