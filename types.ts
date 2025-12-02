export interface ReceiptItem {
  description: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  id: string;
  merchantName: string;
  transactionDate: string;
  currency: string;
  totalAmount: number;
  items: ReceiptItem[];
  category: string;
  confidenceScore: number; // 0-100
  synced?: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  VIEWING = 'VIEWING',
  ERROR = 'ERROR'
}

export interface ChartDataPoint {
  name: string;
  value: number;
}