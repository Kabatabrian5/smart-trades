interface HeaderProps {
  currentTab: 'trade' | 'bot';
  setCurrentTab: (tab: 'trade' | 'bot') => void;
}

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 h-16 bg-[#121217] border-b border-[#22222c] w-full text-white font-sans select-none">
      
      {/* Left section: Brand Logo & Navigation Links */}
      <div className="flex items-center space-x-8">
        
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('trade')}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 via-teal-600 to-cyan-700 flex items-center justify-center font-black text-sm tracking-tighter shadow-lg shadow-emerald-500/20">
            ST
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Smartest</span>
              <span className="font-extrabold text-sm tracking-wide text-emerald-400">Trades</span>
            </div>
            <span className="text-[10px] text-gray-400 block tracking-wider uppercase -mt-0.5">powered by <span className="text-red-500 font-bold">Deriv</span></span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1.5 bg-[#17171e] p-1 rounded-xl border border-[#23232f]">
          <button
            onClick={() => setCurrentTab('trade')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'trade'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30'
                : 'text-gray-400 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <span className="text-sm">⚡</span>
            <span>Manual trading</span>
          </button>

          <button
            onClick={() => setCurrentTab('bot')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'bot'
                ? 'bg-[#23232f] text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <span className="text-sm">🤖</span>
            <span>Bot builder</span>
          </button>

          <button
            onClick={() => alert('Charts view coming soon!')}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#20202a] transition-all cursor-pointer"
          >
            <span className="text-sm">📈</span>
            <span>Charts</span>
          </button>

          <button
            onClick={() => alert('Copy trading view coming soon!')}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#20202a] transition-all cursor-pointer"
          >
            <span className="text-sm">👥</span>
            <span>Copy trading</span>
          </button>

          <button
            onClick={() => alert('Bulk view coming soon!')}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#20202a] transition-all cursor-pointer"
          >
            <span>Bulk</span>
          </button>
        </nav>
      </div>

      {/* Right section: Cashier, Sign In & Sign Up Action Buttons */}
      <div className="flex items-center space-x-3">
        <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
          <span className="text-sm">💳</span>
          <span>Cashier</span>
        </button>

        <button className="px-4 py-2 bg-[#1b1b24] hover:bg-[#252533] border border-[#2e2e3d] text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
          Sign in
        </button>

        <button className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 cursor-pointer">
          Sign up
        </button>
      </div>
    </header>
  );
}