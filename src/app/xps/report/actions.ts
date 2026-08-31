// src/app/xps/report/actions.ts
'use server';

import { sql } from '@/lib/db';

interface ReconciliationItem {
  item_name: string;
  xps_quantity: number;
  inventory_quantity: number;
  variance: number;
  location: string;
  status: 'matched' | 'yellow' | 'red';
  reason: string;
  mapped_item_name: string;
}

export async function getXPSReconciliationReport(date: string) {
  console.log('[Server Action] getXPSReconciliationReport for date:', date);

  try {
    // Get XPS items for the date
    const xpsItems = await sql`
      SELECT * FROM xps_sales_raw 
      WHERE report_date = ${date}
      ORDER BY item_name;
    `;

    if (xpsItems.length === 0) {
      return { 
        success: false, 
        data: null, 
        message: 'No XPS data found for this date. Please upload an XPS file first.' 
      };
    }

    // Get kitchen inventory for the date
    const kitchenItems = await sql`
      SELECT * FROM kitchen_daily_logs 
      WHERE log_date = ${date};
    `;

    // Get bar inventory for the date
    const barItems = await sql`
      SELECT * FROM bar_daily_logs 
      WHERE log_date = ${date};
    `;

    // Map items
    const kitchenMap = new Map();
    for (const item of kitchenItems) {
      kitchenMap.set(item.item_name.toLowerCase(), item);
    }

    const barMap = new Map();
    for (const item of barItems) {
      barMap.set(item.item_name.toLowerCase(), item);
    }

    // Get mappings
    const mappings = await sql`
      SELECT * FROM xps_item_mapping WHERE is_active = TRUE;
    `;

    const mappingMap = new Map();
    for (const mapping of mappings) {
      mappingMap.set(mapping.xps_item_name.toLowerCase(), mapping);
    }

    // Process items
    const items: ReconciliationItem[] = [];
    let matchedItems = 0;
    let yellowFlags = 0;
    let redFlags = 0;

    for (const xpsItem of xpsItems) {
      const itemName = xpsItem.item_name;
      const xpsQty = Number(xpsItem.quantity);

      const mapping = mappingMap.get(itemName.toLowerCase());
      let inventoryQty = 0;
      let location = 'unknown';
      let mappedItemName = itemName;

      if (mapping) {
        const unitConversion = mapping.unit_conversion || 1;
        const convertedXpsQty = xpsQty / unitConversion;

        if (mapping.mapped_to === 'kitchen') {
          const kitchenItem = kitchenMap.get(mapping.mapped_item_name?.toLowerCase() || '');
          if (kitchenItem) {
            inventoryQty = Number(kitchenItem.sales_deduction) || 0;
            location = 'kitchen';
            mappedItemName = kitchenItem.item_name;
          }
        } else if (mapping.mapped_to === 'bar') {
          const barItem = barMap.get(mapping.mapped_item_name?.toLowerCase() || '');
          if (barItem) {
            inventoryQty = Number(barItem.total_sales) || 0;
            location = 'bar';
            mappedItemName = barItem.item_name;
          }
        }

        const variance = convertedXpsQty - inventoryQty;
        let status: 'matched' | 'yellow' | 'red' = 'matched';
        let reason = '';

        if (Math.abs(variance) > 0.5) {
          if (inventoryQty > convertedXpsQty) {
            // Inventory > XPS = RED (used more than sold - theft/error)
            status = 'red';
            reason = `Inventory shows ${inventoryQty}, XPS shows ${convertedXpsQty} (${Math.abs(variance)} more used than sold)`;
            redFlags++;
          } else {
            // XPS > Inventory = YELLOW (sold more than recorded - forgotten transfer)
            status = 'yellow';
            reason = `XPS shows ${convertedXpsQty}, inventory shows ${inventoryQty} (${variance} more sold than recorded)`;
            yellowFlags++;
          }
        } else {
          matchedItems++;
          reason = `XPS ${convertedXpsQty} = Inventory ${inventoryQty}`;
        }

        items.push({
          item_name: itemName,
          xps_quantity: convertedXpsQty,
          inventory_quantity: inventoryQty,
          variance: variance,
          location: location,
          status: status,
          reason: reason,
          mapped_item_name: mappedItemName
        });
      } else {
        // Unmapped item
        items.push({
          item_name: itemName,
          xps_quantity: xpsQty,
          inventory_quantity: 0,
          variance: xpsQty,
          location: 'unknown',
          status: 'red',
          reason: 'No mapping found for this item',
          mapped_item_name: 'Unmapped'
        });
        redFlags++;
      }
    }

    return {
      success: true,
      data: {
        total_items: xpsItems.length,
        matched_items: matchedItems,
        yellow_flags: yellowFlags,
        red_flags: redFlags,
        items: items,
        date: date
      },
      message: 'Report loaded successfully!'
    };

  } catch (error) {
    console.error('Error loading report:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load report.'
    };
  }
}