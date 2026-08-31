// src/app/inventory/kitchen/daily/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { KitchenItem } from '@/types/inventory';
import { carryOverProductionToNextDay } from '@/app/production/daily/actions';

interface SaveKitchenPayload {
  items: KitchenItem[];
  logDate: string;
}

export async function saveKitchenDaily(data: SaveKitchenPayload) {
  console.log(' [Server Action] saveKitchenDaily initiated');
  console.log(' Date:', data.logDate);
  console.log(' Items count:', data?.items?.length || 0);

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
      const totalStock = (item.morningStock || 0) + (item.receivedFromStock || 0);
      const salesDeduction = Math.max(0, 
        totalStock - (item.actualClosingStock || 0) - (item.waste || 0)
      );
      const variance = (item.closingStock || 0) - (item.actualClosingStock || 0);

      await sql`
        INSERT INTO kitchen_daily_logs (
          item_id, item_name, category, unit,
          morning_stock, received_from_stock, total_stock,
          actual_closing_stock, waste, sales_deduction, variance,
          log_date
        ) VALUES (
          ${item.id}, ${item.name}, ${item.category || null}, ${item.unit},
          ${Number(item.morningStock) || 0}, ${Number(item.receivedFromStock) || 0},
          ${totalStock},
          ${Number(item.actualClosingStock) || 0}, ${Number(item.waste) || 0},
          ${salesDeduction}, ${variance},
          ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          morning_stock = EXCLUDED.morning_stock,
          received_from_stock = EXCLUDED.received_from_stock,
          total_stock = EXCLUDED.total_stock,
          actual_closing_stock = EXCLUDED.actual_closing_stock,
          waste = EXCLUDED.waste,
          sales_deduction = EXCLUDED.sales_deduction,
          variance = EXCLUDED.variance;
      `;

      const tomorrowRecord = await sql`
        SELECT * FROM kitchen_daily_logs 
        WHERE item_id = ${item.id} AND log_date = ${tomorrow};
      `;

      if (tomorrowRecord.length === 0) {
        const closingStock = Number(item.actualClosingStock) || 0;
        
        await sql`
          INSERT INTO kitchen_daily_logs (
            item_id, item_name, category, unit,
            morning_stock, received_from_stock, total_stock,
            actual_closing_stock, waste, sales_deduction, variance,
            log_date
          ) VALUES (
            ${item.id}, ${item.name}, ${item.category || null}, ${item.unit},
            ${closingStock}, 0, ${closingStock},
            0, 0, 0, 0,
            ${tomorrow}
          )
          ON CONFLICT (item_id, log_date) 
          DO UPDATE SET 
            morning_stock = EXCLUDED.morning_stock;
        `;
      } else {
        await sql`
          UPDATE kitchen_daily_logs 
          SET morning_stock = ${Number(item.actualClosingStock) || 0}
          WHERE item_id = ${item.id} AND log_date = ${tomorrow};
        `;
      }
    }

    await sql`COMMIT`;
    
    // AFTER saving kitchen, carry over remaining production to next day
    // Only if we're saving today's data
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.logDate === todayStr) {
      const carryoverResult = await carryOverProductionToNextDay(todayStr);
      console.log('Carryover result:', carryoverResult.message);
    }
    
    revalidatePath('/inventory/daily/kitchen');
    revalidatePath('/production/daily');
    
    return { 
      success: true, 
      message: `Kitchen inventory saved successfully! Production carried over to next day.` 
    };
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error(' Database save error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to save data.'
    };
  }
}

export async function loadKitchenDaily(date: string) {
  console.log(' Loading kitchen data for date:', date);

  try {
    const stockItems = await sql`
      SELECT * FROM kitchen_daily_logs 
      WHERE log_date = ${date}
      ORDER BY category, item_name;
    `;

    if (stockItems.length === 0) {
      return { success: true, data: null, message: 'No data found for this date.' };
    }

    const items = stockItems.map((row: any) => ({
      id: row.item_id,
      name: row.item_name,
      category: row.category,
      unit: row.unit,
      morningStock: Number(row.morning_stock),
      receivedFromStock: Number(row.received_from_stock),
      totalStock: Number(row.total_stock),
      closingStock: Number(row.total_stock) - Number(row.sales_deduction) - Number(row.waste || 0),
      actualClosingStock: Number(row.actual_closing_stock),
      salesDeduction: Number(row.sales_deduction),
      waste: Number(row.waste) || 0,
      variance: Number(row.variance) || 0,
      date: row.log_date,
    }));

    return {
      success: true,
      data: items,
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error(' Error loading kitchen data:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function getNextDayOpeningStock(date: string) {
  console.log(' Getting next day opening stock for date:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const stockItems = await sql`
      SELECT item_id, morning_stock FROM kitchen_daily_logs 
      WHERE log_date = ${tomorrow};
    `;

    return {
      success: true,
      data: stockItems,
      message: 'Next day opening stock loaded successfully!'
    };
  } catch (error) {
    console.error(' Error loading next day opening stock:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}