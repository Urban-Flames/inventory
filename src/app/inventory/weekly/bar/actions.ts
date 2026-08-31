// src/app/inventory/weekly/bar/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Helper functions (internal)
function getWeekRangeInternal(date: string): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  
  // Get Monday of the week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  // Get Sunday of the week
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
export async function generateWeeklyBarSummary(date: string) {
  console.log('[Server Action] generateWeeklyBarSummary initiated');
  console.log('Date:', date);

  try {
    const { weekStart, weekEnd } = getWeekRangeInternal(date);
    console.log(`Week range: ${weekStart} to ${weekEnd}`);

    // Get all daily records for the week
    const dailyRecords = await sql`
      SELECT 
        item_id,
        item_name,
        category,
        unit,
        down_open,
        down_add,
        down_close,
        fridge_open,
        fridge_add,
        fridge_close,
        waste,
        total_stock,
        total_sales,
        log_date
      FROM bar_daily_logs
      WHERE log_date >= ${weekStart} AND log_date <= ${weekEnd}
      ORDER BY item_id, log_date;
    `;

    if (dailyRecords.length === 0) {
      return { 
        success: false, 
        message: 'No daily data found for this week. Please enter daily inventory data first.' 
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
          daily_data: [],
          week_opening: null,
          total_added: 0,
          total_waste: 0,
          total_sales: 0,
          week_closing: null,
          days_with_data: 0
        });
      }
      
      const itemData = itemMap.get(itemId);
      const totalStock = Number(record.total_stock) || 0;
      
      itemData.daily_data.push({
        date: record.log_date,
        downOpen: Number(record.down_open) || 0,
        downAdd: Number(record.down_add) || 0,
        downClose: Number(record.down_close) || 0,
        fridgeOpen: Number(record.fridge_open) || 0,
        fridgeAdd: Number(record.fridge_add) || 0,
        fridgeClose: Number(record.fridge_close) || 0,
        waste: Number(record.waste) || 0,
        totalStock: totalStock,
        totalSales: Number(record.total_sales) || 0
      });
      itemData.days_with_data++;
    }

    // Process each item
    const summaryData = [];
    
    for (const [itemId, itemData] of itemMap) {
      // Sort daily data by date
      itemData.daily_data.sort((a: any, b: any) => a.date.localeCompare(b.date));
      
      // Get week opening (first day's total stock)
      if (itemData.daily_data.length > 0) {
        itemData.week_opening = itemData.daily_data[0].totalStock;
        itemData.week_closing = itemData.daily_data[itemData.daily_data.length - 1].totalStock;
      }
      
      // Calculate totals
      for (const day of itemData.daily_data) {
        itemData.total_added += day.downAdd + day.fridgeAdd;
        itemData.total_waste += day.waste;
        itemData.total_sales += day.totalSales;
      }
      
      // Calculate average daily sales
      const salesDays = itemData.daily_data.filter((d: any) => d.totalSales > 0).length;
      itemData.avg_daily_sales = salesDays > 0 
        ? Number((itemData.total_sales / salesDays).toFixed(2))
        : 0;
      
      // Calculate stock cover days (based on sales)
      itemData.stock_cover_days = itemData.avg_daily_sales > 0 
        ? Number((itemData.week_closing / itemData.avg_daily_sales).toFixed(1))
        : 0;
      
      summaryData.push(itemData);
    }

    // Save weekly summary to database
    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO bar_weekly_summary (
          item_id, item_name, category, unit,
          week_start_date, week_end_date,
          opening_stock, total_added, total_waste,
          total_sales, closing_stock,
          avg_daily_sales, stock_cover_days
        ) VALUES (
          ${item.item_id}, ${item.item_name}, ${item.category}, ${item.unit},
          ${weekStart}, ${weekEnd},
          ${item.week_opening}, ${item.total_added}, ${item.total_waste},
          ${item.total_sales}, ${item.week_closing},
          ${item.avg_daily_sales}, ${item.stock_cover_days}
        )
        ON CONFLICT (item_id, week_start_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          total_added = EXCLUDED.total_added,
          total_waste = EXCLUDED.total_waste,
          total_sales = EXCLUDED.total_sales,
          closing_stock = EXCLUDED.closing_stock,
          avg_daily_sales = EXCLUDED.avg_daily_sales,
          stock_cover_days = EXCLUDED.stock_cover_days,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/inventory/weekly/bar');
    
    return {
      success: true,
      data: summaryData,
      weekStart,
      weekEnd,
      message: `Weekly summary generated for ${weekStart} to ${weekEnd}`
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
export async function loadWeeklyBarSummary(date: string) {
  console.log('Loading weekly bar summary for date:', date);

  try {
    const { weekStart, weekEnd } = getWeekRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM bar_weekly_summary
      WHERE week_start_date = ${weekStart}
      ORDER BY category, item_name;
    `;

    if (summary.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No weekly summary found for this week. Generate one first.' 
      };
    }

    // Get daily breakdown for each item
    const dailyBreakdown = await sql`
      SELECT 
        item_id,
        log_date,
        down_open,
        down_add,
        down_close,
        fridge_open,
        fridge_add,
        fridge_close,
        waste,
        total_stock,
        total_sales
      FROM bar_daily_logs
      WHERE log_date >= ${weekStart} AND log_date <= ${weekEnd}
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
        downOpen: Number(record.down_open) || 0,
        downAdd: Number(record.down_add) || 0,
        downClose: Number(record.down_close) || 0,
        fridgeOpen: Number(record.fridge_open) || 0,
        fridgeAdd: Number(record.fridge_add) || 0,
        fridgeClose: Number(record.fridge_close) || 0,
        waste: Number(record.waste) || 0,
        totalStock: Number(record.total_stock) || 0,
        totalSales: Number(record.total_sales) || 0
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