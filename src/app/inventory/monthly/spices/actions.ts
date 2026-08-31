// src/app/inventory/monthly/spices/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Helper functions (internal)
function getMonthRangeInternal(date: string): { monthStart: string; monthEnd: string; monthName: string } {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  
  // First day of month
  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);
  
  // Last day of month
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
  
  // Get all days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Server Actions

// Get month range
export async function getMonthRange(date: string) {
  return getMonthRangeInternal(date);
}

// Generate monthly summary
export async function generateMonthlySpicesSummary(date: string) {
  console.log('[Server Action] generateMonthlySpicesSummary initiated');
  console.log('Date:', date);

  try {
    const { monthStart, monthEnd, monthName } = getMonthRangeInternal(date);
    console.log(`Month range: ${monthStart} to ${monthEnd}`);

    // Get all daily records for the month
    const dailyRecords = await sql`
      SELECT 
        item_id,
        item_name,
        category,
        unit,
        opening_stock,
        added_stock,
        issued_to_production,
        issued_to_kitchen,
        closing_stock,
        reorder_level,
        log_date
      FROM spices_daily_logs
      WHERE log_date >= ${monthStart} AND log_date <= ${monthEnd}
      ORDER BY item_id, log_date;
    `;

    if (dailyRecords.length === 0) {
      return { 
        success: false, 
        message: 'No daily data found for this month. Please enter daily inventory data first.' 
      };
    }

    // Group records by item_id
    const itemMap = new Map();
    
    for (const record of dailyRecords) {
      const itemId = record.item_id;
      
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          item_id: itemId,
          item_name: record.item_name,
          category: record.category,
          unit: record.unit,
          reorder_level: Number(record.reorder_level) || 0,
          daily_data: [],
          month_opening: null,
          total_added: 0,
          total_production: 0,
          total_kitchen: 0,
          total_used: 0,
          month_closing: null,
          days_with_data: 0
        });
      }
      
      const itemData = itemMap.get(itemId);
      itemData.daily_data.push({
        date: record.log_date,
        opening: Number(record.opening_stock) || 0,
        added: Number(record.added_stock) || 0,
        production: Number(record.issued_to_production) || 0,
        kitchen: Number(record.issued_to_kitchen) || 0,
        closing: Number(record.closing_stock) || 0
      });
      itemData.days_with_data++;
    }

    // Process each item
    const summaryData = [];
    
    for (const [itemId, itemData] of itemMap) {
      // Sort daily data by date
      itemData.daily_data.sort((a: any, b: any) => a.date.localeCompare(b.date));
      
      // Get month opening (first day's opening)
      if (itemData.daily_data.length > 0) {
        itemData.month_opening = itemData.daily_data[0].opening;
        itemData.month_closing = itemData.daily_data[itemData.daily_data.length - 1].closing;
      }
      
      // Calculate totals
      for (const day of itemData.daily_data) {
        itemData.total_added += day.added;
        itemData.total_production += day.production;
        itemData.total_kitchen += day.kitchen;
      }
      
      itemData.total_used = itemData.total_production + itemData.total_kitchen;
      
      // Calculate average daily usage
      const usageDays = itemData.daily_data.filter((d: any) => (d.production + d.kitchen) > 0).length;
      itemData.avg_daily_usage = usageDays > 0 
        ? Number((itemData.total_used / usageDays).toFixed(2))
        : 0;
      
      // Calculate stock cover days
      itemData.stock_cover_days = itemData.avg_daily_usage > 0 
        ? Number((itemData.month_closing / itemData.avg_daily_usage).toFixed(1))
        : 0;
      
      summaryData.push(itemData);
    }

    // Save monthly summary to database
    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO spices_monthly_summary (
          item_id, item_name, category, unit,
          month_start_date, month_end_date,
          opening_stock, total_added, total_production, total_kitchen,
          total_used, closing_stock, reorder_level,
          avg_daily_usage, stock_cover_days
        ) VALUES (
          ${item.item_id}, ${item.item_name}, ${item.category}, ${item.unit},
          ${monthStart}, ${monthEnd},
          ${item.month_opening}, ${item.total_added}, ${item.total_production}, ${item.total_kitchen},
          ${item.total_used}, ${item.month_closing}, ${item.reorder_level},
          ${item.avg_daily_usage}, ${item.stock_cover_days}
        )
        ON CONFLICT (item_id, month_start_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          total_added = EXCLUDED.total_added,
          total_production = EXCLUDED.total_production,
          total_kitchen = EXCLUDED.total_kitchen,
          total_used = EXCLUDED.total_used,
          closing_stock = EXCLUDED.closing_stock,
          reorder_level = EXCLUDED.reorder_level,
          avg_daily_usage = EXCLUDED.avg_daily_usage,
          stock_cover_days = EXCLUDED.stock_cover_days,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/inventory/monthly/spices');
    
    return {
      success: true,
      data: summaryData,
      monthStart,
      monthEnd,
      monthName,
      message: `Monthly summary generated for ${monthName}`
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
export async function loadMonthlySpicesSummary(date: string) {
  console.log('Loading monthly spices summary for date:', date);

  try {
    const { monthStart, monthEnd, monthName } = getMonthRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM spices_monthly_summary
      WHERE month_start_date = ${monthStart}
      ORDER BY category, item_name;
    `;

    if (summary.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No monthly summary found for this month. Generate one first.' 
      };
    }

    // Get daily breakdown for each item
    const dailyBreakdown = await sql`
      SELECT 
        item_id,
        log_date,
        opening_stock,
        added_stock,
        issued_to_production,
        issued_to_kitchen,
        closing_stock
      FROM spices_daily_logs
      WHERE log_date >= ${monthStart} AND log_date <= ${monthEnd}
      ORDER BY item_id, log_date;
    `;

    // Group daily breakdown by item
    const dailyMap = new Map();
    for (const record of dailyBreakdown) {
      if (!dailyMap.has(record.item_id)) {
        dailyMap.set(record.item_id, []);
      }
      dailyMap.get(record.item_id).push({
        date: record.log_date,
        opening: Number(record.opening_stock) || 0,
        added: Number(record.added_stock) || 0,
        production: Number(record.issued_to_production) || 0,
        kitchen: Number(record.issued_to_kitchen) || 0,
        closing: Number(record.closing_stock) || 0
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