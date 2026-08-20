import { useState } from 'react';

export default function PositionsDrawer() {
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'transactions' | 'journal'>('summary');

  return (
    <aside className="w-80 bg-[#121217] border-r border-[#22222c] flex flex-col h-full text-white font-sans select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[#22222c] text-xs font-bold text-gray-200">
        <span>Positions</span>
        <button className="text-gray-500 hover:text-white transition-colors">✕</button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#22222c] text-xs font-semibold text-gray-400">
        <button
          onClick={() => setActiveSubTab('summary')}
          className={`flex-1 py-2.5 text-center transition-all ${
            activeSubTab === 'summary'
              ? 'border-b-2 border-red-500 text-white font-bold bg-[#17171e]/50'
              : 'hover:text-white'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex-1 py-2.5 text-center transition-all ${
            activeSubTab === 'transactions'
              ? 'border-b-2 border-red-500 text-white font-bold bg-[#17171e]/50'
              : 'hover:text-white'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveSubTab('journal')}
          className={`flex-1 py-2.5 text-center transition-all ${
            activeSubTab === 'journal'
              ? 'border-b-2 border-red-500 text-white font-bold bg-[#17171e]/50'
              : 'hover:text-white'
          }`}
        >
          Journal
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
        <div className="w-12 h-12 rounded-xl bg-[#1a1a22] border border-[#262633] flex items-center justify-center mb-3 text-gray-400 shadow-inner">
          📊
        </div>
        <p className="text-xs font-medium text-gray-400">No positions yet</p>
      </div>

      {/* Footer Run Statistics */}
      <div className="p-4 bg-[#16161c] border-t border-[#22222c] text-xs">
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">Total stake</span>
            <span className="font-bold text-gray-200">0.00 USD</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">Total payout</span>
            <span className="font-bold text-gray-200">0.00 USD</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">No. of runs</span>
            <span className="font-bold text-gray-200">0</span>
          </div>
        </div>

        {/* Contracts Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-[#22222c] mb-4 text-[11px]">
          <div>
            <span className="text-gray-500 block text-[9px] uppercase">Contracts lost</span>
            <span className="font-bold text-gray-300">0</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase">Contracts won</span>
            <span className="font-bold text-gray-300">0</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase">Total profit/loss</span>
            <span className="font-bold text-emerald-400">0.00 USD</span>
          </div>
        </div>

        {/* Reset Button */}
        <button className="w-full py-2.5 bg-[#1f1f28] hover:bg-[#282835] border border-[#2e2e3d] rounded-xl text-xs font-bold text-gray-300 transition-all shadow-sm">
          Reset
        </button>
      </div>
    </aside>
  );
}