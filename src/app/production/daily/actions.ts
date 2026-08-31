// src/app/production/daily/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { productionMappingData } from '@/data/productionMapping';
import { ProductionBatch, ProductionKitchenIssuance, ProductionWasteLog } from '@/types/production';

interface SaveProductionPayload {
  batches: ProductionBatch[];
  logDate: string;
}

export async function saveProductionDaily(data: SaveProductionPayload) {
  console.log('[Server Action] saveProductionDaily initiated');
  console.log('Date:', data.logDate);
  console.log('Batches count:', data?.batches?.length || 0);

  if (!data?.batches || data.batches.length === 0) {
    return { success: false, message: 'No production batches to save.' };
  }

  try {
    const today = data.logDate || new Date().toISOString().split('T')[0];

    await sql`BEGIN`;

    for (const batch of data.batches) {
      const remaining = Math.max(0, (batch.actualYield || 0) - (batch.kitchenIssued || 0));
      
      let status = batch.status;
      if (!status) {
        if (remaining === 0 && batch.actualYield > 0) {
          status = 'completed';
        } else if (remaining > 0) {
          status = 'active';
        } else {
          status = 'wasted';
        }
      }

      await sql`
        INSERT INTO production_batches (
          batch_number, main_stock_item_id, main_stock_item_name,
          output_product_key, output_product_name,
          quantity_processed, unit, expected_yield, actual_yield,
          kitchen_issued, remaining, status, notes, processed_by, log_date
        ) VALUES (
          ${batch.batchNumber}, ${batch.mainStockItemId}, ${batch.mainStockItemName},
          ${batch.outputProductKey}, ${batch.outputProductName},
          ${Number(batch.quantityProcessed) || 0}, ${batch.unit},
          ${Number(batch.expectedYield) || 0}, ${Number(batch.actualYield) || 0},
          ${Number(batch.kitchenIssued) || 0}, ${remaining},
          ${status}, ${batch.notes || null}, ${batch.processedBy || null},
          ${today}
        )
        ON CONFLICT (batch_number) 
        DO UPDATE SET 
          quantity_processed = EXCLUDED.quantity_processed,
          expected_yield = EXCLUDED.expected_yield,
          actual_yield = EXCLUDED.actual_yield,
          kitchen_issued = EXCLUDED.kitchen_issued,
          remaining = EXCLUDED.remaining,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP;
      `;
    }

    await sql`COMMIT`;
    revalidatePath('/production/daily');
    revalidatePath('/inventory/daily/kitchen');
    
    return { 
      success: true, 
      message: `Production saved successfully!` 
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

export async function loadProductionDaily(date: string) {
  console.log('Loading production data for date:', date);

  try {
    const batches = await sql`
      SELECT * FROM production_batches 
      WHERE log_date = ${date}
      ORDER BY created_at DESC;
    `;

    if (batches.length === 0) {
      return { success: true, data: null, message: 'No production data found for this date.' };
    }

    const productionBatches = batches.map((row: any) => ({
      id: row.id,
      batchNumber: row.batch_number,
      mainStockItemId: row.main_stock_item_id,
      mainStockItemName: row.main_stock_item_name,
      outputProductKey: row.output_product_key,
      outputProductName: row.output_product_name || '',
      quantityProcessed: Number(row.quantity_processed),
      unit: row.unit,
      expectedYield: Number(row.expected_yield),
      actualYield: Number(row.actual_yield),
      kitchenIssued: Number(row.kitchen_issued),
      remaining: Number(row.remaining),
      status: row.status,
      notes: row.notes,
      processedBy: row.processed_by,
      logDate: row.log_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`[loadProductionDaily] Loaded ${productionBatches.length} batches`);
    productionBatches.forEach(b => {
      console.log(`  - ${b.batchNumber}: outputProductName="${b.outputProductName}", remaining=${b.remaining}`);
    });

    return {
      success: true,
      data: productionBatches,
      message: 'Data loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading production data:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function getAvailableProduction(date: string) {
  console.log('Getting available production for date:', date);

  try {
    const batches = await sql`
      SELECT * FROM production_batches 
      WHERE log_date = ${date} 
      AND status = 'active'
      AND remaining > 0
      ORDER BY created_at DESC;
    `;

    // Map database rows to ProductionBatch objects with camelCase
    const mappedBatches = batches.map((row: any) => ({
      id: row.id,
      batchNumber: row.batch_number,
      mainStockItemId: row.main_stock_item_id,
      mainStockItemName: row.main_stock_item_name,
      outputProductKey: row.output_product_key,
      outputProductName: row.output_product_name || '',
      quantityProcessed: Number(row.quantity_processed),
      unit: row.unit,
      expectedYield: Number(row.expected_yield),
      actualYield: Number(row.actual_yield),
      kitchenIssued: Number(row.kitchen_issued),
      remaining: Number(row.remaining),
      status: row.status,
      notes: row.notes,
      processedBy: row.processed_by,
      logDate: row.log_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`[getAvailableProduction] Found ${mappedBatches.length} active batches with remaining > 0 for ${date}`);
    mappedBatches.forEach(b => {
      console.log(`  - ${b.batchNumber}: outputProductName="${b.outputProductName}", remaining=${b.remaining}`);
    });

    return {
      success: true,
      data: mappedBatches,
      message: 'Available production loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading available production:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load data.'
    };
  }
}

export async function issueToKitchen(
  batchId: number,
  quantity: number,
  kitchenItemId: string,
  issuedBy?: string
) {
  console.log('Issuing production to kitchen:', { batchId, quantity, kitchenItemId });

  try {
    await sql`BEGIN`;

    // Get the production batch
    const batch = await sql`
      SELECT * FROM production_batches WHERE id = ${batchId};
    `;

    if (batch.length === 0) {
      throw new Error('Batch not found');
    }

    const currentBatch = batch[0];
    const remaining = Number(currentBatch.remaining);

    if (quantity > remaining) {
      throw new Error(`Cannot issue ${quantity}. Only ${remaining} remaining.`);
    }

    // Update production batch
    const newKitchenIssued = Number(currentBatch.kitchen_issued) + quantity;
    const newRemaining = remaining - quantity;
    const newStatus = newRemaining === 0 ? 'completed' : 'active';

    await sql`
      UPDATE production_batches 
      SET 
        kitchen_issued = ${newKitchenIssued},
        remaining = ${newRemaining},
        status = ${newStatus},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${batchId};
    `;

    // Log the issuance
    await sql`
      INSERT INTO production_kitchen_issuance (
        batch_id, kitchen_item_id, quantity_issued, issued_by, log_date
      ) VALUES (
        ${batchId}, ${kitchenItemId}, ${quantity}, ${issuedBy || null}, CURRENT_DATE
      );
    `;

    // ============================================================
    // FIX: Update kitchen daily logs - find by item_id (kt-xx)
    // ============================================================
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Looking for kitchen item with ID: ${kitchenItemId} for date: ${today}`);

    // First, try to find the kitchen daily log by item_id
    let kitchenItem = await sql`
      SELECT * FROM kitchen_daily_logs 
      WHERE item_id = ${kitchenItemId} AND log_date = ${today};
    `;

    // If not found, try to find by name match
    if (kitchenItem.length === 0) {
      const productName = currentBatch.output_product_name || '';
      console.log(`No kitchen item found by ID, trying name match for: ${productName}`);
      
      kitchenItem = await sql`
        SELECT * FROM kitchen_daily_logs 
        WHERE log_date = ${today}
        AND item_name ILIKE ${`%${productName}%`};
      `;
    }

    if (kitchenItem.length > 0) {
      const item = kitchenItem[0];
      const currentReceived = Number(item.received_from_stock) || 0;
      const newReceived = currentReceived + quantity;
      const morningStock = Number(item.morning_stock) || 0;

      await sql`
        UPDATE kitchen_daily_logs 
        SET 
          received_from_stock = ${newReceived},
          total_stock = ${morningStock + newReceived}
        WHERE id = ${item.id};
      `;
      
      console.log(`✅ Updated kitchen inventory: ${item.item_name} +${quantity} (received: ${currentReceived} → ${newReceived})`);
    } else {
      console.log(`⚠️ No kitchen item found for: ${currentBatch.output_product_name} (ID: ${kitchenItemId})`);
      
      // If no kitchen log exists, create one
      console.log(`Creating new kitchen daily log for ${currentBatch.output_product_name}`);
      
      // Get the kitchen item from the static data to get the unit and category
      const kitchenItemStatic = await sql`
        SELECT * FROM kitchen_items 
        WHERE id = ${kitchenItemId};
      `;
      
      if (kitchenItemStatic.length > 0) {
        const staticItem = kitchenItemStatic[0];
        await sql`
          INSERT INTO kitchen_daily_logs (
            item_id, item_name, category, unit,
            morning_stock, received_from_stock, total_stock,
            actual_closing_stock, waste, sales_deduction, variance,
            log_date
          ) VALUES (
            ${kitchenItemId}, ${staticItem.name}, ${staticItem.category || null}, ${staticItem.unit || 'pcs'},
            0, ${quantity}, ${quantity},
            0, 0, 0, 0,
            ${today}
          );
        `;
        console.log(`✅ Created new kitchen daily log for ${staticItem.name} with ${quantity} received`);
      }
    }

    await sql`COMMIT`;
    
    revalidatePath('/production/daily');
    revalidatePath('/inventory/daily/kitchen');
    revalidatePath('/inventory/daily/main-stock');
    
    return {
      success: true,
      message: `Issued ${quantity} to kitchen successfully! Remaining: ${newRemaining}`,
      remaining: newRemaining
    };
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Issue to kitchen error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to issue to kitchen.'
    };
  }
}

export async function logWaste(
  batchId: number,
  quantity: number,
  wasteReason?: string,
  loggedBy?: string
) {
  console.log('Logging production waste:', { batchId, quantity, wasteReason });

  try {
    await sql`BEGIN`;

    const batch = await sql`
      SELECT * FROM production_batches WHERE id = ${batchId};
    `;

    if (batch.length === 0) {
      throw new Error('Batch not found');
    }

    const currentBatch = batch[0];
    const remaining = Number(currentBatch.remaining);

    if (quantity > remaining) {
      throw new Error(`Cannot waste ${quantity}. Only ${remaining} remaining.`);
    }

    const newRemaining = remaining - quantity;
    const newStatus = newRemaining === 0 ? 'wasted' : 'active';

    await sql`
      UPDATE production_batches 
      SET 
        remaining = ${newRemaining},
        status = ${newStatus},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${batchId};
    `;

    await sql`
      INSERT INTO production_waste_log (
        batch_id, quantity_wasted, waste_reason, logged_by, log_date
      ) VALUES (
        ${batchId}, ${quantity}, ${wasteReason || null}, ${loggedBy || null}, CURRENT_DATE
      );
    `;

    await sql`COMMIT`;
    revalidatePath('/production/daily');
    revalidatePath('/inventory/daily/kitchen');

    return {
      success: true,
      message: `Wasted ${quantity} successfully! Remaining: ${newRemaining}`,
      remaining: newRemaining
    };
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Log waste error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to log waste.'
    };
  }
}

export async function carryOverProductionToNextDay(date: string) {
  console.log('Carrying over production to next day for date:', date);

  try {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const tomorrow = nextDate.toISOString().split('T')[0];

    const activeBatches = await sql`
      SELECT * FROM production_batches 
      WHERE log_date = ${date} 
      AND status = 'active'
      AND remaining > 0;
    `;

    if (activeBatches.length === 0) {
      return { success: true, message: 'No active production to carry over.' };
    }

    await sql`BEGIN`;

    for (const batch of activeBatches) {
      const remaining = Number(batch.remaining);
      
      const tomorrowBatch = await sql`
        SELECT * FROM production_batches 
        WHERE main_stock_item_id = ${batch.main_stock_item_id} 
        AND output_product_name = ${batch.output_product_name}
        AND log_date = ${tomorrow};
      `;

      if (tomorrowBatch.length === 0) {
        const newBatchNumber = `PROD-${tomorrow.replace(/-/g, '')}-${batch.main_stock_item_id.slice(-4)}-${Date.now().toString().slice(-4)}`;
        
        await sql`
          INSERT INTO production_batches (
            batch_number, main_stock_item_id, main_stock_item_name,
            output_product_key, output_product_name,
            quantity_processed, unit, expected_yield, actual_yield,
            kitchen_issued, remaining, status, log_date
          ) VALUES (
            ${newBatchNumber}, ${batch.main_stock_item_id}, ${batch.main_stock_item_name},
            ${batch.output_product_key}, ${batch.output_product_name},
            0, ${batch.unit}, ${remaining}, ${remaining},
            0, ${remaining}, 'active',
            ${tomorrow}
          );
        `;
        console.log(`✅ Carried over ${remaining} of ${batch.output_product_name} to ${tomorrow}`);
      } else {
        const currentRemaining = Number(tomorrowBatch[0].remaining);
        const newRemaining = currentRemaining + remaining;
        
        await sql`
          UPDATE production_batches 
          SET remaining = ${newRemaining},
              actual_yield = ${newRemaining},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${tomorrowBatch[0].id};
        `;
        console.log(`✅ Added ${remaining} to existing batch for ${tomorrow}`);
      }
    }

    await sql`COMMIT`;
    revalidatePath('/production/daily');
    revalidatePath('/inventory/daily/kitchen');
    
    return { 
      success: true, 
      message: `Carried over ${activeBatches.length} production batches to ${tomorrow}` 
    };
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    console.error('Carry over error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to carry over production.'
    };
  }
}

export async function getProductionBatchById(batchId: number) {
  console.log('Getting production batch by ID:', batchId);

  try {
    const batch = await sql`
      SELECT * FROM production_batches WHERE id = ${batchId};
    `;

    if (batch.length === 0) {
      return {
        success: false,
        data: null,
        message: 'Batch not found.'
      };
    }

    const row = batch[0];
    const productionBatch = {
      id: row.id,
      batchNumber: row.batch_number,
      mainStockItemId: row.main_stock_item_id,
      mainStockItemName: row.main_stock_item_name,
      outputProductKey: row.output_product_key,
      outputProductName: row.output_product_name || '',
      quantityProcessed: Number(row.quantity_processed),
      unit: row.unit,
      expectedYield: Number(row.expected_yield),
      actualYield: Number(row.actual_yield),
      kitchenIssued: Number(row.kitchen_issued),
      remaining: Number(row.remaining),
      status: row.status,
      notes: row.notes,
      processedBy: row.processed_by,
      logDate: row.log_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return {
      success: true,
      data: productionBatch,
      message: 'Batch loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading batch:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load batch.'
    };
  }
}

export async function getProductionIssuanceHistory(batchId: number) {
  console.log('Getting production issuance history for batch:', batchId);

  try {
    const issuances = await sql`
      SELECT * FROM production_kitchen_issuance 
      WHERE batch_id = ${batchId}
      ORDER BY created_at DESC;
    `;

    const mappedIssuances = issuances.map((row: any) => ({
      id: row.id,
      batchId: row.batch_id,
      kitchenItemId: row.kitchen_item_id,
      quantityIssued: Number(row.quantity_issued),
      issuedBy: row.issued_by,
      logDate: row.log_date,
      createdAt: row.created_at,
    }));

    return {
      success: true,
      data: mappedIssuances,
      message: 'Issuance history loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading issuance history:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load issuance history.'
    };
  }
}