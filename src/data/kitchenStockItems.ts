// src/data/kitchenStockItems.ts
import { KitchenItem } from '@/types/inventory';

const today = new Date().toISOString();

export const initialKitchenStockData: KitchenItem[] = [
  // Patties
  { id: 'kt-01', name: 'Jumbo Beef Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-02', name: 'Large Beef Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-03', name: 'Medium Beef Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-04', name: 'Small Beef Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-05', name: 'Jumbo Chicken Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-06', name: 'Large Chicken Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-07', name: 'Medium Chicken Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },
  { id: 'kt-08', name: 'Small Chicken Patty', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'patties', date: today },

  // Poultry & Portions
  { id: 'kt-09', name: 'Grilled Full Chicken', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'poultry', date: today },
  { id: 'kt-10', name: 'Half Chicken', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'poultry', date: today },
  { id: 'kt-11', name: 'Quarter Chicken', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'poultry', date: today },
  { id: 'kt-12', name: 'Chicken Wings Portion', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'poultry', date: today },
  { id: 'kt-13', name: 'Chicken Breast', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'poultry', date: today },

  // Shawarma Fillets
  { id: 'kt-14', name: 'Chicken Thigh - Shredded Shawarma Fillet', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'shawarma', date: today },
  { id: 'kt-15', name: 'Skewer Shawarma Chicken Fillet', unit: 'kg', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'shawarma', date: today },
  { id: 'kt-16', name: 'Shredded Shawarma Back Fillet', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'shawarma', date: today },
  { id: 'kt-17', name: 'Skewer Shawarma Back Fillet', unit: 'kg', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'shawarma', date: today },

  // Khebabs & Meats
  { id: 'kt-18', name: 'Beef Khebab', unit: 'stks', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'khebabs_meats', date: today },
  { id: 'kt-19', name: 'Chicken Khebab', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'khebabs_meats', date: today },
  { id: 'kt-20', name: 'Assorted Shredded Beef', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'khebabs_meats', date: today },
  { id: 'kt-21', name: 'Shredded Chicken Breast - Assorted', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'khebabs_meats', date: today },
  { id: 'kt-22', name: 'Loaded Fries Meat', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'khebabs_meats', date: today },

  // Steaks & Chops
  { id: 'kt-23', name: 'Ribs Portion (0.33/ptn)', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-24', name: 'Lamb Chops (0.33/ptn)', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-25', name: 'Pork Chops (0.33/ptn)', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-26', name: 'Beef Steak', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-27', name: 'Beef T-Bone (Portion)', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-28', name: 'Tenderloin', unit: 'kg', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-29', name: 'Beef Tenderloin (portion)', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-30', name: 'Fish Fillet (3 in a Pack)', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-31', name: 'Tilapia Large', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-32', name: 'Tilapia Medium', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },

  // Rice & Sides
  { id: 'kt-33', name: 'Potato Chips (200g)', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-34', name: 'Potato Wedges', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-35', name: 'Sweet Potato Wedges', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-36', name: 'Yam Chips', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-37', name: 'Cassava Chip', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-38', name: 'Rice Uncooked', unit: 'kg', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-39', name: 'Rice Cooked', unit: 'kg', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },
  { id: 'kt-40', name: 'Jollof', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'steaks_sides', date: today },

  // Bakery, Dairy & Finger Foods
  { id: 'kt-41', name: 'Burger Bun 5"', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-42', name: 'Burger Bun 3.5"', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-43', name: 'Pita Bread', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-44', name: 'Egg', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-45', name: 'Sliced Cheese (10 per Pack)', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-46', name: 'Cheddar Cheese', unit: 'pcs', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-47', name: 'Mozzarella Cheese', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-48', name: 'Bacon', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-49', name: 'Samosa', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
  { id: 'kt-50', name: 'Spring Roll', unit: 'ptns', morningStock: 0, receivedFromStock: 0, totalStock: 0, closingStock: 0, actualClosingStock: 0, salesDeduction: 0, variance: 0, category: 'starters_bakery', date: today },
];