// src/types/inventory.ts
export type MainStockCategory =
  | 'chicken'
  | 'meat'
  | 'spices'
  | 'fresh_items'
  | 'bakery_dairy'
  | 'frozen_dry';

export type BarCategory =
  | 'soft_drinks'
  | 'beers'
  | 'spirits'
  | 'wines_syrups'
  | 'ice_mixers';

export type KitchenCategory =
  | 'patties'
  | 'poultry'
  | 'shawarma'
  | 'khebabs_meats'
  | 'steaks_sides'
  | 'starters_bakery';

export type UnitOfMeasure =
  | 'kg'
  | 'grams'
  | 'pieces'
  | 'packs'
  | 'liters'
  | 'bottles'
  | 'boxes'
  | 'crates'
  | 'bags'
  | 'pcs'
  | 'ptns'
  | 'stks'
  | 'portions'
  | 'btls'
  | 'shots'
  | 'pks'
  |'ctns'
  |'blocks'
  | 'bucket'
  |'can'         // Added 'can'
  | 'gallon'      // Added 'gallon'
  | 'bottle'
  | 'L'    
  |'pack'  // Added 'bottle'
  | 'Itrs';     

export type StockUsageType = 'production_raw' | 'direct_sale' | 'both';

export interface MainStockItem {
  id: string;
  name: string;
  category: MainStockCategory;
  usageType: StockUsageType;
  substituteFor?: string;
  openingStock: number;
  addedStock: number;
  issuedToProduction: number;
  issuedToKitchen: number;
  closingStock: number;
  quantityInStock: number;
  unit: UnitOfMeasure;
  reorderLevel: number;
  
  // Production Yield Tracking
  grossWeightIssued?: number;
  wasteWeight?: number;
  netYieldWeight?: number;
  portionsYielded?: number;

  updatedAt: string;
}

export interface ProductionDetail {
  itemId: string;
  itemName: string;
  cartonsIssued: number;
  totalWeightKg: number;
  wasteWeightKg: number;
  portions: Record<string, number>;
}

export interface BarStockItem {
  id: string;
  name: string;
  category?: BarCategory;
  quantityInStock: number;
  unit: UnitOfMeasure;
  reorderLevel: number;
  updatedAt: string;
}

export interface BarDailyItem {
  id: string;
  name: string;
  category: BarCategory;
  unit: UnitOfMeasure;
  downOpen: number;
  downAdd: number;
  downClose: number;
  fridgeOpen: number;
  fridgeAdd: number;
  fridgeClose: number;
  waste: number;
  totalStock: number;
  totalSales: number;
  date?: string;
}

export interface KitchenItem {
  id: string;
  name: string;
  category?: KitchenCategory;
  unit: UnitOfMeasure;
  morningStock: number;
  receivedFromStock: number;
  totalStock?: number;
  closingStock?: number;
  actualClosingStock: number;
  salesDeduction: number;
  waste?: number;
  variance: number;
  date: string;
}

export type MovementType = 'supplier_inflow' | 'kitchen_transfer' | 'bar_transfer' | 'production_transfer';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  unit: UnitOfMeasure;
  source: string;
  destination: string;
  requestedBy?: string;
  approvedBy?: string;
  timestamp: string;
}

export interface RecipeIngredient {
  stockItemId: string;
  stockItemName: string;
  quantityPerPortion: number;
  unit: UnitOfMeasure;
  sourceLocation: 'kitchen' | 'bar';
}

export interface SalesItemRecipe {
  xpsItemName: string;
  ingredients: RecipeIngredient[];
}

export interface XPSSalesRecord {
  id: string;
  date: string;
  xpsItemName: string;
  quantitySold: number;
  totalRevenue?: number;
}

export interface InventoryRedFlag {
  id: string;
  date: string;
  itemName: string;
  location: 'kitchen' | 'bar' | 'main_stock';
  expectedQuantity: number;
  actualQuantity: number;
  deficitQuantity: number;
  reason: 'unrecorded_transfer' | 'portion_mismatch' | 'miscount' | 'unrecorded_spoilage';
  resolved: boolean;
}
// src/types/inventory.ts
// Add this interface after your existing interfaces

export interface DryItem {
  id: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  openingStock: number;
  addedStock: number;
  issuedToKitchen: number;
  issuedToBar: number;
  closingStock: number;
  reorderLevel: number;
  updatedAt?: string;
}

// src/types/inventory.ts
// Add this interface after DryItem

export interface SpiceStockItem {
  id: string;
  name: string;
  category: 'dry_spices' | 'premixes' | 'fresh_herbs' | 'sauces_oils';
  unit: UnitOfMeasure;
  openingStock: number;
  addedStock: number;
  issuedToProduction: number;
  issuedToKitchen: number;
  closingStock: number;
  reorderLevel: number;
  updatedAt?: string;
}

// src/types/inventory.ts
// Add this after DryItem interface

export interface PackagingItem {
  id: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  openingStock: number;
  addedStock: number;
  issuedToKitchen: number;
  issuedToProduction: number;
  closingStock: number;
  reorderLevel: number;
  updatedAt?: string;
}