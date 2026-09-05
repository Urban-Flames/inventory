// src/app/expenses/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { expenseSuppliers, commonExpenseItems } from '@/data/expenseSuppliers';

// Helper function for formatting currency (for messages)
const formatCurrency = (amount: number) => {
  return `GH₵ ${amount.toFixed(2)}`;
};

// Initialize expense suppliers
export async function initializeExpenseSuppliers() {
  try {
    await sql`BEGIN`;

    for (const supplier of expenseSuppliers) {
      const existing = await sql`
        SELECT id FROM expense_suppliers WHERE id = ${supplier.id}
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO expense_suppliers (
            id, name, code, category, contact_person, phone, email,
            payment_terms, credit_days, is_custom
          ) VALUES (
            ${supplier.id}, ${supplier.name}, ${supplier.code}, 
            ${supplier.category}, ${supplier.contactPerson || null}, 
            ${supplier.phone || null}, ${supplier.email || null},
            ${supplier.paymentTerms || 'cheque'}, ${supplier.creditDays || 0},
            false
          )
        `;

        // Add common items for this supplier
        for (const item of commonExpenseItems) {
          await sql`
            INSERT INTO expense_items (
              supplier_id, item_name, unit, category
            ) VALUES (
              ${supplier.id}, ${item.itemName}, ${item.unit}, ${item.category}
            )
          `;
        }
      }
    }

    await sql`COMMIT`;
    return { success: true, message: 'Expense suppliers initialized successfully' };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error initializing expense suppliers:', error);
    return { success: false, message: 'Failed to initialize expense suppliers' };
  }
}

// Add new expense supplier (custom)
export async function addExpenseSupplier(data: {
  name: string;
  category: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  paymentTerms?: 'cash' | 'cheque' | 'credit';
  creditDays?: number;
}) {
  try {
    // Generate a unique ID
    const id = data.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
    const code = 'CUS-' + Date.now().toString().slice(-6);

    await sql`
      INSERT INTO expense_suppliers (
        id, name, code, category, contact_person, phone, email,
        payment_terms, credit_days, is_custom
      ) VALUES (
        ${id}, ${data.name}, ${code}, 
        ${data.category || 'Other'}, ${data.contactPerson || null}, 
        ${data.phone || null}, ${data.email || null},
        ${data.paymentTerms || 'cheque'}, ${data.creditDays || 0},
        true
      )
    `;

    revalidatePath('/expenses');
    
    return { 
      success: true, 
      data: { id, name: data.name, code },
      message: `Supplier "${data.name}" added successfully` 
    };
  } catch (error) {
    console.error('Error adding expense supplier:', error);
    return { success: false, message: 'Failed to add supplier' };
  }
}

// Add expense item to a supplier
export async function addExpenseItem(
  supplierId: string,
  data: {
    itemName: string;
    unit: string;
    unitPrice: number;
    category?: string;
    notes?: string;
  }
) {
  try {
    const result = await sql`
      INSERT INTO expense_items (
        supplier_id, item_name, unit, unit_price, category, notes
      ) VALUES (
        ${supplierId}, ${data.itemName}, ${data.unit}, 
        ${data.unitPrice || 0}, ${data.category || null}, ${data.notes || null}
      )
      RETURNING *
    `;

    revalidatePath('/expenses');
    return { 
      success: true, 
      data: result[0], 
      message: 'Item added successfully' 
    };
  } catch (error) {
    console.error('Error adding expense item:', error);
    return { success: false, message: 'Failed to add item' };
  }
}

// Get all expense suppliers (including custom)
export async function getExpenseSuppliers() {
  try {
    const suppliers = await sql`
      SELECT * FROM expense_suppliers ORDER BY name
    `;

    const items = await sql`
      SELECT * FROM expense_items ORDER BY supplier_id, item_name
    `;

    const itemsBySupplier: Record<string, any[]> = {};
    for (const item of items) {
      if (!itemsBySupplier[item.supplier_id]) {
        itemsBySupplier[item.supplier_id] = [];
      }
      itemsBySupplier[item.supplier_id].push({
        id: item.id,
        itemName: item.item_name,
        unit: item.unit,
        unitPrice: Number(item.unit_price),
        category: item.category,
        notes: item.notes
      });
    }

    const result = suppliers.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      category: s.category,
      contactPerson: s.contact_person,
      phone: s.phone,
      email: s.email,
      address: s.address,
      paymentTerms: s.payment_terms || 'cheque',
      creditDays: s.credit_days || 0,
      isCustom: s.is_custom || false,
      items: itemsBySupplier[s.id] || [],
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching expense suppliers:', error);
    return { success: false, data: null, message: 'Failed to fetch suppliers' };
  }
}

// Save expense transaction
export async function saveExpenseTransaction(data: any) {
  try {
    await sql`BEGIN`;

    const transaction = await sql`
      INSERT INTO expense_transactions (
        supplier_id, supplier_name, transaction_date, item_name,
        quantity, unit, unit_price, total_amount, amount_paid,
        balance, payment_method, cheque_number, cheque_issue_date,
        cheque_clearing_date, cheque_bank, purchased_by, sales_date,
        notes, status
      ) VALUES (
        ${data.supplierId}, ${data.supplierName}, ${data.transactionDate},
        ${data.itemName}, ${data.quantity}, ${data.unit},
        ${data.unitPrice}, ${data.totalAmount}, ${data.amountPaid || 0},
        ${data.balance || data.totalAmount}, ${data.paymentMethod || 'cheque'},
        ${data.chequeNumber || null}, ${data.chequeIssueDate || null},
        ${data.chequeClearingDate || null}, ${data.chequeBank || null},
        ${data.purchasedBy || null}, ${data.salesDate || null},
        ${data.notes || null}, ${data.status || 'pending'}
      )
      RETURNING *
    `;

    // If cheque was issued, record it
    if (data.paymentMethod === 'cheque' && data.chequeNumber && data.chequeIssueDate) {
      await sql`
        INSERT INTO expense_payments (
          supplier_id, supplier_name, payment_date, amount,
          payment_method, cheque_number, cheque_issue_date,
          cheque_clearing_date, cheque_bank, notes
        ) VALUES (
          ${data.supplierId}, ${data.supplierName}, ${data.transactionDate},
          ${data.amountPaid || data.totalAmount}, 'cheque',
          ${data.chequeNumber}, ${data.chequeIssueDate},
          ${data.chequeClearingDate || null}, ${data.chequeBank || null},
          ${data.notes || null}
        )
      `;
    }

    await sql`COMMIT`;
    revalidatePath('/expenses');
    revalidatePath('/expenses/staff');
    
    return { 
      success: true, 
      data: transaction[0],
      message: 'Expense transaction saved successfully' 
    };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error saving expense transaction:', error);
    return { success: false, message: 'Failed to save expense transaction' };
  }
}

// Get expense transactions
export async function getExpenseTransactions(
  supplierId?: string,
  staffName?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    let query = sql`
      SELECT * FROM expense_transactions 
      WHERE 1=1
    `;

    if (supplierId) {
      query = sql`
        ${query} AND supplier_id = ${supplierId}
      `;
    }

    if (staffName) {
      query = sql`
        ${query} AND purchased_by = ${staffName}
      `;
    }

    if (startDate) {
      query = sql`
        ${query} AND transaction_date >= ${startDate}
      `;
    }

    if (endDate) {
      query = sql`
        ${query} AND transaction_date <= ${endDate}
      `;
    }

    query = sql`
      ${query} ORDER BY transaction_date DESC, created_at DESC
    `;

    const transactions = await query;

    const result = transactions.map((t: any) => ({
      id: t.id,
      supplierId: t.supplier_id,
      supplierName: t.supplier_name,
      transactionDate: t.transaction_date,
      itemName: t.item_name,
      quantity: Number(t.quantity),
      unit: t.unit,
      unitPrice: Number(t.unit_price),
      totalAmount: Number(t.total_amount),
      amountPaid: Number(t.amount_paid),
      balance: Number(t.balance),
      paymentMethod: t.payment_method,
      chequeNumber: t.cheque_number,
      chequeIssueDate: t.cheque_issue_date,
      chequeClearingDate: t.cheque_clearing_date,
      chequeBank: t.cheque_bank,
      purchasedBy: t.purchased_by,
      salesDate: t.sales_date,
      notes: t.notes,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching expense transactions:', error);
    return { success: false, data: null, message: 'Failed to fetch transactions' };
  }
}

// Get staff expense summary
export async function getStaffExpenseSummary() {
  try {
    const summary = await sql`
      SELECT 
        purchased_by as staff_name,
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as balance,
        COUNT(*) as transaction_count,
        MAX(transaction_date) as last_transaction_date
      FROM expense_transactions
      WHERE purchased_by IS NOT NULL
      GROUP BY purchased_by
      ORDER BY purchased_by
    `;

    const result = summary.map((s: any) => ({
      staffName: s.staff_name,
      totalPurchases: Number(s.total_purchases),
      totalPaid: Number(s.total_paid),
      balance: Number(s.balance),
      transactionCount: Number(s.transaction_count),
      lastTransactionDate: s.last_transaction_date
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching staff summary:', error);
    return { success: false, data: null, message: 'Failed to fetch staff summary' };
  }
}

// Get expense supplier summary
export async function getExpenseSupplierSummary() {
  try {
    const summary = await sql`
      SELECT 
        supplier_id,
        supplier_name,
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as balance,
        COUNT(*) as transaction_count,
        MAX(transaction_date) as last_transaction_date
      FROM expense_transactions
      GROUP BY supplier_id, supplier_name
      ORDER BY supplier_name
    `;

    const result = summary.map((s: any) => ({
      supplierId: s.supplier_id,
      supplierName: s.supplier_name,
      totalPurchases: Number(s.total_purchases),
      totalPaid: Number(s.total_paid),
      balance: Number(s.balance),
      transactionCount: Number(s.transaction_count),
      lastTransactionDate: s.last_transaction_date
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching expense supplier summary:', error);
    return { success: false, data: null, message: 'Failed to fetch expense supplier summary' };
  }
}

// Get staff transactions
export async function getStaffTransactions(staffName: string) {
  try {
    const transactions = await sql`
      SELECT * FROM expense_transactions 
      WHERE purchased_by = ${staffName}
      ORDER BY transaction_date DESC, created_at DESC
    `;

    const result = transactions.map((t: any) => ({
      id: t.id,
      supplierId: t.supplier_id,
      supplierName: t.supplier_name,
      transactionDate: t.transaction_date,
      itemName: t.item_name,
      quantity: Number(t.quantity),
      unit: t.unit,
      unitPrice: Number(t.unit_price),
      totalAmount: Number(t.total_amount),
      amountPaid: Number(t.amount_paid),
      balance: Number(t.balance),
      paymentMethod: t.payment_method,
      chequeNumber: t.cheque_number,
      chequeIssueDate: t.cheque_issue_date,
      chequeClearingDate: t.cheque_clearing_date,
      chequeBank: t.cheque_bank,
      purchasedBy: t.purchased_by,
      salesDate: t.sales_date,
      notes: t.notes,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching staff transactions:', error);
    return { success: false, data: null, message: 'Failed to fetch staff transactions' };
  }
}

// Update staff refund - FIXED: creates staff supplier within the same transaction
export async function updateStaffRefund(
  staffName: string,
  refundAmount: number,
  note?: string
) {
  try {
    await sql`BEGIN`;

    // Create supplier ID for staff
    const supplierId = `staff_${staffName.toLowerCase()}`;
    
    // Check if supplier exists, create if not
    const existing = await sql`
      SELECT id FROM expense_suppliers WHERE id = ${supplierId}
    `;
    
    if (existing.length === 0) {
      // Create staff as supplier
      await sql`
        INSERT INTO expense_suppliers (
          id, name, code, category, payment_terms, credit_days, is_custom
        ) VALUES (
          ${supplierId}, 
          ${staffName}, 
          ${'STAFF-' + staffName.toUpperCase().slice(0, 3) + '-' + Date.now().toString().slice(-4)}, 
          'Staff', 
          'cash', 
          0, 
          true
        )
      `;
    }

    // Get all pending transactions for this staff member with balance > 0
    const transactions = await sql`
      SELECT * FROM expense_transactions 
      WHERE purchased_by = ${staffName} AND balance > 0
      ORDER BY created_at ASC
    `;

    if (transactions.length === 0) {
      await sql`ROLLBACK`;
      return { success: false, message: `No pending transactions found for ${staffName}` };
    }

    let remainingRefund = refundAmount;
    let totalRefunded = 0;

    // Distribute the refund across transactions (oldest first)
    for (const transaction of transactions) {
      if (remainingRefund <= 0) break;

      const currentBalance = Number(transaction.balance);
      const currentPaid = Number(transaction.amount_paid);
      const amountToRefund = Math.min(remainingRefund, currentBalance);

      const newPaid = currentPaid + amountToRefund;
      const newBalance = currentBalance - amountToRefund;
      const newStatus = newBalance === 0 ? 'completed' : 'partial';

      await sql`
        UPDATE expense_transactions 
        SET 
          amount_paid = ${newPaid},
          balance = ${newBalance},
          status = ${newStatus},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${transaction.id}
      `;

      remainingRefund -= amountToRefund;
      totalRefunded += amountToRefund;
    }

    // Record the refund payment using the staff supplier_id
    await sql`
      INSERT INTO expense_payments (
        supplier_id, supplier_name, payment_date, amount,
        payment_method, notes
      ) VALUES (
        ${supplierId}, ${staffName}, 
        CURRENT_DATE, ${totalRefunded},
        'cash', ${note || `Refund to ${staffName}`}
      )
    `;

    await sql`COMMIT`;
    revalidatePath('/expenses');
    revalidatePath('/expenses/staff');
    
    const remainingBalance = refundAmount - totalRefunded;
    let message = `Refund of ${formatCurrency(totalRefunded)} processed for ${staffName}`;
    if (remainingBalance > 0) {
      message += `. Note: ${formatCurrency(remainingBalance)} could not be refunded as it exceeded available balances.`;
    }

    return { 
      success: true, 
      message: message
    };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error processing staff refund:', error);
    return { success: false, message: 'Failed to process refund. Please try again.' };
  }
}

// Update expense transaction payment
export async function updateExpenseTransactionPayment(
  transactionId: number,
  paymentAmount: number,
  note?: string
) {
  try {
    await sql`BEGIN`;

    // Get current transaction
    const current = await sql`
      SELECT * FROM expense_transactions WHERE id = ${transactionId}
    `;

    if (current.length === 0) {
      await sql`ROLLBACK`;
      return { success: false, message: 'Transaction not found' };
    }

    const transaction = current[0];
    const currentBalance = Number(transaction.balance);
    const currentPaid = Number(transaction.amount_paid);

    if (paymentAmount <= 0) {
      await sql`ROLLBACK`;
      return { success: false, message: 'Payment amount must be greater than 0' };
    }

    if (paymentAmount > currentBalance) {
      await sql`ROLLBACK`;
      return { success: false, message: `Payment amount (${formatCurrency(paymentAmount)}) exceeds balance (${formatCurrency(currentBalance)})` };
    }

    const newPaid = currentPaid + paymentAmount;
    const newBalance = currentBalance - paymentAmount;
    const newStatus = newBalance === 0 ? 'completed' : 'partial';

    // Update transaction
    await sql`
      UPDATE expense_transactions 
      SET 
        amount_paid = ${newPaid},
        balance = ${newBalance},
        status = ${newStatus},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${transactionId}
    `;

    // Record the payment in expense_payments table
    await sql`
      INSERT INTO expense_payments (
        supplier_id, supplier_name, payment_date, amount,
        payment_method, notes
      ) VALUES (
        ${transaction.supplier_id}, ${transaction.supplier_name}, 
        CURRENT_DATE, ${paymentAmount},
        'cash', ${note || `Payment recorded for ${transaction.item_name} (Transaction #${transactionId})`}
      )
    `;

    await sql`COMMIT`;
    revalidatePath('/expenses');
    revalidatePath('/expenses/staff');
    
    return { 
      success: true, 
      message: `Payment of ${formatCurrency(paymentAmount)} recorded successfully. Remaining balance: ${formatCurrency(newBalance)}`
    };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error updating payment:', error);
    return { success: false, message: 'Failed to update payment. Please try again.' };
  }
}

// Delete expense supplier (only custom ones)
export async function deleteExpenseSupplier(supplierId: string) {
  try {
    // Check if it's a custom supplier
    const supplier = await sql`
      SELECT is_custom FROM expense_suppliers WHERE id = ${supplierId}
    `;

    if (supplier.length === 0) {
      return { success: false, message: 'Supplier not found' };
    }

    if (!supplier[0].is_custom) {
      return { success: false, message: 'Cannot delete default suppliers' };
    }

    await sql`
      DELETE FROM expense_suppliers WHERE id = ${supplierId}
    `;

    revalidatePath('/expenses');
    return { success: true, message: 'Supplier deleted successfully' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier' };
  }
}

// Delete expense item
export async function deleteExpenseItem(itemId: number) {
  try {
    await sql`
      DELETE FROM expense_items WHERE id = ${itemId}
    `;

    revalidatePath('/expenses');
    return { success: true, message: 'Item deleted successfully' };
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, message: 'Failed to delete item' };
  }
}

// Update expense item price
export async function updateExpenseItemPrice(itemId: number, unitPrice: number) {
  try {
    await sql`
      UPDATE expense_items 
      SET unit_price = ${unitPrice}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${itemId}
    `;

    revalidatePath('/expenses');
    return { success: true, message: 'Price updated successfully' };
  } catch (error) {
    console.error('Error updating item price:', error);
    return { success: false, message: 'Failed to update price' };
  }
}