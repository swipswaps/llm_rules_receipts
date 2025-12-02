import { createClient } from '@supabase/supabase-js';
import { ReceiptData } from '../types';

/* 
  SQL SCHEMA SETUP
  
  Run this SQL in your Supabase/PostgreSQL SQL Editor to create the necessary tables:

  create table receipts (
    id uuid primary key,
    merchant_name text,
    transaction_date date,
    total_amount numeric,
    currency text,
    category text,
    confidence_score numeric,
    created_at timestamp with time zone default now()
  );

  create table receipt_items (
    id uuid primary key default gen_random_uuid(),
    receipt_id uuid references receipts(id) on delete cascade,
    description text,
    qty numeric,
    price numeric
  );
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize client only if env vars are present
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

export const saveReceiptToDB = async (receipt: ReceiptData): Promise<boolean> => {
  if (!supabase) {
    console.warn("Database credentials missing. Skipping PostgreSQL save.");
    return false;
  }
  
  try {
    // Check if exists first to prevent unique constraint errors if retrying
    const { data: existing } = await supabase
      .from('receipts')
      .select('id')
      .eq('id', receipt.id)
      .single();

    if (existing) return true; // Already exists

    // 1. Insert Receipt
    const { error: receiptError } = await supabase
      .from('receipts')
      .insert({
        id: receipt.id,
        merchant_name: receipt.merchantName,
        transaction_date: receipt.transactionDate,
        total_amount: receipt.totalAmount,
        currency: receipt.currency,
        category: receipt.category,
        confidence_score: receipt.confidenceScore
      });

    if (receiptError) throw receiptError;

    // 2. Insert Items
    if (receipt.items.length > 0) {
      const itemsToInsert = receipt.items.map(item => ({
        receipt_id: receipt.id,
        description: item.description,
        qty: item.qty,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(itemsToInsert);
        
      if (itemsError) throw itemsError;
    }

    return true;
  } catch (error) {
    console.error("PostgreSQL Insert Error:", error);
    throw error;
  }
};

export const fetchReceiptsFromDB = async (): Promise<ReceiptData[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        receipt_items (
          description,
          qty,
          price
        )
      `)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
      id: row.id,
      merchantName: row.merchant_name,
      transactionDate: row.transaction_date,
      totalAmount: row.total_amount,
      currency: row.currency,
      category: row.category,
      confidenceScore: row.confidence_score,
      synced: true, // Mark as synced since it came from DB
      items: (row.receipt_items || []).map((item: any) => ({
        description: item.description,
        qty: item.qty,
        price: item.price
      }))
    }));
  } catch (error) {
    console.error("PostgreSQL Fetch Error:", error);
    throw error;
  }
};

export const syncLocalToDB = async (localReceipts: ReceiptData[]): Promise<number> => {
  if (!supabase) return 0;
  
  let syncedCount = 0;
  
  // Filter for items that are NOT marked as synced
  const unsynced = localReceipts.filter(r => !r.synced);
  
  for (const receipt of unsynced) {
    try {
      const success = await saveReceiptToDB(receipt);
      if (success) syncedCount++;
    } catch (e) {
      console.error(`Failed to sync receipt ${receipt.id}`, e);
    }
  }
  
  return syncedCount;
};