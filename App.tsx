
import React, { useState, createContext, useContext, useEffect, useCallback, Suspense, lazy, Component, ErrorInfo } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { UserState, MoodEntry, AppRoute } from './types';
import OnboardingName from './pages/OnboardingName';
import OnboardingMBTI from './pages/OnboardingMBTI';
import OnboardingQuiz from './pages/OnboardingQuiz';
import OnboardingAnalysis from './pages/OnboardingAnalysis';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/Chat';
import CalendarPage from './pages/Calendar';
import HistoryPage from './pages/History';
import ReportPage from './pages/ReportPage';
import InsightPage from './pages/Insight';
import ProfilePage from './pages/Profile';
import ImageJournal from './pages/ImageJournal';
import PhotoMoodSelect from './pages/PhotoMoodSelect';
import DailySummary from './pages/DailySummary';
import AnimalCollection from './pages/AnimalCollection';
import WeeklyReflection from './pages/WeeklyReflection'; 
import GrowthSeed from './pages/GrowthSeed'; 
import SeedsList from './pages/SeedsList'; 
import GardenPage from './pages/Garden';
import PhotoWall from './pages/PhotoWall';
import NotFound from './pages/NotFound';
// Lazy load PanicMode components
const PanicMode = lazy(() => import('./pages/PanicMode') as Promise<{ default: React.ComponentType<any> }>);
const PanicReflect = lazy(() => import('./pages/PanicReflect') as Promise<{ default: React.ComponentType<any> }>);

import BottomNav from './components/BottomNav';
import PageTransition from './components/PageTransition';
import { Activity, Heart, X, Sparkles, Unlock, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { translations } from './translations';
import { checkNewUnlocks, AnimalDef } from './services/animalService';

// --- Context Setup ---
interface AppContextType {
  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  currentEntry: Partial<MoodEntry>;
  setCurrentEntry: React.Dispatch<React.SetStateAction<Partial<MoodEntry>>>;
  history: MoodEntry[];
  addToHistory: (entry: MoodEntry) => void;
  updateEntry: (entry: MoodEntry) => void;
  watchConnected: boolean;
  currentHeartRate: number;
  showHRAlert: boolean;
  setShowHRAlert: React.Dispatch<React.SetStateAction<boolean>>;
  /** 开发用：模拟周末以显示每周反思入口 */
  simulateWeekend: boolean;
  setSimulateWeekend: React.Dispatch<React.SetStateAction<boolean>>;
  t: (key: string, params?: Record<string, string>) => string;
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
  /** 本次会话中刚完成（新收获）的种子 ID，进入花园时仅这些花朵播放「从地里冒出」特效 */
  newlyHarvestedIds: string[];
  markNewlyHarvested: (id: string) => void;
  clearNewlyHarvested: (ids?: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// 历史页错误边界：出错时显示提示，避免整页空白
class HistoryErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('History page error:', err, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center font-sans">
          <p className="text-gray-600 mb-4">加载失败，请重试</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-[#2D2D2D] text-white rounded-lg text-sm"
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

/** 根路径守卫：已 onboarding 则重定向到 Dashboard，否则显示姓名页 */
const OnboardingGuard: React.FC = () => {
  const { user } = useAppContext();
  if (user.hasOnboarded) return <Navigate to={AppRoute.DASHBOARD} replace />;
  return <OnboardingName />;
};

// --- Toast UI (paper strip style) ---
const Toast = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="fixed left-1/2 -translate-x-1/2 z-[70] max-w-[90%] px-4 py-3 bg-[#2D2D2D] text-white text-sm font-medium rounded-lg shadow-lg border border-gray-700"
    style={{ bottom: 'calc(6rem + var(--safe-bottom, 0px))' }}
    role="status"
    aria-live="polite"
  >
    {message}
    <button type="button" onClick={onDismiss} className="absolute top-1 right-1.5 text-white/70 hover:text-white p-0.5" aria-label="关闭">
      <X size={14} />
    </button>
  </motion.div>
);

// --- Main App Component ---
const AppContent = ({ newUnlock, clearUnlock }: { newUnlock: AnimalDef | null, clearUnlock: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showHRAlert, setShowHRAlert, user, t, toast, clearToast } = useAppContext();

  const handleAlertClick = () => {
    setShowHRAlert(false);
    // Navigate to Panic Mode
    navigate(AppRoute.PANIC);
  };

  const handleUnlockClick = () => {
      clearUnlock();
      navigate(AppRoute.ANIMAL_COLLECTION);
  };

  // Define routes where BottomNav should be visible
  const showNavRoutes = [
    AppRoute.DASHBOARD, 
    AppRoute.HISTORY, 
    AppRoute.PROFILE,
    AppRoute.SEEDS,
    AppRoute.GARDEN,
    AppRoute.PHOTO_WALL,
    AppRoute.ANIMAL_COLLECTION
  ];
  const shouldShowNav = showNavRoutes.includes(location.pathname as AppRoute);

  // Locked to Chinese ('zh')
  const langKey = 'zh';
  const unlockTitle = t('app.new_guide_title');
  const unlockSubtitle = t('app.discovered');
  
  return (
    <div className="max-w-md mx-auto min-h-[100dvh] h-screen bg-white shadow-2xl overflow-hidden relative flex flex-col">
      
      {/* High Heart Rate Notification Overlay - Sticky Note Style */}
      {showHRAlert && (
        <div 
          onClick={handleAlertClick}
          className="absolute top-24 left-6 right-6 z-50 animate-in slide-in-from-top-4 duration-500 cursor-pointer"
        >
          {/* White Sticky Note Container */}
          <div className="bg-[#FFFDF7] paper-texture shadow-[0_10px_25px_rgba(0,0,0,0.15)] border border-gray-200 p-5 transform -rotate-1 relative group rounded-[2px]">
             
             {/* Washi Tape at top */}
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-red-100/60 tape transform rotate-1 backdrop-blur-sm"></div>
             
             {/* Red Accent Line */}
             <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[#FF6B6B] rounded-r-md"></div>

             <button 
                onClick={(e) => { e.stopPropagation(); setShowHRAlert(false); }}
                className="absolute top-2 right-2 text-gray-400 hover:text-[#2D2D2D] transition-colors p-1"
             >
                <X size={18} />
             </button>

             <div className="flex gap-4 items-center pl-3">
                 <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                    <Activity className="text-[#FF6B6B] animate-pulse" size={24} strokeWidth={2.5} />
                 </div>
                 <div className="flex-1 pr-4">
                    <h3 className="font-bold text-[#2D2D2D] font-sans text-base leading-tight mb-1.5">
                        {t('app.high_hr_title')}
                    </h3>
                    <p className="font-sans text-xs text-gray-500 leading-normal">
                        {t('app.high_hr_body')}
                    </p>
                 </div>
             </div>
          </div>
        </div>
      )}

      {/* Unlock Celebration Overlay */}
      <AnimatePresence>
        {newUnlock && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleUnlockClick}
              className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 cursor-pointer font-sans"
            >
                <motion.div 
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    className="bg-[#FFFDF7] rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl relative overflow-hidden border-[6px] border-white"
                >
                    {/* Background Texture */}
                    <div className="absolute inset-0 paper-texture opacity-50"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Washi Tape */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-8 bg-pink-100/50 tape transform -rotate-1"></div>

                        {/* Tag */}
                        <div className="flex items-center gap-2 mb-6 bg-[#FEF3C7] px-4 py-1.5 shadow-sm text-[#5D4037] text-xs font-bold uppercase tracking-widest transform -rotate-2 border border-[#FFF9C4]">
                            <Sparkles size={14} className="text-yellow-600" /> {unlockTitle}
                        </div>
                        
                        {/* Image Circle */}
                        <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-8 border-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] mb-6 bg-[#FFEBEE] flex items-center justify-center relative">
                             <div className={`absolute inset-0 opacity-20 ${newUnlock.color} blur-xl`}></div>
                            <img src={newUnlock.image} className="w-full h-full object-contain p-4 mix-blend-multiply" alt="Unlock" />
                        </div>
                        
                        <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-2">{unlockSubtitle}</p>
                        <h3 className="text-3xl font-black text-[#2D2D2D] mb-3 font-serif italic tracking-tight">{newUnlock.name[langKey]}</h3>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed px-2 font-medium">{newUnlock.description[langKey]}</p>
                        
                        <button className="bg-[#2D2D2D] text-white px-10 py-4 rounded-full font-bold text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                            <Unlock size={16} /> {t('app.collect')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path={AppRoute.ONBOARDING_NAME} element={<PageTransition><OnboardingGuard /></PageTransition>} />
            <Route path={AppRoute.ONBOARDING_MBTI} element={<PageTransition><OnboardingMBTI /></PageTransition>} />
            <Route path={AppRoute.ONBOARDING_QUIZ} element={<PageTransition><OnboardingQuiz /></PageTransition>} />
            <Route path={AppRoute.ONBOARDING_ANALYSIS} element={<PageTransition><OnboardingAnalysis /></PageTransition>} />
            <Route path={AppRoute.DASHBOARD} element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path={AppRoute.CHAT} element={<PageTransition><ChatPage /></PageTransition>} />
            <Route path={AppRoute.HISTORY} element={<PageTransition><HistoryErrorBoundary><CalendarPage /></HistoryErrorBoundary></PageTransition>} />
            <Route path={AppRoute.REPORT} element={<PageTransition><ReportPage /></PageTransition>} />
            <Route path={AppRoute.INSIGHT} element={<PageTransition><InsightPage /></PageTransition>} />
            <Route path={AppRoute.PROFILE} element={<PageTransition><ProfilePage /></PageTransition>} />
            <Route path={AppRoute.IMAGE_JOURNAL} element={<PageTransition><ImageJournal /></PageTransition>} />
            <Route path={AppRoute.PHOTO_MOOD_SELECT} element={<PageTransition><PhotoMoodSelect /></PageTransition>} />
            <Route path={AppRoute.DAILY_SUMMARY} element={<PageTransition><DailySummary /></PageTransition>} />
            <Route path={AppRoute.TIMELINE} element={<PageTransition><HistoryErrorBoundary><HistoryPage /></HistoryErrorBoundary></PageTransition>} />
            <Route path={AppRoute.ANIMAL_COLLECTION} element={<PageTransition><AnimalCollection /></PageTransition>} />
            <Route path={AppRoute.WEEKLY_REFLECTION} element={<PageTransition><WeeklyReflection /></PageTransition>} />
            {/* New Routes */}
            <Route path={AppRoute.GROWTH_SEED} element={<PageTransition><GrowthSeed /></PageTransition>} />
            <Route path={AppRoute.SEEDS} element={<PageTransition><SeedsList /></PageTransition>} />
            <Route path={AppRoute.GARDEN} element={<PageTransition><GardenPage /></PageTransition>} />
            <Route path={AppRoute.PHOTO_WALL} element={<PageTransition><PhotoWall /></PageTransition>} />
            <Route path={AppRoute.PANIC} element={
                <PageTransition>
                    <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>}>
                        <PanicMode />
                    </Suspense>
                </PageTransition>
            } />
            <Route path={AppRoute.PANIC_REFLECT} element={
                <PageTransition>
                    <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>}>
                        <PanicReflect />
                    </Suspense>
                </PageTransition>
            } />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </div>

      {shouldShowNav && <BottomNav />}

      {/* Global Toast (e.g. offline / API fallback) */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDismiss={clearToast} />}
      </AnimatePresence>
    </div>
  );
};

const App = () => {
  // Initialize from localStorage or defaults, FORCING Chinese language
  const [user, setUser] = useState<UserState>(() => {
    const saved = localStorage.getItem('mirror_user_v1');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed ? {
        ...parsed,
        preferences: {
            ...parsed.preferences,
            language: 'Chinese', // Force override
            maxActiveGoals: [3, 5, 7].includes(parsed.preferences?.maxActiveGoals) ? parsed.preferences.maxActiveGoals : 3
        },
        // Ensure unlockedAnimals exists for migration
        unlockedAnimals: parsed.unlockedAnimals || ['cat'],
        // Ensure pendingFrozenEntry exists
        pendingFrozenEntry: parsed.pendingFrozenEntry || null
    } : { 
      name: '', 
      hasOnboarded: false,
      preferences: { 
        notifications: true,
        aiStyle: 'Empathetic',
        language: 'Chinese', // Force default
        aiEnabled: true,
        maxActiveGoals: 3
      },
      unlockedAnimals: ['cat'],
      pendingFrozenEntry: null
    };
  });

  const [currentEntry, setCurrentEntry] = useState<Partial<MoodEntry>>({});
  const [newUnlock, setNewUnlock] = useState<AnimalDef | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(clearToast, 3200);
  }, [clearToast]);

  // Watch State
  const [watchConnected] = useState(true);
  const [currentHeartRate] = useState(72); // Baseline
  const [showHRAlert, setShowHRAlert] = useState(false);
  const [simulateWeekend, setSimulateWeekend] = useState(false);

  const defaultHistory: MoodEntry[] = [
    {
        id: 'demo-1',
        timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
        moodType: 'Pleasant',
        emotions: ['开心', '感激'],
        intensity: 75,
        note: '午餐很棒。',
        advice: '继续保持这种滋养身心的状态。',
        growthGoal: { text: '花5分钟深呼吸', isCompleted: true }
    }
  ];

  const loadHistory = (): MoodEntry[] => {
    try {
      const raw = localStorage.getItem('mirror_history_v1');
      if (!raw) return defaultHistory;
      const parsed = JSON.parse(raw) as any[];
      if (!Array.isArray(parsed)) return defaultHistory;
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
        growthGoal: item.growthGoal
          ? { ...item.growthGoal, isHarvested: item.growthGoal.isHarvested ?? false }
          : undefined,
      }));
    } catch {
      return defaultHistory;
    }
  };

  const [history, setHistory] = useState<MoodEntry[]>(loadHistory);
  const [newlyHarvestedIds, setNewlyHarvestedIds] = useState<string[]>([]);

  const markNewlyHarvested = useCallback((id: string) => {
    setNewlyHarvestedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const clearNewlyHarvested = useCallback((ids?: string[]) => {
    if (ids && ids.length) setNewlyHarvestedIds(prev => prev.filter(x => !ids.includes(x)));
    else setNewlyHarvestedIds([]);
  }, []);

  // 开发环境：控制台可调用 __MIRROR_SET_HR_ALERT / __MIRROR_SET_WEEKEND（任意页面生效）
  useEffect(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      (window as any).__MIRROR_SET_HR_ALERT = (show: boolean) => setShowHRAlert(!!show);
      (window as any).__MIRROR_SET_WEEKEND = (on: boolean) => setSimulateWeekend(!!on);
      return () => {
        delete (window as any).__MIRROR_SET_HR_ALERT;
        delete (window as any).__MIRROR_SET_WEEKEND;
      };
    }
  }, []);

  // Persist user state to localStorage
  useEffect(() => {
    localStorage.setItem('mirror_user_v1', JSON.stringify(user));
  }, [user]);

  // Persist history to localStorage (critical for production: data survives refresh)
  useEffect(() => {
    try {
      localStorage.setItem('mirror_history_v1', JSON.stringify(history));
    } catch (e) {
      console.warn('[Mirror] History persistence failed (storage full?).', e);
    }
  }, [history]);

  const addToHistory = (entry: MoodEntry) => {
    const newHistory = [entry, ...history];
    setHistory(newHistory);

    // Check for new unlocks based on updated history
    const unlocked = checkNewUnlocks(newHistory, user);
    if (unlocked) {
        setUser(prev => ({
            ...prev,
            unlockedAnimals: [...prev.unlockedAnimals, unlocked.id]
        }));
        setNewUnlock(unlocked);
    }
  };

  const updateEntry = (updatedEntry: MoodEntry) => {
    setHistory(prev => prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry));
  };

  // Translation Helper - Locked to Chinese
  const t = (key: string, params?: Record<string, string>): string => {
    const lang = 'Chinese'; // Hardcoded
    let text = (translations as any)[lang]?.[key] || (translations as any)['Chinese']?.[key] || key;
    
    if (params) {
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
    }
    return text;
  };

  return (
    <AppContext.Provider value={{ user, setUser, currentEntry, setCurrentEntry, history, addToHistory, updateEntry, watchConnected, currentHeartRate, showHRAlert, setShowHRAlert, simulateWeekend, setSimulateWeekend, t, toast, showToast, clearToast, newlyHarvestedIds, markNewlyHarvested, clearNewlyHarvested }}>
      <HashRouter>
        <AppContent newUnlock={newUnlock} clearUnlock={() => setNewUnlock(null)} />
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
