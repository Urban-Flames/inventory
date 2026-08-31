// src/app/xps/mapping/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Get all XPS mappings
export async function getXPSMappings() {
  console.log('[Server Action] getXPSMappings initiated');

  try {
    const mappings = await sql`
      SELECT 
        id,
        xps_item_name,
        mapped_to,
        mapped_item_id,
        mapped_item_name,
        COALESCE(unit_conversion, 1) as unit_conversion,
        COALESCE(is_combo, false) as is_combo,
        combo_items,
        COALESCE(is_active, true) as is_active,
        created_at,
        COALESCE(updated_at, created_at) as updated_at
      FROM xps_item_mapping 
      ORDER BY xps_item_name;
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

// Create a new XPS mapping
export async function createXPSMapping(data: {
  xpsItemName: string;
  mappedTo: string;
  mappedItemId: string;
  mappedItemName: string;
  unitConversion: number;
  isCombo: boolean;
  comboItems: any;
}) {
  console.log('[Server Action] createXPSMapping initiated:', data);

  try {
    // Check if mapping already exists
    const existing = await sql`
      SELECT * FROM xps_item_mapping 
      WHERE xps_item_name = ${data.xpsItemName};
    `;

    if (existing.length > 0) {
      return {
        success: false,
        message: `A mapping for "${data.xpsItemName}" already exists.`
      };
    }

    await sql`
      INSERT INTO xps_item_mapping (
        xps_item_name, 
        mapped_to, 
        mapped_item_id, 
        mapped_item_name,
        unit_conversion,
        is_combo,
        combo_items,
        is_active
      ) VALUES (
        ${data.xpsItemName}, 
        ${data.mappedTo}, 
        ${data.mappedItemId}, 
        ${data.mappedItemName},
        ${data.unitConversion || 1},
        ${data.isCombo || false},
        ${data.comboItems ? JSON.stringify(data.comboItems) : null},
        true
      );
    `;

    revalidatePath('/xps/mapping');
    revalidatePath('/xps/daily');

    return {
      success: true,
      message: `Mapping for "${data.xpsItemName}" created successfully!`
    };
  } catch (error) {
    console.error('Error creating mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create mapping.'
    };
  }
}

// Update an existing XPS mapping
export async function updateXPSMapping(id: number, data: {
  xpsItemName?: string;
  mappedTo?: string;
  mappedItemId?: string;
  mappedItemName?: string;
  unitConversion?: number;
  isCombo?: boolean;
  comboItems?: any;
}) {
  console.log('[Server Action] updateXPSMapping initiated:', { id, data });

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.xpsItemName !== undefined) {
      updates.push(`xps_item_name = $${paramIndex}`);
      values.push(data.xpsItemName);
      paramIndex++;
    }
    if (data.mappedTo !== undefined) {
      updates.push(`mapped_to = $${paramIndex}`);
      values.push(data.mappedTo);
      paramIndex++;
    }
    if (data.mappedItemId !== undefined) {
      updates.push(`mapped_item_id = $${paramIndex}`);
      values.push(data.mappedItemId);
      paramIndex++;
    }
    if (data.mappedItemName !== undefined) {
      updates.push(`mapped_item_name = $${paramIndex}`);
      values.push(data.mappedItemName);
      paramIndex++;
    }
    if (data.unitConversion !== undefined) {
      updates.push(`unit_conversion = $${paramIndex}`);
      values.push(data.unitConversion);
      paramIndex++;
    }
    if (data.isCombo !== undefined) {
      updates.push(`is_combo = $${paramIndex}`);
      values.push(data.isCombo);
      paramIndex++;
    }
    if (data.comboItems !== undefined) {
      updates.push(`combo_items = $${paramIndex}`);
      values.push(data.comboItems ? JSON.stringify(data.comboItems) : null);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return {
        success: false,
        message: 'No fields to update.'
      };
    }

    values.push(id);
    const query = `
      UPDATE xps_item_mapping 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex};
    `;

    await sql.query(query, values);

    revalidatePath('/xps/mapping');
    revalidatePath('/xps/daily');

    return {
      success: true,
      message: 'Mapping updated successfully!'
    };
  } catch (error) {
    console.error('Error updating mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update mapping.'
    };
  }
}

// Delete an XPS mapping
export async function deleteXPSMapping(id: number) {
  console.log('[Server Action] deleteXPSMapping initiated:', id);

  try {
    await sql`
      DELETE FROM xps_item_mapping WHERE id = ${id};
    `;

    revalidatePath('/xps/mapping');
    revalidatePath('/xps/daily');

    return {
      success: true,
      message: 'Mapping deleted successfully!'
    };
  } catch (error) {
    console.error('Error deleting mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete mapping.'
    };
  }
}

// Get unmapped XPS items
export async function getUnmappedXPSItems() {
  console.log('[Server Action] getUnmappedXPSItems initiated');

  try {
    const items = await sql`
      SELECT DISTINCT item_name 
      FROM xps_sales_raw 
      WHERE item_name NOT IN (
        SELECT xps_item_name FROM xps_item_mapping WHERE is_active = TRUE
      )
      ORDER BY item_name;
    `;

    return {
      success: true,
      data: items,
      message: 'Unmapped items loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading unmapped items:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load unmapped items.'
    };
  }
}

// Get kitchen items from database
export async function getKitchenItems() {
  console.log('[Server Action] getKitchenItems initiated');

  try {
    // Get distinct kitchen items from kitchen_daily_logs
    const items = await sql`
      SELECT DISTINCT item_id, item_name, unit 
      FROM kitchen_daily_logs 
      WHERE item_id IS NOT NULL
      ORDER BY item_name;
    `;

    // If no items found in daily logs, try kitchen_items table
    if (items.length === 0) {
      const fallbackItems = await sql`
        SELECT DISTINCT id as item_id, name as item_name, unit 
        FROM kitchen_items 
        ORDER BY name;
      `;
      
      if (fallbackItems.length > 0) {
        return {
          success: true,
          data: fallbackItems,
          message: 'Kitchen items loaded from kitchen_items table!'
        };
      }
    }

    return {
      success: true,
      data: items,
      message: 'Kitchen items loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading kitchen items:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load kitchen items.'
    };
  }
}

// Get bar items from database
export async function getBarItems() {
  console.log('[Server Action] getBarItems initiated');

  try {
    // Get distinct bar items from bar_daily_logs
    const items = await sql`
      SELECT DISTINCT item_id, item_name, unit 
      FROM bar_daily_logs 
      WHERE item_id IS NOT NULL
      ORDER BY item_name;
    `;

    // If no items found in daily logs, try bar_items table
    if (items.length === 0) {
      const fallbackItems = await sql`
        SELECT DISTINCT id as item_id, name as item_name, unit 
        FROM bar_items 
        ORDER BY name;
      `;
      
      if (fallbackItems.length > 0) {
        return {
          success: true,
          data: fallbackItems,
          message: 'Bar items loaded from bar_items table!'
        };
      }
    }

    return {
      success: true,
      data: items,
      message: 'Bar items loaded successfully!'
    };
  } catch (error) {
    console.error('Error loading bar items:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load bar items.'
    };
  }
}