import React from 'react';
import { Home, ShoppingCart, Laptop, ShieldAlert, Menu } from 'lucide-react';

export type MainTab = 'HOME' | 'SALES' | 'STOCK' | 'AUDIT' | 'MORE';

interface BottomNavProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  auditAlertCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, auditAlertCount }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800">
      <div className="flex items-center justify-around max-w-md mx-auto h-16 px-1">
        <button
          onClick={() => onSelectTab('HOME')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'HOME' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] tracking-wide mt-1">HOME</span>
          {activeTab === 'HOME' && <div className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />}
        </button>

        <button
          onClick={() => onSelectTab('SALES')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'SALES' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] tracking-wide mt-1">SALES</span>
          {activeTab === 'SALES' && <div className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />}
        </button>

        <button
          onClick={() => onSelectTab('STOCK')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'STOCK' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Laptop className="w-5 h-5" />
          <span className="text-[10px] tracking-wide mt-1">STOCK</span>
          {activeTab === 'STOCK' && <div className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />}
        </button>

        <button
          onClick={() => onSelectTab('AUDIT')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'AUDIT' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShieldAlert className="w-5 h-5" />
            {auditAlertCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {auditAlertCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide mt-1">AUDIT</span>
          {activeTab === 'AUDIT' && <div className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />}
        </button>

        <button
          onClick={() => onSelectTab('MORE')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'MORE' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-wide mt-1">MORE</span>
          {activeTab === 'MORE' && <div className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />}
        </button>
      </div>
    </nav>
  );
};
