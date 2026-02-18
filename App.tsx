
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PalletSlot, SlotStatus, Order, ViewMode, ReturnItem, SasItem, OrderArchive } from './types';
import { generateInitialData, STATUS_CONFIG } from './constants';
import GridView from './components/GridView';
import ListView from './components/ListView';
import SlotModal from './components/SlotModal';
import ReturnsZone from './components/ReturnsZone';
import SasZone from './components/SasZone';
import ArchiveView from './components/ArchiveView';
import { syncToRemote, onRemoteUpdate, isSupabaseEnabled } from './supabase';

const SOUNDS = {
  SAVE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  SAS_EMPTY: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  APPLE_PAY: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
};

const playSfx = (url: string, volume = 0.8) => {
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(e => console.log('Audio play blocked'));
};

interface Clipboard {
  order: Order;
  status: SlotStatus;
  sourceId: string;
  isCutting: boolean;
}

type ExtendedFilterStatus = SlotStatus | 'ENCOURS' | null;
type GridDisplayMode = 'FULL' | 'SECTION_1' | 'SECTION_2' | 'SECTION_3';

const App: React.FC = () => {
  const [data, setData] = useState<Record<string, PalletSlot>>({});
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [sasItems, setSasItems] = useState<SasItem[]>([]);
  const [archives, setArchives] = useState<OrderArchive[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [gridDisplayMode, setGridDisplayMode] = useState<GridDisplayMode>('FULL');
  const [animDirection, setAnimDirection] = useState<'right' | 'left' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PalletSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ExtendedFilterStatus>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [showSasSuccess, setShowSasSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const lastArchivedRef = useRef<{ id: string; time: number } | null>(null);
  const prevSasCount = useRef(0);
  const prevReturnsCount = useRef(0);
  const isFirstLoadAfterInit = useRef(true);

  // --- INITIALISATION LOCALE ET DISTANTE ---
  useEffect(() => {
    // Thème
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add('dark');

    // Chargement initial local
    const savedData = localStorage.getItem('pallet_data');
    const savedReturns = localStorage.getItem('return_items');
    const savedSas = localStorage.getItem('sas_items');
    const savedArchives = localStorage.getItem('pallet_archives');

    setData(savedData ? JSON.parse(savedData) : generateInitialData());
    setReturnItems(savedReturns ? JSON.parse(savedReturns) : []);
    setSasItems(savedSas ? JSON.parse(savedSas) : []);
    setArchives(savedArchives ? JSON.parse(savedArchives) : []);

    // Branchement des écouteurs distants (Supabase)
    const unsubscribe = onRemoteUpdate((remote) => {
      if (remote) {
        if (remote.data) setData(remote.data);
        if (remote.returns) setReturnItems(remote.returns);
        if (remote.sas) setSasItems(remote.sas);
        if (remote.archives) setArchives(remote.archives);
        // Après une sync distante, on considère qu'on est à jour
        setHasUnsavedChanges(false);
      }
    });

    setIsInitialized(true);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // --- DÉTECTION DES MODIFICATIONS ---
  useEffect(() => {
    if (isInitialized) {
      if (isFirstLoadAfterInit.current) {
        isFirstLoadAfterInit.current = false;
        return;
      }
      setHasUnsavedChanges(true);
    }
  }, [data, returnItems, sasItems, archives]);

  // --- AVERTISSEMENT DE SORTIE ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // --- SAUVEGARDE MANUELLE (LOCALE + DISTANTE SUPABASE) ---
  const handleManualSave = async () => {
    setIsSyncing(true);
    
    // Persistance Locale
    localStorage.setItem('pallet_data', JSON.stringify(data));
    localStorage.setItem('return_items', JSON.stringify(returnItems));
    localStorage.setItem('sas_items', JSON.stringify(sasItems));
    localStorage.setItem('pallet_archives', JSON.stringify(archives));
    
// Persistence Distante (Supabase)
console.log("SAVE CLICKED");

const payload = {
  data,
  returns: returnItems,
  sas: sasItems,
  archives,
  lastUpdated: Date.now()
};

const syncSuccess = await syncToRemote(payload);

console.log("SYNC RESULT =", syncSuccess);


    setHasUnsavedChanges(false);
    setIsSyncing(false);
    playSfx(SOUNDS.SAVE, 1.0);
  };

  const toggleDarkMode = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const archiveOrder = (order: Order, locationId: string) => {
    const now = Date.now();
    if (lastArchivedRef.current && 
        lastArchivedRef.current.id === order.orderNumber && 
        now - lastArchivedRef.current.time < 2000) {
      return;
    }
    
    lastArchivedRef.current = { id: order.orderNumber, time: now };

    const newArchive: OrderArchive = {
      orderNumber: order.orderNumber,
      clientName: order.clientName,
      entryTime: order.createdAt || Date.now(),
      exitTime: now,
      flux: order.flux,
      locationId: locationId
    };
    
    const nextArchives = [newArchive, ...archives].slice(0, 200);
    setArchives(nextArchives);
  };

  const handleSasUpdate = (newItems: SasItem[]) => {
    if (prevSasCount.current > 0 && newItems.length === 0) {
      playSfx(SOUNDS.SAS_EMPTY, 1.0);
      setShowSasSuccess(true);
      setTimeout(() => setShowSasSuccess(false), 3000);
    }
    prevSasCount.current = newItems.length;
    setSasItems(newItems);
  };

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      [SlotStatus.EMPTY]: 0,
      [SlotStatus.JAUNE]: 0,
      [SlotStatus.BLANC]: 0,
      [SlotStatus.ROUGE]: 0,
      [SlotStatus.BLEU]: 0,
      [SlotStatus.ORANGE]: 0,
      ENCOURS: 0,
      SAS: sasItems.length,
      GRAND_TOTAL: 0
    };
    const values = Object.values(data) as PalletSlot[];
    counts.GRAND_TOTAL = values.length;
    values.forEach(s => {
      if (counts[s.status] !== undefined) counts[s.status]++;
      if ([SlotStatus.JAUNE, SlotStatus.BLANC, SlotStatus.ROUGE, SlotStatus.BLEU].includes(s.status)) counts.ENCOURS++;
    });
    return counts;
  }, [data, sasItems]);

  const handleUpdateSlot = (slotId: string, status: SlotStatus, order?: Order) => {
    const oldSlot = data[slotId];
    if (oldSlot?.order && status === SlotStatus.EMPTY) {
      archiveOrder(oldSlot.order, slotId);
    }
    
    let finalOrder = order;
    if (order && !order.createdAt) {
      finalOrder = { ...order, createdAt: Date.now() };
    }
    
    setData(prev => ({
      ...prev,
      [slotId]: {
        locationId: slotId,
        status,
        order: status === SlotStatus.EMPTY ? undefined : finalOrder
      }
    }));
  };

  const handleMoveToReturns = (slotId: string) => {
    const slot = data[slotId];
    if (!slot || !slot.order) return;
    const newReturn: ReturnItem = {
      id: Math.random().toString(36).substr(2, 9),
      returnNumber: slot.order.orderNumber,
      clientName: slot.order.clientName,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      createdAt: slot.order.createdAt
    };
    
    setReturnItems(prev => [...prev, newReturn]);
    handleUpdateSlot(slotId, SlotStatus.EMPTY);
    setSelectedSlot(null);
  };

  const handleUpdateReturns = (items: ReturnItem[]) => {
    if (prevReturnsCount.current > 0 && items.length === 0) {
      playSfx(SOUNDS.APPLE_PAY, 1.0);
    }
    prevReturnsCount.current = items.length;
    setReturnItems(items);
  };

  const handleRemoveFromSas = (id: string) => {
    const nextSas = sasItems.filter(item => item.id !== id);
    handleSasUpdate(nextSas);
  };

  const changeGridMode = (direction: 'next' | 'prev') => {
    const modes: GridDisplayMode[] = ['FULL', 'SECTION_1', 'SECTION_2', 'SECTION_3'];
    const currentIndex = modes.indexOf(gridDisplayMode);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= modes.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = modes.length - 1;
    
    setAnimDirection(direction === 'next' ? 'right' : 'left');
    setGridDisplayMode(modes[nextIndex]);
    setViewMode('GRID');
  };

  if (!isInitialized) return null;

  if (viewMode === 'HOME') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 transition-colors">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl mb-8 animate-bounce">
          P
        </div>
        <h1 className="text-4xl font-black text-blue-900 dark:text-indigo-400 tracking-tighter uppercase text-center leading-none mb-2">
          PaletteMaster <span className="text-indigo-600 block sm:inline">LM</span>
        </h1>
        <p className="text-gray-500 dark:text-slate-400 font-bold text-center uppercase tracking-widest text-[10px] mb-12">
          Gestion Cloud Supabase du palettier IKEA/XPO
        </p>
        
        <button 
          onClick={() => setViewMode('GRID')}
          className="w-full max-w-xs py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <span>Accéder au Palettier</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
        </button>

        <div className="mt-12 flex items-center gap-4">
          <button 
            onClick={toggleDarkMode}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-sm"
          >
            {isDarkMode ? 'Mode Clair' : 'Mode Sombre'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:max-w-none max-w-4xl mx-auto shadow-xl bg-gray-50 dark:bg-slate-950 transition-all duration-300">
      {showSasSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6">
          <div className="bg-indigo-600 text-white px-8 py-6 rounded-3xl shadow-2xl border-4 border-white flex flex-col items-center gap-2 animate-in zoom-in slide-in-from-top-12 duration-500 backdrop-blur-md">
            <div className="text-4xl mb-2 animate-bounce">✅</div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">SAS Réception Vidé !</h3>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b dark:border-slate-800 px-4 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('HOME')} className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">P</button>
          <div>
            <h1 className="text-xl font-extrabold text-blue-900 dark:text-indigo-400 tracking-tight leading-none uppercase">PaletteMaster LM</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">SUPABASE SYNC</p>
              {isSupabaseEnabled() && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={handleManualSave}
             disabled={isSyncing}
             className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${
               hasUnsavedChanges 
               ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-200 dark:ring-amber-900' 
               : 'bg-emerald-600 text-white border border-emerald-500'
             } disabled:opacity-50`}
           >
             {isSyncing ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             ) : hasUnsavedChanges ? (
               <>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                 <span>Enregistrer</span>
               </>
             ) : (
               <>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                 <span>Enregistré</span>
               </>
             )}
           </button>

           <button 
             onClick={toggleDarkMode}
             className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 transition-all shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700"
           >
             {isDarkMode ? '☀️' : '🌙'}
           </button>

           {clipboard && (
             <button onClick={() => setClipboard(null)} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black border border-amber-200 dark:border-amber-800 animate-pulse">
               📋 {clipboard.isCutting ? 'DÉPLACEMENT' : 'COPIE'}
             </button>
           )}
           <button 
             onClick={() => setViewMode('ARCHIVES')}
             className={`p-2 rounded-xl transition-all ${viewMode === 'ARCHIVES' ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
           </button>
        </div>
      </header>

      {viewMode !== 'RETOURS' && viewMode !== 'SAS' && viewMode !== 'ARCHIVES' && (
        <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 overflow-x-auto whitespace-nowrap px-4 py-4 flex gap-3 scrollbar-hide flex-shrink-0 items-center transition-colors">
          <button onClick={() => { setFilterStatus(filterStatus === 'ENCOURS' ? null : 'ENCOURS'); setViewMode('LIST'); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all font-black text-[12px] uppercase tracking-tighter shadow-sm ${filterStatus === 'ENCOURS' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-600 text-blue-800 dark:text-blue-300 ring-2 ring-blue-100' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:bg-gray-100'}`}>
            TOUT ({stats.ENCOURS})
          </button>
          {(Object.keys(STATUS_CONFIG) as SlotStatus[]).map((key) => (
            <button key={key} onClick={() => { setFilterStatus(filterStatus === key ? null : key); setViewMode('LIST'); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all font-black text-[12px] uppercase tracking-tighter shadow-sm ${filterStatus === key ? `bg-blue-50 dark:bg-blue-900/30 border-blue-600 text-blue-800 dark:text-blue-300 ring-2 ring-blue-100` : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 dark:text-slate-500 hover:bg-gray-100'}`}>
              <div className={`w-3.5 h-3.5 rounded-full ${STATUS_CONFIG[key].bgColor} border-2 ${STATUS_CONFIG[key].borderColor}`}></div>
              <span className={filterStatus === key ? 'text-blue-800 dark:text-blue-300' : 'text-gray-500 dark:text-slate-400'}>
                {stats[key] || 0} <span className="opacity-70 font-bold">{STATUS_CONFIG[key].label}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {viewMode !== 'ARCHIVES' && (
        <div className="p-4 space-y-4 flex-shrink-0 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input type="text" placeholder="Recherche..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 dark:text-white rounded-2xl border dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div className="flex bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-1.5 shadow-sm gap-1 self-center overflow-x-auto max-w-full">
              {['SAS', 'GRID', 'LIST', 'RETOURS'].map(mode => (
                <button key={mode} onClick={() => { if(mode === 'GRID') setAnimDirection(null); setViewMode(mode as any); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-black text-[10px] tracking-widest uppercase ${viewMode === mode ? (mode === 'SAS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg') : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  {mode === 'SAS' && stats.SAS > 0 && <span className="bg-white/20 px-1.5 rounded-md">{stats.SAS}</span>}
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto bg-white/50 dark:bg-slate-950/50 transition-colors relative">
        <div 
          key={`${viewMode}-${gridDisplayMode}-${animDirection}`}
          className={`h-full w-full p-4 pb-40 ${animDirection === 'right' ? 'slide-in-from-right-full' : animDirection === 'left' ? 'slide-in-from-left-full' : ''}`}
        >
          {viewMode === 'SAS' && (
            <SasZone items={sasItems} onUpdate={handleSasUpdate} />
          )}
          {viewMode === 'GRID' && (
            <GridView 
              data={data} 
              onSlotClick={setSelectedSlot} 
              isCuttingId={clipboard?.isCutting ? clipboard.sourceId : null}
              displayMode={gridDisplayMode}
              onSwipe={changeGridMode}
            />
          )}
          {viewMode === 'LIST' && (
            <ListView data={data} onSlotClick={setSelectedSlot} searchQuery={searchQuery} filterStatus={filterStatus as any} isCuttingId={clipboard?.isCutting ? clipboard.sourceId : null} />
          )}
          {viewMode === 'RETOURS' && (
            <ReturnsZone 
              items={returnItems} 
              onUpdate={handleUpdateReturns} 
              sasItems={sasItems}
              onRemoveFromSas={handleRemoveFromSas}
            />
          )}
          {viewMode === 'ARCHIVES' && (
            <ArchiveView archives={archives} onClear={() => setArchives([])} />
          )}
        </div>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-[#0F172A] dark:bg-slate-900 p-2 pr-2.5 rounded-full shadow-2xl z-40 border border-white/10 dark:border-slate-700 ring-4 ring-black/5">
        <div className="flex items-center gap-1">
          <button onClick={() => changeGridMode('prev')} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></button>
          
          <button 
            onClick={() => { setAnimDirection(null); setViewMode('GRID'); }}
            className="px-4 min-w-[140px] text-center border-x border-white/10 dark:border-slate-700 hover:bg-white/5 transition-colors rounded-sm"
          >
            <div className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] mb-0.5">VUE</div>
            <div className="text-xs font-black text-white whitespace-nowrap tracking-tight uppercase">
              {gridDisplayMode === 'FULL' ? 'VUE GLOBALE' : gridDisplayMode === 'SECTION_1' ? 'ÉCHELLES 1 - 3' : gridDisplayMode === 'SECTION_2' ? 'ÉCHELLES 4 - 6' : 'ÉCHELLES 7 - 9'}
            </div>
          </button>

          <button onClick={() => changeGridMode('next')} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <button onClick={() => { setViewMode('SAS') }} className="ml-2 w-11 h-11 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform ring-4 ring-indigo-600/20 text-white"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg></button>
      </div>

      {selectedSlot && (
        <SlotModal 
          slot={selectedSlot} 
          sasItems={sasItems}
          onRemoveFromSas={handleRemoveFromSas}
          onClose={() => setSelectedSlot(null)} 
          onSave={handleUpdateSlot} 
          onMoveToReturns={handleMoveToReturns} 
          canPaste={!!clipboard} 
          onCopy={() => { if(selectedSlot.order) setClipboard({ order: {...selectedSlot.order}, status: selectedSlot.status, sourceId: selectedSlot.locationId, isCutting: false }); setSelectedSlot(null); }} 
          onCut={() => { if(selectedSlot.order) setClipboard({ order: {...selectedSlot.order}, status: selectedSlot.status, sourceId: selectedSlot.locationId, isCutting: true }); setSelectedSlot(null); }} 
          onPaste={() => { 
            if(clipboard) { 
              handleUpdateSlot(selectedSlot.locationId, clipboard.status, {...clipboard.order, id: Math.random().toString(36).substr(2,9)}); 
              if(clipboard.isCutting) { 
                handleUpdateSlot(clipboard.sourceId, SlotStatus.EMPTY); 
                setClipboard(null); 
              } 
            } 
            setSelectedSlot(null); 
          }} 
        />
      )}
    </div>
  );
};

export default App;
