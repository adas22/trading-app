"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, LineChart, BrainCircuit, User, MoreHorizontal, Cloud, CloudOff, Lock, PlayCircle, CheckCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- TS DECLARATIONS FOR SANDBOX ENV ---
declare global {
  var __firebase_config: string | undefined;
  var __app_id: string | undefined;
  var __initial_auth_token: string | undefined;
}

// --- FIREBASE INIT (SMART WRAPPER) ---
// This safely initializes the backend without crashing your local app before you have your own API keys.
let app: any, auth: any, db: any, appId: string;
const isCloudEnabled = typeof __firebase_config !== 'undefined';

if (isCloudEnabled) {
  try {
    const firebaseConfig = JSON.parse(__firebase_config!);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof __app_id !== 'undefined' ? __app_id! : 'default-app-id';
  } catch (e) {
    console.error("Cloud init bypassed for local dev.", e);
  }
}

// --- MOCK CHART DATA ---
const sampleData = [
  { time: '2023-10-02', open: 150.12, high: 152.45, low: 149.20, close: 151.05 },
  { time: '2023-10-03', open: 151.10, high: 154.20, low: 150.50, close: 153.80 },
  { time: '2023-10-04', open: 153.50, high: 155.10, low: 152.80, close: 154.50 },
  { time: '2023-10-05', open: 154.20, high: 154.80, low: 151.10, close: 151.50 },
  { time: '2023-10-06', open: 151.80, high: 153.20, low: 149.90, close: 152.10 },
  { time: '2023-10-09', open: 152.00, high: 156.00, low: 151.50, close: 155.80 },
  { time: '2023-10-10', open: 155.90, high: 158.20, low: 154.80, close: 157.20 },
  { time: '2023-10-11', open: 157.50, high: 159.10, low: 156.20, close: 158.90 },
  { time: '2023-10-12', open: 159.00, high: 159.50, low: 156.50, close: 157.10 },
  { time: '2023-10-13', open: 157.00, high: 158.00, low: 154.50, close: 155.20 },
];

// --- CUSTOM SVG CANDLESTICK CHART COMPONENT ---
const TradingChart = () => {
  const minLow = Math.min(...sampleData.map(d => d.low)) - 2;
  const maxHigh = Math.max(...sampleData.map(d => d.high)) + 2;
  const range = maxHigh - minLow;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-[#111111] p-4 relative flex flex-col justify-center">
      <svg width="100%" height="90%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
        <line x1="0" y1="25" x2="100" y2="25" stroke="#333333" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#333333" strokeWidth="0.5" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#333333" strokeWidth="0.5" />

        {sampleData.map((data, idx) => {
          const x = (idx / (sampleData.length - 1)) * 90 + 5; 
          const isUp = data.close >= data.open;
          const color = isUp ? '#22c55e' : '#ef4444';
          const yHigh = 100 - ((data.high - minLow) / range) * 100;
          const yLow = 100 - ((data.low - minLow) / range) * 100;
          const yOpen = 100 - ((data.open - minLow) / range) * 100;
          const yClose = 100 - ((data.close - minLow) / range) * 100;
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(Math.abs(yOpen - yClose), 0.5);

          return (
            <g key={idx} className="hover:opacity-80 transition-opacity cursor-pointer">
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="0.5" />
              <rect x={x - 1.5} y={bodyTop} width="3" height={bodyHeight} fill={color} />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between w-full text-[10px] text-gray-500 mt-2 px-2">
        <span>Oct 02</span>
        <span>Oct 06</span>
        <span>Oct 13</span>
      </div>
    </div>
  );
};

export default function Home() {
  // Navigation & User State
  const [currentView, setCurrentView] = useState('quiz');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userTier, setUserTier] = useState(''); 
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Gamification & Backend State
  const [equity, setEquity] = useState(10000);
  const [health, setHealth] = useState(100);
  const [dbUser, setDbUser] = useState<FirebaseUser | null>(null);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'offline', 'syncing', 'saved'

  // Module State
  const [selectedModule, setSelectedModule] = useState<any | null>(null);

  // Simulation State
  const [simState, setSimState] = useState('decision');
  const [simFeedback, setSimFeedback] = useState({ title: '', text: '', color: '' });

  // --- 1. AUTHENTICATION (Connect to Cloud) ---
  useEffect(() => {
    if (!isCloudEnabled || !auth) return;
    
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setDbUser);
    return () => unsubscribe();
  }, []);

  // --- 2. DATA FETCHING (Load Saved Progress) ---
  useEffect(() => {
    if (isCloudEnabled && dbUser && db) {
      setSyncStatus('syncing');
      const docRef = doc(db, 'artifacts', appId, 'users', dbUser.uid, 'profile', 'stats');
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.tier) {
            setUserTier(data.tier);
            setCurrentView('app'); // Skip quiz if they already have a tier
          }
          if (data.equity !== undefined) setEquity(data.equity);
          if (data.health !== undefined) setHealth(data.health);
          setSyncStatus('saved');
        } else {
          setSyncStatus('saved');
        }
      }, (error) => {
        console.error("Snapshot error:", error);
        setSyncStatus('offline');
      });

      return () => unsubscribe();
    } else if (!isCloudEnabled) {
      // FALLBACK FOR LOCAL TESTING: Load from browser storage
      const savedData = localStorage.getItem('atlas_user_data');
      if (savedData) {
        const data = JSON.parse(savedData);
        if (data.tier) {
          setUserTier(data.tier);
          setCurrentView('app');
        }
        if (data.equity !== undefined) setEquity(data.equity);
        if (data.health !== undefined) setHealth(data.health);
        setSyncStatus('saved (local)');
      }
    }
  }, [dbUser]);

  // --- 3. DATA SAVING (Update Cloud on actions) ---
  const saveToCloud = async (dataToSave: any) => {
    setSyncStatus('syncing');
    
    if (isCloudEnabled && dbUser && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', dbUser.uid, 'profile', 'stats');
        await setDoc(docRef, dataToSave, { merge: true });
        setSyncStatus('saved');
      } catch (e) {
        console.error("Save error:", e);
        setSyncStatus('offline');
      }
    } else {
      // FALLBACK FOR LOCAL TESTING: Save to browser storage
      setTimeout(() => {
        const existingData = JSON.parse(localStorage.getItem('atlas_user_data') || '{}');
        const newData = { ...existingData, ...dataToSave };
        localStorage.setItem('atlas_user_data', JSON.stringify(newData));
        setSyncStatus('saved (local)');
      }, 300); // Fake a tiny network delay for the UI icon
    }
  };


  const questions = [
    {
      id: 1,
      text: "If a stock you hold drops 15% on no news, what is your immediate instinct?",
      options: [
        { label: "Panic sell to stop the bleeding.", points: 1 },
        { label: "Wait for the end of the day to review the chart.", points: 2 },
        { label: "Check if my stop-loss hit or if it's a liquidity grab.", points: 3 }
      ]
    },
    {
      id: 2,
      text: "How much time can you dedicate to the market per day?",
      options: [
        { label: "I want to get rich quick, so a few minutes.", points: 1 },
        { label: "About 30-60 minutes after work.", points: 2 },
        { label: "I can watch the screen during the morning open.", points: 3 }
      ]
    },
    {
      id: 3,
      text: "How do you calculate your position size?",
      options: [
        { label: "I just buy as many shares as I can afford.", points: 1 },
        { label: "I invest a fixed dollar amount every month.", points: 2 },
        { label: "I calculate 1% of my total equity based on my stop-loss distance.", points: 3 }
      ]
    }
  ];

  const handleOptionSelect = (points: number) => {
    const newAnswers = { ...quizAnswers, [currentQuestionIdx]: points };
    setQuizAnswers(newAnswers);

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      let totalScore = 0;
      Object.values(newAnswers).forEach(val => totalScore += Number(val));
      
      let assignedTier = '';
      if (totalScore <= 4) assignedTier = 'Catalyst (Beginner)';
      else if (totalScore <= 7) assignedTier = 'Architect (Intermediate)';
      else assignedTier = 'Operator (Advanced)';
      
      setUserTier(assignedTier);
      setCurrentView('app');
      
      // Save initial state to cloud
      saveToCloud({ tier: assignedTier, equity: 10000, health: 100 });
    }
  };

  const handleSimDecision = (action: string) => {
    setSimState('result');
    let newEquity = equity;
    let newHealth = health;

    if (action === 'buy') {
      newEquity = equity - 450;
      newHealth = Math.max(0, health - 15);
      setSimFeedback({
        title: "Trap Triggered. (-$450)",
        text: "You bought into a liquidity grab at a major resistance zone. The institutions dumped their shares on you, and price reversed immediately. Poor risk management.",
        color: "text-red-500 border-red-500 bg-red-900/20"
      });
    } else if (action === 'short') {
      newEquity = equity - 800;
      newHealth = Math.max(0, health - 25);
      setSimFeedback({
        title: "Squeezed. (-$800)",
        text: "You shorted the absolute bottom of a support bounce. The gap-down was a fake-out designed to trap early shorts. You got squeezed out.",
        color: "text-red-500 border-red-500 bg-red-900/20"
      });
    } else if (action === 'pass') {
      newHealth = Math.min(100, health + 5);
      setSimFeedback({
        title: "Discipline Rewarded. (Capital Preserved)",
        text: "Excellent. The chart was erratic with massive opposing volume. Sometimes the best trade is no trade. You preserved capital and gained discipline.",
        color: "text-green-500 border-green-500 bg-green-900/20"
      });
    }

    setEquity(newEquity);
    setHealth(newHealth);
    
    // Save simulation results to cloud
    saveToCloud({ equity: newEquity, health: newHealth });
  };

  const resetSimulation = () => {
    setSimState('decision');
  };

  const courseModules = [
    {
      id: '1.1',
      tier: 'Catalyst',
      title: 'Market Anatomy & Order Mechanics',
      description: 'Understanding the Bid-Ask spread, limit orders, and how price actually moves.',
      status: 'completed', // completed, active, locked
      time: '5 min'
    },
    {
      id: '1.2',
      tier: 'Catalyst',
      title: 'Introduction to Charts',
      description: 'Candlestick anatomy, market states (trends vs ranging), and volume confirmation.',
      status: 'active',
      time: '8 min'
    },
    {
      id: '2.1',
      tier: 'Architect',
      title: 'Advanced Confluence',
      description: 'Dynamic Support & Resistance using SMAs and EMAs.',
      status: 'locked',
      time: '12 min'
    }
  ];

  const renderQuiz = () => {
    const q = questions[currentQuestionIdx];
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-2">
              Onboarding Diagnostic
            </h2>
            <h1 className="text-2xl font-semibold mb-2">Question {currentQuestionIdx + 1} of {questions.length}</h1>
            <div className="w-full bg-gray-800 h-2 rounded-full mt-4">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestionIdx) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <h3 className="text-xl mb-6">{q.text}</h3>
          
          <div className="space-y-3">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(opt.points)}
                className="w-full text-left p-4 rounded-xl border border-gray-700 bg-[#222] hover:bg-blue-600 hover:border-blue-500 transition-all duration-200"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMainApp = () => {
    return (
      <div className="min-h-screen flex bg-[#0f0f0f] text-gray-100 font-sans">
        
        {/* Sidebar */}
        <aside className="w-64 bg-[#141414] border-r border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold tracking-wider text-white">ATLAS<span className="text-blue-500">.AI</span></h1>
            <p className="text-xs text-gray-400 mt-1">Trading Survival Engine</p>
          </div>
          
          <div className="p-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-400 uppercase font-bold">Current Tier</p>
              <p className="text-sm font-semibold">{userTier || 'Loading...'}</p>
            </div>

            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center space-x-3 text-left p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
              >
                <LayoutDashboard size={20} />
                <span>Command Center</span>
              </button>
              <button 
                onClick={() => { setActiveTab('modules'); setSelectedModule(null); }}
                className={`w-full flex items-center space-x-3 text-left p-3 rounded-lg transition-colors ${activeTab === 'modules' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
              >
                <BookOpen size={20} />
                <span>Training Modules</span>
              </button>
              <button 
                onClick={() => setActiveTab('simulations')}
                className={`w-full flex items-center space-x-3 text-left p-3 rounded-lg transition-colors ${activeTab === 'simulations' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
              >
                <LineChart size={20} />
                <span>Simulations</span>
              </button>
              <button className="w-full flex items-center space-x-3 text-left p-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors">
                <BrainCircuit size={20} />
                <span>Journal & Stats</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#141414]">
            <h2 className="text-lg font-medium">
              {activeTab === 'dashboard' ? 'Command Center' : activeTab === 'modules' ? 'Training Academy' : 'Active Simulation'}
            </h2>
            <div className="flex items-center space-x-6">
              
              {/* Sync Status Indicator */}
              <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                {syncStatus === 'saved' && <Cloud size={14} className="text-green-500" />}
                {syncStatus === 'syncing' && <Cloud size={14} className="text-yellow-500 animate-pulse" />}
                {syncStatus === 'offline' && <CloudOff size={14} className="text-gray-500" />}
                {syncStatus === 'saved (local)' && <Cloud size={14} className="text-blue-500" />}
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{syncStatus}</span>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-400">Virtual Equity</p>
                <p className={`text-sm font-bold ${equity < 10000 ? 'text-red-400' : 'text-green-400'}`}>
                  ${equity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Acct Health</p>
                <p className={`text-sm font-bold ${health < 50 ? 'text-red-400' : health < 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {health}%
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <User size={18} />
              </div>
            </div>
          </header>

          {/* Dynamic Content (Dashboard OR Simulation) */}
          <div className="flex-1 p-8 overflow-y-auto">
            
            {activeTab === 'dashboard' && (
              <>
                <div className="bg-gradient-to-r from-blue-900/40 to-[#141414] border border-blue-900/50 rounded-2xl p-8 mb-8">
                  <h2 className="text-2xl font-bold mb-2">Welcome to your Terminal.</h2>
                  <p className="text-gray-400 max-w-2xl">
                    Based on your diagnostic, you have been assigned to the <strong>{userTier}</strong> track. 
                    Your primary goal is to master risk mechanics before touching live capital.
                  </p>
                  <button 
                    onClick={() => setActiveTab('simulations')}
                    className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Start First Simulation
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-2 bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-semibold text-gray-300">Equity Curve (Simulated)</h3>
                      <MoreHorizontal className="text-gray-500 cursor-pointer" size={20} />
                    </div>
                    <div className="h-64 rounded-xl flex-1 items-center justify-center bg-[#111]">
                      <TradingChart />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                      <h3 className="font-semibold text-gray-300 mb-4">Account Health</h3>
                      <div className="flex justify-between items-end mb-2">
                        <span className={`text-3xl font-bold ${health < 50 ? 'text-red-500' : health < 80 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {health}%
                        </span>
                        <span className="text-xs text-gray-400 mb-1">Optimal</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${health < 50 ? 'bg-red-500' : health < 80 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                          style={{ width: `${health}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        Your discipline score drops if you violate position sizing rules.
                      </p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                      <h3 className="font-semibold text-gray-300 mb-4">Daily Briefing</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-[#222] rounded-lg border-l-2 border-red-500">
                          <p className="text-xs text-gray-400">Macro Event</p>
                          <p className="text-sm">CPI Data releases at 8:30 AM. Expect high volatility.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'modules' && (
              <div className="max-w-5xl mx-auto h-full flex flex-col">
                {!selectedModule ? (
                  <>
                    <div className="mb-8">
                      <h1 className="text-3xl font-bold mb-2">The L.S.S. Curriculum</h1>
                      <p className="text-gray-400">Master the mechanics before touching live capital. Complete modules to unlock advanced simulations.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {courseModules.map((mod) => (
                        <div 
                          key={mod.id} 
                          className={`relative border rounded-2xl p-6 transition-all ${mod.status === 'locked' ? 'bg-[#141414] border-gray-800 opacity-60' : 'bg-[#1a1a1a] border-gray-700 hover:border-blue-500 cursor-pointer'}`}
                          onClick={() => mod.status !== 'locked' && setSelectedModule(mod)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500">{mod.tier} • Module {mod.id}</span>
                            {mod.status === 'completed' && <CheckCircle size={18} className="text-green-500" />}
                            {mod.status === 'locked' && <Lock size={18} className="text-gray-600" />}
                            {mod.status === 'active' && <PlayCircle size={18} className="text-blue-500" />}
                          </div>
                          <h3 className="text-xl font-bold mb-2 text-gray-100">{mod.title}</h3>
                          <p className="text-sm text-gray-400 mb-4">{mod.description}</p>
                          <div className="flex items-center text-xs text-gray-500 font-medium">
                            <span>Est. Time: {mod.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#141414]">
                      <div>
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Module {selectedModule.id}</span>
                        <h2 className="text-2xl font-bold">{selectedModule.title}</h2>
                      </div>
                      <button onClick={() => setSelectedModule(null)} className="text-sm text-gray-400 hover:text-white transition-colors">Close X</button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto flex-1">
                      <div className="max-w-3xl mx-auto space-y-8">
                        <section>
                          <h3 className="text-xl font-bold text-gray-300 mb-3 border-l-4 border-blue-500 pl-3">L - Learn</h3>
                          <p className="text-gray-400 leading-relaxed text-lg">
                            {selectedModule.title === 'Introduction to Charts' 
                              ? "A candlestick tells you the story of a specific timeframe. The wick represents where price went, but was rejected. The body represents where price successfully closed. High volume on a large body candle indicates institutional participation."
                              : "This is the foundational learning material. In the real app, this will be populated with rich text, AI-generated explanations, and video content tailored to the exact user's tier and learning speed."}
                          </p>
                        </section>
                        
                        <section>
                          <h3 className="text-xl font-bold text-gray-300 mb-3 border-l-4 border-green-500 pl-3">S - Simulate</h3>
                          <p className="text-gray-400 leading-relaxed mb-4">
                            Theory is useless without execution. It's time to test your recognition of this pattern in a risk-free environment.
                          </p>
                          <button 
                            onClick={() => setActiveTab('simulations')}
                            className="bg-green-600/20 text-green-500 border border-green-500/50 hover:bg-green-600/30 px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
                          >
                            <LineChart size={18} />
                            <span>Jump to Simulation</span>
                          </button>
                        </section>

                        <section>
                          <h3 className="text-xl font-bold text-gray-300 mb-3 border-l-4 border-purple-500 pl-3">S - Shadow (Live Market)</h3>
                          <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                            <p className="text-sm text-purple-300 font-bold tracking-widest uppercase mb-1">AI Market Insight:</p>
                            <p className="text-gray-300 text-sm">
                              "Right now, TSLA is approaching a major support zone similar to what we just discussed. I have added it to your daily watchlist on the dashboard."
                            </p>
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'simulations' && (
              <div className="max-w-4xl mx-auto flex flex-col h-full">
                <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-1">
                      Scenario 01
                    </h2>
                    <h1 className="text-2xl font-semibold">The Gap Down Trap</h1>
                  </div>
                  <span className="px-3 py-1 bg-gray-800 text-xs rounded-md">Timeframe: 15m</span>
                </div>
                
                {/* Chart Container */}
                <div className="h-72 w-full bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4 mb-6 relative">
                  <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-[#1a1a1a] to-transparent z-10 pointer-events-none flex items-center justify-end pr-8">
                     <span className="text-gray-500 text-sm opacity-50 bg-black px-2 py-1 rounded">Future Price Action Hidden</span>
                  </div>
                  <TradingChart />
                </div>

                {/* Interactive Area */}
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 flex-1">
                  
                  {simState === 'decision' ? (
                    <>
                      <p className="text-lg text-gray-300 mb-6 border-l-4 border-blue-500 pl-4">
                        "The market opened with a 2% gap down on CPI news. It immediately rallied back to yesterday's close, printed a massive rejection wick, and is now dropping fast on high volume. What is your play?"
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => handleSimDecision('buy')} className="p-4 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl font-bold transition-all flex flex-col items-center">
                          <span className="text-xl mb-1">Buy Calls</span>
                          <span className="text-xs font-normal opacity-70">Play the reversal</span>
                        </button>
                        <button onClick={() => handleSimDecision('short')} className="p-4 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition-all flex flex-col items-center">
                          <span className="text-xl mb-1">Buy Puts / Short</span>
                          <span className="text-xs font-normal opacity-70">Ride the momentum</span>
                        </button>
                        <button onClick={() => handleSimDecision('pass')} className="p-4 border border-gray-600 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all flex flex-col items-center">
                          <span className="text-xl mb-1">Pass / Wait</span>
                          <span className="text-xs font-normal opacity-70">Protect capital</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={`p-6 border rounded-xl ${simFeedback.color}`}>
                      <h3 className="text-xl font-bold mb-2">{simFeedback.title}</h3>
                      <p className="text-sm opacity-90 mb-6">{simFeedback.text}</p>
                      
                      <div className="flex space-x-4">
                        <button onClick={resetSimulation} className="px-6 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 hover:bg-gray-800">
                          Try Next Scenario
                        </button>
                        <button onClick={() => setActiveTab('dashboard')} className="px-6 py-2 bg-transparent text-gray-400 hover:text-white">
                          Back to Dashboard
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    );
  };

  return (
    <>
      {currentView === 'quiz' ? renderQuiz() : renderMainApp()}
    </>
  );
}