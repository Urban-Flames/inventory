// src/app/xps/daily/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import PDFParser from 'pdf2json';

interface XPSItem {
  item_name: string;
  quantity: number;
  original_text?: string;
  mapped_item_name?: string;
  mapped_to?: string;
}

// Helper function to safely decode URI components
function safeDecodeURIComponent(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

// Helper function to parse PDF using pdf2json
async function parsePDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parse error:', errData);
        reject(new Error(`PDF parse error: ${errData.parserError || 'Unknown error'}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let text = '';
          if (pdfData && pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    for (const line of textItem.R) {
                      if (line.T) {
                        const decodedText = safeDecodeURIComponent(line.T);
                        text += decodedText + ' ';
                      }
                    }
                  }
                }
              }
            }
          }
          resolve(text);
        } catch (err) {
          console.error('Error processing PDF data:', err);
          reject(err);
        }
      });
      
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('PDF parser initialization error:', error);
      reject(error);
    }
  });
}

// Main parser for SambaPOS concatenated format
function parseSambaPOSItems(text: string): XPSItem[] {
  const items: XPSItem[] = [];
  
  // Clean the text - remove extra spaces and newlines
  let cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Try multiple approaches to find the sales data
  
  // Approach 1: Look for patterns like "ItemName Quantity Amount"
  const patterns = [
    // Pattern 1: Standard format with spaces
    /([A-Za-z][A-Za-z\s\-&']+?)\s+(\d+)\s+([\d,]+\.\d{2})/g,
    // Pattern 2: With numbers in name
    /([A-Za-z0-9][A-Za-z0-9\s\-&']+?)\s+(\d+)\s+([\d,]+\.\d{2})/g,
    // Pattern 3: More lenient - any text followed by number and amount
    /(.+?)\s+(\d+)\s+([\d,]+\.\d{2})/g
  ];
  
  for (const pattern of patterns) {
    let match;
    let found = false;
    const tempItems: XPSItem[] = [];
    
    while ((match = pattern.exec(cleanText)) !== null) {
      const [, name, qty, amount] = match;
      // Skip if it's a category header or contains % sign or is too short
      if (!name.includes('%') && name.length > 2 && !name.includes('Group')) {
        const quantity = parseFloat(qty);
        if (quantity > 0 && quantity < 1000) {
          // Check if this item already exists (avoid duplicates)
          const exists = tempItems.some(item => 
            item.item_name === name.trim() && item.quantity === quantity
          );
          if (!exists) {
            tempItems.push({
              item_name: name.trim(),
              quantity: quantity,
              original_text: match[0]
            });
            found = true;
          }
        }
      }
    }
    
    if (found && tempItems.length > 0) {
      items.push(...tempItems);
      console.log(`Pattern found ${tempItems.length} items`);
      break;
    }
  }
  
  // If still no items, try a different approach - look for table-like data
  if (items.length === 0) {
    console.log('Trying table data extraction...');
    const parts = cleanText.split(/\s{2,}/);
    
    for (let i = 0; i < parts.length - 2; i++) {
      const name = parts[i].trim();
      const qtyStr = parts[i + 1].trim();
      const amountStr = parts[i + 2].trim();
      
      const qty = parseFloat(qtyStr);
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      
      if (name.length > 2 && !isNaN(qty) && !isNaN(amount) && qty > 0 && qty < 1000) {
        items.push({
          item_name: name,
          quantity: qty,
          original_text: `${name} ${qty} ${amountStr}`
        });
        i += 2;
      }
    }
  }
  
  console.log('Total items found:', items.length);
  return items;
}

// Upload and parse XPS file (supports PDF, CSV, TXT)
export async function uploadXPSFile(formData: FormData) {
  console.log('[Server Action] uploadXPSFile initiated');

  try {
    const file = formData.get('file') as File;
    const date = formData.get('date') as string;

    if (!file) {
      return { success: false, message: 'No file provided.' };
    }

    if (!date) {
      return { success: false, message: 'No date provided.' };
    }

    const buffer = await file.arrayBuffer();
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    let text = '';

    // Handle different file types
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        console.log('Starting PDF parsing...');
        text = await parsePDF(Buffer.from(buffer));
        console.log('PDF parsing successful, text length:', text.length);
        
        if (!text || text.trim().length === 0) {
          return { 
            success: false, 
            message: 'PDF appears empty or could not be read. Please ensure it\'s a valid SambaPOS export.' 
          };
        }
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return { 
          success: false, 
          message: `Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}.` 
        };
      }
    } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      text = new TextDecoder('utf-8').decode(buffer);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      text = new TextDecoder('utf-8').decode(buffer);
    } else {
      try {
        text = new TextDecoder('utf-8').decode(buffer);
      } catch {
        return { 
          success: false, 
          message: 'Unsupported file format. Please upload PDF, CSV, or TXT files.' 
        };
      }
    }

    // Parse items from the text
    let items: XPSItem[] = [];
    
    // Try the main SambaPOS parser
    items = parseSambaPOSItems(text);

    // If no items found, try the fallback parser
    if (items.length === 0) {
      console.log('Main parser yielded 0 items, trying fallback...');
      items = parseFallbackItems(text);
    }

    if (items.length === 0) {
      console.log('No items could be extracted. Text sample:', text.substring(0, 1000));
      return { 
        success: false, 
        message: 'No items could be extracted from the file. Please check the format.' 
      };
    }

    console.log(`Successfully extracted ${items.length} items`);

    // Get mappings for items
    const mappings = await sql`
      SELECT * FROM xps_item_mapping WHERE is_active = TRUE;
    `;

    const mappingMap = new Map();
    for (const mapping of mappings) {
      mappingMap.set(mapping.xps_item_name.toLowerCase(), mapping);
    }

    // Map items to inventory
    const mappedItems = items.map(item => {
      const cleanName = item.item_name.replace(/\s+/g, ' ').trim();
      const mapping = mappingMap.get(cleanName.toLowerCase());
      return {
        ...item,
        item_name: cleanName,
        mapped_item_name: mapping?.mapped_item_name || null,
        mapped_to: mapping?.mapped_to || null,
        unit_conversion: mapping?.unit_conversion || 1
      };
    });

    // Store in database
    await sql`BEGIN`;

    await sql`
      DELETE FROM xps_sales_raw WHERE report_date = ${date};
    `;

    for (const item of mappedItems) {
      await sql`
        INSERT INTO xps_sales_raw (
          report_date, item_name, quantity, file_name
        ) VALUES (
          ${date}, ${item.item_name}, ${item.quantity}, ${file.name}
        );
      `;
    }

    await sql`COMMIT`;
    revalidatePath('/xps/daily');

    return {
      success: true,
      data: {
        items: mappedItems,
        count: mappedItems.length,
        file_name: file.name,
        file_type: fileType,
        date
      },
      message: `Successfully extracted ${mappedItems.length} items from ${file.name}`
    };

  } catch (error) {
    console.error('Error uploading XPS file:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload file.'
    };
  }
}

// Fallback parser
function parseFallbackItems(text: string): XPSItem[] {
  const items: XPSItem[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip headers
    if (trimmed.includes('Sales') || trimmed.includes('Total') || 
        trimmed.includes('=====') || trimmed.includes('Page') ||
        trimmed.includes('SambaPOS') || trimmed.includes('Group Sales') ||
        trimmed.includes('Item Sales Report') || trimmed.includes('%')) {
      continue;
    }
    
    const match = trimmed.match(/^(.+?)\s+(\d+)\s+([\d,]+\.\d{2})$/);
    if (match) {
      const [, name, qty, amount] = match;
      if (name.length > 2 && !name.includes('%')) {
        const quantity = parseFloat(qty);
        if (quantity > 0 && quantity < 1000) {
          items.push({
            item_name: name.trim(),
            quantity: quantity,
            original_text: trimmed
          });
        }
      }
    }
  }
  
  return items;
}

// Process XPS data and reconcile with inventory
export async function processXPSData(date: string) {
  console.log('[Server Action] processXPSData initiated for date:', date);

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
        message: 'No XPS data found for this date. Please upload the file first.' 
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

    // Map kitchen items by name for quick lookup
    const kitchenMap = new Map();
    for (const item of kitchenItems) {
      kitchenMap.set(item.item_name.toLowerCase(), item);
    }

    // Map bar items by name for quick lookup
    const barMap = new Map();
    for (const item of barItems) {
      barMap.set(item.item_name.toLowerCase(), item);
    }

    // Get item mappings
    const mappings = await sql`
      SELECT * FROM xps_item_mapping WHERE is_active = TRUE;
    `;

    const mappingMap = new Map();
    for (const mapping of mappings) {
      mappingMap.set(mapping.xps_item_name.toLowerCase(), mapping);
    }

    // Process each XPS item
    let matchedItems = 0;
    const redFlags: any[] = [];
    const processedItems: any[] = [];

    for (const xpsItem of xpsItems) {
      const itemName = xpsItem.item_name;
      const xpsQty = Number(xpsItem.quantity);

      // Find mapping
      const mapping = mappingMap.get(itemName.toLowerCase());
      let inventoryQty = 0;
      let location = 'unknown';

      if (mapping) {
        // Apply unit conversion (e.g., wings: 6 wings = 1 portion)
        const unitConversion = mapping.unit_conversion || 1;
        const convertedXpsQty = xpsQty / unitConversion;

        if (mapping.mapped_to === 'kitchen') {
          const kitchenItem = kitchenMap.get(mapping.mapped_item_name?.toLowerCase() || '');
          if (kitchenItem) {
            inventoryQty = Number(kitchenItem.sales_deduction) || 0;
            location = 'kitchen';
          }
        } else if (mapping.mapped_to === 'bar') {
          const barItem = barMap.get(mapping.mapped_item_name?.toLowerCase() || '');
          if (barItem) {
            inventoryQty = Number(barItem.total_sales) || 0;
            location = 'bar';
          }
        }

        // Check for red flag (mismatch)
        let hasRedFlag = false;
        let variance = 0;
        let reason = '';

        if (Math.abs(convertedXpsQty - inventoryQty) > 0.5) {
          hasRedFlag = true;
          variance = convertedXpsQty - inventoryQty;
          reason = `XPS shows ${convertedXpsQty}, inventory shows ${inventoryQty}`;
          redFlags.push({
            item_name: itemName,
            xps_quantity: convertedXpsQty,
            inventory_quantity: inventoryQty,
            variance: variance,
            location: location,
            reason: reason
          });
        }

        processedItems.push({
          item_name: itemName,
          xps_quantity: xpsQty,
          parsed_quantity: convertedXpsQty,
          inventory_quantity: inventoryQty,
          mapped_item_name: mapping.mapped_item_name || 'Unmapped',
          location: location,
          has_red_flag: hasRedFlag,
          variance: variance,
          reason: reason
        });

        if (!hasRedFlag) {
          matchedItems++;
        }
      } else {
        // Unmapped item
        processedItems.push({
          item_name: itemName,
          xps_quantity: xpsQty,
          parsed_quantity: xpsQty,
          inventory_quantity: 0,
          mapped_item_name: 'Unmapped',
          location: 'unknown',
          has_red_flag: true,
          variance: xpsQty,
          reason: 'No mapping found for this item'
        });
        redFlags.push({
          item_name: itemName,
          xps_quantity: xpsQty,
          inventory_quantity: 0,
          variance: xpsQty,
          location: 'unknown',
          reason: 'No mapping found for this item'
        });
      }
    }

    // Save reconciliation report
    await sql`BEGIN`;

    const reportResult = await sql`
      INSERT INTO xps_daily_reports (
        report_date, total_items, total_sales_quantity, matched_items, red_flags, report_data
      ) VALUES (
        ${date}, ${xpsItems.length}, ${xpsItems.reduce((sum: number, item: any) => sum + Number(item.quantity), 0)},
        ${matchedItems}, ${redFlags.length}, ${JSON.stringify(processedItems)}
      )
      RETURNING id;
    `;

    const reportId = reportResult[0].id;

    // Save red flags with the report_id
    for (const flag of redFlags) {
      await sql`
        INSERT INTO xps_red_flags (
          report_id, item_name, xps_quantity, inventory_quantity, variance, location, reason
        ) VALUES (
          ${reportId}, ${flag.item_name}, ${flag.xps_quantity}, ${flag.inventory_quantity},
          ${flag.variance}, ${flag.location}, ${flag.reason}
        );
      `;
    }

    await sql`COMMIT`;
    revalidatePath('/xps/daily');

    return {
      success: true,
      data: {
        total_items: xpsItems.length,
        matched_items: matchedItems,
        red_flags: redFlags.length,
        red_flag_details: redFlags,
        processed_items: processedItems
      },
      message: `Reconciliation complete! ${redFlags.length} red flags found.`
    };

  } catch (error) {
    console.error('Error processing XPS data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process data.'
    };
  }
}

// Get XPS reconciliation for a specific date
export async function getXPSReconciliation(date: string) {
  console.log('[Server Action] getXPSReconciliation for date:', date);

  try {
    const report = await sql`
      SELECT * FROM xps_daily_reports 
      WHERE report_date = ${date}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (report.length === 0) {
      return { 
        success: true, 
        data: null, 
        message: 'No reconciliation found for this date.' 
      };
    }

    const redFlags = await sql`
      SELECT * FROM xps_red_flags 
      WHERE report_id = ${report[0].id};
    `;

    return {
      success: true,
      data: {
        report: report[0],
        red_flags: redFlags
      },
      message: 'Reconciliation loaded successfully!'
    };

  } catch (error) {
    console.error('Error loading reconciliation:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to load reconciliation.'
    };
  }
}

// Get all unmapped XPS items
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

// Debug function
export async function debugParsePDF(formData: FormData) {
  console.log('[Server Action] debugParsePDF initiated');
  
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, message: 'No file provided.' };
    }

    const buffer = await file.arrayBuffer();
    let text = '';
    
    try {
      text = await parsePDF(Buffer.from(buffer));
    } catch (err) {
      console.error('Debug parse error:', err);
    }
    
    console.log('=== RAW PDF TEXT ===');
    console.log(text);
    console.log('=== END RAW PDF TEXT ===');
    
    const items = parseSambaPOSItems(text);
    
    return {
      success: true,
      data: {
        raw_text: text.substring(0, 2000),
        length: text.length,
        extracted_items: items,
        item_count: items.length
      }
    };
  } catch (error) {
    console.error('Debug parse error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Debug parse failed'
    };
  }
}