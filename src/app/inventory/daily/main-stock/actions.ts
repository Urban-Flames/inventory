// src/app/inventory/daily/main-stock/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface SavePayload {
  items: Array<{
    id: string;
    name: string;
    category: string;
    unit: string;
    openingStock: number;
    addedStock: number;
    issuedToProduction: number;
    issuedToKitchen: number;
    closingStock: number;
    reorderLevel: number;
    usageType: string;
    substituteFor?: string;
  }>;
  productionDetails: Record<
    string,
    {
      itemId: string;
      itemName: string;
      cartonsIssued: number;
      totalWeightKg: number;
      wasteWeightKg: number;
      portions: Record<string, number>;
      unit?: string;
    }
  >;
  logDate: string;
}

export async function saveDailyMainStock(data: SavePayload) {
  console.log('[Server Action] saveDailyMainStock initiated');
  console.log('Date:', data.logDate);
  console.log('Items count:', data?.items?.length || 0);
  console.log('Production details count:', Object.keys(data?.productionDetails || {}).length);

  if (!data?.items || data.items.length === 0) {
    return { success: false, message: 'No items to save.' };
  }

  try {
    const today = data.logDate || new Date().toISOString().split('T')[0];
    
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    await sql`BEGIN`;

    // 1. Save Main Stock Items
    for (const item of data.items) {
      await sql`
        INSERT INTO daily_main_stock_logs (
          item_id, item_name, category, unit, 
          opening_stock, added_stock, issued_to_production, 
          issued_to_kitchen, closing_stock,
          usage_type, substitute_for, log_date
        ) VALUES (
          ${item.id}, ${item.name}, ${item.category}, ${item.unit},
          ${Number(item.openingStock) || 0}, ${Number(item.addedStock) || 0}, 
          ${Number(item.issuedToProduction) || 0},
          ${Number(item.issuedToKitchen) || 0}, ${Number(item.closingStock) || 0},
          ${item.usageType || 'direct_sale'},
          ${item.substituteFor || null},
          ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          opening_stock = EXCLUDED.opening_stock,
          added_stock = EXCLUDED.added_stock,
          issued_to_production = EXCLUDED.issued_to_production,
          issued_to_kitchen = EXCLUDED.issued_to_kitchen,
          closing_stock = EXCLUDED.closing_stock,
          usage_type = EXCLUDED.usage_type,
          substitute_for = EXCLUDED.substitute_for;
      `;

      const tomorrowRecord = await sql`
        SELECT * FROM daily_main_stock_logs 
        WHERE item_id = ${item.id} AND log_date = ${tomorrow};
      `;

      if (tomorrowRecord.length === 0) {
        const closingStock = Number(item.closingStock) || 0;
        
        await sql`
          INSERT INTO daily_main_stock_logs (
            item_id, item_name, category, unit,
            opening_stock, added_stock, issued_to_production,
            issued_to_kitchen, closing_stock,
            usage_type, substitute_for, log_date
          ) VALUES (
            ${item.id}, ${item.name}, ${item.category}, ${item.unit},
            ${closingStock}, 0, 0, 0, ${closingStock},
            ${item.usageType || 'direct_sale'},
            ${item.substituteFor || null},
            ${tomorrow}
          )
          ON CONFLICT (item_id, log_date) 
          DO UPDATE SET 
            opening_stock = EXCLUDED.opening_stock,
            closing_stock = EXCLUDED.closing_stock;
        `;
      } else {
        await sql`
          UPDATE daily_main_stock_logs 
          SET opening_stock = ${Number(item.closingStock) || 0},
              closing_stock = ${Number(item.closingStock) || 0}
          WHERE item_id = ${item.id} AND log_date = ${tomorrow};
        `;
      }
    }

    // 2. Save Production Batches & Portions (Legacy)
    for (const [itemId, batch] of Object.entries(data.productionDetails)) {
      const netWeight = Math.max(0, Number(batch.totalWeightKg) - Number(batch.wasteWeightKg));

      await sql`
        INSERT INTO production_batch_logs (
          item_id, item_name, cartons_issued, 
          total_weight_kg, waste_weight_kg, net_weight_kg, log_date
        ) VALUES (
          ${batch.itemId}, ${batch.itemName}, ${Number(batch.cartonsIssued) || 0},
          ${Number(batch.totalWeightKg) || 0}, ${Number(batch.wasteWeightKg) || 0}, 
          ${netWeight}, ${today}
        )
        ON CONFLICT (item_id, log_date) 
        DO UPDATE SET 
          cartons_issued = EXCLUDED.cartons_issued,
          total_weight_kg = EXCLUDED.total_weight_kg,
          waste_weight_kg = EXCLUDED.waste_weight_kg,
          net_weight_kg = EXCLUDED.net_weight_kg;
      `;

      const portionEntries = Object.entries(batch.portions);
      
      console.log('Processing production for item:', batch.itemName);
      console.log('Portions to create:', portionEntries);

      // Save each portion to production_derived_portions
      for (const [portionKey, quantity] of portionEntries) {
        const numericQuantity = Number(quantity) || 0;
        if (numericQuantity > 0) {
          await sql`
            INSERT INTO production_derived_portions (
              item_id, portion_key, portion_quantity, log_date
            ) VALUES (
              ${itemId}, ${portionKey}, ${numericQuantity}, ${today}
            )
            ON CONFLICT (item_id, portion_key, log_date)
            DO UPDATE SET 
              portion_quantity = EXCLUDED.portion_quantity;
          `;
        }
      }

      // 3. CREATE A SEPARATE PRODUCTION BATCH FOR EACH PORTION
      // This is the key fix - loop through ALL portions, not just the first one
      const quantityProcessed = Number(batch.cartonsIssued) || 0;
      
      if (quantityProcessed > 0 && portionEntries.length > 0) {
        const unit = batch.unit || 'ctns';
        
        // Create a separate production batch for EACH portion/product
        for (const [portionKey, portionQuantity] of portionEntries) {
          const numericPortionQuantity = Number(portionQuantity) || 0;
          
          // Skip if quantity is 0 or less
          if (numericPortionQuantity <= 0) continue;
          
          // Format the product name nicely
          const outputProductName = portionKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
          
          const outputProductKey = portionKey;
          
          // Generate unique batch number for each product
          const batchNumber = `PROD-${today.replace(/-/g, '')}-${batch.itemId.slice(-4)}-${portionKey.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
          
          // Check if we already created this batch
          const existingBatch = await sql`
            SELECT * FROM production_batches 
            WHERE main_stock_item_id = ${batch.itemId} 
            AND log_date = ${today}
            AND output_product_key = ${outputProductKey};
          `;

          if (existingBatch.length === 0) {
            await sql`
              INSERT INTO production_batches (
                batch_number, main_stock_item_id, main_stock_item_name,
                output_product_key, output_product_name,
                quantity_processed, unit, expected_yield, actual_yield,
                kitchen_issued, remaining, status, log_date
              ) VALUES (
                ${batchNumber}, ${batch.itemId}, ${batch.itemName},
                ${outputProductKey}, ${outputProductName},
                ${quantityProcessed}, ${unit},
                ${numericPortionQuantity}, ${numericPortionQuantity},
                0, ${numericPortionQuantity}, 'active',
                ${today}
              )
              ON CONFLICT (batch_number) 
              DO UPDATE SET 
                quantity_processed = EXCLUDED.quantity_processed,
                actual_yield = EXCLUDED.actual_yield,
                remaining = EXCLUDED.remaining,
                status = EXCLUDED.status,
                updated_at = CURRENT_TIMESTAMP;
            `;
            
            console.log('Created production batch:', {
              batchNumber: batchNumber,
              item: batch.itemName,
              product: outputProductName,
              yield: numericPortionQuantity,
              unit: unit
            });
          } else {
            console.log('Batch already exists for:', {
              item: batch.itemName,
              product: outputProductName
            });
          }
        }
      }
    }

    await sql`COMMIT`;
    revalidatePath('/inventory/daily/main-stock');
    revalidatePath('/production/daily');
    revalidatePath('/inventory/daily/kitchen');
    
    console.log('All operations completed successfully');
    return { 
      success: true, 
      message: 'Data saved successfully! Production batches created for each product.' 
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

// Function to load data for a specific date
export async function loadDailyMainStock(date: string) {
  console.log('Loading data for date:', date);

  try {
    const stockItems = await sql`
      SELECT * FROM daily_main_stock_logs 
      WHERE log_date = ${date}
      ORDER BY category, item_name;
    `;

    const productionBatches = await sql`
      SELECT * FROM production_batch_logs 
      WHERE log_date = ${date};
    `;

    const portions = await sql`
      SELECT * FROM production_derived_portions 
      WHERE log_date = ${date};
    `;

    if (stockItems.length === 0) {
      return { success: true, data: null, message: 'No data found for this date.' };
    }

    const items = stockItems.map((row: any) => ({
      id: row.item_id,
      name: row.item_name,
      category: row.category,
      unit: row.unit,
      openingStock: Number(row.opening_stock),
      addedStock: Number(row.added_stock),
      issuedToProduction: Number(row.issued_to_production),
      issuedToKitchen: Number(row.issued_to_kitchen),
      closingStock: Number(row.closing_stock),
      reorderLevel: 0,
      usageType: row.usage_type || 'direct_sale',
      substituteFor: row.substitute_for || '',
      quantityInStock: Number(row.closing_stock),
      grossWeightIssued: 0,
      wasteWeight: 0,
      netYieldWeight: 0,
      portionsYielded: 0,
      updatedAt: new Date().toISOString(),
    }));

    const productionDetails: Record<string, any> = {};
    for (const batch of productionBatches) {
      const batchPortions = portions
        .filter((p: any) => p.item_id === batch.item_id)
        .reduce((acc: any, p: any) => {
          acc[p.portion_key] = Number(p.portion_quantity);
          return acc;
        }, {});

      productionDetails[batch.item_id] = {
        itemId: batch.item_id,
        itemName: batch.item_name,
        cartonsIssued: Number(batch.cartons_issued),
        totalWeightKg: Number(batch.total_weight_kg),
        wasteWeightKg: Number(batch.waste_weight_kg),
        portions: batchPortions,
      };
    }

    return {
      success: true,
      data: { items, productionDetails },
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading data:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

// Function to get next day's opening stock
export async function getNextDayOpeningStock(date: string) {
  console.log('Getting next day opening stock for date:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const stockItems = await sql`
      SELECT item_id, opening_stock FROM daily_main_stock_logs 
      WHERE log_date = ${tomorrow};
    `;

    return {
      success: true,
      data: stockItems,
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

// Get production batches from main stock for a specific date
export async function getProductionBatchesFromMainStock(date: string) {
  console.log('Getting production batches from main stock for date:', date);

  try {
    const batches = await sql`
      SELECT * FROM production_batches 
      WHERE log_date = ${date}
      AND main_stock_item_id IS NOT NULL
      ORDER BY created_at DESC;
    `;

    return {
      success: true,
      data: batches,
      message: 'Production batches loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading production batches:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}