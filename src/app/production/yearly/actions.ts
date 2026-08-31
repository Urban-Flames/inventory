// src/app/production/yearly/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

function getYearRangeInternal(date: string): { yearStart: string; yearEnd: string; yearValue: number } {
  const d = new Date(date);
  const year = d.getFullYear();
  
  const yearStart = new Date(year, 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  
  const yearEnd = new Date(year, 11, 31);
  yearEnd.setHours(23, 59, 59, 999);
  
  return {
    yearStart: yearStart.toISOString().split('T')[0],
    yearEnd: yearEnd.toISOString().split('T')[0],
    yearValue: year
  };
}

function getMonthNamesInternal(): string[] {
  return ['January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'];
}

// Get year range
export async function getYearRange(date: string) {
  return getYearRangeInternal(date);
}

// Generate yearly summary
export async function generateYearlyProductionSummary(date: string) {
  console.log('[Server Action] generateYearlyProductionSummary initiated');
  console.log('Date:', date);

  try {
    const { yearStart, yearEnd, yearValue } = getYearRangeInternal(date);
    console.log(`Year range: ${yearStart} to ${yearEnd}`);

    const monthlySummaries = await sql`
      SELECT 
        main_stock_item_id,
        main_stock_item_name,
        output_product_key,
        output_product_name,
        unit,
        month_start_date,
        total_quantity_processed,
        total_expected_yield,
        total_actual_yield,
        total_kitchen_issued,
        total_remaining,
        batch_count,
        avg_yield_per_batch
      FROM production_monthly_summary
      WHERE month_start_date >= ${yearStart} AND month_start_date <= ${yearEnd}
      ORDER BY main_stock_item_id, output_product_key, month_start_date;
    `;

    if (monthlySummaries.length === 0) {
      return { 
        success: false, 
        message: 'No monthly production data found for this year. Please generate monthly reports first.' 
      };
    }

    const itemMap = new Map();
    
    for (const record of monthlySummaries) {
      const key = `${record.main_stock_item_id}_${record.output_product_key}`;
      
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          main_stock_item_id: record.main_stock_item_id,
          main_stock_item_name: record.main_stock_item_name,
          output_product_key: record.output_product_key,
          output_product_name: record.output_product_name,
          unit: record.unit,
          monthly_data: [],
          total_quantity_processed: 0,
          total_expected_yield: 0,
          total_actual_yield: 0,
          total_kitchen_issued: 0,
          total_remaining: 0,
          batch_count: 0,
          avg_yield_per_batch_sum: 0,
          months_with_production: 0
        });
      }
      
      const itemData = itemMap.get(key);
      const monthDate = new Date(record.month_start_date);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
      
      itemData.monthly_data.push({
        month: monthName,
        monthStart: record.month_start_date,
        quantity_processed: Number(record.total_quantity_processed) || 0,
        expected_yield: Number(record.total_expected_yield) || 0,
        actual_yield: Number(record.total_actual_yield) || 0,
        kitchen_issued: Number(record.total_kitchen_issued) || 0,
        remaining: Number(record.total_remaining) || 0,
        batch_count: Number(record.batch_count) || 0,
        avg_yield_per_batch: Number(record.avg_yield_per_batch) || 0
      });
      
      itemData.total_quantity_processed += Number(record.total_quantity_processed) || 0;
      itemData.total_expected_yield += Number(record.total_expected_yield) || 0;
      itemData.total_actual_yield += Number(record.total_actual_yield) || 0;
      itemData.total_kitchen_issued += Number(record.total_kitchen_issued) || 0;
      itemData.total_remaining += Number(record.total_remaining) || 0;
      itemData.batch_count += Number(record.batch_count) || 0;
      itemData.avg_yield_per_batch_sum += Number(record.avg_yield_per_batch) || 0;
      
      if (Number(record.total_quantity_processed) > 0) {
        itemData.months_with_production++;
      }
    }

    const summaryData = [];
    
    for (const [key, itemData] of itemMap) {
      // Calculate average monthly yield
      itemData.avg_monthly_yield = itemData.months_with_production > 0 
        ? Number((itemData.total_actual_yield / itemData.months_with_production).toFixed(2))
        : 0;
      
      // Calculate average yield per batch (overall)
      itemData.avg_yield_per_batch = itemData.batch_count > 0 
        ? Number((itemData.total_actual_yield / itemData.batch_count).toFixed(2))
        : 0;
      
      // Sort monthly data by date
      itemData.monthly_data.sort((a: any, b: any) => a.monthStart.localeCompare(b.monthStart));
      
      summaryData.push(itemData);
    }

    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO production_yearly_summary (
          main_stock_item_id, main_stock_item_name,
          output_product_key, output_product_name, unit,
          year_start_date, year_end_date, year_value,
          total_quantity_processed, total_expected_yield,
          total_actual_yield, total_kitchen_issued,
          total_remaining, batch_count,
          avg_monthly_yield, avg_yield_per_batch,
          months_with_production
        ) VALUES (
          ${item.main_stock_item_id}, ${item.main_stock_item_name},
          ${item.output_product_key}, ${item.output_product_name}, ${item.unit},
          ${yearStart}, ${yearEnd}, ${yearValue},
          ${item.total_quantity_processed}, ${item.total_expected_yield},
          ${item.total_actual_yield}, ${item.total_kitchen_issued},
          ${item.total_remaining}, ${item.batch_count},
          ${item.avg_monthly_yield}, ${item.avg_yield_per_batch},
          ${item.months_with_production}
        )
        ON CONFLICT (main_stock_item_id, output_product_key, year_value) 
        DO UPDATE SET 
          total_quantity_processed = EXCLUDED.total_quantity_processed,
          total_expected_yield = EXCLUDED.total_expected_yield,
          total_actual_yield = EXCLUDED.total_actual_yield,
          total_kitchen_issued = EXCLUDED.total_kitchen_issued,
          total_remaining = EXCLUDED.total_remaining,
          batch_count = EXCLUDED.batch_count,
          avg_monthly_yield = EXCLUDED.avg_monthly_yield,
          avg_yield_per_batch = EXCLUDED.avg_yield_per_batch,
          months_with_production = EXCLUDED.months_with_production,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/production/yearly');
    
    return {
      success: true,
      data: summaryData,
      yearStart,
      yearEnd,
      yearValue,
      message: `Yearly production summary generated for ${yearValue}`
    };
    
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Error generating yearly summary:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate yearly summary.'
    };
  }
}

// Load yearly summary data
export async function loadYearlyProductionSummary(date: string) {
  console.log('Loading yearly production summary for date:', date);

  try {
    const { yearStart, yearEnd, yearValue } = getYearRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM production_yearly_summary
      WHERE year_value = ${yearValue}
      ORDER BY main_stock_item_name, output_product_name;
    `;

    if (summary.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No yearly summary found for this year. Generate one first.' 
      };
    }

    const monthlyBreakdown = await sql`
      SELECT 
        main_stock_item_id,
        output_product_key,
        month_start_date,
        total_quantity_processed,
        total_expected_yield,
        total_actual_yield,
        total_kitchen_issued,
        total_remaining,
        batch_count,
        avg_yield_per_batch
      FROM production_monthly_summary
      WHERE month_start_date >= ${yearStart} AND month_start_date <= ${yearEnd}
      ORDER BY main_stock_item_id, output_product_key, month_start_date;
    `;

    const monthlyMap = new Map();
    for (const record of monthlyBreakdown) {
      const key = `${record.main_stock_item_id}_${record.output_product_key}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, []);
      }
      const monthDate = new Date(record.month_start_date);
      monthlyMap.get(key).push({
        month: monthDate.toLocaleDateString('en-US', { month: 'long' }),
        monthStart: record.month_start_date,
        quantity_processed: Number(record.total_quantity_processed) || 0,
        expected_yield: Number(record.total_expected_yield) || 0,
        actual_yield: Number(record.total_actual_yield) || 0,
        kitchen_issued: Number(record.total_kitchen_issued) || 0,
        remaining: Number(record.total_remaining) || 0,
        batch_count: Number(record.batch_count) || 0,
        avg_yield_per_batch: Number(record.avg_yield_per_batch) || 0
      });
    }

    const monthNames = getMonthNamesInternal();
    
    return {
      success: true,
      data: summary,
      monthlyData: Object.fromEntries(monthlyMap),
      monthNames,
      yearStart,
      yearEnd,
      yearValue,
      message: 'Yearly summary loaded successfully!'
    };
    
  } catch (error) {
    console.error('Error loading yearly summary:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load yearly summary.'
    };
  }
}