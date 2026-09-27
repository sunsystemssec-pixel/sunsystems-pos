import React, { useState } from 'react';
import { Mic, MicOff, Send, Camera, Plus, Sparkles } from 'lucide-react';
import { sunAI } from '../services/sunAI';

interface CommandBarProps {
  currentUserRole?: string;
  onCommandSubmit: (text: string) => void;
  onOpenScan: () => void;
  onQuickAction: (action: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE') => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ currentUserRole, onCommandSubmit, onOpenScan, onQuickAction }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const handleStartVoice = () => {
    setSpeechError(null);
    setIsListening(true);

    sunAI.startListening(
      (transcript) => {
        setIsListening(false);
        setInputText(transcript);
        onCommandSubmit(transcript);
      },
      (err) => {
        setIsListening(false);
        setSpeechError(typeof err === 'string' ? err : 'Microphone unavailable or permission denied.');
      },
      () => {
        setIsListening(false);
      },
      speechLang
    );
  };

  const handleStopVoice = () => {
    sunAI.stopListening();
    setIsListening(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onCommandSubmit(inputText.trim());
    setInputText('');
  };

  const sampleVoicePrompts = [
    'Sold Dell 5420 to Ramesh for 26500 UPI',
    'Add HP 840 G7 to stock serial ABC123 cost 22000 A grade',
    'Purchased five Lenovo T490 from ABC Computers for 110000',
    'Paid 2500 cash for courier',
    'Ramesh gave 10000 cash against credit',
    "Show today's sales"
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl mb-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center space-x-1 text-amber-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SUN AI Natural Input</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 text-[11px]">Lang:</span>
          <select
            value={speechLang}
            onChange={(e) => setSpeechLang(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5"
          >
            <option value="en-IN">English (India)</option>
            <option value="te-IN">Telugu (తెలుగు)</option>
            <option value="hi-IN">Hindi (हिन्दी)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-3">
        <button
          onClick={isListening ? handleStopVoice : handleStartVoice}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
            isListening
              ? 'bg-rose-600 ring-8 ring-rose-500/30 scale-105 animate-pulse'
              : 'bg-gradient-to-tr from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-slate-950 hover:scale-105'
          }`}
          title={isListening ? 'Tap to Stop Listening' : 'Tap to Speak'}
        >
          {isListening ? (
            <MicOff className="w-10 h-10 text-white" />
          ) : (
            <Mic className="w-10 h-10 text-slate-950 font-bold" />
          )}

          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-60"></span>
              <span className="absolute -inset-2 rounded-full border border-rose-500 animate-pulse"></span>
            </>
          )}
        </button>

        <span className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-400">
          {isListening ? 'Listening to you... Speak now' : '🎤 TAP TO SPEAK'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          Speak in English, Telugu, Hindi or Hinglish
        </span>
      </div>

      {speechError && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs px-3 py-2 rounded-lg mb-3">
          {speechError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center space-x-2 mt-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tell Sun Systems what you want to do..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all pr-8"
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 p-2.5 rounded-xl font-bold transition-colors flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-slate-800/80">
        <button
          onClick={() => onQuickAction('SALE')}
          className="flex-1 flex items-center justify-center space-x-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 py-1.5 rounded-lg text-slate-200 text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3 text-emerald-400" />
          <span>SALE</span>
        </button>

        <button
          onClick={() => onQuickAction('STOCK')}
          className="flex-1 flex items-center justify-center space-x-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 py-1.5 rounded-lg text-slate-200 text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3 text-sky-400" />
          <span>STOCK</span>
        </button>

        {currentUserRole === 'OWNER' && (
          <button
            onClick={() => onQuickAction('PURCHASE')}
            className="flex-1 flex items-center justify-center space-x-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 py-1.5 rounded-lg text-slate-200 text-[11px] font-medium transition-colors"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>PUR</span>
          </button>
        )}

        <button
          onClick={() => onQuickAction('EXPENSE')}
          className="flex-1 flex items-center justify-center space-x-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 py-1.5 rounded-lg text-slate-200 text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3 text-amber-400" />
          <span>EXP</span>
        </button>

        <button
          onClick={onOpenScan}
          className="flex items-center justify-center space-x-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>SCAN</span>
        </button>
      </div>

      <div className="mt-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">Try speaking or typing:</p>
        <div className="flex flex-wrap gap-1">
          {sampleVoicePrompts.slice(0, 3).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onCommandSubmit(prompt)}
              className="text-[11px] bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md text-left truncate max-w-full transition-colors border border-slate-800"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
