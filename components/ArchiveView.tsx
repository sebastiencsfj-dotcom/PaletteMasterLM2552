
import React, { useState } from 'react';
import { OrderArchive } from '../types';

interface ArchiveViewProps {
  archives: OrderArchive[];
  onClear: () => void;
}

const ArchiveView: React.FC<ArchiveViewProps> = ({ archives, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const formatLocation = (id: string) => {
    if (!id) return '-';
    if (id.startsWith('ZA')) return id.replace('ZA-', 'SOL ');
    const parts = id.split('-');
    const label = parts.slice(1, 3).join('-');
    
    let pos = '';
    if (parts[3] === 'B') pos = ' (B)';
    else if (parts[3] === 'M') pos = ' (M)';
    else if (parts[3] === 'H') pos = ' (H)';
    
    return `${label}${pos}`;
  };

  const filteredArchives = archives.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.orderNumber.toLowerCase().includes(q) ||
      item.clientName.toLowerCase().includes(q) ||
      (item.flux && item.flux.toLowerCase().includes(q)) ||
      (item.locationId && item.locationId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
      <div className="bg-slate-800 dark:bg-slate-950 p-6 text-center relative transition-colors">
        <h2 className="text-2xl font-black tracking-widest text-white uppercase leading-none">ARCHIVES DES SORTIES</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Suivi chronologique des commandes traitées</p>
        
        {archives.length > 0 && (
          <button 
            onDoubleClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-700 dark:bg-slate-800 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-[10px] font-black transition-colors"
          >
            VIDER (DOUBLE-CLIC)
          </button>
        )}
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Rechercher (N°, Nom, Flux, Emplacement)..." 
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 dark:text-white rounded-2xl border dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-slate-500 outline-none transition-all font-medium text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[60vh] scrollbar-hide">
        <table className="w-full border-collapse min-w-[320px]">
          <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
            <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-4 text-left">Commande</th>
              <th className="py-4 px-2 text-center">Entrée</th>
              <th className="py-4 px-2 text-center">Sortie</th>
              <th className="py-4 px-4 text-right">Emplacement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredArchives.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-300 dark:text-slate-600 font-bold uppercase text-xs italic">
                  {searchQuery ? "Aucun résultat" : "Aucune archive"}
                </td>
              </tr>
            ) : (
              filteredArchives.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap tracking-tight">{item.orderNumber}</div>
                        {item.flux && <span className="text-[7px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 rounded font-black uppercase">{item.flux}</span>}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{item.clientName}</div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-500 leading-none">{formatTime(item.entryTime)}</div>
                    <div className="text-[8px] font-bold text-slate-300 dark:text-slate-600 mt-0.5">{formatDate(item.entryTime)}</div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <div className="text-[11px] font-black text-rose-600 dark:text-rose-500 leading-none">{formatTime(item.exitTime)}</div>
                    <div className="text-[8px] font-bold text-slate-300 dark:text-slate-600 mt-0.5">{formatDate(item.exitTime)}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-colors border border-indigo-100 dark:border-indigo-800">
                      {formatLocation(item.locationId)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center transition-colors">
        <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
          {filteredArchives.length} archive(s) affichée(s)
        </p>
      </div>
    </div>
  );
};

export default ArchiveView;
