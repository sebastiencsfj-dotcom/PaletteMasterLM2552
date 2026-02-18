
import React, { useState } from 'react';
import { PalletSlot, SlotStatus } from '../types';
import { STATUS_CONFIG } from '../constants';

interface ListViewProps {
  data: Record<string, PalletSlot>;
  onSlotClick: (slot: PalletSlot) => void;
  searchQuery: string;
  filterStatus: SlotStatus | 'ENCOURS' | null;
  isCuttingId: string | null;
}

const getDateColor = (dateStr: string) => {
  if (dateStr === 'NEW') return 'text-emerald-500 dark:text-emerald-400 font-black animate-pulse';
  if (!dateStr || !dateStr.includes('/')) return 'text-gray-900 dark:text-white';
  try {
    const [day, month] = dateStr.split('/').map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const itemDate = new Date(today.getFullYear(), month - 1, day);
    itemDate.setHours(0, 0, 0, 0);
    
    if (itemDate.getTime() < today.getTime()) return 'text-black dark:text-white';
    if (itemDate.getTime() === today.getTime()) return 'text-amber-500 dark:text-amber-400';
    if (itemDate.getTime() === tomorrow.getTime()) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-gray-900 dark:text-gray-100';
  } catch (e) {
    return 'text-gray-900 dark:text-white';
  }
};

const ListView: React.FC<ListViewProps> = ({ data, onSlotClick, searchQuery, filterStatus, isCuttingId }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleExcelCopy = (slot: PalletSlot) => {
    if (!slot.order) return;
    
    const textToCopy = `${slot.order.orderNumber}\t${slot.order.flux}\t${slot.order.clientName}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(slot.locationId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const filteredSlots = (Object.values(data) as PalletSlot[])
    .filter(slot => {
      if (filterStatus === 'ENCOURS') {
        if (![SlotStatus.JAUNE, SlotStatus.BLANC, SlotStatus.ROUGE, SlotStatus.BLEU].includes(slot.status)) return false;
      } 
      else if (filterStatus) {
        if (slot.status !== filterStatus) return false;
      }
      
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        slot.locationId.toLowerCase().includes(q) ||
        (slot.order?.orderNumber?.toLowerCase().includes(q) ?? false) ||
        (slot.order?.clientName?.toLowerCase().includes(q) ?? false) ||
        (slot.order?.date?.toLowerCase().includes(q) ?? false) ||
        (slot.order?.tournee?.toLowerCase().includes(q) ?? false) ||
        (slot.order?.comment?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      const isAZA = a.locationId.startsWith('ZA');
      const isBZA = b.locationId.startsWith('ZA');
      if (isAZA && !isBZA) return 1;
      if (!isAZA && isBZA) return -1;
      if (!isAZA && !isBZA) {
        const partsA = a.locationId.split('-');
        const partsB = b.locationId.split('-');
        const baseA = partsA.slice(0, 3).join('-');
        const baseB = partsB.slice(0, 3).join('-');
        if (baseA === baseB) {
          const priority: Record<string, number> = { 'B': 0, 'M': 1, 'H': 2 };
          return priority[partsA[3] || ''] - priority[partsB[3] || ''];
        }
      }
      return a.locationId.localeCompare(b.locationId, undefined, { numeric: true });
    });

  return (
    <div className="flex flex-col gap-3 max-w-5xl mx-auto w-full">
      {filteredSlots.map((slot) => {
        const config = STATUS_CONFIG[slot.status];
        const isZA = slot.locationId.startsWith('ZA');
        const parts = slot.locationId.split('-');
        const isCutting = isCuttingId === slot.locationId;
        const ref = isZA ? "SOL" : parts.slice(1, 3).join(' - ');
        const hasComment = !!slot.order?.comment?.trim();
        
        let pos = '';
        if (isZA) pos = `#${parts[1]}`;
        else if (parts[3]) {
          if (parts[2] === '2') pos = ''; 
          else {
            if (parts[3] === 'H') pos = 'HAUT';
            else if (parts[3] === 'M') pos = 'MILIEU';
            else if (parts[3] === 'B') pos = 'BAS';
          }
        } else pos = parts[2];

        const arrivalTime = slot.order?.createdAt 
          ? new Date(slot.order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
          : '';

        const borderStyle = hasComment 
          ? 'border-dashed border-slate-400 dark:border-slate-500 ring-1 ring-slate-100 dark:ring-slate-800' 
          : 'border-transparent';

        return (
          <div
            key={slot.locationId}
            className={`w-full bg-white dark:bg-slate-900 p-3 pr-4 rounded-2xl border transition-all flex items-center justify-between group shadow-sm ${borderStyle} ${isCutting ? 'opacity-40 grayscale bg-gray-50 dark:bg-slate-800' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => onSlotClick(slot)}
                className={`w-14 h-14 rounded-xl ${config.bgColor} border ${config.borderColor} flex flex-col items-center justify-center font-black text-[9px] ${config.textColor} flex-shrink-0 leading-tight shadow-sm hover:scale-105 active:scale-95 transition-transform ${slot.status === SlotStatus.BLANC ? 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' : ''}`}
              >
                <span className="opacity-50 uppercase text-[7px]">{isZA ? "ZONE" : "EMPL."}</span>
                <span className="text-[13px]">{ref === "SOL" ? "SOL" : ref}</span>
                <span className="text-[7px] opacity-60 uppercase tracking-tighter">{pos}</span>
              </button>

              <div className="text-left overflow-hidden select-text flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className="font-bold text-base sm:text-lg text-gray-800 dark:text-slate-100 tracking-tight whitespace-nowrap">
                    {slot.order?.orderNumber || 'Vide'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-black uppercase flex-shrink-0">
                      {slot.order?.flux}
                    </span>
                    {arrivalTime && (
                      <span className="text-[8px] font-bold text-gray-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-0.5 whitespace-nowrap">
                         <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                         {arrivalTime}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl text-gray-900 dark:text-white font-black uppercase truncate tracking-tight leading-tight">
                    {slot.order?.clientName || 'Disponible'}
                  </span>
                  {hasComment && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 italic font-medium truncate max-w-[200px]">
                        "{slot.order?.comment}"
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[14px] font-black tracking-tight ${getDateColor(slot.order?.date || '')}`}>
                      {slot.order?.date}
                    </span>
                    {slot.order?.tournee && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-black uppercase shadow-sm">
                        TR: {slot.order.tournee}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {slot.order && (
                <button
                  onClick={() => handleExcelCopy(slot)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${copiedId === slot.locationId ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                >
                  {copiedId === slot.locationId ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  )}
                </button>
              )}

              <div className="flex flex-col items-end gap-0.5">
                 <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${config.bgColor} ${config.textColor} border ${config.borderColor} shadow-sm ${slot.status === SlotStatus.BLANC ? 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' : ''} whitespace-nowrap`}>
                  {isCutting ? 'MOVING...' : config.label}
                </span>
                <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold italic truncate max-w-[60px]">
                  {slot.order?.info}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListView;
