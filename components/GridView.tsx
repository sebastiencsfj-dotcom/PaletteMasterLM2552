
import React, { useState, useRef, useEffect } from 'react';
import { PalletSlot, SlotStatus } from '../types';
import { STATUS_CONFIG } from '../constants';

interface GridViewProps {
  data: Record<string, PalletSlot>;
  onSlotClick: (slot: PalletSlot) => void;
  isCuttingId: string | null;
  displayMode: 'FULL' | 'SECTION_1' | 'SECTION_2' | 'SECTION_3';
  onSwipe: (direction: 'next' | 'prev') => void;
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
  } catch (e) { return 'text-gray-900 dark:text-white'; }
};

const getFamilyName = (fullName: string) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  return parts.slice(1).join(' ');
};

const GridView: React.FC<GridViewProps> = ({ data, onSlotClick, isCuttingId, displayMode, onSwipe }) => {
  const [isZoneAOpen, setIsZoneAOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  
  const touchStart = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const prevModeRef = useRef(displayMode);
  
  const dragStartPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const mouseMoved = useRef(0);

  const columnGroupsMap: Record<string, number[][]> = {
    'FULL': [[9, 8, 7], [6, 5, 4], [3, 2, 1]],
    'SECTION_1': [[3, 2, 1]],
    'SECTION_2': [[6, 5, 4]],
    'SECTION_3': [[9, 8, 7]]
  };

  const currentGroups = columnGroupsMap[displayMode];
  const isFull = displayMode === 'FULL';

  // Centrage auto sur colonne 5
  useEffect(() => {
    if (displayMode === 'FULL' && containerRef.current) {
      const timeoutId = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const scrollWidth = container.scrollWidth;
        const scrollHeight = container.scrollHeight;
        const clientWidth = container.clientWidth;
        const clientHeight = container.clientHeight;
        
        const targetScrollX = (scrollWidth - clientWidth) / 2;
        const targetScrollY = scrollHeight > clientHeight ? 20 : 0; 
        
        container.scrollTo({ 
          left: targetScrollX > 0 ? targetScrollX : 0, 
          top: targetScrollY,
          behavior: 'smooth' 
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    prevModeRef.current = displayMode;
  }, [displayMode, zoomLevel]);

  useEffect(() => {
    if (displayMode !== 'FULL') setZoomLevel(1.0);
  }, [displayMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFull) return;
    setIsDragging(true);
    mouseMoved.current = 0;
    if (containerRef.current) {
      dragStartPos.current = {
        x: e.pageX,
        y: e.pageY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.pageX;
    const y = e.pageY;
    const walkX = (x - dragStartPos.current.x);
    const walkY = (y - dragStartPos.current.y);
    mouseMoved.current = Math.sqrt(walkX * walkX + walkY * walkY);
    if (mouseMoved.current > 5) {
      e.preventDefault();
      containerRef.current.scrollLeft = dragStartPos.current.scrollLeft - walkX;
      containerRef.current.scrollTop = dragStartPos.current.scrollTop - walkY;
    }
  };

  const stopDragging = (e: React.MouseEvent) => {
    if (isDragging && mouseMoved.current > 5) {
      e.stopPropagation();
    }
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => { 
    if (displayMode !== 'FULL') {
      touchStart.current = e.touches[0].clientX; 
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || displayMode === 'FULL') return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      onSwipe(diff > 0 ? 'next' : 'prev');
    }
    touchStart.current = null;
  };

  const renderSlot = (slotId: string, label: string, subLabel?: string, isCompact = false) => {
    const slot = data[slotId];
    if (!slot) return null;
    const config = STATUS_CONFIG[slot.status];
    const hasOrder = slot.order?.orderNumber;
    const isCutting = isCuttingId === slotId;
    const hasComment = !!slot.order?.comment?.trim();
    
    const heightClass = isFull 
      ? (isCompact ? 'min-h-[70px]' : 'min-h-[100px]') 
      : (isCompact ? 'min-h-[90px]' : 'min-h-[110px]');

    const borderStyle = hasComment 
      ? 'border-dashed border-slate-500 dark:border-slate-400' 
      : `${config.borderColor}`;

    return (
      <button
        key={slotId}
        onMouseUp={(e) => {
          if (mouseMoved.current < 10) {
            onSlotClick(slot);
          }
        }}
        className={`
          relative flex-1 ${heightClass} rounded-xl border-2 transition-all p-2 flex flex-col justify-between text-left
          ${config.bgColor} ${borderStyle} shadow-sm 
          active:scale-95 hover:brightness-95 select-none
          ${isCutting ? 'opacity-30 border-dashed border-gray-400' : ''}
          ${slot.status === SlotStatus.BLANC && !hasComment ? 'dark:bg-slate-800 dark:border-slate-700' : ''}
          ${slot.status === SlotStatus.BLANC && hasComment ? 'dark:bg-slate-800' : ''}
        `}
      >
        <div className="flex justify-between items-start pointer-events-none">
          <div className="flex flex-col">
            <span className={`text-[9px] font-black opacity-60 ${config.textColor} ${slot.status === SlotStatus.BLANC ? 'dark:text-slate-300' : ''}`}>{label}</span>
            {subLabel && <span className="text-[7px] font-bold opacity-40 uppercase tracking-tighter leading-none dark:text-slate-400">{subLabel}</span>}
          </div>
          <div className="flex items-center gap-1">
            {hasOrder && <span className={`text-[7px] font-bold uppercase ${config.textColor} ${slot.status === SlotStatus.BLANC ? 'dark:text-slate-300' : ''} opacity-70`}>{slot.order?.flux}</span>}
          </div>
        </div>
        
        {hasOrder ? (
          <div className="overflow-hidden flex flex-col gap-0.5 mt-0.5 pointer-events-none">
            <div className={`font-bold text-[9px] tracking-tighter leading-tight ${config.textColor} ${slot.status === SlotStatus.BLANC ? 'dark:text-white' : ''} whitespace-nowrap`}>
              {slot.order?.orderNumber}
            </div>
            <div className={`font-black uppercase truncate ${config.textColor} ${slot.status === SlotStatus.BLANC ? 'dark:text-white' : ''} ${isFull ? 'text-[12px]' : 'text-[14px]'}`}>
              {getFamilyName(slot.order?.clientName || '')}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className={`text-[11px] font-black italic ${getDateColor(slot.order?.date || '')} bg-white/60 dark:bg-slate-900/40 px-1.5 rounded border border-black/10 dark:border-white/10`}>{slot.order?.date}</div>
              {slot.status === SlotStatus.BLANC && slot.order?.tournee && (
                <div className={`text-[11px] font-black leading-none bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm`}>{slot.order.tournee}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full opacity-10 dark:opacity-20 pointer-events-none">
            <svg className="w-4 h-4 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </div>
        )}
      </button>
    );
  };

  const gridBaseWidth = 1000;
  const baseHeight = 850; 
  const currentHeight = innerRef.current ? innerRef.current.scrollHeight : baseHeight;

  return (
    <div className="relative overflow-hidden w-full flex flex-col h-full">
      {isFull && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-4 rounded-2xl mb-4 shadow-sm mx-1 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest whitespace-nowrap">Contrôle Zoom</span>
            <input 
              type="range" 
              min="0.1" 
              max="2.0" 
              step="0.05" 
              value={zoomLevel} 
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-full sm:w-48 h-2 bg-indigo-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 min-w-[45px] text-right">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
          
          <button 
            onClick={() => {
              setZoomLevel(1.0);
              if (containerRef.current) {
                const scrollWidth = containerRef.current.scrollWidth;
                const clientWidth = containerRef.current.clientWidth;
                containerRef.current.scrollTo({ left: (scrollWidth - clientWidth) / 2, top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Recentrer (Col. 5)
          </button>
        </div>
      )}

      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className={`flex-1 select-none transition-all ${isFull ? 'overflow-auto' : 'overflow-y-auto overflow-x-hidden'} ${isFull ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={`flex justify-center items-start min-w-full h-full`}
          style={{ 
            padding: isFull ? '40px 20px 400px 20px' : '10px 10px 100px 10px',
            width: isFull ? `${Math.max(window.innerWidth, gridBaseWidth * zoomLevel + 40)}px` : '100%',
            height: isFull ? `${currentHeight * zoomLevel + 500}px` : 'auto'
          }}
        >
          <div 
            ref={innerRef}
            className={`bg-white dark:bg-slate-900 rounded-3xl shadow-xl border dark:border-slate-800 transition-all origin-top shrink-0 ${!isFull ? 'max-w-2xl w-full' : ''}`}
            style={{ 
              width: isFull ? `${gridBaseWidth}px` : '100%',
              transform: isFull ? `scale(${zoomLevel})` : 'none',
              padding: isFull ? '24px' : '16px'
            }}
          >
            {[3, 2, 1, 0].map((level) => {
              const isSingle = level === 3;
              const isLevel0 = level === 0;
              const isLevel2 = level === 2;
              
              return (
                <div key={level} className="mb-4 last:mb-0 bg-gray-50/50 dark:bg-slate-800/20 p-3 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                  <div className="text-[10px] font-black text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-3">
                    <span className="bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-600 dark:text-slate-400">NIVEAU {level}</span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                  </div>
                  
                  <div className="flex items-stretch gap-3">
                    {currentGroups.map((group, groupIdx) => (
                      <React.Fragment key={groupIdx}>
                        <div className="flex flex-1 gap-2">
                          {group.map((col) => {
                            const referenceLabel = `A - ${col} - ${level}`;
                            return (
                              <div key={col} className="flex-1 flex flex-col gap-2">
                                {isSingle ? renderSlot(`A-${col}-${level}`, referenceLabel) : 
                                 isLevel0 ? (
                                  <>
                                    {renderSlot(`A-${col}-${level}-H`, referenceLabel, "HAUT")}
                                    {renderSlot(`A-${col}-${level}-M`, referenceLabel, "MILIEU")}
                                    {renderSlot(`A-${col}-${level}-B`, referenceLabel, "BAS")}
                                  </>
                                 ) : isLevel2 ? (
                                   renderSlot(`A-${col}-${level}-B`, referenceLabel)
                                 ) : (
                                  <>
                                    {renderSlot(`A-${col}-${level}-H`, referenceLabel, "HAUT")}
                                    {renderSlot(`A-${col}-${level}-B`, referenceLabel, "BAS")}
                                  </>
                                 )}
                              </div>
                            );
                          })}
                        </div>
                        {(isFull && groupIdx < currentGroups.length - 1) && (
                          <div className="mx-2 flex flex-col items-center justify-center">
                            <div className="w-3 h-full min-h-[140px] bg-gray-300 dark:bg-slate-800 rounded-full shadow-inner border border-gray-400/20 dark:border-slate-700 opacity-60"></div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}

            {isFull && (
              <div className="mt-8">
                <button 
                  onClick={() => setIsZoneAOpen(!isZoneAOpen)} 
                  className={`w-full text-xs font-black text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-3 transition-opacity hover:opacity-70`}
                >
                  <span className="bg-gray-200 dark:bg-slate-800 px-3 py-1 rounded-lg text-gray-600 dark:text-slate-400 flex items-center gap-2">ZONE A <svg className={`w-4 h-4 transition-transform ${isZoneAOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg></span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
                </button>
                {(isZoneAOpen || (zoomLevel < 0.6)) && (
                  <div className="p-3 bg-gray-50/30 dark:bg-slate-800/10 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-9 gap-2">
                      {Array.from({ length: 18 }).map((_, i) => renderSlot(`ZA-${i + 1}`, "ZA", undefined, true))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridView;
