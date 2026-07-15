/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Product, StockItem, Movement } from '../types';
import { playSuccessBeep, playErrorBuzzer } from '../utils/audio';
import { 
  PlusCircle, 
  Barcode, 
  Calendar, 
  Package, 
  MapPin, 
  CornerDownRight, 
  ClipboardCheck, 
  RotateCcw,
  Plus,
  Layers
} from 'lucide-react';
import { STOCK_LOCATIONS } from '../data/mockProducts';

interface MovementScreenProps {
  products: Product[];
  stock: StockItem[];
  onAddMovement: (movement: Omit<Movement, 'id' | 'timestamp'>) => void;
  onAddProduct: (product: Product) => void;
  scannedCode: string;
  setScannedCode: (code: string) => void;
}

export default function MovementScreen({
  products,
  stock,
  onAddMovement,
  onAddProduct,
  scannedCode,
  setScannedCode
}: MovementScreenProps) {
  const type = 'ENTRADA';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [lot, setLot] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [keepFocus, setKeepFocus] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (keepFocus && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [keepFocus, successMessage]);

  useEffect(() => {
    if (scannedCode) {
      handleProductCodeLookup(scannedCode);
      setScannedCode('');
    }
  }, [scannedCode]);

  const handleProductCodeLookup = (code: string) => {
    const found = products.find(p => p.code === code || p.name.toLowerCase() === code.toLowerCase());
    
    if (found) {
      if (selectedProduct && selectedProduct.code === found.code) {
        setQuantity(q => q + 1);
      } else {
        setSelectedProduct(found);
        setProductName(found.name);
        setIsNewProduct(false);
        setSearchQuery(found.code);
        setQuantity(1);
        setLot('');
        setExpirationDate('');
        setManufacturingDate('');
      }
      playSuccessBeep();
      setErrorMessage(null);
    } else {
      setSelectedProduct(null);
      setProductName('');
      setIsNewProduct(true);
      setSearchQuery(code);
      setLot('');
      setExpirationDate('');
      setManufacturingDate('');
      setAddress('');
      setQuantity(1);
      playErrorBuzzer();
      setErrorMessage(`Código "${code}" não cadastrado. Digite o nome para cadastrar.`);
    }

    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 20);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim()) {
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
    }
  };

  const selectSuggestedProduct = (product: Product) => {
    handleProductCodeLookup(product.code);
    setShowProductSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        handleProductCodeLookup(searchQuery.trim());
      }
    }
  };

  const handleClearForm = () => {
    setSearchQuery('');
    setSelectedProduct(null);
    setProductName('');
    setQuantity(1);
    setLot('');
    setManufacturingDate('');
    setExpirationDate('');
    setAddress('');
    setNotes('');
    setIsNewProduct(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = searchQuery.trim();
    if (!code) {
      setErrorMessage('Por favor, digite ou bipe um código de barras.');
      playErrorBuzzer();
      return;
    }

    if (!productName.trim()) {
      setErrorMessage('O nome do produto é obrigatório.');
      playErrorBuzzer();
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('A quantidade deve ser maior que zero.');
      playErrorBuzzer();
      return;
    }

    if (!lot.trim()) {
      setErrorMessage('O número de lote é obrigatório.');
      playErrorBuzzer();
      return;
    }

    if (!expirationDate) {
      setErrorMessage('A data de vencimento é obrigatória.');
      playErrorBuzzer();
      return;
    }

    if (!address.trim()) {
      setErrorMessage('O endereço de estoque (localização) é obrigatório.');
      playErrorBuzzer();
      return;
    }

    if (isNewProduct) {
      const newProduct: Product = {
        code,
        name: productName.trim(),
        category: 'Geral',
      };
      onAddProduct(newProduct);
      setIsNewProduct(false);
    }

    onAddMovement({
      productCode: code,
      productName: productName.trim(),
      type,
      quantity,
      lot: lot.trim().toUpperCase(),
      manufacturingDate: manufacturingDate || undefined,
      expirationDate,
      address: address.trim().toUpperCase(),
      notes: notes.trim() || undefined,
    });

    playSuccessBeep();
    setSuccessMessage(`Sucesso! Entrada registrada de ${quantity} un de "${productName.trim()}".`);
    
    setSearchQuery('');
    setSelectedProduct(null);
    setProductName('');
    setQuantity(1);
    setLot('');
    setManufacturingDate('');
    setExpirationDate('');
    setAddress('');
    setNotes('');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const suggestions = searchQuery.trim() 
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.code.includes(searchQuery)
      ).slice(0, 5)
    : [];

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-emerald-600" />
          Registrar Entrada de Mercadoria
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        {successMessage && (
          <div className="bg-emerald-500 text-white p-4 font-medium flex items-center justify-between text-sm animate-fade-in" id="success-banner">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-white hover:text-emerald-100 font-bold ml-2">✕</button>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-500 text-white p-4 font-medium flex items-center justify-between text-sm animate-fade-in" id="error-banner">
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 p-1 rounded-full">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-white hover:text-rose-100 font-bold ml-2">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2 relative">
            <label className="block text-sm font-semibold text-slate-700 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <Barcode className="h-4 w-4 text-indigo-500" />
                1. Bipar Código de Barras ou Digitar Código/Nome
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal">
                <input
                  type="checkbox"
                  id="keep-focus"
                  checked={keepFocus}
                  onChange={(e) => setKeepFocus(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <label htmlFor="keep-focus" className="cursor-pointer">Manter foco automático</label>
              </div>
            </label>

            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                placeholder="Bipe o código com o leitor Bluetooth ou digite aqui..."
                className={`w-full px-4 py-3.5 rounded-xl border-2 font-mono text-base placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                  isNewProduct 
                    ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-50' 
                    : selectedProduct 
                      ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-50' 
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-50'
                }`}
                id="barcode-search-input"
              />
              
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1 rounded-full transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>

            {showProductSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden divide-y divide-slate-100">
                {suggestions.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => selectSuggestedProduct(p)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">{p.name}</span>
                      <span className="text-xs text-slate-400 font-mono">Cód: {p.code}</span>
                    </div>
                    {p.category && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                        {p.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-indigo-500" />
                Nome do Produto
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={isNewProduct ? "Insira o nome do novo produto..." : "Selecione ou bipe um produto"}
                disabled={selectedProduct !== null && !isNewProduct}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                id="product-name-input"
              />
              {isNewProduct && (
                <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 animate-pulse">
                  <Plus className="h-3 w-3" /> Novo produto será cadastrado automaticamente ao salvar.
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-500" />
                Quantidade
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-12 h-12 rounded-xl flex items-center justify-center transition-colors active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  id="qty-input"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center font-semibold text-lg py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-12 h-12 rounded-xl flex items-center justify-center transition-colors active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Detalhamento da Mercadoria (Lote, Vencimento e Endereço)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Número do Lote</label>
                <input
                  type="text"
                  value={lot}
                  onChange={(e) => setLot(e.target.value.toUpperCase())}
                  placeholder="EX: L-AB12"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-slate-800 uppercase bg-white"
                  id="lot-input"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Fabricação (Opcional)</label>
                <input
                  type="date"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-sans text-slate-800 bg-white"
                  id="mfg-date-input"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 flex justify-between">
                  <span>Vencimento</span>
                  {expirationDate && (
                    <span className="text-[10px] text-amber-600 font-semibold font-mono animate-pulse">
                      {Math.ceil((new Date(expirationDate).getTime() - Date.now()) / (1000 * 3600 * 24)) <= 30 ? 'FIFO Crítico!' : ''}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-sans text-slate-800 bg-white"
                  id="exp-date-input"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  Local de Armazenamento (Endereço no Estoque)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value.toUpperCase())}
                  placeholder="EX: SETOR-A-01 ou PRAT-B2"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-slate-800 uppercase bg-white"
                  id="address-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Observações adicionais (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Nota fiscal, Fornecedor X, Operador fulano..."
              className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
              id="notes-input"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-200 shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100"
            id="btn-salvar-movimentacao"
          >
            <CornerDownRight className="h-5 w-5" />
            CONFIRMAR ENTRADA EM ESTOQUE
          </button>
        </form>
      </div>
    </div>
  );
}
