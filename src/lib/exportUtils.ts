// src/lib/exportUtils.ts
import * as XLSX from 'xlsx';
import { MainStockItem } from '@/types/inventory';

interface ExportData {
  items: MainStockItem[];
  productionDetails: Record<string, any>;
  date: string;
}

export const exportToExcel = (data: ExportData) => {
  const { items, productionDetails, date } = data;

  // Format date for filename
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');

  // 1. Create Main Stock Sheet
  const stockData = items.map(item => ({
    'Item Name': item.name,
    'Category': item.category,
    'Unit': item.unit,
    'Opening Stock': item.openingStock || 0,
    'Added Stock': item.addedStock || 0,
    'Issued to Production': item.issuedToProduction || 0,
    'Issued to Kitchen': item.issuedToKitchen || 0,
    'Closing Stock': item.closingStock || 0,
    'Reorder Level': item.reorderLevel || 0,
    'Status': getStockStatus(item),
  }));

  const stockSheet = XLSX.utils.json_to_sheet(stockData);

  // Set column widths for stock sheet
  stockSheet['!cols'] = [
    { wch: 25 }, // Item Name
    { wch: 15 }, // Category
    { wch: 10 }, // Unit
    { wch: 15 }, // Opening Stock
    { wch: 15 }, // Added Stock
    { wch: 20 }, // Issued to Production
    { wch: 18 }, // Issued to Kitchen
    { wch: 15 }, // Closing Stock
    { wch: 15 }, // Reorder Level
    { wch: 15 }, // Status
  ];

  // 2. Create Production Sheet (if there are production details)
  let productionSheet = null;
  if (Object.keys(productionDetails).length > 0) {
    const productionData: any[] = [];

    Object.values(productionDetails).forEach((batch: any) => {
      // Add batch header
      productionData.push({
        'Item': batch.itemName,
        'Cartons Issued': batch.cartonsIssued || 0,
        'Total Weight (kg)': batch.totalWeightKg || 0,
        'Waste (kg)': batch.wasteWeightKg || 0,
        'Net Weight (kg)': (batch.totalWeightKg || 0) - (batch.wasteWeightKg || 0),
        'Portion Type': '',
        'Portion Quantity': '',
      });

      // Add portions
      if (batch.portions && Object.keys(batch.portions).length > 0) {
        Object.entries(batch.portions).forEach(([key, quantity]) => {
          productionData.push({
            'Item': '',
            'Cartons Issued': '',
            'Total Weight (kg)': '',
            'Waste (kg)': '',
            'Net Weight (kg)': '',
            'Portion Type': key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            'Portion Quantity': quantity,
          });
        });
      }

      // Add empty row between batches
      productionData.push({
        'Item': '',
        'Cartons Issued': '',
        'Total Weight (kg)': '',
        'Waste (kg)': '',
        'Net Weight (kg)': '',
        'Portion Type': '',
        'Portion Quantity': '',
      });
    });

    productionSheet = XLSX.utils.json_to_sheet(productionData);
    productionSheet['!cols'] = [
      { wch: 25 }, // Item
      { wch: 18 }, // Cartons Issued
      { wch: 20 }, // Total Weight
      { wch: 18 }, // Waste
      { wch: 18 }, // Net Weight
      { wch: 25 }, // Portion Type
      { wch: 18 }, // Portion Quantity
    ];
  }

  // 3. Create Summary Sheet
  const summaryData = [
    { 'Metric': 'Report Date', 'Value': formatDate(date) },
    { 'Metric': 'Total Items', 'Value': items.length },
    { 'Metric': 'Total Items with Stock', 'Value': items.filter(i => (i.closingStock || 0) > 0).length },
    { 'Metric': 'Out of Stock Items', 'Value': items.filter(i => (i.closingStock || 0) <= 0).length },
    { 'Metric': 'Low Stock Items', 'Value': items.filter(i => (i.closingStock || 0) <= (i.reorderLevel || 0) && (i.closingStock || 0) > 0).length },
    { 'Metric': 'Items in Production', 'Value': Object.keys(productionDetails).length },
    { 'Metric': '', 'Value': '' },
    { 'Metric': 'Generated On', 'Value': new Date().toLocaleString() },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, stockSheet, 'Main Stock');

  if (productionSheet) {
    XLSX.utils.book_append_sheet(wb, productionSheet, 'Production');
  }

  // Generate filename with date
  const fileName = `Daily_Stock_Report_${formattedDate}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fileName);
};

// Helper functions
const getStockStatus = (item: MainStockItem): string => {
  const totalAvailable = (item.openingStock || 0) + (item.addedStock || 0);
  const totalIssued = (item.issuedToProduction || 0) + (item.issuedToKitchen || 0);
  
  if (totalIssued > totalAvailable || (item.closingStock || 0) < 0) return '⚠️ DEFICIT';
  if ((item.closingStock || 0) <= 0) return '❌ OUT OF STOCK';
  if ((item.closingStock || 0) <= (item.reorderLevel || 0)) return '⚠️ LOW STOCK';
  return '✅ OK';
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};