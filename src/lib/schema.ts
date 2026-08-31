// lib/db/schema.ts
import { pgTable, serial, varchar, numeric, date, timestamp, unique } from 'drizzle-orm/pg-core';

export const dailyMainStockLogs = pgTable('daily_main_stock_logs', {
  id: serial('id').primaryKey(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  openingStock: numeric('opening_stock', { precision: 10, scale: 2 }).default('0'),
  addedStock: numeric('added_stock', { precision: 10, scale: 2 }).default('0'),
  issuedToProduction: numeric('issued_to_production', { precision: 10, scale: 2 }).default('0'),
  issuedToKitchen: numeric('issued_to_kitchen', { precision: 10, scale: 2 }).default('0'),
  closingStock: numeric('closing_stock', { precision: 10, scale: 2 }).default('0'),
  logDate: date('log_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueConstraint: unique().on(table.itemId, table.logDate)
}));

export const productionBatchLogs = pgTable('production_batch_logs', {
  id: serial('id').primaryKey(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  cartonsIssued: numeric('cartons_issued', { precision: 10, scale: 2 }).default('0'),
  totalWeightKg: numeric('total_weight_kg', { precision: 10, scale: 2 }).default('0'),
  wasteWeightKg: numeric('waste_weight_kg', { precision: 10, scale: 2 }).default('0'),
  netWeightKg: numeric('net_weight_kg', { precision: 10, scale: 2 }).default('0'),
  logDate: date('log_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueConstraint: unique().on(table.itemId, table.logDate)
}));

export const productionDerivedPortions = pgTable('production_derived_portions', {
  id: serial('id').primaryKey(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  portionKey: varchar('portion_key', { length: 100 }).notNull(),
  portionQuantity: numeric('portion_quantity', { precision: 10, scale: 2 }).default('0'),
  logDate: date('log_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueConstraint: unique().on(table.itemId, table.portionKey, table.logDate)
}));