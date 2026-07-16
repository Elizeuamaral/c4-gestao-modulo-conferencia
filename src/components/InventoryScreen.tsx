/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, StockItem, Movement } from '../types';
import { MOVEMENT_EXPORT_HEADERS } from '../utils/stockTemplate';
import { 
  Search, 
  Archive, 
  History, 
  Clock, 
  Trash2, 
  MapPin, 
  Download
} from 'lucide-react';

interface InventoryScreenProps {
  products: Product[];
  stock: StockItem[];
  movements: Movement[];
  onDeleteMovement?: (movementId: string) => void;
}

export default function InventoryScreen({
  products,
  stock,
  movements,
  onDeleteMovement
}: InventoryScreenProps) {
  const [activeTab, setActiveTab] = useState<'ESTOQUE' | 'HISTORICO'>('ESTOQUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [locationFilter, setLocationFilter] = useState('TODOS');

  const filteredStock = stock.filter((item) => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productCode.includes(searchQuery) ||
      item.lot.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = locationFilter === 'TODOS' || item.address === locationFilter;
    
    return matchesSearch && matchesLocation && item.quantity > 0;
  });

  const filteredMovements = movements.filter((mov) => {
    const matchesSearch = 
      mov.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mov.productCode.includes(searchQuery) ||
      mov.lot.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mov.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mov.notes && mov.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'TODOS' || mov.type === typeFilter;
    const matchesLocation = locationFilter === 'TODOS' || mov.address === locationFilter;
    
    return matchesSearch && matchesType && matchesLocation;
  });

  const uniqueLocationsInStock = Array.from(new Set(stock.map(item => item.address))).sort();

  const totalItemsInStock = stock.reduce((sum, item) => sum + item.quantity, 0);
  const totalUniqueProductsInStock = new Set(stock.filter(i => i.quantity > 0).map(item => item.productCode)).size;
  const totalEntradas = movements.filter(m => m.type === 'ENTRADA').reduce((sum, m) => sum + m.quantity, 0);

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return dateString.split('-').reverse().join('/');
    } catch {
      return dateString;
    }
  };

  const exportToCSV = () => {
    const headers = [...MOVEMENT_EXPORT_HEADERS];
    let rows: string[][] = [];
    let filename = '';

    if (activeTab === 'ESTOQUE') {
      rows = filteredStock.map(item => [
        item.productCode,
        item.productName,
        item.lot,
        item.manufacturingDate || 'N/A',
        item.expirationDate,
        item.address,
        item.quantity.toString(),
        item.unit
      ]);
      filename = 'estoque_atual.csv';
    } else {
      rows = filteredMovements.map(mov => [
        mov.productCode,
        mov.productName,
        mov.lot,
        mov.manufacturingDate || 'N/A',
        mov.expirationDate,
        mov.address,
        mov.quantity.toString(),
        mov.unit
      ]);
      filename = 'historico_movimentacoes.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Produtos Ativos</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-800">{totalUniqueProductsInStock}</span>
            <span className="text-xs text-slate-500">tipos</span>
          </div>
        </div>
        
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Itens em Estoque</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-600">{totalItemsInStock}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Entradas</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">+{totalEntradas}</span>
            <span className="text-xs text-slate-500">un</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('ESTOQUE'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-center font-bold text-base border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ESTOQUE'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-estoque-atual"
        >
          <Archive className="h-5 w-5" />
          Estoque Atual
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {filteredStock.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('HISTORICO'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-center font-bold text-base border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'HISTORICO'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-historico-movimentacoes"
        >
          <History className="h-5 w-5" />
          Histórico de Movimentações
          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {filteredMovements.length}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 relative">
            <Search className="absolute left-3 top-3 text-slate-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'ESTOQUE' 
                ? "Buscar por produto, lote, código, endereço..."
                : "Buscar no histórico por produto, lote..."
              }
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50"
              id="inventory-search-input"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:border-indigo-500"
              id="filter-location-select"
            >
              <option value="TODOS">Todos os setores</option>
              {uniqueLocationsInStock.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToCSV}
            className="sm:col-span-2 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
            id="btn-export-csv"
          >
            <Download className="h-3.5 w-3.5" />
            Excel/CSV
          </button>
        </div>
      </div>

      {activeTab === 'ESTOQUE' && (
        <div className="space-y-3">
          {filteredStock.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <p className="text-slate-400 font-medium text-base mb-2">Nenhuma mercadoria encontrada em estoque.</p>
              <p className="text-slate-400 text-xs">Experimente limpar a busca ou registrar novas entradas na tela anterior.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider font-mono">
                      <th className="py-3 px-4 font-semibold">Produto / Código</th>
                      <th className="py-3 px-3 font-semibold">Lote</th>
                      <th className="py-3 px-3 font-semibold">Vencimento</th>
                      <th className="py-3 px-3 font-semibold">Endereço</th>
                      <th className="py-3 px-3 font-semibold">Situação Venc.</th>
                      <th className="py-3 px-4 font-semibold text-right">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {filteredStock.map((item) => {
                      const daysRemaining = Math.ceil(
                        (new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 3600 * 24)
                      );
                      let warningBg = 'bg-emerald-100 text-emerald-800';
                      let warningText = 'Seguro';
                      let alertColor = 'text-slate-600';
                      
                      if (daysRemaining < 0) {
                        warningBg = 'bg-rose-100 text-rose-800 animate-pulse font-bold';
                        warningText = `VENCIDO`;
                        alertColor = 'text-rose-600 font-bold';
                      } else if (daysRemaining <= 30) {
                        warningBg = 'bg-amber-100 text-amber-800 font-bold';
                        warningText = `Urgente`;
                        alertColor = 'text-amber-600 font-bold';
                      } else if (daysRemaining <= 90) {
                        warningBg = 'bg-yellow-100 text-yellow-800';
                        warningText = `Alerta`;
                        alertColor = 'text-yellow-600 font-medium';
                      }

                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-50/40 transition-colors"
                          id={`stock-row-${item.id}`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{item.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Cód: {item.productCode}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-600 font-bold whitespace-nowrap">
                            {item.lot}
                          </td>
                          <td className={`py-3 px-3 font-mono text-xs whitespace-nowrap ${alertColor}`}>
                            {formatDate(item.expirationDate)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                              <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                              {item.address}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${warningBg}`}>
                              {warningText}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-sm whitespace-nowrap text-slate-800">
                            {item.quantity} un
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'HISTORICO' && (
        <div className="space-y-3">
          {filteredMovements.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <p className="text-slate-400 font-medium text-base mb-2">Nenhuma movimentação correspondente no histórico.</p>
              <p className="text-slate-400 text-xs">As entradas que você registrar aparecerão aqui detalhadamente.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider font-mono">
                      <th className="py-3 px-4 font-semibold">Data/Hora</th>
                      <th className="py-3 px-3 font-semibold">Produto / Código</th>
                      <th className="py-3 px-3 font-semibold">Lote</th>
                      <th className="py-3 px-3 font-semibold">Vencimento</th>
                      <th className="py-3 px-3 font-semibold">Endereço</th>
                      <th className="py-3 px-4 font-semibold text-right">Qtd</th>
                      {onDeleteMovement && <th className="py-3 px-4 font-semibold text-center w-16">Estorno</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {filteredMovements.map((mov) => {
                      return (
                        <tr 
                          key={mov.id} 
                          className="hover:bg-slate-50/40 transition-colors"
                          id={`movement-row-${mov.id}`}
                        >
                          <td className="py-3 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                              {formatDateTime(mov.timestamp)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 line-clamp-1">{mov.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Cód: {mov.productCode}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-600 font-bold whitespace-nowrap">
                            {mov.lot}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {formatDate(mov.expirationDate)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                              <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                              {mov.address}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-sm whitespace-nowrap text-emerald-600">
                            +{mov.quantity}
                          </td>
                          {onDeleteMovement && (
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => onDeleteMovement(mov.id)}
                                title="Estornar movimentação"
                                className="text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 p-1.5 rounded-lg transition-all inline-flex items-center justify-center active:scale-90"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
