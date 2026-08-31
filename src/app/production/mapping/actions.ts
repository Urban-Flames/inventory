// src/app/production/mapping/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface ProductionMapping {
  id?: number;
  mainStockItemId: string;
  mainStockItemName: string;
  outputProductKey: string;
  outputProductName: string;
  unit: string;
  yieldPerUnit: number;
  category: 'chicken' | 'meat' | 'bakery_dairy' | 'frozen_dry';
  isActive?: boolean;
}

interface MainStockItem {
  id: string;
  name: string;
}

// Load all production mappings
export async function loadProductionMappings() {
  console.log('[Server Action] loadProductionMappings initiated');

  try {
    const mappings = await sql`
      SELECT * FROM production_mappings 
      ORDER BY category, main_stock_item_name, output_product_name;
    `;

    return {
      success: true,
      data: mappings,
      message: 'Mappings loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading mappings:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load mappings.'
    };
  }
}

// Get a single mapping by ID
export async function getProductionMapping(id: number) {
  console.log('[Server Action] getProductionMapping initiated:', id);

  try {
    const mapping = await sql`
      SELECT * FROM production_mappings WHERE id = ${id};
    `;

    if (mapping.length === 0) {
      return {
        success: false,
        data: null,
        message: 'Mapping not found.'
      };
    }

    return {
      success: true,
      data: mapping[0],
      message: 'Mapping loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading mapping:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load mapping.'
    };
  }
}

// Create a new production mapping
export async function createProductionMapping(data: ProductionMapping) {
  console.log('[Server Action] createProductionMapping initiated:', data);

  try {
    // Check for duplicate
    const existing = await sql`
      SELECT * FROM production_mappings 
      WHERE main_stock_item_id = ${data.mainStockItemId} 
      AND output_product_key = ${data.outputProductKey};
    `;

    if (existing.length > 0) {
      return {
        success: false,
        message: 'A mapping with this source item and output product already exists.'
      };
    }

    await sql`
      INSERT INTO production_mappings (
        main_stock_item_id, main_stock_item_name,
        output_product_key, output_product_name,
        unit, yield_per_unit, category
      ) VALUES (
        ${data.mainStockItemId}, ${data.mainStockItemName},
        ${data.outputProductKey}, ${data.outputProductName},
        ${data.unit}, ${data.yieldPerUnit}, ${data.category}
      );
    `;

    revalidatePath('/production/mapping');
    
    return {
      success: true,
      message: 'Production mapping created successfully!'
    };
  } catch (error) {
    console.error('Error creating mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create mapping.'
    };
  }
}

// Update an existing production mapping
export async function updateProductionMapping(id: number, data: Partial<ProductionMapping>) {
  console.log('[Server Action] updateProductionMapping initiated:', { id, data });

  try {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.mainStockItemId !== undefined) {
      updateFields.push(`main_stock_item_id = $${paramIndex}`);
      values.push(data.mainStockItemId);
      paramIndex++;
    }
    if (data.mainStockItemName !== undefined) {
      updateFields.push(`main_stock_item_name = $${paramIndex}`);
      values.push(data.mainStockItemName);
      paramIndex++;
    }
    if (data.outputProductKey !== undefined) {
      updateFields.push(`output_product_key = $${paramIndex}`);
      values.push(data.outputProductKey);
      paramIndex++;
    }
    if (data.outputProductName !== undefined) {
      updateFields.push(`output_product_name = $${paramIndex}`);
      values.push(data.outputProductName);
      paramIndex++;
    }
    if (data.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex}`);
      values.push(data.unit);
      paramIndex++;
    }
    if (data.yieldPerUnit !== undefined) {
      updateFields.push(`yield_per_unit = $${paramIndex}`);
      values.push(data.yieldPerUnit);
      paramIndex++;
    }
    if (data.category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      values.push(data.category);
      paramIndex++;
    }
    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      values.push(data.isActive);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 0) {
      return {
        success: false,
        message: 'No fields to update.'
      };
    }

    values.push(id);
    const query = `
      UPDATE production_mappings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex};
    `;

    await sql.query(query, values);

    revalidatePath('/production/mapping');
    
    return {
      success: true,
      message: 'Production mapping updated successfully!'
    };
  } catch (error) {
    console.error('Error updating mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update mapping.'
    };
  }
}

// Delete a production mapping
export async function deleteProductionMapping(id: number) {
  console.log('[Server Action] deleteProductionMapping initiated:', id);

  try {
    await sql`
      DELETE FROM production_mappings WHERE id = ${id};
    `;

    revalidatePath('/production/mapping');
    
    return {
      success: true,
      message: 'Production mapping deleted successfully!'
    };
  } catch (error) {
    console.error('Error deleting mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete mapping.'
    };
  }
}

// Get available main stock items for dropdown
export async function getMainStockItems() {
  console.log('[Server Action] getMainStockItems initiated');

  try {
    // Get unique main stock items from existing mappings
    const existingItems = await sql`
      SELECT DISTINCT main_stock_item_id, main_stock_item_name 
      FROM production_mappings 
      ORDER BY main_stock_item_name;
    `;

    // Also get from main stock data (you can add more items here)
    const allItems: MainStockItem[] = [
      { id: 'ms-01', name: 'Chicken Thigh' },
      { id: 'ms-02', name: 'Back Fillet' },
      { id: 'ms-03', name: 'Chicken Wings' },
      { id: 'ms-04', name: 'Chicken Breast' },
      { id: 'ms-05', name: 'Chicken Minced' },
      { id: 'ms-06', name: 'Meat Minced' },
      { id: 'ms-07', name: 'Lamb Chops' },
      { id: 'ms-08', name: 'Pork Chops' },
      { id: 'ms-13', name: 'Mozzarella Cheese' },
      { id: 'ms-17', name: 'Potato Fries 2.5kg' },
    ];

    // Merge and deduplicate
    const existingIds = new Set(existingItems.map((item: any) => item.main_stock_item_id));
    const mergedItems = [
      ...existingItems.map((item: any) => ({
        id: item.main_stock_item_id,
        name: item.main_stock_item_name
      })),
      ...allItems
        .filter(item => !existingIds.has(item.id))
        .map(item => ({ id: item.id, name: item.name }))
    ];

    return {
      success: true,
      data: mergedItems,
      message: 'Main stock items loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading main stock items:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load main stock items.'
    };
  }
}