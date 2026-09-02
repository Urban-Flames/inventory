// src/data/expenseSuppliers.ts
import { ExpenseSupplier } from '@/types/expenses';

export const expenseSuppliers: ExpenseSupplier[] = [
  {
    id: 'panda_mall',
    name: 'Panda Mall',
    code: 'PAN-001',
    category: 'Supermarket',
    contactPerson: 'Panda Mall Manager',
    phone: '+233 24 000 0000',
    paymentTerms: 'cheque',
    creditDays: 0
  },
  {
    id: 'open_market',
    name: 'Open Market',
    code: 'OMK-001',
    category: 'Market',
    contactPerson: 'Market Vendor',
    phone: '+233 24 000 0000',
    paymentTerms: 'cash',
    creditDays: 0
  },
  {
    id: 'china_mall',
    name: 'China Mall',
    code: 'CHN-001',
    category: 'Supermarket',
    contactPerson: 'China Mall Manager',
    phone: '+233 24 000 0000',
    paymentTerms: 'cheque',
    creditDays: 0
  },
  {
    id: 'palace_mall',
    name: 'Palace Mall',
    code: 'PAL-001',
    category: 'Supermarket',
    contactPerson: 'Palace Mall Manager',
    phone: '+233 24 000 0000',
    paymentTerms: 'cheque',
    creditDays: 0
  }
];

// Common expense items (will be pre-loaded)
export const commonExpenseItems = [
  { itemName: 'Vegetables Assorted', unit: 'kg', category: 'Produce' },
  { itemName: 'Fruits Assorted', unit: 'kg', category: 'Produce' },
  { itemName: 'Cooking Oil', unit: 'litre', category: 'Groceries' },
  { itemName: 'Flour', unit: 'kg', category: 'Baking' },
  { itemName: 'Sugar', unit: 'kg', category: 'Groceries' },
  { itemName: 'Salt', unit: 'kg', category: 'Spices' },
  { itemName: 'Cleaning Supplies', unit: 'set', category: 'Cleaning' },
  { itemName: 'Detergent', unit: 'kg', category: 'Cleaning' },
  { itemName: 'Disposable Gloves', unit: 'box', category: 'Kitchen Supplies' },
  { itemName: 'Aluminum Foil', unit: 'roll', category: 'Kitchen Supplies' },
  { itemName: 'Cling Wrap', unit: 'roll', category: 'Kitchen Supplies' },
  { itemName: 'Paper Towels', unit: 'roll', category: 'Kitchen Supplies' },
  { itemName: 'Toilet Paper', unit: 'roll', category: 'Cleaning' },
  { itemName: 'Hand Soap', unit: 'bottle', category: 'Cleaning' },
  { itemName: 'Dish Soap', unit: 'bottle', category: 'Cleaning' },
];