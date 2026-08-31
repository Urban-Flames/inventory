// src/app/inventory/monthly/kitchen/actions.ts
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
export async function generateMonthlyKitchenSummary(date: string) {
  console.log('[Server Action] generateMonthlyKitchenSummary initiated');
  console.log('Date:', date);

  try {
    const { monthStart, monthEnd, monthName } = getMonthRangeInternal(date);
    console.log(`Month range: ${monthStart} to ${monthEnd}`);

    const dailyRecords = await sql`
      SELECT 
        item_id,
        item_name,
        category,
        unit,
        morning_stock,
        received_from_stock,
        total_stock,
        actual_closing_stock,
        waste,
        sales_deduction,
        variance,
        log_date
      FROM kitchen_daily_logs
      WHERE log_date >= ${monthStart} AND log_date <= ${monthEnd}
      ORDER BY item_id, log_date;
    `;

    if (dailyRecords.length === 0) {
      return { 
        success: false, 
        message: 'No daily data found for this month. Please enter daily inventory data first.' 
      };
    }

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
          month_opening: null,
          total_received: 0,
          total_waste: 0,
          total_sales: 0,
          total_variance: 0,
          month_closing: null,
          days_with_data: 0
        });
      }
      
      const itemData = itemMap.get(itemId);
      itemData.daily_data.push({
        date: record.log_date,
        morningStock: Number(record.morning_stock) || 0,
        received: Number(record.received_from_stock) || 0,
        totalStock: Number(record.total_stock) || 0,
        closing: Number(record.actual_closing_stock) || 0,
        waste: Number(record.waste) || 0,
        sales: Number(record.sales_deduction) || 0,
        variance: Number(record.variance) || 0
      });
      itemData.days_with_data++;
    }

    const summaryData = [];
    
    for (const [itemId, itemData] of itemMap) {
      itemData.daily_data.sort((a: any, b: any) => a.date.localeCompare(b.date));
      
      if (itemData.daily_data.length > 0) {
        itemData.month_opening = itemData.daily_data[0].morningStock;
        itemData.month_closing = itemData.daily_data[itemData.daily_data.length - 1].closing;
      }
      
      for (const day of itemData.daily_data) {
        itemData.total_received += day.received;
        itemData.total_waste += day.waste;
        itemData.total_sales += day.sales;
        itemData.total_variance += Math.abs(day.variance);
      }
      
      const salesDays = itemData.daily_data.filter((d: any) => d.sales > 0).length;
      itemData.avg_daily_sales = salesDays > 0 
        ? Number((itemData.total_sales / salesDays).toFixed(2))
        : 0;
      
      itemData.stock_cover_days = itemData.avg_daily_sales > 0 
        ? Number((itemData.month_closing / itemData.avg_daily_sales).toFixed(1))
        : 0;
      
      summaryData.push(itemData);
    }

    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO kitchen_monthly_summary (
          item_id, item_name, category, unit,
          month_start_date, month_end_date,
          opening_stock, total_received, total_waste,
          total_sales, closing_stock,
          avg_daily_sales, stock_cover_days, total_variance
        ) VALUES (
          ${item.item_id}, ${item.item_name}, ${item.category}, ${item.unit},
          ${monthStart}, ${monthEnd},
          ${item.month_opening}, ${item.total_received}, ${item.total_waste},
          ${item.total_sales}, ${item.month_closing},
          ${item.avg_daily_sales}, ${item.stock_cover_days}, ${item.total_variance}
        )
        ON CONFLICT (item_id, month_start_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          total_received = EXCLUDED.total_received,
          total_waste = EXCLUDED.total_waste,
          total_sales = EXCLUDED.total_sales,
          closing_stock = EXCLUDED.closing_stock,
          avg_daily_sales = EXCLUDED.avg_daily_sales,
          stock_cover_days = EXCLUDED.stock_cover_days,
          total_variance = EXCLUDED.total_variance,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/inventory/monthly/kitchen');
    
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
export async function loadMonthlyKitchenSummary(date: string) {
  console.log('Loading monthly kitchen summary for date:', date);

  try {
    const { monthStart, monthEnd, monthName } = getMonthRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM kitchen_monthly_summary
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

    const dailyBreakdown = await sql`
      SELECT 
        item_id,
        log_date,
        morning_stock,
        received_from_stock,
        total_stock,
        actual_closing_stock,
        waste,
        sales_deduction,
        variance
      FROM kitchen_daily_logs
      WHERE log_date >= ${monthStart} AND log_date <= ${monthEnd}
      ORDER BY item_id, log_date;
    `;

    const dailyMap = new Map();
    for (const record of dailyBreakdown) {
      if (!dailyMap.has(record.item_id)) {
        dailyMap.set(record.item_id, []);
      }
      dailyMap.get(record.item_id).push({
        date: record.log_date,
        morningStock: Number(record.morning_stock) || 0,
        received: Number(record.received_from_stock) || 0,
        totalStock: Number(record.total_stock) || 0,
        closing: Number(record.actual_closing_stock) || 0,
        waste: Number(record.waste) || 0,
        sales: Number(record.sales_deduction) || 0,
        variance: Number(record.variance) || 0
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