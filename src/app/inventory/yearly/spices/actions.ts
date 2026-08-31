// src/app/inventory/yearly/spices/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Helper functions (internal)
function getYearRangeInternal(date: string): { yearStart: string; yearEnd: string; yearValue: number } {
  const d = new Date(date);
  const year = d.getFullYear();
  
  // First day of year
  const yearStart = new Date(year, 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  
  // Last day of year
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

// Server Actions

// Get year range
export async function getYearRange(date: string) {
  return getYearRangeInternal(date);
}

// Generate yearly summary
export async function generateYearlySpicesSummary(date: string) {
  console.log('[Server Action] generateYearlySpicesSummary initiated');
  console.log('Date:', date);

  try {
    const { yearStart, yearEnd, yearValue } = getYearRangeInternal(date);
    console.log(`Year range: ${yearStart} to ${yearEnd}`);

    // Get all monthly summaries for the year
    const monthlySummaries = await sql`
      SELECT 
        item_id,
        item_name,
        category,
        unit,
        month_start_date,
        opening_stock,
        total_added,
        total_production,
        total_kitchen,
        total_used,
        closing_stock,
        reorder_level,
        avg_daily_usage,
        stock_cover_days
      FROM spices_monthly_summary
      WHERE month_start_date >= ${yearStart} AND month_start_date <= ${yearEnd}
      ORDER BY item_id, month_start_date;
    `;

    if (monthlySummaries.length === 0) {
      return { 
        success: false, 
        message: 'No monthly data found for this year. Please generate monthly reports first.' 
      };
    }

    // Group records by item_id
    const itemMap = new Map();
    
    for (const record of monthlySummaries) {
      const itemId = record.item_id;
      
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          item_id: itemId,
          item_name: record.item_name,
          category: record.category,
          unit: record.unit,
          reorder_level: Number(record.reorder_level) || 0,
          monthly_data: [],
          year_opening: null,
          total_added: 0,
          total_production: 0,
          total_kitchen: 0,
          total_used: 0,
          year_closing: null,
          months_with_data: 0,
          total_days: 0,
          avg_daily_usage_sum: 0
        });
      }
      
      const itemData = itemMap.get(itemId);
      const monthDate = new Date(record.month_start_date);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
      
      itemData.monthly_data.push({
        month: monthName,
        monthStart: record.month_start_date,
        opening: Number(record.opening_stock) || 0,
        added: Number(record.total_added) || 0,
        production: Number(record.total_production) || 0,
        kitchen: Number(record.total_kitchen) || 0,
        used: Number(record.total_used) || 0,
        closing: Number(record.closing_stock) || 0,
        avgDaily: Number(record.avg_daily_usage) || 0
      });
      itemData.months_with_data++;
    }

    // Process each item
    const summaryData = [];
    
    for (const [itemId, itemData] of itemMap) {
      // Sort monthly data by month
      itemData.monthly_data.sort((a: any, b: any) => a.monthStart.localeCompare(b.monthStart));
      
      // Get year opening (first month's opening)
      if (itemData.monthly_data.length > 0) {
        itemData.year_opening = itemData.monthly_data[0].opening;
        itemData.year_closing = itemData.monthly_data[itemData.monthly_data.length - 1].closing;
      }
      
      // Calculate totals
      for (const month of itemData.monthly_data) {
        itemData.total_added += month.added;
        itemData.total_production += month.production;
        itemData.total_kitchen += month.kitchen;
        itemData.avg_daily_usage_sum += month.avgDaily;
      }
      
      itemData.total_used = itemData.total_production + itemData.total_kitchen;
      
      // Calculate average monthly usage
      const monthsWithData = itemData.monthly_data.filter((m: any) => m.used > 0).length;
      itemData.avg_monthly_usage = monthsWithData > 0 
        ? Number((itemData.total_used / monthsWithData).toFixed(2))
        : 0;
      
      // Calculate stock cover months
      itemData.stock_cover_months = itemData.avg_monthly_usage > 0 
        ? Number((itemData.year_closing / itemData.avg_monthly_usage).toFixed(1))
        : 0;
      
      // Calculate average daily usage (average of monthly averages)
      const monthsWithAvg = itemData.monthly_data.filter((m: any) => m.avgDaily > 0).length;
      itemData.avg_daily_usage = monthsWithAvg > 0 
        ? Number((itemData.avg_daily_usage_sum / monthsWithAvg).toFixed(2))
        : 0;
      
      summaryData.push(itemData);
    }

    // Save yearly summary to database
    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO spices_yearly_summary (
          item_id, item_name, category, unit,
          year_start_date, year_end_date, year_value,
          opening_stock, total_added, total_production, total_kitchen,
          total_used, closing_stock, reorder_level,
          avg_monthly_usage, stock_cover_months
        ) VALUES (
          ${item.item_id}, ${item.item_name}, ${item.category}, ${item.unit},
          ${yearStart}, ${yearEnd}, ${yearValue},
          ${item.year_opening}, ${item.total_added}, ${item.total_production}, ${item.total_kitchen},
          ${item.total_used}, ${item.year_closing}, ${item.reorder_level},
          ${item.avg_monthly_usage}, ${item.stock_cover_months}
        )
        ON CONFLICT (item_id, year_value) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          total_added = EXCLUDED.total_added,
          total_production = EXCLUDED.total_production,
          total_kitchen = EXCLUDED.total_kitchen,
          total_used = EXCLUDED.total_used,
          closing_stock = EXCLUDED.closing_stock,
          reorder_level = EXCLUDED.reorder_level,
          avg_monthly_usage = EXCLUDED.avg_monthly_usage,
          stock_cover_months = EXCLUDED.stock_cover_months,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/inventory/yearly/spices');
    
    return {
      success: true,
      data: summaryData,
      yearStart,
      yearEnd,
      yearValue,
      message: `Yearly summary generated for ${yearValue}`
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
export async function loadYearlySpicesSummary(date: string) {
  console.log('Loading yearly spices summary for date:', date);

  try {
    const { yearStart, yearEnd, yearValue } = getYearRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM spices_yearly_summary
      WHERE year_value = ${yearValue}
      ORDER BY category, item_name;
    `;

    if (summary.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No yearly summary found for this year. Generate one first.' 
      };
    }

    // Get monthly breakdown for each item
    const monthlyBreakdown = await sql`
      SELECT 
        item_id,
        month_start_date,
        opening_stock,
        total_added,
        total_production,
        total_kitchen,
        total_used,
        closing_stock,
        avg_daily_usage
      FROM spices_monthly_summary
      WHERE month_start_date >= ${yearStart} AND month_start_date <= ${yearEnd}
      ORDER BY item_id, month_start_date;
    `;

    // Group monthly breakdown by item
    const monthlyMap = new Map();
    for (const record of monthlyBreakdown) {
      if (!monthlyMap.has(record.item_id)) {
        monthlyMap.set(record.item_id, []);
      }
      const monthDate = new Date(record.month_start_date);
      monthlyMap.get(record.item_id).push({
        month: monthDate.toLocaleDateString('en-US', { month: 'long' }),
        monthStart: record.month_start_date,
        opening: Number(record.opening_stock) || 0,
        added: Number(record.total_added) || 0,
        production: Number(record.total_production) || 0,
        kitchen: Number(record.total_kitchen) || 0,
        used: Number(record.total_used) || 0,
        closing: Number(record.closing_stock) || 0,
        avgDaily: Number(record.avg_daily_usage) || 0
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