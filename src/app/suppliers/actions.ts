// src/app/suppliers/actions.ts
'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { supplierData } from '@/data/suppliers';
import { 
  Supplier, 
  SupplierProduct, 
  SupplierTransaction, 
  SupplierPayment,
  SupplierSummary,
  ChequeRecord
} from '@/types/supplier';

// Initialize suppliers if they don't exist
export async function initializeSuppliers() {
  try {
    await sql`BEGIN`;

    for (const supplier of supplierData) {
      // Check if supplier exists
      const existing = await sql`
        SELECT id FROM suppliers WHERE id = ${supplier.id}
      `;

      if (existing.length === 0) {
        // Insert supplier with payment terms
        await sql`
          INSERT INTO suppliers (
            id, name, code, category, contact_person, phone, email,
            payment_terms, credit_days
          ) VALUES (
            ${supplier.id}, ${supplier.name}, ${supplier.code}, 
            ${supplier.category}, ${supplier.contactPerson || null}, 
            ${supplier.phone || null}, ${supplier.email || null},
            ${supplier.paymentTerms || 'credit'}, ${supplier.creditDays || 30}
          )
        `;

        // Insert products
        for (const product of supplier.products) {
          await sql`
            INSERT INTO supplier_products (
              supplier_id, product_name, unit, unit_price
            ) VALUES (
              ${supplier.id}, ${product.productName}, ${product.unit}, ${product.unitPrice}
            )
          `;
        }
      }
    }

    await sql`COMMIT`;
    return { success: true, message: 'Suppliers initialized successfully' };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error initializing suppliers:', error);
    return { success: false, message: 'Failed to initialize suppliers' };
  }
}

// Get all suppliers
export async function getSuppliers() {
  try {
    const suppliers = await sql`
      SELECT * FROM suppliers ORDER BY name
    `;

    const supplierProducts = await sql`
      SELECT * FROM supplier_products ORDER BY supplier_id, product_name
    `;

    const productsBySupplier: Record<string, SupplierProduct[]> = {};
    for (const product of supplierProducts) {
      if (!productsBySupplier[product.supplier_id]) {
        productsBySupplier[product.supplier_id] = [];
      }
      productsBySupplier[product.supplier_id].push({
        id: product.id,
        productName: product.product_name,
        unit: product.unit,
        unitPrice: Number(product.unit_price),
        notes: product.notes
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
      paymentTerms: s.payment_terms || 'credit',
      creditDays: s.credit_days || 30,
      products: productsBySupplier[s.id] || [],
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return { success: false, data: null, message: 'Failed to fetch suppliers' };
  }
}

// Add product to supplier
export async function addSupplierProduct(
  supplierId: string,
  product: { productName: string; unit: string; unitPrice: number; notes?: string }
) {
  try {
    const result = await sql`
      INSERT INTO supplier_products (
        supplier_id, product_name, unit, unit_price, notes
      ) VALUES (
        ${supplierId}, ${product.productName}, ${product.unit}, 
        ${product.unitPrice}, ${product.notes || null}
      )
      RETURNING *
    `;

    revalidatePath('/suppliers');
    return { 
      success: true, 
      data: result[0], 
      message: 'Product added successfully' 
    };
  } catch (error) {
    console.error('Error adding product:', error);
    return { success: false, message: 'Failed to add product' };
  }
}

// Delete supplier product
export async function deleteSupplierProduct(productId: number) {
  try {
    await sql`
      DELETE FROM supplier_products WHERE id = ${productId}
    `;

    revalidatePath('/suppliers');
    return { success: true, message: 'Product deleted successfully' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: 'Failed to delete product' };
  }
}

// Save transaction with cheque/credit support
export async function saveTransaction(data: any) {
  try {
    await sql`BEGIN`;

    // Calculate due date for credit
    let dueDate = null;
    if (data.paymentMethod === 'credit') {
      // Get supplier to check credit days
      const supplier = await sql`
        SELECT credit_days FROM suppliers WHERE id = ${data.supplierId}
      `;
      if (supplier.length > 0) {
        const days = supplier[0].credit_days || 30;
        const date = new Date(data.transactionDate);
        date.setDate(date.getDate() + days);
        dueDate = date.toISOString().split('T')[0];
      }
    }

    // Determine status
    let status = data.status || 'pending';
    if (data.paymentMethod === 'cheque' && data.chequeNumber) {
      status = 'pending'; // Cheque is issued but not yet cleared
    } else if (data.paymentMethod === 'credit') {
      status = 'pending'; // Credit is pending payment
    } else if (data.amountPaid >= data.totalAmount) {
      status = 'completed';
    } else if (data.amountPaid > 0) {
      status = 'partial';
    }

    const transaction = await sql`
      INSERT INTO supplier_transactions (
        supplier_id, supplier_name, transaction_date, product_name,
        quantity, unit, unit_price, total_amount, amount_paid,
        balance, payment_method, cheque_number, cheque_issue_date,
        cheque_clearing_date, cheque_bank, due_date, notes, status
      ) VALUES (
        ${data.supplierId}, ${data.supplierName}, ${data.transactionDate},
        ${data.productName}, ${data.quantity}, ${data.unit},
        ${data.unitPrice}, ${data.totalAmount}, ${data.amountPaid || 0},
        ${data.balance || data.totalAmount}, ${data.paymentMethod || 'credit'},
        ${data.chequeNumber || null}, ${data.chequeIssueDate || null},
        ${data.chequeClearingDate || null}, ${data.chequeBank || null},
        ${dueDate}, ${data.notes || null}, ${status}
      )
      RETURNING *
    `;

    // If cheque was issued, record it in cheques table
    if (data.paymentMethod === 'cheque' && data.chequeNumber && data.chequeIssueDate) {
      await sql`
        INSERT INTO supplier_cheques (
          supplier_id, supplier_name, cheque_number, amount,
          issue_date, clearing_date, bank, status, notes
        ) VALUES (
          ${data.supplierId}, ${data.supplierName}, ${data.chequeNumber},
          ${data.amountPaid || data.totalAmount}, ${data.chequeIssueDate},
          ${data.chequeClearingDate || null}, ${data.chequeBank || null},
          'issued', ${data.notes || null}
        )
      `;
    }

    // If payment was made (cash or cheque), record it
    if (data.amountPaid > 0) {
      await sql`
        INSERT INTO supplier_payments (
          supplier_id, supplier_name, payment_date, amount,
          payment_method, cheque_number, cheque_issue_date,
          cheque_clearing_date, cheque_bank, notes
        ) VALUES (
          ${data.supplierId}, ${data.supplierName}, ${data.transactionDate},
          ${data.amountPaid}, ${data.paymentMethod || 'cash'},
          ${data.chequeNumber || null}, ${data.chequeIssueDate || null},
          ${data.chequeClearingDate || null}, ${data.chequeBank || null},
          ${data.notes || null}
        )
      `;
    }

    await sql`COMMIT`;
    revalidatePath('/suppliers');
    revalidatePath('/suppliers/cheques');
    
    return { 
      success: true, 
      data: transaction[0],
      message: 'Transaction saved successfully' 
    };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error saving transaction:', error);
    return { success: false, message: 'Failed to save transaction' };
  }
}

// Get transactions for a supplier
export async function getSupplierTransactions(supplierId: string, startDate?: string, endDate?: string) {
  try {
    let query = sql`
      SELECT * FROM supplier_transactions 
      WHERE supplier_id = ${supplierId}
    `;

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
      productName: t.product_name,
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
      dueDate: t.due_date,
      notes: t.notes,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, data: null, message: 'Failed to fetch transactions' };
  }
}

// Get supplier summary
export async function getSupplierSummary(supplierId: string) {
  try {
    const summary = await sql`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as balance,
        COUNT(*) as transaction_count,
        MAX(transaction_date) as last_transaction_date,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN balance ELSE 0 END), 0) as overdue_amount
      FROM supplier_transactions
      WHERE supplier_id = ${supplierId}
    `;

    return {
      success: true,
      data: {
        supplierId: supplierId,
        totalPurchases: Number(summary[0]?.total_purchases || 0),
        totalPaid: Number(summary[0]?.total_paid || 0),
        balance: Number(summary[0]?.balance || 0),
        transactionCount: Number(summary[0]?.transaction_count || 0),
        lastTransactionDate: summary[0]?.last_transaction_date,
        overdueCount: Number(summary[0]?.overdue_count || 0),
        overdueAmount: Number(summary[0]?.overdue_amount || 0)
      }
    };
  } catch (error) {
    console.error('Error fetching summary:', error);
    return { success: false, data: null, message: 'Failed to fetch summary' };
  }
}

// Record payment
export async function recordPayment(data: {
  supplierId: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer';
  chequeNumber?: string;
  chequeIssueDate?: string;
  chequeClearingDate?: string;
  chequeBank?: string;
  notes?: string;
}) {
  try {
    await sql`BEGIN`;

    const payment = await sql`
      INSERT INTO supplier_payments (
        supplier_id, supplier_name, payment_date, amount,
        payment_method, cheque_number, cheque_issue_date,
        cheque_clearing_date, cheque_bank, notes
      ) VALUES (
        ${data.supplierId}, ${data.supplierName}, ${data.paymentDate},
        ${data.amount}, ${data.paymentMethod},
        ${data.chequeNumber || null}, ${data.chequeIssueDate || null},
        ${data.chequeClearingDate || null}, ${data.chequeBank || null},
        ${data.notes || null}
      )
      RETURNING *
    `;

    // If cheque was issued, record it in cheques table
    if (data.paymentMethod === 'cheque' && data.chequeNumber && data.chequeIssueDate) {
      await sql`
        INSERT INTO supplier_cheques (
          supplier_id, supplier_name, cheque_number, amount,
          issue_date, clearing_date, bank, status, notes
        ) VALUES (
          ${data.supplierId}, ${data.supplierName}, ${data.chequeNumber},
          ${data.amount}, ${data.chequeIssueDate},
          ${data.chequeClearingDate || null}, ${data.chequeBank || null},
          'issued', ${data.notes || null}
        )
      `;
    }

    // Update the transaction balance
    // Find the oldest pending transaction with balance
    const pendingTransaction = await sql`
      SELECT id, balance FROM supplier_transactions 
      WHERE supplier_id = ${data.supplierId}
      AND balance > 0
      ORDER BY transaction_date ASC
      LIMIT 1
    `;

    if (pendingTransaction.length > 0) {
      const currentBalance = Number(pendingTransaction[0].balance);
      const newBalance = Math.max(0, currentBalance - data.amount);
      const newStatus = newBalance === 0 ? 'completed' : 'partial';

      await sql`
        UPDATE supplier_transactions 
        SET 
          amount_paid = amount_paid + ${data.amount},
          balance = ${newBalance},
          status = ${newStatus},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${pendingTransaction[0].id}
      `;
    }

    await sql`COMMIT`;
    revalidatePath('/suppliers');
    revalidatePath('/suppliers/cheques');
    
    return { 
      success: true, 
      data: payment[0],
      message: 'Payment recorded successfully' 
    };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error recording payment:', error);
    return { success: false, message: 'Failed to record payment' };
  }
}

// Get all supplier summaries (dashboard)
export async function getAllSupplierSummaries() {
  try {
    const summaries = await sql`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.payment_terms,
        COALESCE(SUM(st.total_amount), 0) as total_purchases,
        COALESCE(SUM(st.amount_paid), 0) as total_paid,
        COALESCE(SUM(st.balance), 0) as balance,
        COUNT(st.id) as transaction_count,
        MAX(st.transaction_date) as last_transaction_date,
        COUNT(CASE WHEN st.status = 'overdue' THEN 1 END) as overdue_count
      FROM suppliers s
      LEFT JOIN supplier_transactions st ON s.id = st.supplier_id
      GROUP BY s.id, s.name, s.payment_terms
      ORDER BY s.name
    `;

    const result = summaries.map((s: any) => ({
      supplierId: s.supplier_id,
      supplierName: s.supplier_name,
      paymentTerms: s.payment_terms || 'credit',
      totalPurchases: Number(s.total_purchases),
      totalPaid: Number(s.total_paid),
      balance: Number(s.balance),
      transactionCount: Number(s.transaction_count),
      lastTransactionDate: s.last_transaction_date,
      overdueCount: Number(s.overdue_count || 0)
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching supplier summaries:', error);
    return { success: false, data: null, message: 'Failed to fetch summaries' };
  }
}

// Get cheques for a supplier
export async function getSupplierCheques(supplierId: string) {
  try {
    const cheques = await sql`
      SELECT * FROM supplier_cheques 
      WHERE supplier_id = ${supplierId}
      ORDER BY issue_date DESC, created_at DESC
    `;

    const result = cheques.map((c: any) => ({
      id: c.id,
      supplierId: c.supplier_id,
      supplierName: c.supplier_name,
      chequeNumber: c.cheque_number,
      amount: Number(c.amount),
      issueDate: c.issue_date,
      clearingDate: c.clearing_date,
      bank: c.bank,
      status: c.status || 'issued',
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching cheques:', error);
    return { success: false, data: null, message: 'Failed to fetch cheques' };
  }
}

// Get all cheques (for overview)
export async function getAllCheques() {
  try {
    const cheques = await sql`
      SELECT * FROM supplier_cheques 
      ORDER BY issue_date DESC, created_at DESC
    `;

    const result = cheques.map((c: any) => ({
      id: c.id,
      supplierId: c.supplier_id,
      supplierName: c.supplier_name,
      chequeNumber: c.cheque_number,
      amount: Number(c.amount),
      issueDate: c.issue_date,
      clearingDate: c.clearing_date,
      bank: c.bank,
      status: c.status || 'issued',
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching all cheques:', error);
    return { success: false, data: null, message: 'Failed to fetch cheques' };
  }
}

// Update cheque status (mark as cleared)
export async function updateChequeStatus(
  chequeId: number, 
  status: 'cleared' | 'bounced', 
  clearingDate?: string
) {
  try {
    await sql`BEGIN`;

    // Get cheque details first
    const cheque = await sql`
      SELECT * FROM supplier_cheques WHERE id = ${chequeId}
    `;

    if (cheque.length === 0) {
      return { success: false, message: 'Cheque not found' };
    }

    const chequeData = cheque[0];

    // Update cheque status
    await sql`
      UPDATE supplier_cheques 
      SET 
        status = ${status},
        clearing_date = ${clearingDate || new Date().toISOString().split('T')[0]},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${chequeId}
    `;

    // If cheque is cleared, update the transaction status
    if (status === 'cleared') {
      // Find the transaction associated with this cheque
      const transaction = await sql`
        SELECT * FROM supplier_transactions 
        WHERE supplier_id = ${chequeData.supplier_id}
        AND cheque_number = ${chequeData.cheque_number}
        AND payment_method = 'cheque'
        ORDER BY transaction_date DESC
        LIMIT 1
      `;

      if (transaction.length > 0) {
        const tx = transaction[0];
        const newStatus = Number(tx.balance) === 0 ? 'completed' : 'partial';
        
        await sql`
          UPDATE supplier_transactions 
          SET 
            status = ${newStatus},
            cheque_clearing_date = ${clearingDate || new Date().toISOString().split('T')[0]},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${tx.id}
        `;
      }
    }

    await sql`COMMIT`;
    revalidatePath('/suppliers');
    revalidatePath('/suppliers/cheques');
    
    return { success: true, message: `Cheque ${status === 'cleared' ? 'cleared' : 'bounced'} successfully` };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error updating cheque status:', error);
    return { success: false, message: 'Failed to update cheque status' };
  }
}

// Get overdue credit transactions
export async function getOverdueCredits() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const overdue = await sql`
      SELECT * FROM supplier_transactions 
      WHERE payment_method = 'credit'
      AND due_date < ${today}
      AND status IN ('pending', 'partial')
      ORDER BY due_date ASC
    `;

    const result = overdue.map((t: any) => ({
      id: t.id,
      supplierId: t.supplier_id,
      supplierName: t.supplier_name,
      transactionDate: t.transaction_date,
      productName: t.product_name,
      totalAmount: Number(t.total_amount),
      amountPaid: Number(t.amount_paid),
      balance: Number(t.balance),
      dueDate: t.due_date,
      status: t.status,
      daysOverdue: Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24))
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching overdue credits:', error);
    return { success: false, data: null, message: 'Failed to fetch overdue credits' };
  }
}

// Get cheque summary (for dashboard)
export async function getChequeSummary() {
  try {
    const summary = await sql`
      SELECT 
        COUNT(*) as total_cheques,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as pending_cheques,
        COALESCE(SUM(CASE WHEN status = 'issued' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'cleared' THEN 1 END) as cleared_cheques,
        COALESCE(SUM(CASE WHEN status = 'cleared' THEN amount ELSE 0 END), 0) as cleared_amount
      FROM supplier_cheques
    `;

    return {
      success: true,
      data: {
        totalCheques: Number(summary[0]?.total_cheques || 0),
        totalAmount: Number(summary[0]?.total_amount || 0),
        pendingCheques: Number(summary[0]?.pending_cheques || 0),
        pendingAmount: Number(summary[0]?.pending_amount || 0),
        clearedCheques: Number(summary[0]?.cleared_cheques || 0),
        clearedAmount: Number(summary[0]?.cleared_amount || 0)
      }
    };
  } catch (error) {
    console.error('Error fetching cheque summary:', error);
    return { success: false, data: null, message: 'Failed to fetch cheque summary' };
  }
}