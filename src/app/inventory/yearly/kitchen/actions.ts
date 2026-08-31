// src/app/inventory/yearly/kitchen/actions.ts
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
export async function generateYearlyKitchenSummary(date: string) {
  console.log('[Server Action] generateYearlyKitchenSummary initiated');
  console.log('Date:', date);

  try {
    const { yearStart, yearEnd, yearValue } = getYearRangeInternal(date);
    console.log(`Year range: ${yearStart} to ${yearEnd}`);

    const monthlySummaries = await sql`
      SELECT 
        item_id,
        item_name,
        category,
        unit,
        month_start_date,
        opening_stock,
        total_received,
        total_waste,
        total_sales,
        closing_stock,
        avg_daily_sales,
        stock_cover_days,
        total_variance
      FROM kitchen_monthly_summary
      WHERE month_start_date >= ${yearStart} AND month_start_date <= ${yearEnd}
      ORDER BY item_id, month_start_date;
    `;

    if (monthlySummaries.length === 0) {
      return { 
        success: false, 
        message: 'No monthly data found for this year. Please generate monthly reports first.' 
      };
    }

    const itemMap = new Map();
    
    for (const record of monthlySummaries) {
      const itemId = record.item_id;
      
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          item_id: itemId,
          item_name: record.item_name,
          category: record.category,
          unit: record.unit,
          monthly_data: [],
          year_opening: null,
          total_received: 0,
          total_waste: 0,
          total_sales: 0,
          total_variance: 0,
          year_closing: null,
          months_with_data: 0,
          avg_daily_sales_sum: 0
        });
      }
      
      const itemData = itemMap.get(itemId);
      const monthDate = new Date(record.month_start_date);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
      
      itemData.monthly_data.push({
        month: monthName,
        monthStart: record.month_start_date,
        opening: Number(record.opening_stock) || 0,
        received: Number(record.total_received) || 0,
        waste: Number(record.total_waste) || 0,
        sales: Number(record.total_sales) || 0,
        closing: Number(record.closing_stock) || 0,
        avgDailySales: Number(record.avg_daily_sales) || 0,
        variance: Number(record.total_variance) || 0
      });
      itemData.months_with_data++;
    }

    const summaryData = [];
    
    for (const [itemId, itemData] of itemMap) {
      itemData.monthly_data.sort((a: any, b: any) => a.monthStart.localeCompare(b.monthStart));
      
      if (itemData.monthly_data.length > 0) {
        itemData.year_opening = itemData.monthly_data[0].opening;
        itemData.year_closing = itemData.monthly_data[itemData.monthly_data.length - 1].closing;
      }
      
      for (const month of itemData.monthly_data) {
        itemData.total_received += month.received;
        itemData.total_waste += month.waste;
        itemData.total_sales += month.sales;
        itemData.total_variance += month.variance;
        itemData.avg_daily_sales_sum += month.avgDailySales;
      }
      
      const monthsWithSales = itemData.monthly_data.filter((m: any) => m.sales > 0).length;
      itemData.avg_monthly_sales = monthsWithSales > 0 
        ? Number((itemData.total_sales / monthsWithSales).toFixed(2))
        : 0;
      
      itemData.stock_cover_months = itemData.avg_monthly_sales > 0 
        ? Number((itemData.year_closing / itemData.avg_monthly_sales).toFixed(1))
        : 0;
      
      const monthsWithAvg = itemData.monthly_data.filter((m: any) => m.avgDailySales > 0).length;
      itemData.avg_daily_sales = monthsWithAvg > 0 
        ? Number((itemData.avg_daily_sales_sum / monthsWithAvg).toFixed(2))
        : 0;
      
      summaryData.push(itemData);
    }

    await sql`BEGIN`;
    
    for (const item of summaryData) {
      await sql`
        INSERT INTO kitchen_yearly_summary (
          item_id, item_name, category, unit,
          year_start_date, year_end_date, year_value,
          opening_stock, total_received, total_waste,
          total_sales, closing_stock,
          avg_monthly_sales, stock_cover_months, total_variance
        ) VALUES (
          ${item.item_id}, ${item.item_name}, ${item.category}, ${item.unit},
          ${yearStart}, ${yearEnd}, ${yearValue},
          ${item.year_opening}, ${item.total_received}, ${item.total_waste},
          ${item.total_sales}, ${item.year_closing},
          ${item.avg_monthly_sales}, ${item.stock_cover_months}, ${item.total_variance}
        )
        ON CONFLICT (item_id, year_value) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          total_received = EXCLUDED.total_received,
          total_waste = EXCLUDED.total_waste,
          total_sales = EXCLUDED.total_sales,
          closing_stock = EXCLUDED.closing_stock,
          avg_monthly_sales = EXCLUDED.avg_monthly_sales,
          stock_cover_months = EXCLUDED.stock_cover_months,
          total_variance = EXCLUDED.total_variance,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    await sql`COMMIT`;
    revalidatePath('/inventory/yearly/kitchen');
    
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
export async function loadYearlyKitchenSummary(date: string) {
  console.log('Loading yearly kitchen summary for date:', date);

  try {
    const { yearStart, yearEnd, yearValue } = getYearRangeInternal(date);
    
    const summary = await sql`
      SELECT * FROM kitchen_yearly_summary
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

    const monthlyBreakdown = await sql`
      SELECT 
        item_id,
        month_start_date,
        opening_stock,
        total_received,
        total_waste,
        total_sales,
        closing_stock,
        avg_daily_sales,
        total_variance
      FROM kitchen_monthly_summary
      WHERE month_start_date >= ${yearStart} AND month_start_date <= ${yearEnd}
      ORDER BY item_id, month_start_date;
    `;

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
        received: Number(record.total_received) || 0,
        waste: Number(record.total_waste) || 0,
        sales: Number(record.total_sales) || 0,
        closing: Number(record.closing_stock) || 0,
        avgDailySales: Number(record.avg_daily_sales) || 0,
        variance: Number(record.total_variance) || 0
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