/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { 
  ClipboardList, 
  Archive, 
  RotateCcw,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'MOVIMENTACAO' | 'CONSULTA'>('MOVIMENTACAO');
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('fast_stock_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('fast_stock_inventory');
    return saved ? JSON.parse(saved) : INITIAL_STOCK;
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('fast_stock_movements');
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [scannedCode, setScannedCode] = useState<string>('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

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
        if (e.key === 'Enter') {
        }
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
          (item) => 
            item.productCode === newMov.productCode &&
            item.lot === newMov.lot &&
            item.address === newMov.address
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
            lot: newMov.lot,
            manufacturingDate: newMov.manufacturingDate,
            expirationDate: newMov.expirationDate,
            address: newMov.address
          });
        }
      } else if (newMov.type === 'SAIDA') {
        const existingItemIndex = stockCopy.findIndex(
          (item) => 
            item.productCode === newMov.productCode &&
            item.lot === newMov.lot &&
            item.address === newMov.address
        );

        if (existingItemIndex > -1) {
          const currentQty = stockCopy[existingItemIndex].quantity;
          const remainingQty = Math.max(0, currentQty - newMov.quantity);
          
          if (remainingQty === 0) {
            stockCopy.splice(existingItemIndex, 1);
          } else {
            stockCopy[existingItemIndex] = {
              ...stockCopy[existingItemIndex],
              quantity: remainingQty
            };
          }
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

      if (movToCancel.type === 'ENTRADA') {
        const existingIndex = stockCopy.findIndex(
          (item) => 
            item.productCode === movToCancel.productCode &&
            item.lot === movToCancel.lot &&
            item.address === movToCancel.address
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
      } else if (movToCancel.type === 'SAIDA') {
        const existingIndex = stockCopy.findIndex(
          (item) => 
            item.productCode === movToCancel.productCode &&
            item.lot === movToCancel.lot &&
            item.address === movToCancel.address
        );

        if (existingIndex > -1) {
          stockCopy[existingIndex] = {
            ...stockCopy[existingIndex],
            quantity: stockCopy[existingIndex].quantity + movToCancel.quantity
          };
        } else {
          stockCopy.push({
            id: `stock-recreated-${Date.now()}`,
            productCode: movToCancel.productCode,
            productName: movToCancel.productName,
            quantity: movToCancel.quantity,
            lot: movToCancel.lot,
            manufacturingDate: movToCancel.manufacturingDate,
            expirationDate: movToCancel.expirationDate,
            address: movToCancel.address
          });
        }
      }

      return stockCopy;
    });

    showNotification(`Movimentação estornada com sucesso. Estoque atualizado!`, 'info');
  };

  const handleResetDatabase = () => {
    const confirm = window.confirm(
      'Atenção: Isso irá APAGAR de forma irreversível todos os produtos cadastrados, estoque atual e histórico de movimentações. Deseja iniciar uma base limpa?'
    );
    if (confirm) {
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
