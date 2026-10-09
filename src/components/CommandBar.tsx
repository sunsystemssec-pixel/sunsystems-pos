import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Camera, Plus, Sparkles, SlidersHorizontal } from 'lucide-react';
import { sunAI } from '../services/sunAI';
import { voiceTraining, VoiceLanguage } from '../services/voiceTraining';

interface CommandBarProps {
  currentUserRole?: string;
  onCommandSubmit: (text: string) => void;
  onOpenScan: () => void;
  onQuickAction: (action: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE') => void;
  onOpenVoiceTraining?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ currentUserRole, onCommandSubmit, onOpenScan, onQuickAction, onOpenVoiceTraining }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<VoiceLanguage>(voiceTraining.getSelectedLanguage());
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    setSpeechLang(voiceTraining.getSelectedLanguage());
  }, []);

  const handleLangChange = (lang: VoiceLanguage) => {
    setSpeechLang(lang);
    voiceTraining.setSelectedLanguage(lang);
  };

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
    'New sale',
    'बिक्री दर्ज करो (Sale)',
    'కొత్త బిల్లు చేయ్ (Telugu)',
    'Add purchase 5 Lenovo T490',
    'Paid 250 cash for courier',
    "Show today's sales"
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl mb-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center space-x-1 text-amber-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SUN AI Multilingual Voice</span>
        </div>
        <div className="flex items-center space-x-2">
          {onOpenVoiceTraining && (
            <button
              type="button"
              onClick={onOpenVoiceTraining}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center space-x-1 transition-colors"
              title="Train Voice Keywords & Test"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Train Voice</span>
            </button>
          )}
          <div className="flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-0.5">
            <span className="text-slate-400 text-[10px]">Lang:</span>
            <select
              value={speechLang}
              onChange={(e) => handleLangChange(e.target.value as VoiceLanguage)}
              className="bg-transparent text-slate-200 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="en-IN" className="bg-slate-900 text-slate-100">🇬🇧 English</option>
              <option value="hi-IN" className="bg-slate-900 text-slate-100">🇮🇳 हिन्दी</option>
              <option value="te-IN" className="bg-slate-900 text-slate-100">🇮🇳 తెలుగు</option>
            </select>
          </div>
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
            <span>PURCHASE</span>
          </button>
        )}

        <button
          onClick={() => onQuickAction('EXPENSE')}
          className="flex-1 flex items-center justify-center space-x-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 py-1.5 rounded-lg text-rose-300 text-[11px] font-bold transition-all shadow-sm"
          title="Record Shop Expense"
        >
          <Plus className="w-3 h-3 text-rose-400" />
          <span>EXPENSE</span>
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
