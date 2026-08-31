// src/app/inventory/daily/packaging/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { PackagingItem } from '@/types/inventory';

interface SavePackagingItemsPayload {
  items: PackagingItem[];
  logDate: string;
}

export async function savePackagingItems(data: SavePackagingItemsPayload) {
  console.log('[Server Action] savePackagingItems initiated');
  console.log('Date:', data.logDate);
  console.log('Items count:', data?.items?.length || 0);

  if (!data?.items || data.items.length === 0) {
    return { success: false, message: 'No items to save.' };
  }

  try {
    const today = data.logDate || new Date().toISOString().split('T')[0];
    
    // Calculate tomorrow's date
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    await sql`BEGIN`;

    for (const item of data.items) {
      // Calculate closing stock
      const closingStock = (item.openingStock || 0) + (item.addedStock || 0) - 
        ((item.issuedToKitchen || 0) + (item.issuedToProduction || 0));

      await sql`
        INSERT INTO packaging_items_daily_logs (
          item_id, item_name, category, unit,
          opening_stock, added_stock, issued_to_kitchen, issued_to_production,
          closing_stock, reorder_level, log_date
        ) VALUES (
          ${item.id}, ${item.name}, ${item.category || 'Packaging'}, ${item.unit},
          ${Number(item.openingStock) || 0}, ${Number(item.addedStock) || 0},
          ${Number(item.issuedToKitchen) || 0}, ${Number(item.issuedToProduction) || 0},
          ${closingStock}, ${Number(item.reorderLevel) || 0},
          ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          added_stock = EXCLUDED.added_stock,
          issued_to_kitchen = EXCLUDED.issued_to_kitchen,
          issued_to_production = EXCLUDED.issued_to_production,
          closing_stock = EXCLUDED.closing_stock,
          reorder_level = EXCLUDED.reorder_level;
      `;

      // Check if tomorrow's record exists
      const tomorrowRecord = await sql`
        SELECT * FROM packaging_items_daily_logs 
        WHERE item_id = ${item.id} AND log_date = ${tomorrow};
      `;

      // If tomorrow's record doesn't exist, create it with today's closing as opening
      if (tomorrowRecord.length === 0) {
        await sql`
          INSERT INTO packaging_items_daily_logs (
            item_id, item_name, category, unit,
            opening_stock, added_stock, issued_to_kitchen, issued_to_production,
            closing_stock, reorder_level, log_date
          ) VALUES (
            ${item.id}, ${item.name}, ${item.category || 'Packaging'}, ${item.unit},
            ${closingStock}, 0, 0, 0, ${closingStock},
            ${Number(item.reorderLevel) || 0},
            ${tomorrow}
          )
          ON CONFLICT (item_id, log_date) 
          DO UPDATE SET 
            opening_stock = EXCLUDED.opening_stock,
            closing_stock = EXCLUDED.closing_stock;
        `;
      } else {
        // Update tomorrow's opening stock to match today's closing
        await sql`
          UPDATE packaging_items_daily_logs 
          SET opening_stock = ${closingStock},
              closing_stock = ${closingStock}
          WHERE item_id = ${item.id} AND log_date = ${tomorrow};
        `;
      }
    }

    await sql`COMMIT`;
    revalidatePath('/inventory/daily/packaging');
    
    return { 
      success: true, 
      message: `Packaging items saved successfully! Tomorrow's opening stock has been auto-set.` 
    };
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Database save error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to save data.'
    };
  }
}

export async function loadPackagingItems(date: string) {
  console.log('Loading packaging items data for date:', date);

  try {
    const items = await sql`
      SELECT * FROM packaging_items_daily_logs 
      WHERE log_date = ${date}
      ORDER BY item_name;
    `;

    if (items.length === 0) {
      return { success: true, data: null, message: 'No data found for this date.' };
    }

    const packagingItems = items.map((row: any) => ({
      id: row.item_id,
      name: row.item_name,
      category: row.category || 'Packaging',
      unit: row.unit,
      openingStock: Number(row.opening_stock),
      addedStock: Number(row.added_stock),
      issuedToKitchen: Number(row.issued_to_kitchen),
      issuedToProduction: Number(row.issued_to_production),
      closingStock: Number(row.closing_stock),
      reorderLevel: Number(row.reorder_level) || 0,
    }));

    return {
      success: true,
      data: packagingItems,
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading packaging items:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function getNextDayPackagingItemsOpening(date: string) {
  console.log('Getting next day opening stock for packaging items:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const items = await sql`
      SELECT item_id, opening_stock FROM packaging_items_daily_logs 
      WHERE log_date = ${tomorrow};
    `;

    return {
      success: true,
      data: items,
      message: 'Next day opening stock loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading next day opening stock:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}