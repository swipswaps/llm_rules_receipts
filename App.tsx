import React, { useState, useCallback, useEffect } from 'react';
import { ReceiptData, AppState } from './types';
import { performOCR } from './services/ocrService';
import { parseReceiptText } from './services/geminiService';
import { saveReceiptToDB, fetchReceiptsFromDB, syncLocalToDB, supabase } from './services/supabaseService';
import UploadZone from './components/UploadZone';
import ReceiptCard from './components/ReceiptCard';
import Dashboard from './components/Dashboard';
import { Scan, History, Plus, AlertCircle, Database, ServerOff, Download, RefreshCw, Check, Cpu } from 'lucide-react';

const App: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(!!supabase);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');

  // Load and Merge Data
  useEffect(() => {
    const loadData = async () => {
      // 1. Get Local Data
      const localStr = localStorage.getItem('receipts');
      const localData: ReceiptData[] = localStr ? JSON.parse(localStr) : [];
      
      let mergedData = [...localData];

      // 2. Get DB Data if available
      if (supabase) {
        try {
          const dbData = await fetchReceiptsFromDB();
          
          // Merge: Create a Map by ID. Prefer DB data (which has synced: true)
          const dataMap = new Map<string, ReceiptData>();
          
          // Add local first
          localData.forEach(r => dataMap.set(r.id, r));
          
          // Overwrite with DB data
          dbData.forEach(r => dataMap.set(r.id, r));
          
          mergedData = Array.from(dataMap.values()).sort((a, b) => 
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
          );
        } catch (err) {
          console.warn("Failed to load from DB, using local only");
        }
      }
      
      setReceipts(mergedData);
      localStorage.setItem('receipts', JSON.stringify(mergedData));
    };
    loadData();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setAppState(AppState.PROCESSING);
    setErrorMsg(null);
    setCurrentReceipt(null);
    setProcessingStage('Initializing...');

    try {
      // Step 1: OCR (PaddleOCR via Backend)
      setProcessingStage('Scanning text with PaddleOCR...');
      const rawText = await performOCR(file);
      
      if (!rawText || rawText.length < 5) {
        throw new Error("No readable text found on receipt.");
      }

      // Step 2: Parsing (Gemini LLM)
      setProcessingStage('Analyzing data with Gemini...');
      const data = await parseReceiptText(rawText);
      
      // Step 3: Save
      let savedToDb = false;
      try {
        savedToDb = await saveReceiptToDB(data);
      } catch (dbError) {
        console.error("Failed to save to DB:", dbError);
      }

      const dataWithSyncStatus = { ...data, synced: savedToDb };

      setReceipts(prev => {
        const newReceipts = [dataWithSyncStatus, ...prev];
        localStorage.setItem('receipts', JSON.stringify(newReceipts));
        return newReceipts;
      });

      setCurrentReceipt(dataWithSyncStatus);
      setAppState(AppState.VIEWING);
      
      if (!savedToDb && supabase) {
        setErrorMsg("Receipt parsed locally. Click 'Sync' to save to database.");
      }

    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      setErrorMsg(err.message || "Failed to process receipt.");
    } finally {
      setProcessingStage('');
    }
  }, []);

  const handleSync = async () => {
    if (!supabase || isSyncing) return;
    setIsSyncing(true);
    try {
      const count = await syncLocalToDB(receipts);
      
      // Update local state to reflect sync
      const updatedReceipts = receipts.map(r => ({ ...r, synced: true }));
      setReceipts(updatedReceipts);
      localStorage.setItem('receipts', JSON.stringify(updatedReceipts));
      
      setErrorMsg(null); 
    } catch (e) {
      console.error("Sync failed", e);
      setErrorMsg("Synchronization failed. Please check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    if (receipts.length === 0) return;

    const headers = ['ID', 'Date', 'Merchant', 'Total', 'Currency', 'Category', 'Status', 'Items Count'];
    const rows = receipts.map(r => [
      r.id,
      r.transactionDate,
      `"${r.merchantName.replace(/"/g, '""')}"`,
      r.totalAmount,
      r.currency,
      r.category,
      r.synced ? 'Synced' : 'Local',
      r.items.length
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `receipts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unsyncedCount = receipts.filter(r => !r.synced).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Scan className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">Receipt<span className="text-indigo-600">AI</span></span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Sync Button */}
              {dbConnected && unsyncedCount > 0 && (
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : `Sync ${unsyncedCount} Items`}
                </button>
              )}

              {/* Export Button */}
              {receipts.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              )}

              {/* DB Status */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  dbConnected 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                {dbConnected ? <Database className="w-3.5 h-3.5" /> : <ServerOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{dbConnected ? 'PostgreSQL' : 'Local Mode'}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Notification */}
        {errorMsg && (
          <div className={`mb-6 border px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            appState === AppState.ERROR ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="ml-auto text-sm font-semibold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Dashboard (Top Section) */}
        {receipts.length > 0 && <Dashboard receipts={receipts} />}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Uploader */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                New Scan
              </h2>
              <UploadZone 
                onFileSelect={handleFileSelect} 
                isProcessing={appState === AppState.PROCESSING} 
              />
              {appState === AppState.PROCESSING && processingStage && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium animate-pulse">
                      <Cpu className="w-4 h-4" />
                      {processingStage}
                  </div>
              )}
              <div className="mt-4 text-xs text-slate-400 leading-relaxed">
                <p>
                  Pipeline: <strong>PaddleOCR</strong> (Text) → <strong>Gemini</strong> (Structure).
                  {dbConnected 
                    ? " Data synced to PostgreSQL."
                    : " Local mode active."}
                </p>
              </div>
            </div>

            {/* Recent History List */}
            {receipts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700">Recent Scans</h3>
                  <History className="w-4 h-4 text-slate-400" />
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {receipts.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setCurrentReceipt(r);
                        setAppState(AppState.VIEWING);
                      }}
                      className={`w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex justify-between items-center group
                        ${currentReceipt?.id === r.id ? 'bg-indigo-50/50' : ''}
                      `}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{r.merchantName}</p>
                           {/* Status Indicator */}
                           {dbConnected && (
                             r.synced 
                               ? <Check className="w-3 h-3 text-emerald-500" title="Synced to DB" />
                               : <RefreshCw className="w-3 h-3 text-amber-500" title="Local Only - Needs Sync" />
                           )}
                        </div>
                        <p className="text-xs text-slate-500">{r.transactionDate}</p>
                      </div>
                      <span className="font-semibold text-slate-700">{r.currency}{r.totalAmount.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Receipt Detail View */}
          <div className="lg:col-span-7">
            {currentReceipt ? (
              <div className="h-full animate-in fade-in zoom-in-95 duration-300">
                <ReceiptCard data={currentReceipt} />
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Scan className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No receipt selected</p>
                <p className="text-sm">Upload a receipt to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
