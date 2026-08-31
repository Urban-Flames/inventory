// src/app/inventory/daily/spices/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { SpiceStockItem } from '@/types/inventory';

interface SaveSpicesPayload {
  items: SpiceStockItem[];
  logDate: string;
}

export async function saveSpicesDaily(data: SaveSpicesPayload) {
  console.log('[Server Action] saveSpicesDaily initiated');
  console.log('Date:', data.logDate);
  console.log('Items count:', data?.items?.length || 0);

  if (!data?.items || data.items.length === 0) {
    return { success: false, message: 'No items to save.' };
  }

  try {
    const today = data.logDate || new Date().toISOString().split('T')[0];
    
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    await sql`BEGIN`;

    for (const item of data.items) {
      const closingStock = (item.openingStock || 0) + (item.addedStock || 0) - 
        ((item.issuedToProduction || 0) + (item.issuedToKitchen || 0));

      await sql`
        INSERT INTO spices_daily_logs (
          item_id, item_name, category, unit,
          opening_stock, added_stock, issued_to_production, issued_to_kitchen,
          closing_stock, reorder_level, log_date
        ) VALUES (
          ${item.id}, ${item.name}, ${item.category}, ${item.unit},
          ${Number(item.openingStock) || 0}, ${Number(item.addedStock) || 0},
          ${Number(item.issuedToProduction) || 0}, ${Number(item.issuedToKitchen) || 0},
          ${closingStock}, ${Number(item.reorderLevel) || 0},
          ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          added_stock = EXCLUDED.added_stock,
          issued_to_production = EXCLUDED.issued_to_production,
          issued_to_kitchen = EXCLUDED.issued_to_kitchen,
          closing_stock = EXCLUDED.closing_stock,
          reorder_level = EXCLUDED.reorder_level;
      `;

      const tomorrowRecord = await sql`
        SELECT * FROM spices_daily_logs 
        WHERE item_id = ${item.id} AND log_date = ${tomorrow};
      `;

      if (tomorrowRecord.length === 0) {
        await sql`
          INSERT INTO spices_daily_logs (
            item_id, item_name, category, unit,
            opening_stock, added_stock, issued_to_production, issued_to_kitchen,
            closing_stock, reorder_level, log_date
          ) VALUES (
            ${item.id}, ${item.name}, ${item.category}, ${item.unit},
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
        await sql`
          UPDATE spices_daily_logs 
          SET opening_stock = ${closingStock},
              closing_stock = ${closingStock}
          WHERE item_id = ${item.id} AND log_date = ${tomorrow};
        `;
      }
    }

    await sql`COMMIT`;
    revalidatePath('/inventory/daily/spices');
    
    return { 
      success: true, 
      message: `Spices saved successfully! Tomorrow's opening stock has been auto-set.` 
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

export async function loadSpicesDaily(date: string) {
  console.log('Loading spices data for date:', date);

  try {
    const items = await sql`
      SELECT * FROM spices_daily_logs 
      WHERE log_date = ${date}
      ORDER BY category, item_name;
    `;

    if (items.length === 0) {
      return { success: true, data: null, message: 'No data found for this date.' };
    }

    const spices = items.map((row: any) => ({
      id: row.item_id,
      name: row.item_name,
      category: row.category,
      unit: row.unit,
      openingStock: Number(row.opening_stock),
      addedStock: Number(row.added_stock),
      issuedToProduction: Number(row.issued_to_production),
      issuedToKitchen: Number(row.issued_to_kitchen),
      closingStock: Number(row.closing_stock),
      reorderLevel: Number(row.reorder_level) || 0,
    }));

    return {
      success: true,
      data: spices,
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading spices:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function getNextDaySpicesOpening(date: string) {
  console.log('Getting next day opening stock for spices:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const items = await sql`
      SELECT item_id, opening_stock FROM spices_daily_logs 
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