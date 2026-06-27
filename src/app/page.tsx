"use client";

import React, { useState } from 'react';
import { LayoutDashboard, BookOpen, LineChart, BrainCircuit, User, MoreHorizontal } from 'lucide-react';

export default function Home() {
  // State to manage which screen the user is currently seeing
  const [currentView, setCurrentView] = useState('quiz'); // 'quiz' or 'dashboard'
  const [userTier, setUserTier] = useState(''); // 'Catalyst', 'Architect', 'Operator'
  const [quizAnswers, setQuizAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // The "Sorting Hat" Questions
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

  const handleOptionSelect = (points) => {
    const newAnswers = { ...quizAnswers, [currentQuestionIdx]: points };
    setQuizAnswers(newAnswers);

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Calculate final score and assign tier
      let totalScore = 0;
      Object.values(newAnswers).forEach(val => totalScore += Number(val));
      
      let assignedTier = '';
      if (totalScore <= 4) assignedTier = 'Catalyst (Beginner)';
      else if (totalScore <= 7) assignedTier = 'Architect (Intermediate)';
      else assignedTier = 'Operator (Advanced)';
      
      setUserTier(assignedTier);
      setCurrentView('dashboard');
    }
  };

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

  const renderDashboard = () => {
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
              <p className="text-sm font-semibold">{userTier}</p>
            </div>

            <nav className="space-y-2">
              <button className="w-full flex items-center space-x-3 text-left p-3 rounded-lg bg-gray-800 text-white">
                <LayoutDashboard size={20} />
                <span>Command Center</span>
              </button>
              <button className="w-full flex items-center space-x-3 text-left p-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors">
                <BookOpen size={20} />
                <span>Training Modules</span>
              </button>
              <button className="w-full flex items-center space-x-3 text-left p-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors">
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
            <h2 className="text-lg font-medium">Command Center</h2>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Virtual Equity</p>
                <p className="text-sm font-bold text-green-400">$10,000.00</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <User size={18} />
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-900/40 to-[#141414] border border-blue-900/50 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-2">Welcome to your Terminal.</h2>
              <p className="text-gray-400 max-w-2xl">
                Based on your diagnostic, you have been assigned to the <strong>{userTier}</strong> track. 
                Your primary goal is to master risk mechanics before touching live capital.
              </p>
              <button className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Start Module 1
              </button>
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="col-span-2 bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-gray-300">Equity Curve (Simulated)</h3>
                  <MoreHorizontal className="text-gray-500 cursor-pointer" size={20} />
                </div>
                {/* Mock Chart Area */}
                <div className="h-64 border border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-[#111]">
                  <p className="text-gray-500 text-sm">[ TradingView Chart Component will render here later ]</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-300 mb-4">Account Health</h3>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-bold text-green-500">100%</span>
                    <span className="text-xs text-gray-400 mb-1">Optimal</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
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
                    <div className="p-3 bg-[#222] rounded-lg border-l-2 border-blue-500">
                      <p className="text-xs text-gray-400">AI Suggestion</p>
                      <p className="text-sm">Review Module 2.1 on Support Zones before trading.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    );
  };

  return (
    <>
      {currentView === 'quiz' ? renderQuiz() : renderDashboard()}
    </>
  );
}