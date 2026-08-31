// src/types/production.ts
export interface ProductionBatch {
  id?: number;
  batchNumber: string;
  mainStockItemId: string;
  mainStockItemName: string;
  outputProductKey: string;
  outputProductName: string;
  quantityProcessed: number;
  unit: string;
  expectedYield: number;
  actualYield: number;
  kitchenIssued: number;
  remaining: number;
  status: 'active' | 'completed' | 'wasted';
  notes?: string;
  processedBy?: string;
  logDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionKitchenIssuance {
  id?: number;
  batchId: number;
  kitchenItemId: string;
  quantityIssued: number;
  issuedBy?: string;
  logDate: string;
  createdAt?: string;
}

export interface ProductionWasteLog {
  id?: number;
  batchId: number;
  quantityWasted: number;
  wasteReason?: string;
  loggedBy?: string;
  logDate: string;
  createdAt?: string;
}

export interface ProductionSummary {
  batchNumber: string;
  mainStockItemName: string;
  outputProductName: string;
  quantityProcessed: number;
  actualYield: number;
  kitchenIssued: number;
  remaining: number;
  status: string;
  logDate: string;
}

export interface ProductionMapping {
  id: string;
  mainStockItemId: string;
  mainStockItemName: string;
  outputProductName: string;
  outputProductKey: string;
  unit: string;
  yieldPerUnit: number;
  category: 'chicken' | 'meat' | 'bakery_dairy' | 'frozen_dry';
}