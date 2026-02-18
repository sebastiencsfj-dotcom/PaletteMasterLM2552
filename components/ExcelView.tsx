
import React from 'react';
import { PalletSlot, SlotStatus, Order } from '../types';
import { STATUS_CONFIG } from '../constants';

interface ExcelViewProps {
  data: Record<string, PalletSlot>;
  onSlotClick: (slot: PalletSlot) => void;
}

const getDateColor = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('/')) return 'text-inherit';
  try {
    const [day, month] = dateStr.split('/').map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const itemDate = new Date(today.getFullYear(), month - 1, day);
    itemDate.setHours(0, 0, 0, 0);
    
    if (itemDate.getTime() < today.getTime()) return 'text-black'; // Passé en NOIR
    if (itemDate.getTime() === today.getTime()) return 'text-amber-500'; // Aujourd'hui en JAUNE
    if (itemDate.getTime() === tomorrow.getTime()) return 'text-emerald-600';
    return 'text-inherit';
  } catch (e) {
    return 'text-inherit';
  }
};

const ExcelView: React.FC<ExcelViewProps> = ({ data, onSlotClick }) => {
  const sortedSlots = (Object.values(data) as PalletSlot[]).sort((a, b) => {
    const isAZA = a.locationId.startsWith('ZA');
    const isBZA = b.locationId.startsWith('ZA');
    if (isAZA && !isBZA) return 1;
    if (!isAZA && isBZA) return -1;
    return a.locationId.localeCompare(b.locationId, undefined, { numeric: true });
  });

  const formatLocation = (id: string) => {
    if (id.startsWith('ZA')) return id.replace('ZA-', 'ZONE A - ');
    const parts = id.split('-');
    const label = parts.slice(0, 3).join(' - ');
    
    let pos = '';
    if (parts[3] === 'B') pos = ' (BAS)';
    else if (parts[3] === 'M') pos = ' (MILIEU)';
    else if (parts[3] === 'H') pos = ' HAUT';
    
    return `${label}${pos}`;
  };

  const copyToClipboard = () => {
    const headers = ['EMPLACEMENT', 'N° COMMANDE', 'FLUX', 'NOM', 'STATUT', 'DATE', 'COMMENTAIRE'];
    const rows = sortedSlots.map(slot => [
      formatLocation(slot.locationId),
      slot.order?.orderNumber || '',
      slot.order?.flux || '',
      slot.order?.clientName || '',
      STATUS_CONFIG[slot.status].label,
      slot.order?.date || '',
      slot.order?.comment || ''
    ]);

    const tsvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');
    
    navigator.clipboard.writeText(tsvContent).then(() => {
      alert("Tableau copié ! Vous pouvez maintenant le coller dans Excel.");
    });
  };

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  return (
    <div className="bg-[#f8f9fa] border border-gray-300 shadow-xl overflow-hidden rounded-md flex flex-col h-full select-text">
      {/* Google Sheets Toolbar */}
      <div className="bg-white border-b border-gray-300 p-2 flex items-center justify-between overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-[#22c55e] text-black px-4 py-1.5 rounded font-bold text-xs hover:bg-[#16a34a] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            COPIER POUR EXCEL
          </button>
          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          <span className="text-[10px] text-gray-500 font-medium">Cliquez sur une ligne pour l'éditer</span>
        </div>
        <div className="text-[10px] text-gray-400 italic hidden sm:block">
          La sélection à la souris est maintenant activée pour tout le tableau.
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full border-collapse table-fixed min-w-[1000px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f8f9fa] border-b border-gray-300 h-6">
              <th className="w-10 bg-[#e8eaed] border-r border-gray-300"></th>
              {columns.map(col => (
                <th key={col} className="bg-[#f8f9fa] border-r border-gray-300 text-[10px] text-gray-500 font-normal uppercase text-center align-middle">
                  {col}
                </th>
              ))}
            </tr>
            <tr className="bg-[#22c55e] text-black h-10 shadow-sm">
              <th className="bg-[#e8eaed] border-r border-b border-gray-300 text-[10px] text-gray-500 font-normal">1</th>
              <th className="border-r border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">EMPLACEMENT</th>
              <th className="border-r border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">N° COMMANDE</th>
              <th className="border-r border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">FLUX</th>
              <th className="border-r border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">NOM</th>
              <th className="border-r border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">STATUT</th>
              <th className="border-r border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">DATE</th>
              <th className="border-b border-black px-3 py-2 text-left text-[11px] font-black uppercase tracking-tight">COMMENTAIRE</th>
            </tr>
          </thead>
          <tbody className="cursor-default">
            {sortedSlots.map((slot, index) => {
              const config = STATUS_CONFIG[slot.status];
              const isOccupied = slot.status !== SlotStatus.EMPTY;
              const rowBgClass = isOccupied ? config.bgColor : 'bg-white';
              const textClass = isOccupied ? config.textColor : 'text-gray-900';
              const rowIndex = index + 2;

              return (
                <tr 
                  key={slot.locationId} 
                  onClick={() => onSlotClick(slot)}
                  className={`${rowBgClass} border-b border-gray-200 h-10 hover:brightness-95 active:bg-blue-50 transition-colors group relative`}
                >
                  <td className="bg-[#e8eaed] border-r border-gray-300 text-[10px] text-gray-500 text-center font-normal sticky left-0 z-10">
                    {rowIndex}
                  </td>

                  {/* EMPLACEMENT */}
                  <td className="border-r border-gray-200 px-3 py-1 bg-[#22c55e] text-black font-black text-[11px] whitespace-nowrap overflow-hidden">
                    {formatLocation(slot.locationId)}
                  </td>

                  {/* N° COMMANDE */}
                  <td className={`border-r border-gray-200 px-3 py-1 font-bold text-[12px] ${textClass}`}>
                    {slot.order?.orderNumber || ''}
                  </td>

                  {/* FLUX */}
                  <td className={`border-r border-gray-200 px-3 py-1 text-center font-black text-[11px] ${textClass}`}>
                    {slot.order?.flux || ''}
                  </td>

                  {/* NOM */}
                  <td className={`border-r border-gray-200 px-3 py-1 font-black text-[12px] uppercase truncate ${textClass}`}>
                    {slot.order?.clientName || ''}
                  </td>

                  {/* STATUT */}
                  <td className={`border-r border-gray-200 px-3 py-1 font-black text-[11px] uppercase ${textClass}`}>
                    {config.label}
                  </td>

                  {/* DATE */}
                  <td className={`border-r border-gray-200 px-3 py-1 font-black text-[11px] text-center ${getDateColor(slot.order?.date || '')}`}>
                    {slot.order?.date || ''}
                  </td>

                  {/* COMMENTAIRE */}
                  <td className={`px-3 py-1 font-medium italic text-[11px] truncate ${textClass}`}>
                    {slot.order?.comment || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Sheets Tabs Bar */}
      <div className="bg-[#f8f9fa] border-t border-gray-300 px-4 py-1 flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center bg-white px-4 py-1.5 border-t-2 border-green-600 rounded-t shadow-sm">
           <svg className="w-3 h-3 text-green-700 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/></svg>
           <span className="text-[11px] font-black text-gray-700">Palettier IKEA</span>
        </div>
      </div>
    </div>
  );
};

export default ExcelView;
