
import React, { useState, useEffect, useRef } from 'react';
import { SasItem } from '../types';
import { GoogleGenAI } from "@google/genai";

const VALIDATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
const FLUX_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';

interface SasZoneProps {
  items: SasItem[];
  onUpdate: (items: SasItem[]) => void;
}

const SasZone: React.FC<SasZoneProps> = ({ items, onUpdate }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ROWS_COUNT = Math.max(25, items.length + 5);

  const formatReturnNumber = (val: string) => {
    let clean = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.length === 4 && !clean.includes('-') && !/^\d+$/.test(clean)) {
      return clean + '-';
    }
    if (clean.includes('-') && clean.length > 9) return clean.slice(0, 9);
    return clean;
  };

  const handleCellChange = (index: number, field: keyof SasItem, value: string) => {
    const newItems = [...items];
    const prevItem = newItems[index];
    const wasComplete = prevItem?.orderNumber?.trim() && prevItem?.clientName?.trim();

    if (!newItems[index]) {
      newItems[index] = { 
        id: Math.random().toString(36).substr(2, 9), 
        orderNumber: '', 
        clientName: '', 
        flux: '', 
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) 
      };
    }

    const finalValue = field === 'orderNumber' ? formatReturnNumber(value) : value;
    newItems[index] = { ...newItems[index], [field]: finalValue as any };

    if (field === 'flux' && value !== '') {
      const audio = new Audio(FLUX_SOUND);
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }

    const isNowComplete = newItems[index].orderNumber?.trim() && newItems[index].clientName?.trim();
    if (isNowComplete && !wasComplete) {
      const audio = new Audio(VALIDATION_SOUND);
      audio.volume = 0.9;
      audio.play().catch(() => {});
    }

    onUpdate(newItems.filter(item => item && (item.orderNumber?.trim() || item.clientName?.trim())));
  };

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erreur caméra:", err);
      alert("Impossible d'accéder à la caméra.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
    setIsAnalyzing(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      // Fix: Create new GoogleGenAI instance right before making an API call to ensure current configuration.
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!apiKey) {
  throw new Error("Clé Gemini manquante : VITE_GEMINI_API_KEY");
}

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Tu es un expert en logistique IKEA / XPO Logistics. Analyse l'image de ce document (Bon de Livraison ou Bon de Retour).

      RÈGLES d'EXTRACTION STRICTES :
      1. 'orderNumber' :
         - Localise le texte "Order number :".
         - Pour un Bon de Livraison (BL) : Le numéro commence OBLIGATOIREMENT par 15, 16, 17 ou 18.
         - Pour un Bon de Retour (BR) : Extrais le numéro tel quel (souvent alphanumérique ex: 8QAL-4MQ8).
      
      2. 'clientName' :
         - Extrais le nom dans le champ "Destinataire" ou "Adresse d'enlèvement".
      
      3. 'flux' (RÈGLES DE FAMILLE CRUCIALES) :
         - Si le titre du document est "Bon de Retour", mets "RET".
         - Si c'est un "Bon de Livraison", cherche les codes de mode de livraison :
           * Si tu vois "CC1", "CU1" ou "CU2" -> Mets "CDC".
           * Si tu vois "LC1", "LU1" ou "LU2" -> Mets "LCD".
           * Sinon, laisse vide.

      Réponds UNIQUEMENT en JSON sous ce format : {"orderNumber": "string", "clientName": "string", "flux": "string"}`;

      // Fix: Upgraded to 'gemini-3-pro-preview' for higher accuracy in complex image analysis and OCR extraction.
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }
      });

      // Fix: Safely access response.text property (not a method).
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanJson);

      if (result.orderNumber || result.clientName) {
        const newItems = [...items];
        const emptyIndex = newItems.findIndex(item => !item.orderNumber && !item.clientName);
        const targetIndex = emptyIndex === -1 ? newItems.length : emptyIndex;

        newItems[targetIndex] = {
          id: Math.random().toString(36).substr(2, 9),
          orderNumber: result.orderNumber || '',
          clientName: result.clientName || '',
          flux: (result.flux as any) || '',
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        };

        if (newItems[targetIndex].orderNumber && newItems[targetIndex].clientName) {
            const audio = new Audio(VALIDATION_SOUND);
            audio.volume = 0.9;
            audio.play().catch(() => {});
        }

        onUpdate(newItems.filter(item => item && (item.orderNumber?.trim() || item.clientName?.trim())));
        stopCamera();
      } else {
        alert("Aucune information détectée. Veuillez réessayer.");
      }
    } catch (err) {
      console.error("Erreur d'analyse:", err);
      alert("Erreur lors de l'analyse du document.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearRow = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  const handleExportExcel = () => {
    if (items.length === 0) return;
    const tableRows = items.map(item => `
      <tr>
        <td>${item.orderNumber || ''}</td>
        <td>${item.clientName || ''}</td>
        <td>${item.flux || ''}</td>
      </tr>`).join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      </head>
      <body>
        <table border="1">
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>`;

    const blob = new Blob(['\ufeff' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const fileName = `SA RÉCEPTION ${dateStr}.xls`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-xl overflow-hidden mb-20 relative transition-colors">
      
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-4 shadow-2xl relative transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-indigo-900 dark:text-indigo-400 font-black uppercase text-sm tracking-widest">Scanner BL / BR</h3>
              <button onClick={stopCamera} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden border-4 border-indigo-100 dark:border-slate-800">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[2px] border-white/30 pointer-events-none flex items-center justify-center">
                <div className="w-4/5 h-1/4 border-2 border-indigo-50 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"></div>
              </div>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-white font-black text-xs uppercase tracking-widest animate-pulse">Lecture intelligente...</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={captureAndAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? "Analyse en cours..." : "Analyser le document"}
              </button>
              <p className="text-center text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Cible le n° de commande (10 chiffres)</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-indigo-600 dark:bg-indigo-700 p-6 text-center relative flex flex-col items-center gap-4 transition-colors">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">SAS RÉCEPTION</h2>
          <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Classification auto (CDC: CC/CU • LCD: LC/LU)</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={startCamera}
            className="group relative flex items-center gap-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-full font-black text-xs transition-all shadow-lg active:scale-95 border-b-4 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>SCANNER BL / BR</span>
          </button>

          <button 
            onDoubleClick={handleExportExcel}
            className="group relative flex items-center gap-3 bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-black text-xs transition-all shadow-lg active:scale-95 border-b-4 border-emerald-700 dark:border-emerald-900 hover:border-b-2 hover:translate-y-0.5"
            title="Double-cliquez pour exporter en Excel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2z"/>
            </svg>
            <div className="flex flex-col items-start leading-tight">
              <span>EXPORTER EXCEL</span>
              <span className="text-[8px] opacity-70 font-bold uppercase tracking-widest">(DOUBLE-CLIC)</span>
            </div>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-50 dark:bg-slate-800 border-b-2 border-indigo-200 dark:border-slate-700 transition-colors">
              <th className="w-10 py-3 text-center text-[10px] font-black text-indigo-400 dark:text-slate-500">#</th>
              <th className="w-32 sm:w-1/4 py-3 text-center text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tight">N° Commande</th>
              <th className="w-1/2 py-3 text-center text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tight">Client</th>
              <th className="w-16 py-3 text-center text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tight">Flux</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS_COUNT }).map((_, index) => {
              const item = items[index];
              return (
                <tr key={index} className="border-b border-indigo-50 dark:border-slate-800 hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors h-14">
                  <td className="text-center text-[9px] font-bold text-indigo-200 dark:text-slate-600">{index + 1}</td>
                  <td className="p-0 border-r border-indigo-50 dark:border-slate-800">
                    <input
                      type="text"
                      value={item?.orderNumber || ''}
                      onChange={(e) => handleCellChange(index, 'orderNumber', e.target.value)}
                      placeholder="..."
                      className="w-full h-full px-2 text-center font-black text-indigo-900 dark:text-white uppercase outline-none bg-transparent placeholder:text-indigo-100 dark:placeholder:text-slate-800 selection:bg-indigo-100 dark:selection:bg-slate-700 text-sm sm:text-base tracking-tight"
                    />
                  </td>
                  <td className="p-0 border-r border-indigo-50 dark:border-slate-800">
                    <input
                      type="text"
                      value={item?.clientName || ''}
                      onChange={(e) => handleCellChange(index, 'clientName', e.target.value)}
                      placeholder="Nom du client"
                      className="w-full h-full px-2 text-center font-bold text-gray-800 dark:text-slate-300 uppercase outline-none bg-transparent placeholder:text-gray-100 dark:placeholder:text-slate-800 selection:bg-indigo-50 dark:selection:bg-slate-700 text-sm"
                    />
                  </td>
                  <td className="p-0">
                    <select
                      value={item?.flux || ''}
                      onChange={(e) => handleCellChange(index, 'flux', e.target.value)}
                      className="w-full h-full px-1 text-center font-black text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 bg-transparent outline-none appearance-none cursor-pointer"
                    >
                      <option value="" className="dark:bg-slate-900">-</option>
                      <option value="CDC" className="dark:bg-slate-900">CDC</option>
                      <option value="LCD" className="dark:bg-slate-900">LCD</option>
                      <option value="RET" className="dark:bg-slate-900">RET</option>
                      <option value="REG" className="dark:bg-slate-900">REG</option>
                    </select>
                  </td>
                  <td className="text-center">
                    {item && (
                      <button 
                        onClick={() => handleClearRow(index)} 
                        className="p-1.5 text-indigo-200 dark:text-slate-600 hover:text-red-500 transition-colors active:scale-90"
                        title="Supprimer la ligne"
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
      
      <div className="bg-indigo-50/50 dark:bg-slate-900/50 p-2.5 text-center border-t border-indigo-100 dark:border-slate-800 flex justify-between px-6 items-center transition-colors">
        <p className="text-[8px] font-black text-indigo-300 dark:text-slate-600 uppercase tracking-widest">
          Catégorisation : CDC (CC/CU) • LCD (LC/LU)
        </p>
        <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
          N° Commande limité à 10 chiffres pour visibilité optimale
        </p>
      </div>
    </div>
  );
};

export default SasZone;
