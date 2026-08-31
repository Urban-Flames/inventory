// src/app/production/monthly/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

function getMonthRangeInternal(date: string): { monthStart: string; monthEnd: string; monthName: string } {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  
  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  return {
    monthStart: monthStart.toISOString().split('T')[0],
    monthEnd: monthEnd.toISOString().split('T')[0],
    monthName: `${monthNames[month]} ${year}`
  };
}

function getMonthDatesInternal(monthStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(monthStart);
  const month = start.getMonth();
  const year = start.getFullYear();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Get month range
export async function getMonthRange(date: string) {
  return getMonthRangeInternal(date);
}

// Generate monthly summary
export async function generateMonthlyProductionSummary(date: string) {
  console.log('[Server Action] generateMonthlyProductionSummary initiated');
  console.log('Date:', date);

  try {
    const { monthStart, monthEnd, monthName } = getMonthRangeInternal(date);
    console.log(`Month range: ${monthStart} to ${monthEnd}`);

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
      WHERE log_date >= ${monthStart} AND log_date <= ${monthEnd}
      ORDER BY main_stock_item_id, output_product_key, log_date;
    `;

    if (batches.length === 0) {
      return { 
        success: false, 
        message: 'No production data found for this month. Please generate daily production data first.' 
      };
    }

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

    const summaryData = [];
    
    for (const [key, itemData] of itemMap) {
      itemData.avg_yield_per_batch = itemData.batch_count > 0 
        ? Number((itemData.total_actual_yield / itemData.batch_count).toFixed(2))
        : 0;
      
      itemData.daily_data.sort((a: any, b: any) => a.date.localeCompare(b.date));
      
      summaryData.push(itemData);
    }

    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO production_monthly_summary (
          main_stock_item_id, main_stock_item_name,
          output_product_key, output_product_name, unit,
          month_start_date, month_end_date,
          total_quantity_processed, total_expected_yield,
          total_actual_yield, total_kitchen_issued,
          total_remaining, batch_count, avg_yield_per_batch
        ) VALUES (
          ${item.main_stock_item_id}, ${item.main_stock_item_name},
          ${item.output_product_key}, ${item.output_product_name}, ${item.unit},
          ${monthStart}, ${monthEnd},
          ${item.total_quantity_processed}, ${item.total_expected_yield},
          ${item.total_actual_yield}, ${item.total_kitchen_issued},
          ${item.total_remaining}, ${item.batch_count}, ${item.avg_yield_per_batch}
        )
        ON CONFLICT (main_stock_item_id, output_product_key, month_start_date) 
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
    revalidatePath('/production/monthly');
    
    return {
      success: true,
      data: summaryData,
      monthStart,
      monthEnd,
      monthName,
      message: `Monthly production summary generated for ${monthName}`
    };
    
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Error generating monthly summary:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate monthly summary.'
    };
  }
}

// Load monthly summary data
export async function loadMonthlyProductionSummary(date: string) {
  console.log('Loading monthly production summary for date:', date);

  try {
    const { monthStart, monthEnd, monthName } = getMonthRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM production_monthly_summary
      WHERE month_start_date = ${monthStart}
      ORDER BY main_stock_item_name, output_product_name;
    `;

    if (summary.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No monthly summary found for this month. Generate one first.' 
      };
    }

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
      WHERE log_date >= ${monthStart} AND log_date <= ${monthEnd}
      ORDER BY main_stock_item_id, output_product_key, log_date;
    `;

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

    const monthDates = getMonthDatesInternal(monthStart);
    
    return {
      success: true,
      data: summary,
      dailyData: Object.fromEntries(dailyMap),
      monthDates,
      monthStart,
      monthEnd,
      monthName,
      message: 'Monthly summary loaded successfully!'
    };
    
  } catch (error) {
    console.error('Error loading monthly summary:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load monthly summary.'
    };
  }
}