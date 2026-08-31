// src/app/production/weekly/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Helper functions (internal)
function getWeekRangeInternal(date: string): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0]
  };
}

function getWeekDatesInternal(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Server Actions

// Get the start and end of the week
export async function getWeekRange(date: string) {
  return getWeekRangeInternal(date);
}

// Get all dates in a week
export async function getWeekDates(date: string) {
  const { weekStart } = getWeekRangeInternal(date);
  return getWeekDatesInternal(weekStart);
}

// Generate weekly summary from daily data
export async function generateWeeklyProductionSummary(date: string) {
  console.log('[Server Action] generateWeeklyProductionSummary initiated');
  console.log('Date:', date);

  try {
    const { weekStart, weekEnd } = getWeekRangeInternal(date);
    console.log(`Week range: ${weekStart} to ${weekEnd}`);

    // Get all production batches for the week
    const batches = await sql`
      SELECT 
        main_stock_item_id,
        main_stock_item_name,
        output_product_key,
        output_product_name,
        unit,
        quantity_processed,
        expected_yield,
        actual_yield,
        kitchen_issued,
        remaining,
        log_date
      FROM production_batches
      WHERE log_date >= ${weekStart} AND log_date <= ${weekEnd}
      ORDER BY main_stock_item_id, output_product_key, log_date;
    `;

    if (batches.length === 0) {
      return { 
        success: false, 
        message: 'No production data found for this week. Please generate daily production data first.' 
      };
    }

    // Group by main_stock_item_id and output_product_key
    const itemMap = new Map();
    
    for (const record of batches) {
      const key = `${record.main_stock_item_id}_${record.output_product_key}`;
      
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          main_stock_item_id: record.main_stock_item_id,
          main_stock_item_name: record.main_stock_item_name,
          output_product_key: record.output_product_key,
          output_product_name: record.output_product_name,
          unit: record.unit,
          daily_data: [],
          total_quantity_processed: 0,
          total_expected_yield: 0,
          total_actual_yield: 0,
          total_kitchen_issued: 0,
          total_remaining: 0,
          batch_count: 0
        });
      }
      
      const itemData = itemMap.get(key);
      itemData.daily_data.push({
        date: record.log_date,
        quantity_processed: Number(record.quantity_processed) || 0,
        expected_yield: Number(record.expected_yield) || 0,
        actual_yield: Number(record.actual_yield) || 0,
        kitchen_issued: Number(record.kitchen_issued) || 0,
        remaining: Number(record.remaining) || 0
      });
      
      itemData.total_quantity_processed += Number(record.quantity_processed) || 0;
      itemData.total_expected_yield += Number(record.expected_yield) || 0;
      itemData.total_actual_yield += Number(record.actual_yield) || 0;
      itemData.total_kitchen_issued += Number(record.kitchen_issued) || 0;
      itemData.total_remaining += Number(record.remaining) || 0;
      itemData.batch_count++;
    }

    // Process and calculate averages
    const summaryData = [];
    
    for (const [key, itemData] of itemMap) {
      // Calculate average yield per batch
      itemData.avg_yield_per_batch = itemData.batch_count > 0 
        ? Number((itemData.total_actual_yield / itemData.batch_count).toFixed(2))
        : 0;
      
      // Sort daily data by date
      itemData.daily_data.sort((a: any, b: any) => a.date.localeCompare(b.date));
      
      summaryData.push(itemData);
    }

    // Save weekly summary to database
    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO production_weekly_summary (
          main_stock_item_id, main_stock_item_name,
          output_product_key, output_product_name, unit,
          week_start_date, week_end_date,
          total_quantity_processed, total_expected_yield,
          total_actual_yield, total_kitchen_issued,
          total_remaining, batch_count, avg_yield_per_batch
        ) VALUES (
          ${item.main_stock_item_id}, ${item.main_stock_item_name},
          ${item.output_product_key}, ${item.output_product_name}, ${item.unit},
          ${weekStart}, ${weekEnd},
          ${item.total_quantity_processed}, ${item.total_expected_yield},
          ${item.total_actual_yield}, ${item.total_kitchen_issued},
          ${item.total_remaining}, ${item.batch_count}, ${item.avg_yield_per_batch}
        )
        ON CONFLICT (main_stock_item_id, output_product_key, week_start_date) 
        DO UPDATE SET 
          total_quantity_processed = EXCLUDED.total_quantity_processed,
          total_expected_yield = EXCLUDED.total_expected_yield,
          total_actual_yield = EXCLUDED.total_actual_yield,
          total_kitchen_issued = EXCLUDED.total_kitchen_issued,
          total_remaining = EXCLUDED.total_remaining,
          batch_count = EXCLUDED.batch_count,
          avg_yield_per_batch = EXCLUDED.avg_yield_per_batch,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/production/weekly');
    
    return {
      success: true,
      data: summaryData,
      weekStart,
      weekEnd,
      message: `Weekly production summary generated for ${weekStart} to ${weekEnd}`
    };
    
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Error generating weekly summary:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate weekly summary.'
    };
  }
}

// Load weekly summary data
export async function loadWeeklyProductionSummary(date: string) {
  console.log('Loading weekly production summary for date:', date);

  try {
    const { weekStart, weekEnd } = getWeekRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM production_weekly_summary
      WHERE week_start_date = ${weekStart}
      ORDER BY main_stock_item_name, output_product_name;
    `;

    if (summary.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No weekly summary found for this week. Generate one first.' 
      };
    }

    // Get daily breakdown for each product
    const dailyBreakdown = await sql`
      SELECT 
        main_stock_item_id,
        output_product_key,
        log_date,
        quantity_processed,
        expected_yield,
        actual_yield,
        kitchen_issued,
        remaining
      FROM production_batches
      WHERE log_date >= ${weekStart} AND log_date <= ${weekEnd}
      ORDER BY main_stock_item_id, output_product_key, log_date;
    `;

    // Group daily breakdown by product
    const dailyMap = new Map();
    for (const record of dailyBreakdown) {
      const key = `${record.main_stock_item_id}_${record.output_product_key}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, []);
      }
      dailyMap.get(key).push({
        date: record.log_date,
        quantity_processed: Number(record.quantity_processed) || 0,
        expected_yield: Number(record.expected_yield) || 0,
        actual_yield: Number(record.actual_yield) || 0,
        kitchen_issued: Number(record.kitchen_issued) || 0,
        remaining: Number(record.remaining) || 0
      });
    }

    const weekDates = getWeekDatesInternal(weekStart);
    
    return {
      success: true,
      data: summary,
      dailyData: Object.fromEntries(dailyMap),
      weekDates,
      weekStart,
      weekEnd,
      message: 'Weekly summary loaded successfully!'
    };
    
  } catch (error) {
    console.error('Error loading weekly summary:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load weekly summary.'
    };
  }
}