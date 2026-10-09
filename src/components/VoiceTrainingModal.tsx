import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Sparkles, Volume2, Plus, Trash2, Check, ArrowRight, Play, BookOpen, Settings2, Globe } from 'lucide-react';
import { voiceTraining, VoiceLanguage, TrainedVoiceKeyword, SUPPORTED_LANGUAGES } from '../services/voiceTraining';
import { sunAI } from '../services/sunAI';
import { User } from '../types';

interface VoiceTrainingModalProps {
  currentUser: User;
  onClose: () => void;
  onExecuteAction?: (action: TrainedVoiceKeyword['action'], targetValue?: string) => void;
}

export const VoiceTrainingModal: React.FC<VoiceTrainingModalProps> = ({
  currentUser,
  onClose,
  onExecuteAction
}) => {
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(voiceTraining.getSelectedLanguage());
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [testResult, setTestResult] = useState<{
    action: TrainedVoiceKeyword['action'];
    matchedKeyword: TrainedVoiceKeyword;
    targetValue?: string;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Custom Training Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [customPhrase, setCustomPhrase] = useState('');
  const [customLang, setCustomLang] = useState<VoiceLanguage | 'all'>('all');
  const [customAction, setCustomAction] = useState<TrainedVoiceKeyword['action']>('OPEN_SALE');
  const [customTarget, setCustomTarget] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Dictionary Tab & Search
  const [dictFilter, setDictFilter] = useState<'ALL' | 'en-IN' | 'hi-IN' | 'te-IN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const allKeywords = voiceTraining.getAllKeywords();
  const customKeywords = voiceTraining.getCustomKeywords();

  const handleLanguageChange = (lang: VoiceLanguage) => {
    setSelectedLang(lang);
    voiceTraining.setSelectedLanguage(lang);
    if (lang === 'en-IN') sunAI.speak('English voice selected', 'en-IN');
    else if (lang === 'hi-IN') sunAI.speak('हिन्दी वॉयस चुनी गई है', 'hi-IN');
    else if (lang === 'te-IN') sunAI.speak('తెలుగు వాయిస్ ఎంచుకోబడింది', 'te-IN');
  };

  const handleStartPractice = () => {
    setTestError(null);
    setLiveTranscript('');
    setTestResult(null);
    setIsListening(true);

    sunAI.startListening(
      (transcript) => {
        setIsListening(false);
        setLiveTranscript(transcript);
        const match = voiceTraining.matchAction(transcript, selectedLang);
        if (match) {
          setTestResult(match);
          sunAI.speak(`Recognized action ${match.action.replace('_', ' ')}`, selectedLang);
        } else {
          setTestResult(null);
        }
      },
      (err) => {
        setIsListening(false);
        setTestError(typeof err === 'string' ? err : 'Microphone unavailable or permission denied.');
      },
      () => {
        setIsListening(false);
      },
      selectedLang
    );
  };

  const handleStopPractice = () => {
    sunAI.stopListening();
    setIsListening(false);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhrase.trim()) return;
    try {
      voiceTraining.addCustomKeyword(
        customPhrase.trim(),
        customAction,
        customLang,
        customTarget.trim() || undefined,
        customNotes.trim() || undefined
      );
      setCustomPhrase('');
      setCustomTarget('');
      setCustomNotes('');
      setShowAddForm(false);
      setRefreshTrigger(v => v + 1);
      sunAI.speak('Custom voice trigger trained successfully', selectedLang);
    } catch (err: any) {
      alert(err.message || 'Failed to save voice training');
    }
  };

  const handleDeleteCustom = (id: string) => {
    voiceTraining.removeCustomKeyword(id);
    setRefreshTrigger(v => v + 1);
  };

  const handleExecute = (action: TrainedVoiceKeyword['action'], targetValue?: string) => {
    onClose();
    if (onExecuteAction) {
      onExecuteAction(action, targetValue);
    }
  };

  const filteredDictionary = allKeywords.filter(k => {
    if (dictFilter !== 'ALL' && k.language !== 'all' && k.language !== dictFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return k.phrase.toLowerCase().includes(q) || k.action.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl my-auto space-y-5 max-h-[95vh] overflow-y-auto text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                <span>AI Voice Training &amp; Language Settings</span>
              </h3>
              <p className="text-xs text-slate-400">
                Dictate &amp; record entries in English, Hindi (हिन्दी) or Telugu (తెలుగు)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-xl bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. LANGUAGE SELECTOR CARDS */}
        <div>
          <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Active Voice Dictation Language</span>
          </label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {lang.flag}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 font-bold" />}
                  </div>
                  <div className="font-bold text-sm text-slate-100">{lang.nativeName}</div>
                  <div className="text-[10px] text-slate-400">{lang.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. LIVE VOICE PRACTICE & TESTER */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Voice Practice &amp; Action Tester</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
              Listening in: <strong className="text-amber-300">{SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.nativeName}</strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
            <button
              onClick={isListening ? handleStopPractice : handleStartPractice}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 shadow-xl ${
                isListening
                  ? 'bg-rose-600 ring-8 ring-rose-500/30 scale-105 animate-pulse text-white'
                  : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 hover:scale-105'
              }`}
              title={isListening ? 'Stop Listening' : 'Tap to Practice Speaking'}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 font-bold" />}
            </button>

            <div className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 min-h-[64px] flex flex-col justify-center">
              {isListening ? (
                <div className="flex items-center space-x-2 text-rose-400 font-medium text-xs animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening... Speak naturally in {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.nativeName} (e.g. &quot;New Sale&quot; or &quot;बिल बनाओ&quot; or &quot;కొత్త బిల్లు&quot;)...</span>
                </div>
              ) : liveTranscript ? (
                <div>
                  <span className="text-[10px] text-slate-500 block">Heard Transcript:</span>
                  <p className="text-sm font-semibold text-slate-100 font-mono">
                    &ldquo;{liveTranscript}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Tap microphone and speak any command or action phrase to test recognition.
                </p>
              )}
            </div>
          </div>

          {testError && (
            <div className="text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 px-3 py-2 rounded-xl">
              ⚠️ {testError}
            </div>
          )}

          {/* Test Recognition Result */}
          {testResult && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                  <span>Action Matched Successfully!</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {testResult.action}
                </span>
              </div>
              <div className="text-xs text-slate-300">
                Matched Keyword: <span className="text-amber-400 font-bold font-mono">&ldquo;{testResult.matchedKeyword.phrase}&rdquo;</span>
                {testResult.matchedKeyword.notes && ` (${testResult.matchedKeyword.notes})`}
              </div>
              <button
                type="button"
                onClick={() => handleExecute(testResult.action, testResult.targetValue)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow"
              >
                <span>Execute This Action Now ({testResult.action.replace('_', ' ')})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {liveTranscript && !testResult && !isListening && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-amber-300">
                Phrase recognized, but no preset action matched.
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomPhrase(liveTranscript);
                  setShowAddForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
              >
                + Train This Phrase
              </button>
            </div>
          )}
        </div>

        {/* 3. CUSTOM VOICE KEYWORD TRAINER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Trained Custom Keywords ({customKeywords.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Train Custom Word'}</span>
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleSaveCustom} className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="text-xs font-bold text-amber-400">
                Add Custom Voice Action Trigger
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    When I Speak (Phrase / Word)
                  </label>
                  <input
                    type="text"
                    required
                    value={customPhrase}
                    onChange={(e) => setCustomPhrase(e.target.value)}
                    placeholder="e.g. bada bill, laptop kotto, ramesh anna"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Take Action
                  </label>
                  <select
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="OPEN_SALE">🛒 Open New Sale Bill</option>
                    <option value="OPEN_PURCHASE">📦 Open Purchase Intake</option>
                    <option value="OPEN_EXPENSE">💸 Open Expense Entry</option>
                    <option value="VIEW_STOCK">🔍 View Stock Inventory</option>
                    <option value="VIEW_SALES">📊 View Sales History</option>
                    <option value="VIEW_CREDIT">📒 View Customer Credit</option>
                    <option value="DAILY_CLOSING">🌙 Daily Closing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Language
                  </label>
                  <select
                    value={customLang}
                    onChange={(e) => setCustomLang(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="all">Any / All Languages</option>
                    <option value="en-IN">English (India)</option>
                    <option value="hi-IN">Hindi (हिन्दी)</option>
                    <option value="te-IN">Telugu (తెలుగు)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Target Note / Product (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    placeholder="e.g. Dell Latitude 5420 or Party Name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow"
                >
                  Save Trained Trigger
                </button>
              </div>
            </form>
          )}

          {customKeywords.length > 0 && (
            <div className="space-y-1.5">
              {customKeywords.map(ck => (
                <div
                  key={ck.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-mono font-bold">&ldquo;{ck.phrase}&rdquo;</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                      {ck.language}
                    </span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-emerald-400 font-semibold">{ck.action}</span>
                    {ck.targetValue && (
                      <span className="text-slate-400 text-[11px]">({ck.targetValue})</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCustom(ck.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded"
                    title="Delete custom voice training"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. RECOGNIZED DICTIONARY / CHEAT SHEET */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Recognized Main Words Dictionary ({filteredDictionary.length})</span>
            </span>
            <div className="flex items-center space-x-1.5">
              {(['ALL', 'en-IN', 'hi-IN', 'te-IN'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDictFilter(f)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                    dictFilter === f
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'en-IN' ? 'EN' : f === 'hi-IN' ? 'HI' : 'TE'}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords (e.g. bill, kharcha, purchase, సేల్)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredDictionary.map(kw => (
              <div
                key={kw.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-amber-300">&ldquo;{kw.phrase}&rdquo;</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {kw.language === 'en-IN' ? '🇬🇧 EN' : kw.language === 'hi-IN' ? '🇮🇳 हिन्दी' : kw.language === 'te-IN' ? '🇮🇳 తెలుగు' : '🌐 ALL'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    {kw.action}
                  </span>
                  <button
                    onClick={() => handleExecute(kw.action, kw.targetValue)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center space-x-1 transition-colors"
                    title="Test execute this command"
                  >
                    <span>Run</span>
                    <Play className="w-2.5 h-2.5 text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
