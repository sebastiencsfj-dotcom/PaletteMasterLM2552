
import React, { useState, useEffect } from 'react';
import { PalletSlot, SlotStatus, Order, SasItem } from '../types';
import { STATUS_CONFIG } from '../constants';

const SAVE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';

interface SlotModalProps {
  slot: PalletSlot;
  onClose: () => void;
  onSave: (slotId: string, status: SlotStatus, order?: Order) => void;
  onMoveToReturns?: (slotId: string) => void;
  canPaste?: boolean;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  sasItems?: SasItem[];
  onRemoveFromSas?: (id: string) => void;
}

const SlotModal: React.FC<SlotModalProps> = ({ 
  slot, onClose, onSave, onMoveToReturns, canPaste, onCopy, onCut, onPaste,
  sasItems = [], onRemoveFromSas
}) => {
  const [status, setStatus] = useState<SlotStatus>(slot.status);
  const [orderNumber, setOrderNumber] = useState(slot.order?.orderNumber || '');
  const [clientName, setClientName] = useState(slot.order?.clientName || '');
  const [flux, setFlux] = useState<any>(slot.order?.flux || '');
  const [date, setDate] = useState(slot.order?.date || '');
  const [info, setInfo] = useState(slot.order?.info || '');
  const [tournee, setTournee] = useState(slot.order?.tournee || '');
  const [comment, setComment] = useState(slot.order?.comment || '');
  
  const [showSasPicker, setShowSasPicker] = useState(false);
  const [confirmMove, setConfirmMove] = useState(false);

  useEffect(() => {
    if (confirmMove) {
      const timer = setTimeout(() => setConfirmMove(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmMove]);

  const handleSave = () => {
    const audio = new Audio(SAVE_SOUND);
    audio.volume = 0.7;
    audio.play().catch(() => {});

    if (status === SlotStatus.EMPTY) {
      onSave(slot.locationId, SlotStatus.EMPTY);
    } else {
      onSave(slot.locationId, status, {
        id: slot.order?.id || Math.random().toString(36).substr(2, 9),
        orderNumber,
        clientName,
        flux,
        date,
        info,
        tournee: status === SlotStatus.BLANC ? tournee : '',
        comment,
        createdAt: slot.order?.createdAt 
      });
    }
    onClose();
  };

  const handlePickFromSas = (item: SasItem) => {
    setOrderNumber(item.orderNumber || '');
    setClientName(item.clientName || '');
    setFlux(item.flux || '');
    // Remplacement automatique de la date par "NEW" lors de l'import SAS
    setDate("NEW");
    setStatus(SlotStatus.JAUNE);
    if (onRemoveFromSas) onRemoveFromSas(item.id);
    setShowSasPicker(false);
  };

  const isZA = slot.locationId.startsWith('ZA');
  const parts = slot.locationId.split('-');
  const displayId = isZA ? "ZA" : parts.slice(0, 3).join(' - ');
  
  let position = '';
  if (isZA) position = `Emplacement ${parts[1]}`;
  else if (parts[3]) {
    if (parts[2] === '2') position = '';
    else {
      if (parts[3] === 'H') position = 'HAUT';
      else if (parts[3] === 'M') position = 'MILIEU';
      else if (parts[3] === 'B') position = 'BAS';
    }
  }

  const hasData = slot.status !== SlotStatus.EMPTY;
  const filteredSasItems = sasItems.filter(item => {
    const num = item.orderNumber || '';
    const isReturn = num.includes('-') || /^[A-Z]/i.test(num);
    return !isReturn;
  });

  const formatArrival = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col border border-white/20 dark:border-slate-800 transition-colors">
        
        {showSasPicker && (
          <div className="absolute inset-0 z-[60] bg-indigo-950/95 dark:bg-slate-950/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Pick depuis le SAS</h3>
              <button onClick={() => setShowSasPicker(false)} className="text-white/50 hover:text-white p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredSasItems.length === 0 ? (
                <div className="text-center py-12 text-indigo-300 font-bold uppercase text-sm border-2 border-dashed border-indigo-800 rounded-3xl px-4">
                  Aucune commande disponible dans le SAS
                </div>
              ) : (
                filteredSasItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => handlePickFromSas(item)}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">{item.flux || 'FLUX?'}</span>
                      <span className="text-white font-black text-lg">{item.orderNumber}</span>
                    </div>
                    <div className="text-white font-black uppercase text-xl truncate tracking-tight">{item.clientName}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-start bg-gray-50/50 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              {isZA ? "STOCKAGE SOL" : `EMPLACEMENT ${position ? `(${position})` : ''}`}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-blue-900 dark:text-indigo-400 tracking-tighter">
                {displayId}
              </h2>
              <button 
                onClick={() => setShowSasPicker(true)}
                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all shadow-md active:scale-90"
                title="Importer depuis le SAS"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            {hasData && (
              <>
                <button onClick={onCopy} className="p-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-slate-400 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg></button>
                <button onClick={onCut} className="p-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-slate-400 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243 4.243 3 3 0 014.243-4.243zm0-5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z"/></svg></button>
              </>
            )}
            {canPaste && (
              <button onClick={onPaste} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 00-2 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg></button>
            )}
            <div className="w-px h-6 bg-gray-100 dark:bg-slate-700 mx-1"></div>
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto bg-white dark:bg-slate-900 transition-colors">
          {status === SlotStatus.BLEU && hasData && (
            <button
              onClick={() => confirmMove ? onMoveToReturns?.(slot.locationId) : setConfirmMove(true)}
              className={`w-full py-4 px-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs transition-all duration-300 shadow-lg ${confirmMove ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-200' : 'bg-black dark:bg-slate-800 text-white hover:bg-gray-800'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
              {confirmMove ? "VALIDEZ LE TRANSFERT !" : "Transférer en ZONE RETOUR"}
            </button>
          )}

          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-3">Statut de l'emplacement</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(SlotStatus) as Array<keyof typeof SlotStatus>).map((key) => {
                const config = STATUS_CONFIG[SlotStatus[key]];
                const isSelected = status === SlotStatus[key];
                const isBlanc = SlotStatus[key] === SlotStatus.BLANC;
                return (
                  <button
                    key={key}
                    onClick={() => setStatus(SlotStatus[key])}
                    className={`flex items-center p-3 rounded-2xl border-2 transition-all ${isSelected ? `${config.borderColor} ${config.bgColor} shadow-sm ${isBlanc ? 'dark:bg-slate-800 dark:border-slate-600' : ''}` : 'border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full mr-3 ${config.bgColor} border ${config.borderColor} shadow-sm ${isBlanc ? 'dark:bg-slate-700' : ''}`}></div>
                    <div className="text-left">
                      <div className={`font-black text-xs uppercase ${isSelected ? (isBlanc ? 'text-gray-900 dark:text-slate-100' : config.textColor) : 'text-gray-700 dark:text-slate-400'}`}>{config.label}</div>
                      <div className="text-[9px] font-bold opacity-50 dark:text-slate-500">{config.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {status !== SlotStatus.EMPTY && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">N° Commande</label>
                <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="w-full p-4 rounded-2xl border-2 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg" placeholder="158798..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Flux</label>
                <select value={flux} onChange={(e) => setFlux(e.target.value)} className="w-full p-4 rounded-2xl border-2 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black uppercase text-xs">
                  <option value="">-</option>
                  <option value="CDC">CDC</option>
                  <option value="LCD">LCD</option>
                  <option value="RET">RET</option>
                  <option value="REG">REG</option>
                </select>
              </div>
              
              {status === SlotStatus.BLANC && (
                <div className="animate-in zoom-in duration-300">
                  <label className="block text-[10px] font-black text-blue-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">Tournée 🚛</label>
                  <input type="text" value={tournee} onChange={(e) => setTournee(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800/60 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-blue-900 dark:text-indigo-300 text-xl" placeholder="T01" />
                </div>
              )}

              <div className="col-span-2 border-t dark:border-slate-800 pt-4 mt-2">
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Client</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-4 rounded-2xl border-2 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black uppercase text-lg" placeholder="NOM DU CLIENT" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-emerald-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-slate-800/40 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black" placeholder="24/01" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Infos Complémentaires</label>
                <input type="text" value={info} onChange={(e) => setInfo(e.target.value)} className="w-full p-4 rounded-2xl border-2 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold italic" placeholder="Ex: FAILED, REPROG..." />
              </div>

              {slot.order?.createdAt && (
                <div className="col-span-2 py-3 border-t border-b dark:border-slate-800 flex items-center gap-4">
                   <div className="flex-shrink-0 text-emerald-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7-7 7M5 12h14" />
                      </svg>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Enregistré le</span>
                      <span className="text-xs font-bold text-gray-600 dark:text-slate-400">{formatArrival(slot.order.createdAt)}</span>
                   </div>
                </div>
              )}

              <div className="col-span-2 border-t dark:border-slate-800 pt-4 mt-2">
                <label className="block text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/></svg>
                  Commentaire / Note interne
                </label>
                <textarea 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  className="w-full p-4 rounded-2xl border-2 border-amber-50 dark:border-slate-800 bg-amber-50/20 dark:bg-slate-800/40 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium italic text-gray-700 min-h-[100px] resize-none" 
                  placeholder="Ajouter une précision ici..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50/80 dark:bg-slate-900 border-t dark:border-slate-800 flex gap-3 flex-shrink-0 transition-colors">
          <button onClick={onClose} className="flex-1 py-4 px-4 rounded-2xl border-2 dark:border-slate-700 font-black uppercase text-xs text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-4 px-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default SlotModal;
