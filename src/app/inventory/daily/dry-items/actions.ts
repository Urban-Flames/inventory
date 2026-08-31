// src/app/inventory/daily/dry-items/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { DryItem } from '@/types/inventory';

interface SaveDryItemsPayload {
  items: DryItem[];
  logDate: string;
}

export async function saveDryItems(data: SaveDryItemsPayload) {
  console.log('[Server Action] saveDryItems initiated');
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
        ((item.issuedToKitchen || 0) + (item.issuedToBar || 0));

      await sql`
        INSERT INTO dry_items_daily_logs (
          item_id, item_name, category, unit,
          opening_stock, added_stock, issued_to_kitchen, issued_to_bar,
          closing_stock, reorder_level, log_date
        ) VALUES (
          ${item.id}, ${item.name}, ${item.category || 'Dry Items'}, ${item.unit},
          ${Number(item.openingStock) || 0}, ${Number(item.addedStock) || 0},
          ${Number(item.issuedToKitchen) || 0}, ${Number(item.issuedToBar) || 0},
          ${closingStock}, ${Number(item.reorderLevel) || 0},
          ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          added_stock = EXCLUDED.added_stock,
          issued_to_kitchen = EXCLUDED.issued_to_kitchen,
          issued_to_bar = EXCLUDED.issued_to_bar,
          closing_stock = EXCLUDED.closing_stock,
          reorder_level = EXCLUDED.reorder_level;
      `;

      // Check if tomorrow's record exists
      const tomorrowRecord = await sql`
        SELECT * FROM dry_items_daily_logs 
        WHERE item_id = ${item.id} AND log_date = ${tomorrow};
      `;

      // If tomorrow's record doesn't exist, create it with today's closing as opening
      if (tomorrowRecord.length === 0) {
        await sql`
          INSERT INTO dry_items_daily_logs (
            item_id, item_name, category, unit,
            opening_stock, added_stock, issued_to_kitchen, issued_to_bar,
            closing_stock, reorder_level, log_date
          ) VALUES (
            ${item.id}, ${item.name}, ${item.category || 'Dry Items'}, ${item.unit},
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
          UPDATE dry_items_daily_logs 
          SET opening_stock = ${closingStock},
              closing_stock = ${closingStock}
          WHERE item_id = ${item.id} AND log_date = ${tomorrow};
        `;
      }
    }

    await sql`COMMIT`;
    revalidatePath('/inventory/daily/dry-items');
    
    return { 
      success: true, 
      message: `Dry items saved successfully! Tomorrow's opening stock has been auto-set.` 
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

export async function loadDryItems(date: string) {
  console.log('Loading dry items data for date:', date);

  try {
    const items = await sql`
      SELECT * FROM dry_items_daily_logs 
      WHERE log_date = ${date}
      ORDER BY item_name;
    `;

    if (items.length === 0) {
      return { success: true, data: null, message: 'No data found for this date.' };
    }

    const dryItems = items.map((row: any) => ({
      id: row.item_id,
      name: row.item_name,
      category: row.category || 'Dry Items',
      unit: row.unit,
      openingStock: Number(row.opening_stock),
      addedStock: Number(row.added_stock),
      issuedToKitchen: Number(row.issued_to_kitchen),
      issuedToBar: Number(row.issued_to_bar),
      closingStock: Number(row.closing_stock),
      reorderLevel: Number(row.reorder_level) || 0,
    }));

    return {
      success: true,
      data: dryItems,
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading dry items:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function getNextDayDryItemsOpening(date: string) {
  console.log('Getting next day opening stock for dry items:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const items = await sql`
      SELECT item_id, opening_stock FROM dry_items_daily_logs 
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