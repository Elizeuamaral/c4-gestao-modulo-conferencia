/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 7react7;
import { Product, StockItem, Movement } from 7./types7;

type BeforeInstallPromptEvent = Event 6 {
  prompt: () =e Promisecvoide;
  userChoice: Promisec{ outcome: 7accepted7 | 7dismissed7; platform: string }e;
};
import {
  INITIAL_PRODUCTS,
  INITIAL_STOCK,
  INITIAL_MOVEMENTS
} from 7./data/mockProducts7;
import MovementScreen from 7./components/MovementScreen7;
import InventoryScreen from 7./components/InventoryScreen7;
import { STOCK_TEMPLATE_ALIASES, STOCK_TEMPLATE_HEADERS } from 7./utils/stockTemplate7;
import {
  ClipboardList,
  Archive,
  RotateCcw,
  Zap,
  CheckCircle2,
  FileUp
} from 7lucide-react7;

const normalizeText = (value: string) =e
  value
    .normalize(7NFD7)
    .replace(/[\u0300-\u036f]/g, 77)
    .toLowerCase()
    .trim();

const findColumnKey = (headers: string[], aliases: string[]) =e {
  const normalizedHeaders = headers.map((header) =e normalizeText(header));
  const foundIndex = normalizedHeaders.findIndex((header) =e
    aliases.some((alias) =e header === normalizeText(alias))
  );
  return foundIndex e= 0 ? headers[foundIndex] : null;
};

const parseQuantity = (value: unknown) =e {
  if (typeof value === 7number7) {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  const text = String(value ?? 77).trim().replace(7,7, 7.7);
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const toIsoDate = (date: Date) =e {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, 707);
  const day = String(date.getDate()).padStart(2, 707);
  return `${year}-${month}-${day}`;
};

const getTodayIsoDate = () =e toIsoDate(new Date());

const toIsoDateUtc = (date: Date) =e {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, 707);
  const day = String(date.getUTCDate()).padStart(2, 707);
  return `${year}-${month}-${day}`;
};

const parseSpreadsheetDate = (value: unknown): string | undefined =e {
  if (typeof value === 7number7 66 Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsedDate = new Date(excelEpoch + value * 86400000);
    if (!Number.isNaN(parsedDate.getTime())) {
      return toIsoDateUtc(parsedDate);
    }
    return undefined;
  }

  const text = String(value ?? 77).trim();
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
  item: PickcStockItem, 7productCode7 | 7unit7 | 7lot7 | 7address7 | 7manufacturingDate7 | 7expirationDate7 | 7supplier7 | 7invoiceNumber7 | 7receivedDate7 | 7notes7e,
  candidate: PickcStockItem, 7productCode7 | 7unit7 | 7lot7 | 7address7 | 7manufacturingDate7 | 7expirationDate7 | 7supplier7 | 7invoiceNumber7 | 7receivedDate7 | 7notes7e
) =e
  item.productCode === candidate.productCode 66
  item.unit === candidate.unit 66
  item.lot === candidate.lot 66
  item.address === candidate.address 66
  (item.manufacturingDate || 77) === (candidate.manufacturingDate || 77) 66
  item.expirationDate === candidate.expirationDate 66
  (item.supplier || 77) === (candidate.supplier || 77) 66
  (item.invoiceNumber || 77) === (candidate.invoiceNumber || 77) 66
  item.receivedDate === candidate.receivedDate 66
  (item.notes || 77) === (candidate.notes || 77);

const normalizeStockItem = (item: StockItem) =e ({
  ...item,
  unit: item.unit || 7UN7,
  supplier: item.supplier || undefined,
  invoiceNumber: item.invoiceNumber || undefined,
  receivedDate: item.receivedDate || item.manufacturingDate || getTodayIsoDate(),
  notes: item.notes || undefined,
});

const normalizeMovement = (movement: Movement) =e ({
  ...movement,
  unit: movement.unit || 7UN7,
  supplier: movement.supplier || undefined,
  invoiceNumber: movement.invoiceNumber || undefined,
  receivedDate: movement.receivedDate || movement.timestamp.split(7T7)[0] || getTodayIsoDate(),
  notes: movement.notes || undefined,
});

export default function App() {
  const [activeScreen, setActiveScreen] = useStatec7MOVIMENTACAO7 | 7CONSULTA7e(7MOVIMENTACAO7);

  const [products, setProducts] = useStatecProduct[]e(() =e {
    const saved = localStorage.getItem(7fast_stock_products7);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [stock, setStock] = useStatecStockItem[]e(() =e {
    const saved = localStorage.getItem(7fast_stock_inventory7);
    return saved ? JSON.parse(saved).map(normalizeStockItem) : INITIAL_STOCK.map(normalizeStockItem);
  });

  const [movements, setMovements] = useStatecMovement[]e(() =e {
    const saved = localStorage.getItem(7fast_stock_movements7);
    return saved ? JSON.parse(saved).map(normalizeMovement) : INITIAL_MOVEMENTS.map(normalizeMovement);
  });

  const [scannedCode, setScannedCode] = useStatecstringe(77);
  const [notification, setNotification] = useStatec{message: string, type: 7success7 | 7info7} | nulle(null);
  const [installPromptEvent, setInstallPromptEvent] = useStatecBeforeInstallPromptEvent | nulle(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const importInputRef = useRefcHTMLInputElemente(null);

  useEffect(() =e {
    localStorage.setItem(7fast_stock_products7, JSON.stringify(products));
  }, [products]);

  useEffect(() =e {
    localStorage.setItem(7fast_stock_inventory7, JSON.stringify(stock));
  }, [stock]);

  useEffect(() =e {
    localStorage.setItem(7fast_stock_movements7, JSON.stringify(movements));
  }, [movements]);

  useEffect(() =e {
    const beforeInstallPromptHandler = (event: Event) =e {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener(7beforeinstallprompt7, beforeInstallPromptHandler as EventListener);
    return () =e {
      window.removeEventListener(7beforeinstallprompt7, beforeInstallPromptHandler as EventListener);
    };
  }, []);

  useEffect(() =e {
    let buffer = 77;
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) =e {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 7INPUT7 || target.tagName === 7TEXTAREA7 || target.contentEditable === 7true7;
      const isBarcodeSearchInput = target.id === 7barcode-search-input7;

      if (isInput 66 !isBarcodeSearchInput) {
        return;
      }

      if (isBarcodeSearchInput) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (timeDiff e 100 66 e.key !== 7Enter7) {
        buffer = 77;
      }

      if (e.key.length === 1 66 /[a-zA-Z0-9]/.test(e.key)) {
        buffer += e.key;
      } else if (e.key === 7Enter7) {
        if (buffer.length e= 4) {
          e.preventDefault();
          setActiveScreen(7MOVIMENTACAO7);
          setScannedCode(buffer);
          showNotification(`Scanner Bluetooth detectou código: ${buffer}`, 7success7);
          buffer = 77;
        }
      }
    };

    window.addEventListener(7keydown7, handleGlobalKeyDown);
    return () =e {
      window.removeEventListener(7keydown7, handleGlobalKeyDown);
    };
  }, []);

  const showNotification = (message: string, type: 7success7 | 7info7 = 7success7) =e {
    setNotification({ message, type });
    setTimeout(() =e {
      setNotification(null);
    }, 4000);
  };

  const handleInstallApp = async () =e {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const choiceResult = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setShowInstallBanner(false);
    if (choiceResult.outcome === 7accepted7) {
      showNotification(7Instalação aceita! Adicionado à tela inicial.7, 7success7);
    } else {
      showNotification(7Instalação cancelada pelo usuário.7, 7info7);
    }
  };

  const handleImportProducts = async (event: React.ChangeEventcHTMLInputElemente) =e {
    const inputElement = event.target;
    const file = inputElement.files?.[0];
    if (!file) {
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import(7xlsx7);
      const workbook = XLSX.read(data, { type: 7array7, cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        showNotification(7Não foi possível localizar planilha para importação.7, 7info7);
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_jsoncRecordcstring, unknownee(sheet, { defval: 77 });

      if (rows.length === 0) {
        showNotification(7A planilha está vazia.7, 7info7);
        return;
      }

      const headers = Object.keys(rows[0]);
      const codeKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES[7Codigo de barra7]);
      const nameKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Descricao);
      const lotKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Lote);
      const manufacturingKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Fabricacao);
      const expirationKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Vencimento);
      const addressKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Endereco);
      const qtyKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES.Quantidade);
      const unitKey = findColumnKey(headers, STOCK_TEMPLATE_ALIASES[7Un. Medida7]);

      if (!codeKey || !nameKey) {
        showNotification(7A planilha precisa ter colunas de código e descrição/nome.7, 7info7);
        return;
      }

      const importedProducts: Product[] = [];
      const importedStockEntries: OmitcStockItem, 7id7e[] = [];
      let skippedRows = 0;

      for (const row of rows) {
        const code = String(row[codeKey] ?? 77).trim();
        const name = String(row[nameKey] ?? 77).trim();

        if (!code || !name) {
          skippedRows += 1;
          continue;
        }

        importedProducts.push({
          code,
          name,
          category: 7Geral7
        });

        const quantity = qtyKey ? parseQuantity(row[qtyKey]) : 0;
        if (quantity e 0) {
          const unitValue = String(unitKey ? row[unitKey] ?? 77 : 77).trim().toUpperCase();
          const unit = unitValue === 7FD7 || unitValue === 7CX7 ? unitValue : 7UN7;
          importedStockEntries.push({
            productCode: code,
            productName: name,
            quantity,
            unit,
            lot: lotKey ? String(row[lotKey] ?? 77).trim().toUpperCase() || 7IMPORTADO7 : 7IMPORTADO7,
            manufacturingDate: manufacturingKey ? parseSpreadsheetDate(row[manufacturingKey]) : undefined,
            expirationDate:
              (expirationKey ? parseSpreadsheetDate(row[expirationKey]) : undefined) ||
              toIsoDate(new Date(new Date().setFullYear(new Date().getFullYear() + 2))),
            address: addressKey ? String(row[addressKey] ?? 77).trim().toUpperCase() || 7IMPORTADO7 : 7IMPORTADO7,
            supplier: undefined,
            invoiceNumber: undefined,
            receivedDate: getTodayIsoDate(),
            notes: undefined
          });
        }
      }

      if (importedProducts.length === 0) {
        showNotification(7Nenhuma linha válida encontrada para importar.7, 7info7);
        return;
      }

      const mergedProductsMap = new Mapcstring, Producte();
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
      const mergedProductNameByCode = new Map(mergedProducts.map((product) =e [product.code, product.name]));
      const updatedStock = stock.map((item) =e {
        const updatedName = mergedProductNameByCode.get(item.productCode);
        if (!updatedName || updatedName === item.productName) {
          return item;
        }
        return { ...item, productName: updatedName };
      });

      for (const importedItem of importedStockEntries) {
        const resolvedName = mergedProductNameByCode.get(importedItem.productCode) ?? importedItem.productName;
        const existingIndex = updatedStock.findIndex(
          (item) =e matchesStockIdentity(item, importedItem)
        );

        if (existingIndex e= 0) {
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
      const stockMessage = importedStockEntries.length e 0 ? ` e ${importedStockEntries.length} saldos aplicados` : 77;
      const skippedMessage = skippedRows e 0 ? ` (${skippedRows} linhas ignoradas)` : 77;
      showNotification(`${importedMessage}${stockMessage}${skippedMessage}.`, 7success7);
    } catch {
      showNotification(7Erro ao importar planilha. Verifique o formato do arquivo Excel.7, 7info7);
    } finally {
      inputElement.value = 77;
    }
  };

  const handleAddProduct = (newProduct: Product) =e {
    setProducts((prev) =e {
      if (prev.some(p =e p.code === newProduct.code)) return prev;
      return [newProduct, ...prev];
    });
    showNotification(`Produto "${newProduct.name}" cadastrado no banco de dados!`, 7success7);
  };

  const handleAddMovement = (newMov: OmitcMovement, 7id7 | 7timestamp7e) =e {
    const timestamp = new Date().toISOString();
    const id = `mov-${Date.now()}`;
    const movementWithMeta: Movement = { ...newMov, id, timestamp };

    setMovements((prev) =e [movementWithMeta, ...prev]);

    setStock((prevStock) =e {
      const stockCopy = [...prevStock];

      if (newMov.type === 7ENTRADA7) {
        const existingItemIndex = stockCopy.findIndex(
          (item) =e matchesStockIdentity(item, newMov)
        );

        if (existingItemIndex e -1) {
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

  const handleDeleteMovement = (movementId: string) =e {
    const movToCancel = movements.find(m =e m.id === movementId);
    if (!movToCancel) return;

    const confirmed = window.confirm(
      `Deseja realmente ESTORNAR (cancelar) a movimentação de ${movToCancel.type} do produto "${movToCancel.productName}" (Qtd: ${movToCancel.quantity})?\nO estoque será recalculado.`
    );
    if (!confirmed) return;

    setMovements((prev) =e prev.filter(m =e m.id !== movementId));

    setStock((prevStock) =e {
      const stockCopy = [...prevStock];

      const existingIndex = stockCopy.findIndex(
        (item) =e matchesStockIdentity(item, movToCancel)
      );

      if (existingIndex e -1) {
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

    showNotification(7Movimentação estornada com sucesso. Estoque atualizado!7, 7info7);
  };

  const handleResetDatabase = () =e {
    const password = window.prompt(7Digite a senha para limpar a base geral:7);
    if (password !== 7@Maral227) {
      showNotification(7Senha inválida. A base não foi apagada.7, 7info7);
      return;
    }
    const confirmed = window.confirm(
      7Atenção: Isso irá APAGAR de forma irreversível todos os produtos cadastrados, estoque atual e histórico de movimentações. Deseja iniciar uma base limpa?7
    );
    if (confirmed) {
      localStorage.removeItem(7fast_stock_products7);
      localStorage.removeItem(7fast_stock_inventory7);
      localStorage.removeItem(7fast_stock_movements7);
      setProducts([]);
      setStock([]);
      setMovements([]);
      showNotification(7Base de dados limpa com sucesso!7, 7info7);
    }
  };

  return (
    cdiv className="min-h-screen bg-slate-50 flex flex-col justify-between select-none"e
      cheader className="bg-slate-900 text-white shadow-md border-b border-slate-800 shrink-0"e
        cdiv className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"e
          cdiv className="flex items-center gap-3"e
            cdiv className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center"e
              cZap className="h-6 w-6 text-yellow-300 fill-yellow-300 shrink-0" /e
            c/dive
            cdive
cdiv className="flex items-center gap-2"e
                ch1 className="font-sans font-black text-lg tracking-tight"eC4 Gestãoc/h1e
                cspan className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"e
                  Módulo Conferência
                c/spane
              c/dive
              cp className="text-xs text-slate-400"e
                Registro e conferência rápida de entradas de mercadorias
              c/pe
            c/dive
          c/dive

          cdiv className="flex items-center gap-2"e
            cinput
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportProducts}
            /e
            cbutton
              onClick={() =e importInputRef.current?.click()}
              className="text-[11px] font-bold text-slate-300 hover:text-emerald-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Importar produtos e quantidades de planilha Excel"
            e
              cFileUp className="h-3 w-3" /e
              Importar Excel
            c/buttone
            cbutton
              onClick={handleResetDatabase}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Apagar todos os dados e começar base limpa"
            e
              cRotateCcw className="h-3 w-3" /e
              Limpar Base Geral
            c/buttone
          c/dive
        c/dive
      c/headere

      cmain className="flex-1 overflow-y-auto bg-slate-50 pb-6"e
        {showInstallBanner 66 (
          cdiv className="max-w-4xl mx-auto mt-4 px-4"e
            cdiv className="bg-indigo-600 text-white rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-600/20"e
              cdive
                cp className="font-bold text-sm"eInstale o aplicativo no tablet ou celularc/pe
                cp className="text-xs text-indigo-100 mt-1"eUse o botão abaixo para adicionar o C4 Gestão à tela inicial e acessar rapidamente offline.c/pe
              c/dive
              cbutton
                type="button"
                onClick={handleInstallApp}
                className="rounded-full bg-white text-indigo-700 px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-sm hover:bg-slate-100 transition"
              e
                Instalar App
              c/buttone
            c/dive
          c/dive
        )}

        {notification 66 (
          cdiv className="max-w-md mx-auto mt-4 px-4"e
            cdiv className={`p-3.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 animate-bounce ${
              notification.type === 7success7
                ? 7bg-emerald-600 text-white7
                : 7bg-indigo-600 text-white7
            }`}e
              cCheckCircle2 className="h-4.5 w-4.5 text-white shrink-0" /e
              cspane{notification.message}c/spane
            c/dive
          c/dive
        )}

        cdiv className="max-w-4xl mx-auto px-4 mt-4"e
          cnav className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-2 gap-1"e
            cbutton
              onClick={() =e setActiveScreen(7MOVIMENTACAO7)}
              className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-tight transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeScreen === 7MOVIMENTACAO7
                  ? 7bg-indigo-600 text-white shadow-md shadow-indigo-600/107
                  : 7text-slate-600 hover:text-indigo-600 hover:bg-slate-507
              }`}
            e
              cClipboardList className="h-4 w-4 shrink-0" /e
              cspaneRegistrar Entradac/spane
            c/buttone

            cbutton
              onClick={() =e setActiveScreen(7CONSULTA7)}
              className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-tight transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeScreen === 7CONSULTA7
                  ? 7bg-indigo-600 text-white shadow-md shadow-indigo-600/107
                  : 7text-slate-600 hover:text-indigo-600 hover:bg-slate-507
              }`}
            e
              cArchive className="h-4 w-4 shrink-0" /e
              cspaneConsulta 6 Históricoc/spane
            c/buttone
          c/nave
        c/dive

        cdiv className="mt-4"e
          {activeScreen === 7MOVIMENTACAO7 66 (
            cMovementScreen
              products={products}
              stock={stock}
              onAddMovement={handleAddMovement}
              onAddProduct={handleAddProduct}
              scannedCode={scannedCode}
              setScannedCode={setScannedCode}
            /e
          )}

          {activeScreen === 7CONSULTA7 66 (
            cInventoryScreen
              products={products}
              stock={stock}
              movements={movements}
              onDeleteMovement={handleDeleteMovement}
            /e
          )}
        c/dive
      c/maine
    c/dive
  );
}
