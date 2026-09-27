import React, { useState } from 'react';
import { Camera, Upload, Check, X, Sparkles } from 'lucide-react';
import { User } from '../types';
import { db } from '../services/db';

interface DocumentScannerModalProps {
  currentUser: User;
  onClose: () => void;
  onScannedSuccess: (data: any) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  currentUser,
  onClose,
  onScannedSuccess
}) => {
  const [docType, setDocType] = useState<'Purchase Invoice' | 'Expense Receipt' | 'Serial / Barcode'>('Purchase Invoice');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  const simulateScan = (sampleType: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      if (sampleType === 'Purchase Invoice') {
        setScannedResult({
          docType: 'Purchase Invoice',
          driveFolder: '02_PURCHASES',
          fileName: `INV_${Date.now()}.pdf`,
          extracted: {
            supplierName: 'ABC Computers Ltd',
            invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString().split('T')[0],
            productName: 'Dell Latitude 5420 Refurbished',
            quantity: 5,
            unitCost: 22000,
            totalAmount: 110000
          }
        });
      } else if (sampleType === 'Expense Receipt') {
        setScannedResult({
          docType: 'Expense Receipt',
          driveFolder: '05_EXPENSES',
          fileName: `RECEIPT_${Date.now()}.jpg`,
          extracted: {
            category: 'Courier',
            vendor: 'Professional Couriers CTC',
            description: 'Laptop motherboard transport to Mumbai',
            amount: 1850,
            paymentMode: 'Cash'
          }
        });
      } else if (sampleType === 'Serial / Barcode') {
        const serials = ['ABC123', 'DEF456', 'HP840G7-01', 'DEL5400-SOLD', 'LEN-T490-88'];
        const randomSerial = serials[Math.floor(Math.random() * serials.length)];
        const stockMatch = db.getStock().find(s => s.serialNumber === randomSerial);
        setScannedResult({
          docType: 'Serial / Barcode',
          driveFolder: '11_SCAN_DOCUMENTS',
          fileName: `BARCODE_${randomSerial}.png`,
          extracted: {
            serialNumber: randomSerial,
            brand: stockMatch ? stockMatch.brand : 'Dell',
            model: stockMatch ? stockMatch.model : 'Latitude 5420',
            status: stockMatch ? stockMatch.status : 'AVAILABLE',
            matchedStock: stockMatch
          }
        });
      }
    }, 800);
  };

  const handleConfirmSave = () => {
    if (!scannedResult) return;

    db.addDocument({
      fileName: scannedResult.fileName,
      docType: scannedResult.docType,
      driveFolder: scannedResult.driveFolder,
      uploadedBy: currentUser.name,
      ocrExtractedData: scannedResult.extracted
    }, currentUser);

    if (scannedResult.docType === 'Purchase Invoice') {
      db.addPurchase({
        supplierName: scannedResult.extracted.supplierName,
        productName: scannedResult.extracted.productName,
        quantity: scannedResult.extracted.quantity,
        unitCost: scannedResult.extracted.unitCost,
        totalAmount: scannedResult.extracted.totalAmount,
        paymentMode: 'Bank Transfer',
        invoiceNumber: scannedResult.extracted.invoiceNumber
      }, currentUser);
    } else if (scannedResult.docType === 'Expense Receipt') {
      db.addExpense({
        category: scannedResult.extracted.category,
        description: scannedResult.extracted.description,
        amount: scannedResult.extracted.amount,
        paymentMode: scannedResult.extracted.paymentMode
      }, currentUser);
    }

    onScannedSuccess(scannedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100 uppercase">
                MOBILE CAMERA & OCR SCANNER
              </h3>
              <p className="text-[11px] text-slate-400">Captures document & saves to Owner's Drive</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
          {(['Purchase Invoice', 'Expense Receipt', 'Serial / Barcode'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setDocType(type);
                setScannedResult(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                docType === type
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {!scannedResult && (
          <div className="mt-4 border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-950/50 flex flex-col items-center justify-center min-h-[190px]">
            {isScanning ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-amber-400 font-semibold animate-pulse flex items-center space-x-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Scanning & Running OCR Extraction...</span>
                </p>
                <p className="text-[11px] text-slate-500">Connecting to Google Drive folder...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  Align {docType} in viewfinder
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                  Take a live photo or upload from phone storage. OCR will auto-extract key figures.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => simulateScan(docType)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    <span>CAPTURE PHOTO</span>
                  </button>
                  <button
                    onClick={() => simulateScan(docType)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {scannedResult && (
          <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-amber-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OCR Extracted Data</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Drive: {scannedResult.driveFolder}
              </span>
            </div>

            <div className="mt-2.5 space-y-1.5">
              {Object.entries(scannedResult.extracted).map(([k, v]) => {
                if (typeof v === 'object') return null;
                return (
                  <div key={k} className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-semibold text-slate-200">
                      {typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : String(v)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>SAVE DATA & UPLOAD TO DRIVE</span>
              </button>
              <button
                onClick={() => setScannedResult(null)}
                className="py-2.5 px-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Retake
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
