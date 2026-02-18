
import React, { useState, useEffect } from 'react';
import { OrderArchive } from '../types';

interface HistoryViewProps {
  archives: OrderArchive[];
  onClear: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ archives, onClear }) => {
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (confirmClear) {
      const timer = setTimeout(() => setConfirmClear(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmClear]);

  const formatDateTime = (ts: number) => {
    const date = new Date(ts);
    return {
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    };
  };

  const handleClear = () => {
    if (confirmClear) {
      onClear();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-800 shadow-xl overflow-hidden rounded-3xl animate-in fade-in duration-500">
      <div className="bg-slate-800 p-6 text-center relative">
        {archives.length > 0 && (
          <button
            onClick={handleClear}
            className={`absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl border-2 font-black text-[10px] uppercase transition-all flex items-center gap-2 shadow-lg active:scale-90 ${
              confirmClear 
              ? 'bg-red-600 border-red-400 text-white animate-pulse' 
              : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            {confirmClear ? "CONFIRMER ?" : "VIDER"}
          </button>
        )}
        <h2 className="text-2xl font-black tracking-widest text-white uppercase leading-none">REGISTRE DE TRAÇABILITÉ</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Suivi temporel des 100 dernières commandes</p>
      </div>

      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto scrollbar-hide">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b-2 border-slate-200">
              <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Détails Commande</th>
              <th className="py-4 px-6 text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/30">Heure Arrivée</th>
              <th className="py-4 px-6 text-center text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50/30">Heure Sortie / État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {archives.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-20 text-center text-slate-300 font-bold uppercase text-xs italic">
                  Aucune donnée de traçabilité enregistrée
                </td>
              </tr>
            ) : (
              archives.map((item) => {
                const entry = formatDateTime(item.entryTime);
                const exit = item.exitTime ? formatDateTime(item.exitTime) : null;

                return (
                  <tr key={item.orderNumber} className="hover:bg-slate-50 transition-colors">
                    {/* Commande */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="text-sm font-black text-slate-900 tracking-tight">{item.orderNumber}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{item.clientName}</div>
                    </td>

                    {/* Arrivée (Heure + Date uniquement) */}
                    <td className="py-4 px-6 bg-emerald-50/5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-sm font-black text-emerald-700 leading-none">{entry.time}</span>
                        <span className="text-[10px] font-bold text-emerald-600/50 mt-1 uppercase">{entry.date}</span>
                      </div>
                    </td>

                    {/* Sortie (Heure + Date uniquement ou Statut) */}
                    <td className="py-4 px-6 bg-rose-50/5 text-center">
                      {exit ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black text-rose-700 leading-none">{exit.time}</span>
                          <span className="text-[10px] font-bold text-rose-600/50 mt-1 uppercase">{exit.date}</span>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-sm uppercase tracking-wider animate-pulse">
                            En Stock
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center px-8">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Système de pointage temporel automatique
        </p>
        <div className="flex gap-6">
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Entrée Système</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Sortie Définitive</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
