import { useState, useEffect } from 'react';
import {
  Trophy, Gift, Share2, PartyPopper, RefreshCw, X,
  Zap, Star, Crown, Medal, Target, Calendar,
  TrendingUp, Users, Clock, ChevronRight,
  Flame, Coins, Award, Timer, CheckCircle2,
  Copy, ExternalLink, Bell, Settings,
  Activity, BarChart3, Sparkles, Heart,
  Maximize as MaximizeIcon, Minimize as MinimizeIcon
} from 'lucide-react';
import WelcomeTab from './WelcomeTab';

export default function CoreCreditsDashboard({ onClose }) {
  const [activeTab, setActiveTab] = useState(() => {
    const seen = localStorage.getItem('hasSeenWelcome');
    return seen ? 'WelcomeTab' : 'WelcomeTab';
  });

  const [isMaximized, setIsMaximized] = useState(false);

  const [userStats, setUserStats] = useState({
    totalCredits: 15750,
    dailyEarned: 240,
    weeklyRank: 15,
    streak: 7,
    level: 12,
    xp: 2340,
    nextLevelXp: 3000
  });

  const [notifications, setNotifications] = useState([
    { id: 1, type: 'achievement', message: 'You earned the "Hot Streak" badge!', time: '2m ago', read: false },
    { id: 2, type: 'reward', message: 'Daily bonus: +50 Cr claimed', time: '1h ago', read: false },
    { id: 3, type: 'event', message: 'New event: Mega Monday started!', time: '3h ago', read: true }
  ]);

  useEffect(() => {
  // Prevent background scroll
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = '';
  };
}, []);


  const tabButtonClasses = (tab) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
      activeTab === tab 
        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105' 
        : 'bg-white/80 text-gray-700 hover:bg-orange-100 hover:scale-102 border border-gray-200'
    }`;

  return (
    <div className={`fixed inset-0 z-[9999] ${isMaximized ? 'bg-pink/90 dark:bg-slate-900/90' : 'bg-black/80 backdrop-blur-sm'} overflow-y-auto`}>
      <div className={`${isMaximized ? 'min-h-screen w-full' : 'max-w-6xl max-h-[90vh]'} mx-auto bg-gradient-to-br from-pink via-white-50 to-red-50 rounded-2xl shadow-2xl flex flex-col`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Coins className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Core Credits Dashboard</h2>
                <p className="text-orange-100">Level {userStats.level} • {userStats.totalCredits.toLocaleString()} Cr</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              {/* Maximize Button */}
              <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title={isMaximized ? 'Minimize' : 'Maximize'}>
                {isMaximized ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
              </button>
              {/* Close Button only in panel mode */}
              {!isMaximized && (
                <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-4 relative">
            <div className="bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${(userStats.xp / userStats.nextLevelXp) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-orange-100 mt-1">
              <span>{userStats.xp} XP</span>
              <span>Next Level: {userStats.nextLevelXp} XP</span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-orange-100 bg-white/80">
          <button className={tabButtonClasses('welcome')} onClick={() => setActiveTab('welcome')}>
            <Sparkles className="w-4 h-4" /> Welcome
          </button>
          <button className={tabButtonClasses('dashboard')} onClick={() => setActiveTab('dashboard')}>
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
          <button className={tabButtonClasses('leaderboard')} onClick={() => setActiveTab('leaderboard')}>
            <Trophy className="w-4 h-4" /> Leaderboard
          </button>
          <button className={tabButtonClasses('events')} onClick={() => setActiveTab('events')}>
            <PartyPopper className="w-4 h-4" /> Events
          </button>
          <button className={tabButtonClasses('challenges')} onClick={() => setActiveTab('challenges')}>
            <Target className="w-4 h-4" /> Challenges
          </button>
          <button className={tabButtonClasses('referrals')} onClick={() => setActiveTab('referrals')}>
            <Share2 className="w-4 h-4" /> Referrals
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'welcome' && <WelcomeTab onComplete={() => setActiveTab('WelcomeTab')} />}
          {/* Other tabs to be added here */}
        </div>
      </div>
    </div>
  );
}
