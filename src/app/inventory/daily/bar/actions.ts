// src/app/inventory/daily/bar/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { BarDailyItem } from '@/types/inventory';

interface SaveBarPayload {
  items: BarDailyItem[];
  logDate: string;
}

export async function saveBarDaily(data: SaveBarPayload) {
  console.log('[Server Action] saveBarDaily initiated');
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
      const downAvailable = (item.downOpen || 0) + (item.downAdd || 0);
      const fridgeAvailable = (item.fridgeOpen || 0) + (item.fridgeAdd || 0);
      const totalStock = downAvailable + fridgeAvailable;
      const totalClosing = (item.downClose || 0) + (item.fridgeClose || 0);
      const totalSales = Math.max(0, totalStock - totalClosing - (item.waste || 0));

      await sql`
        INSERT INTO bar_daily_logs (
          item_id, item_name, category, unit,
          down_open, down_add, down_close,
          fridge_open, fridge_add, fridge_close,
          waste, total_stock, total_sales, log_date
        ) VALUES (
          ${item.id}, ${item.name}, ${item.category}, ${item.unit},
          ${Number(item.downOpen) || 0}, ${Number(item.downAdd) || 0}, ${Number(item.downClose) || 0},
          ${Number(item.fridgeOpen) || 0}, ${Number(item.fridgeAdd) || 0}, ${Number(item.fridgeClose) || 0},
          ${Number(item.waste) || 0}, ${totalStock}, ${totalSales},
          ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          down_open = EXCLUDED.down_open,
          down_add = EXCLUDED.down_add,
          down_close = EXCLUDED.down_close,
          fridge_open = EXCLUDED.fridge_open,
          fridge_add = EXCLUDED.fridge_add,
          fridge_close = EXCLUDED.fridge_close,
          waste = EXCLUDED.waste,
          total_stock = EXCLUDED.total_stock,
          total_sales = EXCLUDED.total_sales;
      `;

      // Auto-populate tomorrow's opening stock
      const tomorrowRecord = await sql`
        SELECT * FROM bar_daily_logs 
        WHERE item_id = ${item.id} AND log_date = ${tomorrow};
      `;

      // For bar, tomorrow's opening stock should be today's closing stock
      // For each location: down closing becomes tomorrow's down opening
      const downClose = Number(item.downClose) || 0;
      const fridgeClose = Number(item.fridgeClose) || 0;

      if (tomorrowRecord.length === 0) {
        await sql`
          INSERT INTO bar_daily_logs (
            item_id, item_name, category, unit,
            down_open, down_add, down_close,
            fridge_open, fridge_add, fridge_close,
            waste, total_stock, total_sales, log_date
          ) VALUES (
            ${item.id}, ${item.name}, ${item.category}, ${item.unit},
            ${downClose}, 0, 0,
            ${fridgeClose}, 0, 0,
            0, ${downClose + fridgeClose}, 0,
            ${tomorrow}
          )
          ON CONFLICT (item_id, log_date) 
          DO UPDATE SET 
            down_open = EXCLUDED.down_open,
            fridge_open = EXCLUDED.fridge_open,
            total_stock = EXCLUDED.total_stock;
        `;
      } else {
        await sql`
          UPDATE bar_daily_logs 
          SET down_open = ${downClose},
              fridge_open = ${fridgeClose},
              total_stock = ${downClose + fridgeClose}
          WHERE item_id = ${item.id} AND log_date = ${tomorrow};
        `;
      }
    }

    await sql`COMMIT`;
    revalidatePath('/inventory/daily/bar');
    
    return { 
      success: true, 
      message: `Bar inventory saved successfully! Tomorrow's opening stock has been auto-set.` 
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

export async function loadBarDaily(date: string) {
  console.log('Loading bar data for date:', date);

  try {
    const items = await sql`
      SELECT * FROM bar_daily_logs 
      WHERE log_date = ${date}
      ORDER BY category, item_name;
    `;

    if (items.length === 0) {
      return { success: true, data: null, message: 'No data found for this date.' };
    }

    const barItems = items.map((row: any) => ({
      id: row.item_id,
      name: row.item_name,
      category: row.category,
      unit: row.unit,
      downOpen: Number(row.down_open),
      downAdd: Number(row.down_add),
      downClose: Number(row.down_close),
      fridgeOpen: Number(row.fridge_open),
      fridgeAdd: Number(row.fridge_add),
      fridgeClose: Number(row.fridge_close),
      waste: Number(row.waste) || 0,
      totalStock: Number(row.total_stock),
      totalSales: Number(row.total_sales),
    }));

    return {
      success: true,
      data: barItems,
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading bar data:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function getNextDayBarOpening(date: string) {
  console.log('Getting next day opening stock for bar:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const items = await sql`
      SELECT item_id, down_open, fridge_open FROM bar_daily_logs 
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