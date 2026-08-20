import React, { useState } from 'react';
import PositionsDrawer from './components/layout/PositionsDrawer';
import { useDerivSocket } from './hooks/useDerivSocket';
import { derivService } from './services/derivSocket';

const VOLATILITY_MARKETS = [
  { id: '1HZ10V', name: 'Volatility 10 (1s) Index' },
  { id: '1HZ25V', name: 'Volatility 25 (1s) Index' },
  { id: '1HZ50V', name: 'Volatility 50 (1s) Index' },
  { id: '1HZ75V', name: 'Volatility 75 (1s) Index' },
  { id: '1HZ100V', name: 'Volatility 100 (1s) Index' },
];

interface BotItem {
  id: string;
  name: string;
  lastModified: string;
  status: 'Unsaved' | 'Saved' | 'Running';
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

export default function App() {
  const [currentTab, setCurrentTab] = useState<'manual-trading' | 'dashboard' | 'bot-builder'>('dashboard');

  // Trading state
  const [selectedSymbol, setSelectedSymbol] = useState('1HZ100V');
  const [selectedDigit, setSelectedDigit] = useState<number>(3);
  const [predictionMode, setPredictionMode] = useState<'MATCHES' | 'DIFFERS'>('MATCHES');
  const [stake, setStake] = useState(10);
  const [ticksCount] = useState(1);
  const { currentTick, marketStatus, digitHistory } = useDerivSocket(selectedSymbol);

  // Dashboard & Bot Manager state
  const [dashboardBots, setDashboardBots] = useState<BotItem[]>([
    { id: '1', name: 'Untitled Bot', lastModified: '15 Aug 2026', status: 'Unsaved' },
  ]);

  // Quick Strategy Modal State
  const [isQuickStrategyOpen, setIsQuickStrategyOpen] = useState(false);
  const [quickStrategyStep, setQuickStrategyStep] = useState<'template' | 'parameters'>('template');
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'accumulators' | 'options'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  // Strategy Parameter Inputs State
  const [initialStakeInput, setInitialStakeInput] = useState<number>(1);
  const [martingaleFactorInput, setMartingaleFactorInput] = useState<number>(2);
  const [maxStakeLimitInput, setMaxStakeLimitInput] = useState<number>(100);

  // Active Strategy Execution Engine State
  const [activeStrategyConfig, setActiveStrategyConfig] = useState<{
    strategyName: string;
    initialStake: number;
    factor: number;
    maxLimit: number;
    currentStake: number;
    stepIndex: number;
    seriesProfit: number;
  } | null>(null);

  const accumulatorsStrategies = [
    'Martingale',
    'Martingale on Stat Reset',
    "D'Alembert",
    "D'Alembert on Stat Reset",
    'Reverse Martingale',
    'Reverse Martingale on Stat Reset',
    "Reverse D'Alembert",
    "Reverse D'Alembert on Stat Reset",
  ];

  const optionsStrategies = [
    'Martingale',
    "D'Alembert",
    'Reverse Martingale',
    "Reverse D'Alembert",
    "Oscar's Grind",
    '1-3-2-6',
  ];

  // Bot Builder internal state & Blocks Modal
  const [builderCategory, setBuilderCategory] = useState<string>('Trade parameters');
  const [rightPanelTab, setRightPanelTab] = useState<'summary' | 'transactions' | 'journal'>('summary');
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botRuns, setBotRuns] = useState(0);
  const [botProfit, setBotProfit] = useState(0);

  // Modal / Flyout state for category block details (Image 2)
  const [activeCategoryModal, setActiveCategoryModal] = useState<string | null>(null);

  // Canvas Blocks added to workspace
  const [canvasPurchaseBlocks, setCanvasPurchaseBlocks] = useState<string[]>(['Rise']);
  const [canvasSellBlocks, setCanvasSellBlocks] = useState<string[]>(['is available']);

  const totalTicks = Math.max(1, digitHistory.length);
  const digitStats = Array.from({ length: 10 }, (_, digit) => {
    const count = digitHistory.filter((d) => d === digit).length;
    const pct = Math.round((count / totalTicks) * 100);
    return { digit, pct, count };
  });

  const minPct = Math.min(...digitStats.map(s => s.pct));
  const lastDigit = currentTick !== null && !isNaN(currentTick) 
    ? parseInt(currentTick.toString().slice(-1), 10) 
    : 3;

  const calculateNextStake = (lastResult: 'win' | 'loss'): number => {
    if (!activeStrategyConfig) return stake;

    const { strategyName, initialStake, factor, maxLimit, currentStake } = activeStrategyConfig;
    let nextStake = currentStake;
    let newStepIndex = activeStrategyConfig.stepIndex;

    switch (strategyName) {
      case 'Martingale':
        if (lastResult === 'loss') {
          nextStake = currentStake * (factor || 2);
        } else {
          nextStake = initialStake;
        }
        break;
      case 'Reverse Martingale':
        if (lastResult === 'win') {
          nextStake = currentStake * (factor || 2);
        } else {
          nextStake = initialStake;
        }
        break;
      case "D'Alembert":
        if (lastResult === 'loss') {
          nextStake = currentStake + (factor || 1);
        } else {
          nextStake = Math.max(initialStake, currentStake - (factor || 1));
        }
        break;
      default:
        nextStake = initialStake;
        break;
    }

    if (nextStake > maxLimit) {
      nextStake = initialStake;
      newStepIndex = 0;
    }

    setActiveStrategyConfig(prev => prev ? { ...prev, currentStake: nextStake, stepIndex: newStepIndex } : null);
    setStake(nextStake);
    return nextStake;
  };

  const handleLoadStrategyToWorkspace = () => {
    if (!selectedStrategy) return;

    setActiveStrategyConfig({
      strategyName: selectedStrategy,
      initialStake: initialStakeInput,
      factor: martingaleFactorInput,
      maxLimit: maxStakeLimitInput,
      currentStake: initialStakeInput,
      stepIndex: 0,
      seriesProfit: 0,
    });
    setStake(initialStakeInput);

    setIsQuickStrategyOpen(false);
    setCurrentTab('bot-builder');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newBot: BotItem = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        lastModified: '21 Aug 2026',
        status: 'Saved',
      };
      setDashboardBots((prev) => [newBot, ...prev]);
    }
  };

  const handleGoogleSignIn = () => {
    const gapi = (window as any).gapi;
    const google = (window as any).google;

    if (!gapi || !google || !GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      alert("Google Drive is not configured yet.");
      return;
    }

    gapi.load('client:picker', () => {
      gapi.client.init({ apiKey: GOOGLE_API_KEY }).then(() => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error) {
              alert(`Google Auth Error: ${response.error}`);
              return;
            }
            openPicker(response.access_token);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      });
    });
  };

  const openPicker = (oauthToken: string) => {
    const google = (window as any).google;
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes('application/json,text/xml');

    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
      .setOAuthToken(oauthToken)
      .addView(view)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const file = data.docs[0];
          const newBot: BotItem = {
            id: file.id || Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, ""),
            lastModified: '21 Aug 2026',
            status: 'Saved',
          };
          setDashboardBots((prev) => [newBot, ...prev]);
        }
      })
      .build();

    picker.setVisible(true);
  };

  const handleDeleteBot = (id: string) => {
    setDashboardBots((prev) => prev.filter(b => b.id !== id));
  };

  const handleDuplicateBot = (bot: BotItem) => {
    const duplicated: BotItem = {
      ...bot,
      id: Date.now().toString(),
      name: `${bot.name} (Copy)`,
      status: 'Unsaved',
    };
    setDashboardBots((prev) => [duplicated, ...prev]);
  };

  const handlePurchase = async () => {
    try {
      const contractType = predictionMode === 'MATCHES' ? 'DIGITMATCH' : 'DIGITDIFF';
      const proposalRes = await derivService.send({
        proposal: 1,
        amount: stake,
        basis: 'stake',
        currency: 'USD',
        symbol: selectedSymbol,
        contract_type: contractType,
        duration: ticksCount,
        duration_unit: 't',
        barrier: selectedDigit.toString(),
      });

      if (proposalRes.proposal) {
        const buyRes = await derivService.buyContract(proposalRes.proposal.id, proposalRes.proposal.ask_price);
        alert(`Digit Trade executed! Contract ID: ${buyRes.buy.contract_id}`);
      }
    } catch (error: any) {
      alert(`Trade failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#16161c] text-white font-sans relative">
      <header className="h-14 bg-[#121217] border-b border-[#22222c] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center font-extrabold text-black text-xs">ST</span>
            <span className="font-extrabold text-sm tracking-wide text-white">Smartest <span className="text-teal-400">Trades</span></span>
          </div>

          <nav className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentTab('manual-trading')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'manual-trading' ? 'bg-[#222230] text-teal-400 shadow' : 'text-gray-400 hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              Manual trading
            </button>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('bot-builder')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'bot-builder' ? 'bg-[#222230] text-teal-400 shadow' : 'text-gray-400 hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              Bot Builder
            </button>
          </nav>
        </div>
      </header>

      {/* Manual Trading View */}
      {currentTab === 'manual-trading' && (
        <div className="flex flex-1 overflow-hidden">
          <PositionsDrawer />
          <main className="flex-1 flex flex-col bg-[#16161c] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between bg-[#1b1b24] px-5 py-3 rounded-2xl border border-[#262633] shadow-md shrink-0">
              <div className="flex items-center space-x-3">
                <span className={`w-3 h-3 rounded-full ${marketStatus.includes('Live') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <div>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => {
                      setSelectedSymbol(e.target.value);
                    }}
                    className="bg-transparent font-extrabold text-white text-sm outline-none cursor-pointer"
                  >
                    {VOLATILITY_MARKETS.map((market) => (
                      <option key={market.id} value={market.id} className="bg-[#1b1b24] text-white">
                        {market.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {currentTick !== null ? currentTick : 'Waiting for ticks...'} 
                    <span className="text-emerald-400 ml-2 font-semibold">({totalTicks} ticks analyzed)</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400">Status: <span className="text-white font-semibold">{marketStatus}</span></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center bg-[#1b1b24]/40 border border-[#262633] rounded-2xl p-8 relative shadow-inner">
              <div className="grid grid-cols-5 gap-6 max-w-2xl">
                {digitStats.map((item) => {
                  const isSelected = selectedDigit === item.digit;
                  const isCurrent = lastDigit === item.digit;
                  const isLowest = item.pct === minPct && totalTicks > 5;
                  
                  const radius = 34;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (item.pct / 100) * circumference;
                  const ringColor = isLowest ? '#ef4444' : (isSelected ? '#2dd4bf' : '#38bdf8');

                  return (
                    <button
                      key={item.digit}
                      onClick={() => setSelectedDigit(item.digit)}
                      className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected ? 'bg-[#222230] shadow-lg shadow-teal-500/20' : 'bg-[#1b1b24] hover:border-gray-500'
                      }`}
                    >
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r={radius} stroke="#262633" strokeWidth="3" fill="transparent" />
                        <circle
                          cx="40" cy="40" r={radius} stroke={ringColor} strokeWidth="3"
                          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round" fill="transparent" className="transition-all duration-500"
                        />
                      </svg>
                      <span className="text-xl font-bold font-mono text-white z-10">{item.digit}</span>
                      <span className={`text-[10px] font-semibold mt-0.5 z-10 ${isLowest ? 'text-rose-400' : 'text-gray-400'}`}>
                        {item.pct}%
                      </span>
                      {isCurrent && (
                        <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-teal-400 animate-ping z-20"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </main>

          <aside className="w-80 bg-[#121217] border-l border-[#22222c] flex flex-col h-full text-white p-5 justify-between shrink-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-400 border-b border-[#22222c] pb-2">
                <span>Matches / Differs</span>
                <span className="text-teal-400 font-mono">Barrier: {selectedDigit}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 bg-[#1b1b24] p-2 rounded-xl border border-[#262633]">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDigit(d)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedDigit === d ? 'bg-white text-black font-extrabold' : 'text-gray-400 hover:text-white hover:bg-[#252533]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#22222c]">
              <button
                onClick={() => { setPredictionMode('MATCHES'); handlePurchase(); }}
                className="py-3 px-2 rounded-xl text-center font-bold bg-teal-500 text-black cursor-pointer"
              >
                Matches
              </button>
              <button
                onClick={() => { setPredictionMode('DIFFERS'); handlePurchase(); }}
                className="py-3 px-2 rounded-xl text-center font-bold bg-rose-600 text-white cursor-pointer"
              >
                Differs
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Dashboard View */}
      {currentTab === 'dashboard' && (
        <main className="flex-1 flex flex-col items-center justify-start bg-[#16161c] overflow-y-auto p-10 space-y-8 animate-in fade-in duration-200">
          <div className="text-center space-y-2 mt-4">
            <p className="text-gray-300 text-sm">
              Import a bot from your computer or Google Drive, build it from scratch, or start with a quick strategy.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-6 max-w-3xl w-full">
            <label className="flex flex-col items-center justify-center bg-[#1b1b24] border border-[#262633] hover:border-teal-500/50 p-6 rounded-2xl cursor-pointer transition-all shadow-md group space-y-3">
              <span className="text-xs font-semibold text-gray-200">My computer</span>
              <div className="w-12 h-12 rounded-xl bg-[#222230] flex items-center justify-center text-xl">💻</div>
              <input type="file" accept=".xml,.json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button 
              onClick={handleGoogleSignIn}
              className="flex flex-col items-center justify-center bg-[#1b1b24] border border-[#262633] hover:border-emerald-500/50 p-6 rounded-2xl cursor-pointer transition-all shadow-md space-y-3 group"
            >
              <span className="text-xs font-semibold text-gray-200">Google Drive</span>
              <div className="w-12 h-12 rounded-xl bg-[#222230] flex items-center justify-center text-xl">📁</div>
            </button>

            <button 
              onClick={() => setCurrentTab('bot-builder')}
              className="flex flex-col items-center justify-center bg-[#1b1b24] border border-[#262633] hover:border-sky-500/50 p-6 rounded-2xl cursor-pointer transition-all shadow-md space-y-3 group"
            >
              <span className="text-xs font-semibold text-gray-200">Bot Builder</span>
              <div className="w-12 h-12 rounded-xl bg-[#222230] flex items-center justify-center text-xl">🧩</div>
            </button>

            <button 
              onClick={() => setIsQuickStrategyOpen(true)}
              className="flex flex-col items-center justify-center bg-[#1b1b24] border border-[#262633] hover:border-purple-500/50 p-6 rounded-2xl cursor-pointer transition-all shadow-md space-y-3 group"
            >
              <span className="text-xs font-semibold text-gray-200">Quick strategy</span>
              <div className="w-12 h-12 rounded-xl bg-[#222230] flex items-center justify-center text-xl">⚡</div>
            </button>
          </div>

          <div className="max-w-3xl w-full bg-[#1b1b24] border border-[#262633] rounded-2xl p-6 shadow-inner space-y-4">
            <h3 className="text-sm font-bold text-gray-300">Your bots:</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-[#262633] pb-2">
                  <th className="pb-3 font-semibold">Bot name</th>
                  <th className="pb-3 font-semibold">Last modified</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262633]/50">
                {dashboardBots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-[#22222c] transition-colors">
                    <td className="py-3.5 font-medium text-white">{bot.name}</td>
                    <td className="py-3.5 text-gray-400">{bot.lastModified}</td>
                    <td className="py-3.5 text-amber-400 font-mono text-[11px]">{bot.status}</td>
                    <td className="py-3.5 text-right space-x-3">
                      <button onClick={() => handleDuplicateBot(bot)} title="Duplicate">📄</button>
                      <button onClick={() => alert(`Saving ${bot.name}`)} title="Save">💾</button>
                      <button onClick={() => handleDeleteBot(bot.id)} title="Delete">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* Bot Builder Workspace View */}
      {currentTab === 'bot-builder' && (
        <div className="flex flex-1 overflow-hidden bg-[#f4f5f7] text-gray-800">
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
            <div className="p-3 border-b border-gray-200">
              <button 
                onClick={() => setIsQuickStrategyOpen(true)} 
                className="w-full bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Quick strategy</span>
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Blocks menu</span>
              <button onClick={() => setCurrentTab('dashboard')} className="text-[11px] text-blue-600 hover:underline cursor-pointer">← Exit</button>
            </div>

            <div className="p-3">
              <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 space-x-2">
                <span className="text-gray-400 text-xs">🔍</span>
                <input type="text" placeholder="Search" className="w-full bg-transparent text-xs text-gray-800 outline-none" />
              </div>
            </div>

            <div className="flex flex-col text-xs font-medium divide-y divide-gray-100 overflow-y-auto">
              {[
                'Trade parameters', 
                'Purchase conditions', 
                'Sell conditions (optional)', 
                'Restart trading conditions', 
                'Analysis', 
                'Utility'
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setBuilderCategory(cat);
                    if (cat === 'Purchase conditions' || cat === 'Sell conditions (optional)') {
                      setActiveCategoryModal(cat);
                    }
                  }}
                  className={`text-left px-4 py-3.5 transition-colors cursor-pointer flex items-center justify-between ${builderCategory === cat ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span>{cat}</span>
                  <span className="text-gray-400">⌄</span>
                </button>
              ))}
            </div>

            <div className="p-4 mt-auto border-t border-gray-200">
              <button className="w-full bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold py-2 px-3 rounded-lg shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
                <span>⚠️ Risk Disclaimer</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa] relative">
            <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 space-x-3 shrink-0 shadow-sm">
              <button title="Undo" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">🔄</button>
              <button title="Folder" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">📁</button>
              <button title="Save" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">💾</button>
              <button title="List" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">📊</button>
              <div className="h-4 w-[1px] bg-gray-300"></div>
              <button title="Undo Action" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">↩️</button>
              <button title="Redo Action" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">↪️</button>
              <button title="Delete All" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">🗑️</button>
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-6 relative">
              <div className="bg-[#1e293b] text-white rounded-xl p-4 shadow-md max-w-2xl space-y-3 border border-slate-700">
                <div className="text-xs font-bold text-teal-400">1. Trade parameters</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Market: Derived</div>
                  <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Continuous Indices</div>
                  <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Volatility 10 Index</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Trade Type: Up/Down</div>
                  <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Contract Type: Both</div>
                </div>
                <div className="text-[11px] text-gray-300">Default Candle Interval: <span className="bg-[#0f172a] px-2 py-1 rounded border border-slate-700 ml-1">1 minute</span></div>
              </div>

              {/* Rendered Purchase Conditions Block on Canvas with nested Purchase Blocks */}
              <div className="bg-[#1e293b] text-white rounded-xl p-4 shadow-md max-w-2xl space-y-3 border border-blue-500/50">
                <div className="text-xs font-bold text-blue-400">2. Purchase conditions</div>
                <div className="space-y-2">
                  {canvasPurchaseBlocks.map((blockType, idx) => (
                    <div key={idx} className="bg-[#0f172a] p-2.5 rounded border border-slate-700 flex items-center justify-between text-xs font-mono">
                      <span>Purchase {blockType}</span>
                      <button 
                        onClick={() => setCanvasPurchaseBlocks(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 text-xs font-sans cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {canvasPurchaseBlocks.length === 0 && (
                    <div className="text-[11px] text-gray-400 italic">No purchase blocks added yet. Click 'Purchase conditions' in the left menu to add one.</div>
                  )}
                </div>
              </div>

              <div className="bg-[#1e293b] text-white rounded-xl p-4 shadow-md max-w-2xl space-y-3 border border-emerald-500/50">
                <div className="text-xs font-bold text-emerald-400">3. Sell conditions (optional)</div>
                <div className="space-y-2">
                  <div className="bg-[#0f172a] p-2.5 rounded border border-slate-700 text-xs font-mono">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-emerald-400">if</span>
                      <span className="text-gray-500">then</span>
                    </div>
                  </div>
                  {canvasSellBlocks.map((blockType, idx) => (
                    <div key={idx} className="bg-[#0f172a] p-2.5 rounded border border-slate-700 flex items-center justify-between text-xs font-mono">
                      <span>Sell {blockType}</span>
                      <button
                        onClick={() => setCanvasSellBlocks(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 text-xs font-sans cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {canvasSellBlocks.length === 0 && (
                    <div className="text-[11px] text-gray-400 italic">Add a sell block inside the condition.</div>
                  )}
                </div>
              </div>

              {activeStrategyConfig && (
                <div className="bg-[#1e293b] text-white rounded-xl p-4 shadow-md max-w-2xl space-y-2 border border-blue-500/50">
                  <div className="text-xs font-bold text-blue-400">Active Strategy Loaded: {activeStrategyConfig.strategyName}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                    <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Initial Stake: {activeStrategyConfig.initialStake}</div>
                    <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Factor/Step: {activeStrategyConfig.factor}</div>
                    <div className="bg-[#0f172a] p-2 rounded border border-slate-700">Max Limit: {activeStrategyConfig.maxLimit}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-80 bg-white border-l border-gray-200 flex flex-col justify-between shrink-0 shadow-sm">
            <div>
              <div className="flex border-b border-gray-200 text-xs font-semibold">
                {['summary', 'transactions', 'journal'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRightPanelTab(tab as any)}
                    className={`flex-1 py-3 text-center capitalize transition-colors cursor-pointer ${rightPanelTab === tab ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6 text-center space-y-6">
                {rightPanelTab === 'summary' && (
                  <div className="py-12 text-gray-500 text-xs leading-relaxed">
                    When you're ready to trade, hit <span className="text-blue-600 font-bold">Run</span>.<br />
                    You'll be able to track your bot's performance here.
                  </div>
                )}
                {rightPanelTab === 'transactions' && (
                  <div className="py-12 text-gray-500 text-xs">No active contract transactions yet.</div>
                )}
                {rightPanelTab === 'journal' && (
                  <div className="py-12 text-gray-500 text-xs">System logs and triggers will appear here.</div>
                )}

                <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-200 pt-4 text-xs">
                  <div>
                    <div className="text-gray-500">Current Stake</div>
                    <div className="font-bold text-sm text-gray-800">{stake.toFixed(2)} AUD</div>
                  </div>
                  <div>
                    <div className="text-gray-500">No. of runs</div>
                    <div className="font-bold text-sm text-gray-800">{botRuns}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total profit/loss</div>
                    <div className={`font-bold text-sm ${botProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{botProfit.toFixed(2)} AUD</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex space-x-3 items-center">
              <button 
                onClick={() => { setBotRuns(0); setBotProfit(0); setIsBotRunning(false); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Reset
              </button>
              <button 
                onClick={() => {
                  const newRunningState = !isBotRunning;
                  setIsBotRunning(newRunningState);
                  if (newRunningState) {
                    setBotRuns(prev => prev + 1);
                    const outcome = Math.random() > 0.4 ? 'win' : 'loss';
                    const delta = outcome === 'win' ? 5 : -3;
                    setBotProfit(prev => prev + delta);
                    calculateNextStake(outcome);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${isBotRunning ? 'bg-rose-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'}`}
              >
                {isBotRunning ? 'Stop' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Flyout / Modal for Purchase Conditions (Matches Image 2) */}
      {(activeCategoryModal === 'Purchase conditions' || activeCategoryModal === 'Sell conditions (optional)') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col text-gray-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-950">{activeCategoryModal}</h2>
              <div className="flex items-center space-x-3">
                {/* Plus button to add purchase block to workspace */}
                <button 
                  onClick={() => {
                    if (activeCategoryModal === 'Purchase conditions') {
                      setCanvasPurchaseBlocks(prev => [...prev, 'Rise']);
                    } else {
                      setCanvasSellBlocks(prev => [...prev, 'is available']);
                    }
                    setActiveCategoryModal(null);
                  }}
                  title="Add block to workspace"
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 flex items-center justify-center font-bold transition-colors cursor-pointer shadow-sm"
                >
                  +
                </button>
                <button 
                  onClick={() => setActiveCategoryModal(null)}
                  className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              <p className="text-xs text-gray-600 leading-relaxed">
                {activeCategoryModal === 'Purchase conditions'
                  ? 'This block is mandatory. Only one copy of this block is allowed. You can place the Purchase block here as well as conditional blocks to define your purchase conditions.'
                  : 'This optional block lets you define conditions for selling an active contract. Add sell blocks here to control when the bot exits a trade.'}
                {' '}<a href="#" className="text-rose-600 font-semibold hover:underline">Learn more</a>
              </p>

              <div className={`p-4 rounded-xl text-white space-y-2 shadow-inner ${activeCategoryModal === 'Purchase conditions' ? 'bg-[#1e3a5f]' : 'bg-[#14532d]'}`}>
                <div className="text-xs font-semibold">{activeCategoryModal === 'Purchase conditions' ? '2. Purchase conditions' : '3. Sell conditions (optional)'}</div>
                <div className="w-full bg-[#1b2a47] h-8 rounded border border-blue-400/30"></div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">{activeCategoryModal === 'Purchase conditions' ? 'Purchase' : 'Sell'}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {activeCategoryModal === 'Purchase conditions'
                    ? 'Use this block to purchase the specific contract you want. You may add multiple Purchase blocks together with conditional blocks to define your purchase conditions.'
                    : 'Use this block to define when the bot should sell an active contract. You may add multiple Sell blocks together with conditional blocks.'}
                </p>

                <div className="inline-flex items-center bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 space-x-4">
                  <span className="text-xs font-mono font-bold text-gray-700">{activeCategoryModal === 'Purchase conditions' ? 'Purchase' : 'Sell'}</span>
                  <span className="text-gray-400 text-xs">▼</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Strategy Modal */}
      {isQuickStrategyOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col text-gray-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">Quick Strategy</h2>
              <button 
                onClick={() => setIsQuickStrategyOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 h-[520px]">
              <div className="w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col space-y-6">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Choose a template below and set your trade parameters.
                </p>
                <div className="relative pl-6 space-y-8">
                  <div className="absolute left-2.5 top-3 bottom-3 w-[2px] bg-blue-600"></div>

                  <div className="relative flex items-center space-x-3 cursor-pointer" onClick={() => setQuickStrategyStep('template')}>
                    <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center ${quickStrategyStep === 'template' ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}>
                      {quickStrategyStep === 'template' ? (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      ) : (
                        <span className="text-[10px] text-white font-bold">✓</span>
                      )}
                    </div>
                    <div className="font-bold text-gray-900">Choose template</div>
                  </div>

                  <div className="relative flex items-center space-x-3 cursor-pointer" onClick={() => selectedStrategy && setQuickStrategyStep('parameters')}>
                    <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center ${quickStrategyStep === 'parameters' ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}>
                      {quickStrategyStep === 'parameters' && <span className="w-2 h-2 rounded-full bg-white"></span>}
                    </div>
                    <div className={`font-bold ${selectedStrategy ? 'text-gray-900' : 'text-gray-400'}`}>Set parameters</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                {quickStrategyStep === 'template' ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {(['all', 'accumulators', 'options'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setStrategyFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                              strategyFilter === filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Search strategy..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 outline-none w-48"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[320px] pr-2">
                      {(strategyFilter === 'all' || strategyFilter === 'options') &&
                        optionsStrategies
                          .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((strat) => (
                            <div
                              key={`opt-${strat}`}
                              onClick={() => setSelectedStrategy(strat)}
                              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                selectedStrategy === strat ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">{strat}</span>
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Options</span>
                              </div>
                              <span className="text-[11px] text-gray-500 mt-2">Standard risk management strategy for options trading.</span>
                            </div>
                          ))}

                      {(strategyFilter === 'all' || strategyFilter === 'accumulators') &&
                        accumulatorsStrategies
                          .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((strat) => (
                            <div
                              key={`acc-${strat}`}
                              onClick={() => setSelectedStrategy(strat)}
                              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                selectedStrategy === strat ? 'border-purple-600 bg-purple-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">{strat}</span>
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Accumulators</span>
                              </div>
                              <span className="text-[11px] text-gray-500 mt-2">Tailored progressive risk algorithm for accumulator indices.</span>
                            </div>
                          ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-blue-600 font-semibold uppercase">Selected Template</div>
                          <div className="text-sm font-bold text-gray-900">{selectedStrategy}</div>
                        </div>
                        <button onClick={() => setQuickStrategyStep('template')} className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer">Change</button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700">Initial Stake</label>
                          <input
                            type="number"
                            value={initialStakeInput}
                            onChange={(e) => setInitialStakeInput(parseFloat(e.target.value) || 1)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700">Martingale Factor</label>
                          <input
                            type="number"
                            value={martingaleFactorInput}
                            onChange={(e) => setMartingaleFactorInput(parseFloat(e.target.value) || 2)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700">Max Stake Limit</label>
                          <input
                            type="number"
                            value={maxStakeLimitInput}
                            onChange={(e) => setMaxStakeLimitInput(parseFloat(e.target.value) || 100)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-auto">
                  {quickStrategyStep === 'parameters' ? (
                    <button
                      onClick={() => setQuickStrategyStep('template')}
                      className="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Back
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {quickStrategyStep === 'template' ? (
                    <button
                      disabled={!selectedStrategy}
                      onClick={() => setQuickStrategyStep('parameters')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all ${
                        selectedStrategy ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleLoadStrategyToWorkspace}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
                    >
                      Load Strategy to Workspace
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}