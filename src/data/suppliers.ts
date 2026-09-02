// src/data/suppliers.ts
import { Supplier } from '@/types/supplier';

export const supplierData: Supplier[] = [
  {
    id: 'carmesita',
    name: 'Carmesita',
    code: 'CAR-001',
    category: 'Poultry & Meat',
    contactPerson: 'Carmesita',
    phone: '+233 24 000 0000',
    email: 'carmesita@example.com',
    paymentTerms: 'cheque', // Pays by cheque
    products: [
      { productName: 'Chicken Thigh', unit: 'kg', unitPrice: 25.00 },
      { productName: 'Full Chicken', unit: 'kg', unitPrice: 28.00 },
      { productName: 'Chicken Wings', unit: 'kg', unitPrice: 20.00 },
      { productName: 'Chicken Breast', unit: 'kg', unitPrice: 30.00 },
      { productName: 'Fish Fillet', unit: 'kg', unitPrice: 35.00 },
      { productName: 'Sliced Cheese', unit: 'kg', unitPrice: 45.00 },
      { productName: 'Potato Fries', unit: 'kg', unitPrice: 18.00 },
    ]
  },
  {
    id: 'henos',
    name: 'Henos Energy',
    code: 'HEN-001',
    category: 'Gas & Energy',
    contactPerson: 'Henos',
    phone: '+233 24 000 0000',
    paymentTerms: 'credit',
    creditDays: 30,
    products: [
      { productName: 'Large Gas Cylinder', unit: 'cylinder', unitPrice: 120.00 },
      { productName: 'Medium Gas Cylinder', unit: 'cylinder', unitPrice: 70.00 },
    ]
  },
  {
    id: 'cool',
    name: 'Cool',
    code: 'COL-001',
    category: 'Beverages',
    contactPerson: 'Cool',
    phone: '+233 24 000 0000',
    paymentTerms: 'credit',
    creditDays: 30,
    products: [
      { productName: 'Voltic Water Large', unit: 'bottle', unitPrice: 8.00 },
      { productName: 'Voltic Water Small', unit: 'bottle', unitPrice: 3.00 },
    ]
  },
  {
    id: 'ice',
    name: 'Ice Suppliers',
    code: 'ICE-001',
    category: 'Ice',
    contactPerson: 'Ice',
    phone: '+233 24 000 0000',
    paymentTerms: 'credit',
    creditDays: 30,
    products: [
      { productName: 'Crushed Ice', unit: 'bag', unitPrice: 10.00 },
      { productName: 'Uncrushed Ice Cubes', unit: 'bag', unitPrice: 10.00 },
    ]
  },
  {
    id: 'sika',
    name: 'Sika Kraba',
    code: 'SIK-001',
    category: 'Dry Goods & Groceries',
    contactPerson: 'Sika Kraba',
    phone: '+233 24 000 0000',
    paymentTerms: 'credit',
    creditDays: 30,
    products: [
      { productName: 'Basmati Rice 5kg', unit: 'bag', unitPrice: 85.00 },
      { productName: 'Basmati Rice 10kg', unit: 'bag', unitPrice: 160.00 },
      { productName: 'Cic Lele Rice 4.5kg', unit: 'bag', unitPrice: 55.00 },
      { productName: 'Sunflower Oil', unit: 'litre', unitPrice: 30.00 },
      { productName: 'Sweet Corn', unit: 'tin', unitPrice: 12.00 },
      { productName: 'Green Pea', unit: 'tin', unitPrice: 10.00 },
      { productName: 'Ketchups', unit: 'bottle', unitPrice: 15.00 },
    ]
  },
  {
    id: 'aunty_eva',
    name: 'Aunty Eva',
    code: 'EVA-001',
    category: 'Poultry',
    contactPerson: 'Aunty Eva',
    phone: '+233 24 000 0000',
    paymentTerms: 'credit',
    creditDays: 14,
    products: [
      { productName: 'Crate of Eggs (30 pcs)', unit: 'crate', unitPrice: 45.00 },
      { productName: 'Half Crate Eggs (15 pcs)', unit: 'half_crate', unitPrice: 23.00 },
    ]
  }
];