// src/data/packaging-items.ts
import { PackagingItem } from '@/types/inventory';

export const packagingItemsData: PackagingItem[] = [
  // ============================================
  // SECTION 1: FOOD PACKAGING
  // ============================================
  
  // Takeaway Containers
  { id: 'pkg_01', name: 'Take Away Packaging', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_02', name: 'Take Away Packaging (Alt)', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_38', name: 'White Takeaway', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_05', name: 'Large Food Packaging', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_16', name: 'Take Away Packaging (Pack)', category: 'Food Packaging', unit: 'pks', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  
  // Specialty Packaging
  { id: 'pkg_03', name: 'Sharwarma Packaging', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_06', name: 'Shawarma Packaging (Alt)', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_04', name: 'Burger Packaging', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_07', name: 'Burger Wrap Packaging 1', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_08', name: 'Burger Wrap Packaging 2', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_14', name: 'Papa Jumbi Packaging', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // Salad & Portion Cups
  { id: 'pkg_09', name: 'Salad Pack Packaging 1', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_10', name: 'Salad Pack Packaging 2', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_20', name: 'Shito Cups', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_21', name: 'Salad Cups', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_22', name: 'Olonka Rub Packaging', category: 'Food Packaging', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_23', name: 'Portion Rub Packaging', category: 'Food Packaging', unit: 'pks', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  
  // ============================================
  // SECTION 2: DISPOSABLES
  // ============================================
  
  // Paper & Plastic Disposables
  { id: 'pkg_12', name: 'Disposable Spoon', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_13', name: 'Disposable Fork', category: 'Disposables', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_39', name: 'Disposable Cup Take Away', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_40', name: 'Disposable Cup', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // Tissue & Napkins
  { id: 'pkg_15', name: 'Hand Tissue Packaging', category: 'Disposables', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_17', name: 'Tissue Napkin (Jumbo Tissu)', category: 'Disposables', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_18', name: 'Tissue Napkin Packaging 2', category: 'Disposables', unit: 'pks', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_37', name: 'Paper Bag', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // Plastics & Films
  { id: 'pkg_19', name: 'Plastic Wrap Packaging', category: 'Disposables', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_33', name: 'Cling Film', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_43', name: 'Aluminium Foil/Sheet', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_42', name: 'Baking Sheet', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // Straws & Utensils
  { id: 'pkg_25', name: 'Straw', category: 'Disposables', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_41', name: 'Urban Stick', category: 'Disposables', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // ============================================
  // SECTION 3: CLEANING SUPPLIES
  // ============================================
  
  // Liquid Cleaners
  { id: 'pkg_26', name: 'Soft Wipes', category: 'Cleaning Supplies', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_27', name: 'Bleach', category: 'Cleaning Supplies', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_28', name: 'Liquid Soap', category: 'Cleaning Supplies', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_31', name: 'Glass Cleaner', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  
  // Soaps & Detergents
  { id: 'pkg_29', name: 'Detergent', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_30', name: 'Bar Soap', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // PPE & Safety
  { id: 'pkg_24', name: 'Hair Net', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_32', name: 'Hand Gloves', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_35', name: 'Gloves (Alt)', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  { id: 'pkg_36', name: 'Nose Mask', category: 'Cleaning Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
  
  // ============================================
  // SECTION 4: KITCHEN SUPPLIES
  // ============================================
  
  { id: 'pkg_11', name: 'Takeaway Item Packaging', category: 'Kitchen Supplies', unit: 'kg', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_34', name: 'Steel Wire', category: 'Kitchen Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 3 },
  { id: 'pkg_44', name: 'Trash Bag', category: 'Kitchen Supplies', unit: 'pcs', openingStock: 0, addedStock: 0, issuedToProduction: 0, issuedToKitchen: 0, closingStock: 0, reorderLevel: 5 },
];

// Helper function to get items by category
export const getPackagingItemsByCategory = (category: string) => {
  return packagingItemsData.filter(item => item.category === category);
};

// Helper function to get all unique categories
export const getPackagingCategories = () => {
  const categories = new Set(packagingItemsData.map(item => item.category));
  return Array.from(categories);
};