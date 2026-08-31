// src/data/dailySpicesData.ts
import { SpiceStockItem } from '@/types/inventory';

export const initialSpiceStockData: SpiceStockItem[] = [
  // --- Dry Spices & Powders ---
  { id: 'sp_01', name: 'Ground White Pepper', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_02', name: 'White Pepper', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_03', name: 'Ground Black Pepper', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_04', name: 'Black Pepper', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_05', name: 'Pepper Corn', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_06', name: 'Coriander', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_07', name: 'Cardamom', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_08', name: 'Cumin', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_09', name: 'Cumin Seeds', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_10', name: 'Sweet Smoked Paprika', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_11', name: 'Paprika', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_12', name: 'Cloves Fine', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_13', name: 'Cloves Powder', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_14', name: 'Cloves', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_15', name: 'Turmeric Powder', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_16', name: 'Cinnamon', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_17', name: 'Cayenne Pepper', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_18', name: 'Kivo Pepper', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_19', name: 'Nutmeg', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_20', name: 'Salt', category: 'dry_spices', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 10 },

  // --- House Blends & Rubs ---
  { id: 'sp_21', name: 'Complete Seasoning', category: 'premixes', unit: 'bottle', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_22', name: 'Kalaajieh Tikkah', category: 'premixes', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_23', name: 'Thyme Mix', category: 'premixes', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_24', name: 'Curry Powder', category: 'premixes', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_25', name: 'Fish Powder', category: 'premixes', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_26', name: 'Shrimp Powder', category: 'premixes', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_27', name: 'Suya Spice', category: 'premixes', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },

  // --- Fresh Herbs & Aromatics ---
  { id: 'sp_28', name: 'Basil', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_29', name: 'Dried Minced Garlic / Onion', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_30', name: 'Rosemary', category: 'fresh_herbs', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 2 },
  { id: 'sp_31', name: 'Parsley', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_32', name: 'Oregano', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_33', name: 'Dried Tarragon', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 2 },
  { id: 'sp_34', name: 'Fresh Herbs', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_35', name: 'Fresh Pepper', category: 'fresh_herbs', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'sp_36', name: 'Dried Mint', category: 'fresh_herbs', unit: 'pack', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'sp_37', name: 'Bay Leaves', category: 'fresh_herbs', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 2 },

  // --- Oils, Sauces & Vinegars ---
  { id: 'sp_38', name: 'Sunflower Oil', category: 'sauces_oils', unit: 'L', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
];