/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Product, StockItem, Movement } from './types';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
import {
  INITIAL_PRODUCTS,
  INITIAL_STOCK,
  INITIAL_MOVEMENTS
} from './data/mockProducts';
import MovementScreen from './components/MovementScreen';
import InventoryScreen from './components/InventoryScreen';
import { STOCK_TEMPLATE_ALIASES, STOCK_TEMPLATE_HEADERS } from './utils/stockTemplate';
import {
  ClipboardList,
  Archive,
  RotateCcw,
  Zap,
  CheckCircle2,
  FileUp
} from 'lucide-react';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const findColumnKey = (headers: string[], aliases: string[]) => {
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  const foundIndex = normalizedHeaders.findIndex((header) =>
    aliases.some((alias) => header === normalizeText(alias))
  );
  return foundIndex >= 0 ? headers[foundIndex] : null;
};

const parseQuantity = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  const text = String(value ?? '').trim().replace(',', '.');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayIsoDate = () => toIsoDate(new Date());

const toIsoDateUtc = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseSpreadsheetDate = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsedDate = new Date(excelEpoch + value * 86400000);
    if (!Number.isNaN(parsedDate.getTime())) {
      return toIsoDateUtc(parsedDate);
    }
    return undefined;
  }

  const text = String(value ?? '').trim();
  if (!text) {
    return undefined;
  }

  const ddMmYyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const matched = text.match(ddMmYyyy);
  if (matched) {
    const day = Number(matched[1]);
    const month = Number(matched[2]);
    const year = Number(matched[3]);
    const parsedDate = new Date(year, month - 1, day);
    if (!Number.isNaN(parsedDate.getTime())) {
      return toIsoDate(parsedDate);
    }
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    return toIsoDate(parsedDate);
  }

  return undefined;
};

const matchesStockIdentity = (
  item: Pick<StockItem, 'productCode' | 'unit' | 'lot' | 'address' | 'manufacturingDate' | 'expirationDate' | 'supplier' | 'invoiceNumber' | 'receivedDate' | 'notes'>,
  candidate: Pick<StockItem, 'productCode' | 'unit' | 'lot' | 'address' | 'manufacturingDate' | 'expirationDate' | 'supplier' | 'invoiceNumber' | 'receivedDate' | 'notes'>
) =>
  item.productCode === candidate.productCode &&
  item.unit === candidate.unit &&
  item.lot === candidate.lot &&
  item.address === candidate.address &&
  (item.manufacturingDate || '') === (candidate.manufacturingDate || '') &&
  item.expirationDate === candidate.expirationDate &&
  (item.supplier || '') === (candidate.supplier || '') &&
  (item.invoiceNumber || '') === (candidate.invoiceNumber || '') &&
  item.receivedDate === candidate.receivedDate &&
  (item.notes || '') === (candidate.notes || '');

const normalizeStockItem = (item: StockItem) => ({
  ...item,
  unit: item.unit || 'UN',
  supplier: item.supplier || undefined,
  invoiceNumber: item.invoiceNumber || undefined,
  receivedDate: item.receivedDate || item.manufacturingDate || getTodayIsoDate(),
  notes: item.notes || undefined,
});

const normalizeMovement = (movement: Movement) => ({
  ...movement,
  unit: movement.unit || 'UN',
  supplier: movement.supplier || undefined,
  invoiceNumber: movement.invoiceNumber || undefined,
  receivedDate: movement.receivedDate || movement.timestamp.split('T')[0] || getTodayIsoDate(),
  notes: movement.notes || undefined,
});

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'MOVIMENTACAO' | 'CONSULTA'>('MOVIMENTACAO');

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('fast_stock_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('fast_stock_inventory');
    return saved ? JSON.parse(saved).map(normalizeStockItem) : INITIAL_STOCK.map(normalizeStockItem);
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('fast_stock_movements');
    return saved ? JSON.parse(saved).map(normalizeMovement) : INITIAL_MOVEMENTS.map(normalizeMovement);
  });

  const [scannedCode, setScannedCode] = useState<string>('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('fast_stock_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('fast_stock_inventory', JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem('fast_stock_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    const beforeInstallPromptHandler = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      const isBarcodeSearchInput = target.id === 'barcode-search-input';

      if (isInput && !isBarcodeSearchInput) {
        return;
      }

      if (isBarcodeSearchInput) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (timeDiff > 100 && e.key !== 'Enter') {
        buffer = '';
      }

      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        buffer += e.key;
      } else if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          setActiveScreen('MOVIMENTACAO');
          setScannedCode(buffer);
          showNotification(`Scanner Bluetooth detectou código: ${buffer}`, 'success');
          buffer = '';
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const choiceResult = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setShowInstallBanner(false);
    if (choiceResult.outcome === 'accepted') {
      showNotification('Instalação aceita! Adicionado à tela inicial.', 'success');
    } else {
      showNotification('Instalação cancelada pelo usuário.', 'info');
    }
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = event.target;
    const file = inputElement.files?.[0];
    if (!file) {
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        showNotification('Não foi possível localizar planilha para importação.', 'info');
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (rows.length === 0) {
        showNotification('A planilha está vazia.', 'info');
        return;
      }

      const headers = Object.keys(rows[0]);
      const codeKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES['Codigo de barra']);
      const nameKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Descricao);
      const lotKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Lote);
      const manufacturingKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Fabricacao);
      const expirationKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Vencimento);
      const addressKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Endereco);
      const qtyKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Quantidade);
      const unitKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES['Un. Medida']);

      if (!codeKey || !nameKey) {
        showNotification('A planilha precisa ter colunas de código e descrição/nome.', 'info');
        return;
      }

      const importedProducts: Product[] = [];
      const importedStockEntries: Omit<StockItem, 'id'>[] = [];
      let skippedRows = 0;

      for (const row of rows) {
        const code = String(row[codeKey] ?? '').trim();
        const name = String(row[nameKey] ?? '').trim();

        if (!code || !name) {
          skippedRows += 1;
          continue;
        }

        importedProducts.push({
          code,
          name,
          category: 'Geral'
        });

        const quantity = qtyKey ? parseQuantity(row[qtyKey]) : 0;
        if (quantity > 0) {
          const unitValue = String(unitKey ? row[unitKey] ?? '' : '').trim().toUpperCase();
          const unit = unitValue === 'FD' || unitValue === 'CX' ? unitValue : 'UN';
          importedStockEntries.push({
            productCode: code,
            productName: name,
            quantity,
            unit,
            lot: lotKey ? String(row[lotKey] ?? '').trim().toUpperCase() || 'IMPORTADO' : 'IMPORTADO',
            manufacturingDate: manufacturingKey ? parseSpreadsheetDate(row[manufacturingKey]) : undefined,
            expirationDate:
              (expirationKey ? parseSpreadsheetDate(row[expirationKey]) : undefined) ||
              toIsoDate(new Date(new Date().setFullYear(new Date().getFullYear() + 2))),
            address: addressKey ? String(row[addressKey] ?? '').trim().toUpperCase() || 'IMPORTADO' : 'IMPORTADO',
            supplier: undefined,
            invoiceNumber: undefined,
            receivedDate: getTodayIsoDate(),
            notes: undefined
          });
        }
      }

      if (importedProducts.length === 0) {
        showNotification('Nenhuma linha válida encontrada para importar.', 'info');
        return;
      }

      const mergedProductsMap = new Map<string, Product>();
      for (const product of products) {
        mergedProductsMap.set(product.code, product);
      }
      for (const importedProduct of importedProducts) {
        mergedProductsMap.set(importedProduct.code, importedProduct);
      }
      const mergedProducts = Array.from(mergedProductsMap.values());
      setProducts(mergedProducts);

      const now = Date.now();
      let importSequence = 0;
      const mergedProductNameByCode = new Map(mergedProducts.map((product) => [product.code, product.name]));
      const updatedStock = stock.map((item) => {
        const updatedName = mergedProductNameByCode.get(item.productCode);
        if (!updatedName || updatedName === item.productName) {
          return item;
        }
        return { ...item, productName: updatedName };
      });

      for (const importedItem of importedStockEntries) {
        const resolvedName = mergedProductNameByCode.get(importedItem.productCode) ?? importedItem.productName;
        const existingIndex = updatedStock.findIndex(
          (item) => matchesStockIdentity(item, importedItem)
        );

        if (existingIndex >= 0) {
          updatedStock[existingIndex] = {
            ...updatedStock[existingIndex],
            productName: resolvedName,
            quantity: updatedStock[existingIndex].quantity + importedItem.quantity
          };
        } else {
          importSequence += 1;
          updatedStock.unshift({
            id: `stock-import-${now}-${importSequence}`,
            ...importedItem,
            productName: resolvedName
          });
        }
      }
      setStock(updatedStock);

      const importedMessage = `${importedProducts.length} produtos importados`;
      const stockMessage = importedStockEntries.length > 0 ? ` e ${importedStockEntries.length} saldos aplicados` : '';
      const skippedMessage = skippedRows > 0 ? ` (${skippedRows} linhas ignoradas)` : '';
      showNotification(`${importedMessage}${stockMessage}${skippedMessage}.`, 'success');
    } catch {
      showNotification('Erro ao importar planilha. Verifique o formato do arquivo Excel.', 'info');
    } finally {
      inputElement.value = '';
    }
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => {
      if (prev.some(p => p.code === newProduct.code)) return prev;
      return [newProduct, ...prev];
    });
    showNotification(`Produto "${newProduct.name}" cadastrado no banco de dados!`, 'success');
  };

  const handleAddMovement = (newMov: Omit<Movement, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const id = `mov-${Date.now()}`;
    const movementWithMeta: Movement = { ...newMov, id, timestamp };

    setMovements((prev) => [movementWithMeta, ...prev]);

    setStock((prevStock) => {
      const stockCopy = [...prevStock];

      if (newMov.type === 'ENTRADA') {
        const existingItemIndex = stockCopy.findIndex(
          (item) => matchesStockIdentity(item, newMov)
        );

        if (existingItemIndex > -1) {
          stockCopy[existingItemIndex] = {
            ...stockCopy[existingItemIndex],
            quantity: stockCopy[existingItemIndex].quantity + newMov.quantity
          };
        } else {
          stockCopy.push({
            id: `stock-${Date.now()}`,
            productCode: newMov.productCode,
            productName: newMov.productName,
            quantity: newMov.quantity,
            unit: newMov.unit,
            lot: newMov.lot,
            manufacturingDate: newMov.manufacturingDate,
            expirationDate: newMov.expirationDate,
            address: newMov.address,
            supplier: newMov.supplier,
            invoiceNumber: newMov.invoiceNumber,
            receivedDate: newMov.receivedDate,
            notes: newMov.notes
          });
        }
      }

      return stockCopy;
    });
  };

  const handleDeleteMovement = (movementId: string) => {
    const movToCancel = movements.find(m => m.id === movementId);
    if (!movToCancel) return;

    const confirmed = window.confirm(
      `Deseja realmente ESTORNAR (cancelar) a movimentação de ${movToCancel.type} do produto "${movToCancel.productName}" (Qtd: ${movToCancel.quantity})?\nO estoque será recalculado.`
    );
    if (!confirmed) return;

    setMovements((prev) => prev.filter(m => m.id !== movementId));

    setStock((prevStock) => {
      const stockCopy = [...prevStock];

      const existingIndex = stockCopy.findIndex(
        (item) => matchesStockIdentity(item, movToCancel)
      );

      if (existingIndex > -1) {
        const currentQty = stockCopy[existingIndex].quantity;
        const remaining = Math.max(0, currentQty - movToCancel.quantity);
        if (remaining === 0) {
          stockCopy.splice(existingIndex, 1);
        } else {
          stockCopy[existingIndex] = { ...stockCopy[existingIndex], quantity: remaining };
        }
      }

      return stockCopy;
    });

    showNotification(
      'Movimentação estornada com sucesso. Estoque atualizado!', 'info');
  };

  const handleResetDatabase = () => {
    const password = window.prompt('Digite a senha para limpar a base geral:');
    if (password !== '@Maral22') {
      showNotification('Senha inválida. A base não foi apagada.', 'info');
      return;
    }
    const confirmed = window.confirm(
      'Atenção: Isso irá APAGAR de forma irreversível todos os produtos cadastrados, estoque atual e histórico de movimentações. Deseja iniciar uma base limpa?'
    );
    if (confirmed) {
      localStorage.removeItem('fast_stock_products');
      localStorage.removeItem('fast_stock_inventory');
      localStorage.removeItem('fast_stock_movements');
      setProducts([]);
      setStock([]);
      setMovements([]);
      showNotification('Base de dados limpa com sucesso!', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none">
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center">
              <Zap className="h-6 w-6 text-yellow-300 fill-yellow-300 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-black text-lg tracking-tight">C4 Gestão</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Módulo Conferência
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registro e conferência rápida de entradas de mercadorias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportProducts}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="text-[11px] font-bold text-slate-300 hover:text-emerald-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Importar produtos e quantidades de planilha Excel"
            >
              <FileUp className="h-3 w-3" />
              Importar Excel
            </button>
            <button
              onClick={handleResetDatabase}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Apagar todos os dados e começar base limpa"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar Base Geral
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        {showInstallBanner && (
          <div className="max-w-4xl mx-auto mt-4 px-4">
            <div className="bg-indigo-600 text-white rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-600/20">
              <div>
                <p className="font-bold text-sm">Instale o aplicativo no tablet ou celular</p>
                <p className="text-xs text-indigo-100 mt-1">Use o botão abaixo para adicionar o C4 Gestão à tela inicial e acessar rapidamente offline.</p>
              </div>
              <button
                type="button"
                onClick={handleInstallApp}
                className="rounded-full bg-white text-indigo-700 px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-sm hover:bg-slate-100 transition"
              >
                Instalar App
              </button>
            </div>
          </div>
        )}

        {notification && (
          <div className="max-w-md mx-auto mt-4 px-4">
            <div className={`p-3.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 animate-bounce ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}>
              <CheckCircle2 className="h-4.5 w-4.5 text-white shrink-0" />
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 mt-4">
          <nav className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveScreen('MOVIMENTACAO')}
              className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-tight transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeScreen === 'MOVIMENTACAO'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>Registrar Entrada</span>
            </button>

            <button
              onClick={() => setActiveScreen('CONSULTA')}
              className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-tight transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeScreen === 'CONSULTA'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span>Consulta & Histórico</span>
            </button>
          </nav>
        </div>

        <div className="mt-4">
          {activeScreen === 'MOVIMENTACAO' && (
            <MovementScreen
              products={products}
              stock={stock}
              onAddMovement={handleAddMovement}
              onAddProduct={handleAddProduct}
              scannedCode={scannedCode}
              setScannedCode={setScannedCode}
            />
          )}

          {activeScreen === 'CONSULTA' && (
            <InventoryScreen
              products={products}
              stock={stock}
              movements={movements}
              onDeleteMovement={handleDeleteMovement}
            />
          )}
        </div>
      </main>
    </div>
  );
}
