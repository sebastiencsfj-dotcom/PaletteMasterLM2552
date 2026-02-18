
import React, { useState, useEffect } from 'react';
import { ReturnItem, SasItem } from '../types';

interface ReturnsZoneProps {
  items: ReturnItem[];
  onUpdate: (items: ReturnItem[]) => void;
  sasItems: SasItem[];
  onRemoveFromSas: (id: string) => void;
}

const ReturnsZone: React.FC<ReturnsZoneProps> = ({ items, onUpdate, sasItems, onRemoveFromSas }) => {
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const [showSasPicker, setShowSasPicker] = useState(false);
  
  const MIN_ROWS = 25;
  const ROWS_COUNT = Math.max(MIN_ROWS, items.length);

  useEffect(() => {
    if (confirmClear) {
      const timer = setTimeout(() => setConfirmClear(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmClear]);

  const formatReturnNumber = (val: string) => {
    let clean = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.length === 4 && !clean.includes('-') && !/^\d+$/.test(clean)) {
      return clean + '-';
    }
    if (clean.includes('-') && clean.length > 9) return clean.slice(0, 9);
    return clean;
  };

  const handleCellChange = (index: number, field: keyof ReturnItem, value: string) => {
    const newItems = [...items];
    if (!newItems[index]) {
      newItems[index] = {
        id: Math.random().toString(36).substr(2, 9),
        returnNumber: '',
        clientName: '',
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      };
    }

    const formattedValue = field === 'returnNumber' ? formatReturnNumber(value) : value;
    newItems[index] = { ...newItems[index], [field]: formattedValue };
    
    const compactedItems = newItems.filter(item => 
      item && (item.returnNumber.trim() !== '' || item.clientName.trim() !== '')
    );
    
    onUpdate(compactedItems);
  };

  const handleClearRow = (index: number) => {
    const itemToRemove = items[index];
    if (itemToRemove) {
      const newSelected = new Set(selectedIds);
      newSelected.delete(itemToRemove.id);
      setSelectedIds(newSelected);
    }
    const compactedItems = items.filter((_, i) => i !== index);
    onUpdate(compactedItems);
  };

  const handleClearAll = () => {
    if (confirmClear) {
      onUpdate([]);
      setSelectedIds(new Set());
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const copyToExcel = () => {
    const itemsToCopy = selectedIds.size > 0 
      ? items.filter(item => selectedIds.has(item.id))
      : items;

    if (itemsToCopy.length === 0) return;

    const rows = itemsToCopy
      .map(item => `${item.returnNumber}\t${item.clientName}`)
      .join('\n');

    navigator.clipboard.writeText(rows).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const retSasItems = sasItems.filter(item => item.flux === 'RET');

  const handleImportFromSas = (sasItem: SasItem) => {
    const newReturn: ReturnItem = {
      id: Math.random().toString(36).substr(2, 9),
      returnNumber: sasItem.orderNumber || '',
      clientName: sasItem.clientName || '',
      date: sasItem.date || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    };
    onUpdate([...items, newReturn]);
    onRemoveFromSas(sasItem.id);
    setShowSasPicker(false);
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-950 dark:border-slate-800 shadow-xl overflow-hidden select-text mb-24 relative transition-colors rounded-2xl">
      
      {showSasPicker && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-6 max-w-lg mx-auto w-full">
            <h3 className="text-white font-black text-xl tracking-tight uppercase">Import RET (SAS)</h3>
            <button onClick={() => setShowSasPicker(false)} className="bg-white/10 p-2 rounded-full text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-w-lg mx-auto w-full">
            {retSasItems.length === 0 ? (
              <div className="text-center py-16 text-blue-300 font-bold uppercase text-xs border-2 border-dashed border-blue-800 rounded-3xl px-6">
                Aucun retour (Flux RET) dans le SAS
              </div>
            ) : (
              retSasItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => handleImportFromSas(item)}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 border border-white/10 p-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">FLUX RET</span>
                    <span className="text-white font-black text-lg group-hover:text-blue-400">{item.orderNumber}</span>
                  </div>
                  <div className="text-slate-300 font-bold uppercase text-base truncate tracking-tight">{item.clientName}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="border-b-2 border-slate-950 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center gap-3 relative transition-colors p-4">
        <div className="flex items-center justify-between w-full mb-1">
           <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white transition-colors">ZONE RETOUR</h2>
            <button 
              onClick={() => setShowSasPicker(true)}
              className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg active:scale-90 border border-blue-500"
              title="Importer depuis le SAS"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
          
          <button
            onClick={handleClearAll}
            className={`px-3 py-1.5 rounded-xl border-2 font-black text-[9px] uppercase transition-all flex items-center gap-1.5 shadow-sm active:scale-90 ${
              confirmClear 
              ? 'bg-red-600 border-red-700 text-white animate-pulse' 
              : 'bg-white dark:bg-slate-800 border-slate-950 dark:border-slate-700 text-slate-950 dark:text-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            {confirmClear ? "OK ?" : "VIDER"}
          </button>
        </div>
        
        {items.length > 0 && (
          <button 
            onClick={copyToExcel}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs transition-all shadow-md active:scale-[0.98] ${
              copied 
              ? 'bg-emerald-600 text-white' 
              : hasSelection 
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 dark:bg-slate-800 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            {copied ? (hasSelection ? `COPIÉ (${selectedIds.size}) !` : 'COPIÉ !') : (hasSelection ? `COPIER LES ${selectedIds.size} LIGNES` : 'COPIER TOUT POUR EXCEL')}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[340px]">
          <thead>
            <tr className="border-b border-slate-950 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <th className="w-10 py-3 text-center border-r border-slate-200 dark:border-slate-800">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                  disabled={items.length === 0}
                />
              </th>
              <th className="py-3 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-200 dark:border-slate-800">N° Retour</th>
              <th className="py-3 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Client</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS_COUNT }).map((_, index) => {
              const item = items[index];
              const isSelected = item ? selectedIds.has(item.id) : false;
              
              return (
                <tr key={index} className={`border-b border-slate-100 dark:border-slate-800 h-14 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="text-center border-r border-slate-100 dark:border-slate-800 p-0">
                    {item && (
                      <div className="flex items-center justify-center w-full h-full" onClick={() => toggleSelect(item.id)}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          readOnly
                          className="w-5 h-5 accent-blue-600"
                        />
                      </div>
                    )}
                  </td>
                  
                  <td className="border-r border-slate-100 dark:border-slate-800 p-0 relative">
                    <input
                      type="text"
                      value={item?.returnNumber || ''}
                      onChange={(e) => handleCellChange(index, 'returnNumber', e.target.value)}
                      placeholder={index === items.length ? "SAISIR..." : ""}
                      className="w-full h-full px-2 text-center text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase bg-transparent outline-none placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:bg-blue-50/50 dark:focus:bg-slate-800/50"
                    />
                  </td>
                  
                  <td className="p-0 relative">
                    <input
                      type="text"
                      value={item?.clientName || ''}
                      onChange={(e) => handleCellChange(index, 'clientName', e.target.value)}
                      placeholder={index === items.length ? "NOM..." : ""}
                      className="w-full h-full px-2 text-center text-sm font-bold text-slate-700 dark:text-slate-300 uppercase bg-transparent outline-none placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:bg-blue-50/50 dark:focus:bg-slate-800/50"
                    />
                    
                    {item && (item.returnNumber || item.clientName) && (
                      <button 
                        onClick={() => handleClearRow(index)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center px-4 transition-colors">
        <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          {items.length} LIGNE(S) • RETOURS MAGASIN
        </p>
        {hasSelection && (
          <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            {selectedIds.size} SÉLECTIONNÉE(S)
          </p>
        )}
      </div>
    </div>
  );
};

export default ReturnsZone;
