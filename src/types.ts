/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  code: string; // Barcode or unique product code
  name: string;
  category?: string;
  minStock?: number;
}

export interface StockItem {
  id: string; // Unique combination of product, lot, address, and expiry
  productCode: string;
  productName: string;
  quantity: number;
  unit: 'FD' | 'UN' | 'CX';
  lot: string;
  manufacturingDate?: string;
  expirationDate: string;
  address: string; // Storage address, e.g., "PR-A1-N2" (Prateleira A1, Nível 2)
  supplier?: string;
  invoiceNumber?: string;
  receivedDate: string;
  notes?: string;
}

export interface Movement {
  id: string;
  productCode: string;
  productName: string;
  type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  unit: 'FD' | 'UN' | 'CX';
  lot: string;
  manufacturingDate?: string;
  expirationDate: string;
  address: string;
  supplier?: string;
  invoiceNumber?: string;
  receivedDate: string;
  timestamp: string;
  notes?: string;
}
