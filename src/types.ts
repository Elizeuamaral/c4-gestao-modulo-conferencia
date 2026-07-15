/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  code: string;
  name: string;
  category?: string;
  minStock?: number;
}

export interface StockItem {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  lot: string;
  manufacturingDate?: string;
  expirationDate: string;
  address: string;
}

export interface Movement {
  id: string;
  productCode: string;
  productName: string;
  type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  lot: string;
  manufacturingDate?: string;
  expirationDate: string;
  address: string;
  timestamp: string;
  notes?: string;
}
