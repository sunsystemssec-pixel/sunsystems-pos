import React, { useState } from 'react';
import { Cloud, CheckCircle, RefreshCw, Folder, Download, X, FileSpreadsheet } from 'lucide-react';
import { COMPANY_INFO } from '../data/seedData';
import { DRIVE_FOLDERS, DATABASE_TABS, driveService } from '../services/googleDrive';

interface DriveModalProps {
  onClose: () => void;
}

export const DriveModal: React.FC<DriveModalProps> = ({ onClose }) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('01_DATABASE');
  const [isSyncing, setIsSyncing] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      driveService.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 700);
  };

  const handleBackupNow = () => {
    const backup = driveService.createBackup();
    setBackupMessage(`Backup successfully created: ${backup.name} (${backup.size})`);
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const folderItems = driveService.getFolderContents(selectedFolder);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100">
                GOOGLE DRIVE & SHEETS DATABASE
              </h3>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>🟢 CONNECTED: {COMPANY_INFO.ownerEmail}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'SYNC NOW'}</span>
          </button>

          <button
            onClick={handleBackupNow}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>BACKUP NOW</span>
          </button>
        </div>

        {backupMessage && (
          <div className="mt-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl text-xs">
            {backupMessage}
          </div>
        )}

        <div className="mt-4 bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-slate-100 block">
                  {COMPANY_INFO.databaseSheet}
                </span>
                <span className="text-[10px] text-slate-400">
                  Folder: {COMPANY_INFO.driveFolder} / 01_DATABASE
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              20 TABS
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {DATABASE_TABS.slice(0, 10).map((tab) => (
              <span key={tab} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                {tab}
              </span>
            ))}
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              +10 more
            </span>
          </div>
        </div>

        <div className="mt-4">
          <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">
            DRIVE FOLDER STRUCTURE (11 SUBFOLDERS):
          </span>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {DRIVE_FOLDERS.map((f) => (
              <button
                key={f.code}
                onClick={() => setSelectedFolder(f.code)}
                className={`text-left p-2 rounded-lg text-xs flex items-center space-x-1.5 transition-colors ${
                  selectedFolder === f.code
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] font-bold text-slate-400 block mb-2">
            Files in {selectedFolder}:
          </span>
          {folderItems.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No files yet in this folder.</p>
          ) : (
            <div className="space-y-1.5">
              {folderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-0">
                  <span className="text-slate-200 font-medium truncate max-w-[220px]">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.size || item.updatedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
          >
            Close Drive Center
          </button>
        </div>
      </div>
    </div>
  );
};
