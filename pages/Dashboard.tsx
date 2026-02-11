
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { AppRoute, MOOD_HEX_CODES } from '../types';
import BlobBackground from '../components/BlobBackground';
import { formatSeedDisplay } from '../utils/seedDisplay';
import { Activity, ArrowUpRight, Camera, BarChart2, LayoutTemplate, X, Pin, Sun, Moon, Wrench, Check, Plus, Flower2, Sprout, Cat, Paperclip, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 弹窗内用纯 SVG 绘图，避免 Recharts 长时间挂载导致白屏
const SVG_CHART = { w: 360, h: 260, pad: { l: 44, r: 12, t: 16, b: 32 } };

function useDetailChartPaths(chartData: { time: string; value: number; mood: string }[]) {
  return useMemo(() => {
    if (chartData.length === 0) return { areaPath: '', linePath: '', points: [] as { x: number; y: number }[] };
    const { w, h, pad } = SVG_CHART;
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const n = chartData.length;
    const points = chartData.map((d, i) => {
      const x = pad.l + (n === 1 ? cw / 2 : (i / (n - 1)) * cw);
      const y = pad.t + (1 - d.value / 100) * ch;
      return { x, y, ...d };
    });
    const areaPath = points.length
      ? `M ${pad.l} ${pad.t + ch} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${pad.t + ch} Z`
      : '';
    const linePath = points.length ? `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}` : '';
    return { areaPath, linePath, points };
  }, [chartData]);
}

const Dashboard: React.FC = () => {
  const { history, user, watchConnected, setShowHRAlert, t, updateEntry, markNewlyHarvested } = useAppContext();
  const navigate = useNavigate();
  const [showDetailChart, setShowDetailChart] = useState(false);
  const [simulateWeekend, setSimulateWeekend] = useState(false);
  /** 刚完成、正在播放动画的条目 id，动画结束后移除此集合并隐藏 */
  const [showingCompletedIds, setShowingCompletedIds] = useState<Set<string>>(new Set());
  const isWeekend = [0, 6].includes(new Date().getDay()); // Sun(0) / Sat(6)
  const showWeeklyReflection = simulateWeekend || isWeekend;
  
  const hasReflectionData = history.length > 0;
  const pendingFrozenEntry = user.pendingFrozenEntry;

  const activeSeeds = useMemo(() => {
      return history
          .filter(h => h.growthGoal && !h.growthGoal.isHarvested && !h.growthGoal.isCompleted)
          .slice(0, 3);
  }, [history]);

  /** 用于展示的种子：进行中 + 刚完成尚在播动画的 */
  const displaySeeds = useMemo(() => {
      const withCompleted = history
          .filter(h => h.growthGoal && !h.growthGoal.isHarvested)
          .filter(h => !h.growthGoal?.isCompleted || showingCompletedIds.has(h.id))
          .sort((a, b) => (a.growthGoal?.isCompleted ? 1 : 0) - (b.growthGoal?.isCompleted ? 1 : 0));
      return withCompleted.slice(0, 5);
  }, [history, showingCompletedIds]);

  const toggleSeed = (e: React.MouseEvent, entry: any) => {
      e.stopPropagation();
      if (!entry.growthGoal) return;
      
      const isCompleting = !entry.growthGoal.isCompleted;
      const updatedEntry = {
          ...entry,
          growthGoal: {
              ...entry.growthGoal,
              isCompleted: isCompleting
          }
      };
      updateEntry(updatedEntry);
      if (isCompleting) {
        markNewlyHarvested?.(entry.id);
        setShowingCompletedIds(prev => new Set(prev).add(entry.id));
      }
  };

  const getMoodValue = (mood: string) => {
      switch(mood) {
          case 'Thrilled': return 100;
          case 'Pleasant': return 75;
          case 'Calm': return 50;
          case 'Stressful': return 25;
          case 'Irritating': return 0;
          default: return 50;
      }
   };

  const chartData = useMemo(() => {
    const today = new Date();
    const todaysEntries = history
        .filter(entry => {
            const d = new Date(entry.timestamp);
            return !isNaN(d.getTime()) &&
                   d.getDate() === today.getDate() &&
                   d.getMonth() === today.getMonth() &&
                   d.getFullYear() === today.getFullYear();
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (todaysEntries.length === 0) return [];

    return todaysEntries.map(e => ({
        time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: getMoodValue(e.moodType),
        mood: e.moodType,
        note: e.note || e.cause || '',
    }));
  }, [history]);

  const todayEntries = useMemo(() => {
    const today = new Date();
    return history.filter(entry => {
      const d = new Date(entry.timestamp);
      return !isNaN(d.getTime()) &&
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    });
  }, [history]);
  const sparklinePoints = useMemo(() => {
    if (chartData.length === 0) return ""; 
    if (chartData.length === 1) {
        const val = 100 - ((chartData[0].value / 100) * 100); 
        return `0,${val} 100,${val}`;
    }
    return chartData.map((entry, index, arr) => {
        const x = (index / (arr.length - 1)) * 100;
        const y = 100 - entry.value; 
        return `${x},${y}`;
    }).join(' ');
  }, [chartData]);

  /** 生成折线路径，无数据时返回空 */
  const sparklinePath = useMemo(() => {
    if (chartData.length === 0 || !sparklinePoints) return '';
    const pts = sparklinePoints.split(' ').map(s => s.split(',').map(Number) as [number, number]);
    if (pts.length === 1) return `M 0 ${pts[0][1]} L 100 ${pts[0][1]}`;
    return pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  }, [chartData, sparklinePoints]);

  const sparklineAreaPath = useMemo(() => {
    if (chartData.length === 0 || !sparklinePath) return '';
    const pts = sparklinePoints.split(' ').map(s => s.split(',').map(Number));
    const [x0, y0] = pts[0];
    const lastY = pts[pts.length - 1][1];
    const curveRest = sparklinePath.replace(/^M\s*[\d.]+\s*[\d.]+\s*/, '').trim();
    return `M0,100 L0,${y0} L${x0},${y0} ${curveRest} L100,${lastY} L100,100 Z`;
  }, [sparklinePath, sparklinePoints, chartData.length]);

  const { areaPath, linePath, points } = useDetailChartPaths(chartData);

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return t('dashboard.morning');
      if (hour < 18) return t('dashboard.afternoon');
      return t('dashboard.evening');
  };

  return (
    <BlobBackground>
      <div className="flex flex-col h-full min-h-0 overflow-y-auto font-sans no-scrollbar relative">
        
        {/* --- Header (Handwritten Title on Page) --- */}
        <div className="px-6 pt-12 pb-4 flex items-start justify-between z-20">
            <div className="relative">
                {/* Visual Underline/Highlight */}
                <div className="absolute -bottom-1 left-0 w-full h-3 bg-yellow-200/50 -rotate-1 rounded-sm"></div>
                <h2 className="text-3xl font-black text-[#2D2D2D] leading-none relative z-10">
                    {getGreeting()}, <br/>
                    <span className="text-2xl font-serif italic">{user.name || 'Friend'}</span>
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 ml-1">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
            </div>

            <div className="flex flex-col items-end gap-3">
                 {/* Animal Collection Entrance */}
                 <button
                    onClick={() => navigate(AppRoute.ANIMAL_COLLECTION)}
                    className="w-11 h-11 bg-white rounded-full shadow-md border-[3px] border-white flex items-center justify-center text-[#2D2D2D] hover:text-[#FF6B6B] hover:scale-105 transition-all transform rotate-6 z-30"
                    title={t('animal.collection_title')}
                >
                    <Cat size={20} strokeWidth={2.5} />
                </button>

                {/* Watch Status Sticker */}
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 paper-card transform rotate-2 border border-gray-200 rounded-md
                    ${watchConnected ? 'text-[#2D2D2D]' : 'text-gray-400'}
                `}>
                    <Activity size={14} className={watchConnected ? "text-[#FF6B6B]" : ""} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold">Sync</span>
                </div>
            </div>
        </div>

        <div className="px-6 pt-4 flex-1 flex flex-col gap-10 pb-nav">
            
            {/* --- FROZEN MOMENT WIDGET (Pending Panic Entry) --- */}
            <AnimatePresence>
                {pendingFrozenEntry && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => navigate(AppRoute.PANIC_REFLECT)}
                        className="w-full relative cursor-pointer z-30 group"
                    >
                        {/* Paperclip */}
                        <div className="absolute -top-4 left-6 text-gray-400 transform -rotate-12 z-40 drop-shadow-sm">
                             <Paperclip size={32} strokeWidth={2.5} />
                        </div>

                        {/* Note Card */}
                        <div className="bg-[#EFF6FF] border border-blue-100 p-4 shadow-lg transform rotate-1 group-hover:rotate-0 transition-transform duration-300 rounded-sm relative overflow-hidden">
                            {/* Texture */}
                            <div className="absolute inset-0 paper-texture opacity-50 mix-blend-multiply"></div>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-200/20 to-transparent"></div>

                            <div className="flex gap-4 items-center relative z-10">
                                {/* Thumbnail */}
                                <div className="w-16 h-16 bg-gray-200 border-4 border-white shadow-sm transform -rotate-2 group-hover:rotate-0 transition-transform">
                                     <img src={pendingFrozenEntry.image} className="w-full h-full object-cover grayscale-[30%] opacity-80" alt="Frozen" />
                                     <div className="absolute inset-0 bg-blue-500/20 mix-blend-overlay"></div>
                                </div>
                                
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-blue-900">{t('dashboard.frozen_moment')}</h3>
                                    <p className="text-xs text-blue-800/60 font-medium uppercase tracking-widest">{t('dashboard.thaw_moment')}</p>
                                </div>

                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- TOP: STICKY NOTE (Scrapbook Style with Blooming Effect) --- */}
            <div 
                onClick={() => navigate(AppRoute.SEEDS)}
                className="w-full relative cursor-pointer group hover:-translate-y-1 transition-transform duration-300"
            >
                {/* Yellow Paper Scrap */}
                <div 
                    className="bg-[#FEF3C7] paper-texture shadow-md p-6 relative z-10 transform -rotate-1 hover:rotate-0 transition-transform duration-300 border-none rounded-sm" 
                    style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 98%, 95% 100%, 0% 100%)" }} 
                >
                    {/* Washi Tape */}
                    <div className="tape tape-yellow w-24 -top-3 left-1/2 -translate-x-1/2 transform -rotate-2"></div>
                    
                    <div className="flex justify-between items-start mb-4 border-b border-yellow-800/10 pb-2">
                        <span className="text-xs font-black text-yellow-900/60 uppercase tracking-widest flex items-center gap-2">
                            <Pin size={14} className="fill-yellow-800/40" /> {t('growth.title')}
                        </span>
                        <Plus size={16} className="text-yellow-800/40" />
                    </div>

                    {displaySeeds.length > 0 ? (
                        <ul className="flex flex-col gap-3">
                            <AnimatePresence>
                                {displaySeeds.map((entry) => {
                                     const isDone = entry.growthGoal?.isCompleted;
                                     return (
                                        <motion.li 
                                            key={entry.id}
                                            layout
                                            initial={false}
                                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                            className="flex items-center gap-3 text-[#451a03] group/item"
                                            onClick={(e) => toggleSeed(e, entry)}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                {isDone ? (
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -45 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                        onAnimationComplete={() => setShowingCompletedIds(prev => { const next = new Set(prev); next.delete(entry.id); return next; })}
                                                    >
                                                        <Flower2 size={20} className="text-pink-500 drop-shadow-sm" fill="#fbcfe8" strokeWidth={1.5} />
                                                    </motion.div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-yellow-800/20 flex items-center justify-center bg-white/40">
                                                        <Sprout size={10} className="text-yellow-800/40" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <span className={`text-base leading-tight transition-all duration-300 ${isDone ? 'text-yellow-900/40 line-through decoration-2 decoration-pink-300/50' : 'text-[#451a03]'}`}>
                                                {formatSeedDisplay(entry.growthGoal?.text)}
                                            </span>
                                        </motion.li>
                                    );
                                })}
                            </AnimatePresence>
                        </ul>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-base text-yellow-900/40 mb-1 transform -rotate-2">
                                {t('seeds.dashboard_empty')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- GRID ITEMS (Scraps) --- */}
            
            {/* Photo Journal (Polaroid Style) */}
            <div 
                onClick={() => navigate(AppRoute.IMAGE_JOURNAL)}
                className="paper-card paper-texture p-3 pb-8 cursor-pointer transition-all duration-300 group relative z-10 transform rotate-1 hover:rotate-2 hover:z-20 rounded-md"
            >
                {/* Tape Corner */}
                <div className="tape tape-red w-16 -top-2 -left-3 transform -rotate-[30deg]"></div>

                <div className="h-40 bg-[#F3F4F6] w-full mb-3 relative overflow-hidden flex items-center justify-center border border-gray-200 rounded-sm">
                    <div className="relative z-10 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        <Camera size={32} className="text-gray-300 mb-2" strokeWidth={1.5} />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {t('dashboard.tap_to_record')}
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-end px-2">
                    <h2 className="text-2xl font-bold text-[#2D2D2D] leading-none">{t('dashboard.photo_journal')}</h2>
                    <span className="text-xs text-gray-400 font-bold rotate-[-2deg]">#memory</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                
                {/* 左下角：周末模式 → 每周反思；否则 → 今日卡片（手账风）；点击预览区 → 当日记录 */}
                <div 
                    onClick={() => showWeeklyReflection 
                        ? navigate(AppRoute.WEEKLY_REFLECTION) 
                        : navigate(AppRoute.DAILY_SUMMARY, { state: { targetDate: new Date().toISOString() } })
                    }
                    className={[
                        'p-4 aspect-square flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group paper-texture rounded-md',
                        showWeeklyReflection
                          ? 'bg-[#FEF3C7] border-2 border-yellow-200 shadow-[0_18px_34px_rgba(180,83,9,0.18)] transform -rotate-1'
                          : 'bg-[#FFFDF7] border border-[#E8E4D9] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transform -rotate-1'
                    ].join(' ')}
                    style={showWeeklyReflection ? { backgroundColor: '#FEF3C7' } : undefined}
                >
                    {/* 今日预览区：手账便签风格，点击进入当日记录（仅非周末显示） */}
                    {!showWeeklyReflection && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(AppRoute.DAILY_SUMMARY, { state: { targetDate: new Date().toISOString() } });
                            }}
                            className="relative z-10 mb-3 rounded-r-md rounded-l-sm border border-[#E8E4D9] border-l-4 border-l-amber-400/70 bg-[#FFFBEB]/90 h-14 flex items-center justify-center cursor-pointer hover:bg-amber-50/90 transition-colors px-2 paper-texture"
                        >
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                {todayEntries.length > 0 ? (
                                    todayEntries.slice(0, 5).map((e, i) => (
                                        <span
                                            key={e.id || i}
                                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border border-white/60"
                                            style={{ backgroundColor: MOOD_HEX_CODES[e.moodType] || '#E5E7EB' }}
                                            aria-hidden
                                        />
                                    ))
                                ) : null}
                                <span className="text-[11px] font-bold text-[#5D4037]/80 ml-0.5">
                                    {todayEntries.length > 0 ? t('dashboard.today_records', { count: String(todayEntries.length) }) : t('dashboard.today_no_records')}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="relative z-10 flex justify-between items-start">
                        <div className={[
                            'w-8 h-8 flex items-center justify-center border-2 rounded-sm shadow-sm',
                            showWeeklyReflection ? 'border-yellow-200 text-yellow-700 bg-white/60' : 'border-[#E8E4D9] text-[#5D4037]/70 bg-white/80'
                        ].join(' ')}>
                            <LayoutTemplate size={16} />
                        </div>
                    </div>

                    <div className="relative z-10">
                        <h3 className={`font-bold text-xl leading-tight mb-1 ${showWeeklyReflection ? 'text-[#5D4037]' : 'text-[#3D2914]'}`}>
                            {showWeeklyReflection ? t('dashboard.weekly_review') : t('dashboard.daily_card')}
                        </h3>
                        <span className="inline-block w-10 h-0.5 bg-amber-300/50 rounded-full -rotate-1 mb-1.5" aria-hidden />
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${showWeeklyReflection ? 'text-yellow-800/70' : 'text-[#5D4037]/70'}`}>
                            {showWeeklyReflection ? t('dashboard.weekly_review_sub') : t('dashboard.daily_card_sub')}
                        </p>
                    </div>
                </div>

                {/* Mood Flow (Square Grid Scrap) */}
                <div 
                    onClick={() => setShowDetailChart(true)}
                    className="bg-white p-4 aspect-square flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition-all relative overflow-hidden group paper-card paper-texture transform rotate-1 rounded-md"
                >
                    {/* 网格背景 */}
                    <div 
                        className="absolute inset-2 pointer-events-none rounded-sm opacity-20"
                        style={{
                            backgroundImage: 'linear-gradient(#E0F2FE 1px, transparent 1px), linear-gradient(90deg, #E0F2FE 1px, transparent 1px)',
                            backgroundSize: '12px 12px',
                        }}
                    />

                    <div className="relative z-10 w-8 h-8 flex items-center justify-center border-2 border-blue-100 text-blue-400 rounded-md">
                        <BarChart2 size={16} />
                    </div>

                     {/* 今日心流折线 - 铺满卡片中央区域 */}
                    {sparklinePoints && sparklinePath && (
                        <div className="absolute inset-x-2 top-14 bottom-12 pointer-events-none z-0">
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="dashboard-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <path d={sparklineAreaPath} fill="url(#dashboard-sparkline-fill)" stroke="none" />
                                <path 
                                    d={sparklinePath}
                                    fill="none"
                                    stroke="#0EA5E9"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    )}

                    <div className="relative z-10">
                        <h3 className="font-bold text-xl text-[#2D2D2D] leading-none mb-1">{t('dashboard.todays_flow')}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {sparklinePoints ? t('dashboard.live') : t('dashboard.no_data_short')}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- Dev-only: Simulate HR / Weekend (hidden in production) --- */}
            {import.meta.env.DEV && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300/50">
                    <div className="flex justify-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
                        <button onClick={() => setShowHRAlert(true)} className="text-xs font-bold text-gray-400 hover:text-[#FF6B6B] flex items-center gap-1">
                            <Wrench size={12} /> {t('dashboard.simulate_hr')}
                        </button>
                        <button onClick={() => setSimulateWeekend(prev => !prev)} className="text-xs font-bold text-gray-400 hover:text-[#FF6B6B]">
                            {showWeeklyReflection ? t('dashboard.weekend_on') : t('dashboard.weekend_off')}
                        </button>
                    </div>
                </div>
            )}

        </div>

        {/* Detailed Chart Modal - Clipboard Style，fixed 避免在滚动布局下白屏 */}
        {showDetailChart && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 px-4">
                <div 
                    className="bg-[#FFFDF7] paper-texture w-full max-w-sm p-2 shadow-2xl relative transform rotate-1 border-t-8 border-gray-300 rounded-md"
                >
                    {/* Metal Clip */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-8 bg-gradient-to-b from-gray-400 to-gray-200 rounded-t-lg shadow-md z-20"></div>

                    <div className="p-4 border border-gray-200 h-full rounded-sm">
                        <div className="flex justify-between items-center mb-6 mt-2">
                            <div>
                                <h2 className="text-3xl font-black text-[#2D2D2D] leading-none">{t('dashboard.todays_flow')}</h2>
                                <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mt-1">{t('dashboard.analysis')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowDetailChart(false); navigate(AppRoute.TIMELINE); }}
                                    className="btn-icon-with-label text-[#2D2D2D] hover:text-[#FF6B6B]"
                                    title={t('summary.timeline_link')}
                                >
                                    <List size={20} strokeWidth={2} />
                                    <span>{t('summary.timeline_link')}</span>
                                </button>
                                <button 
                                    onClick={() => setShowDetailChart(false)}
                                    className="text-[#2D2D2D] hover:text-[#FF6B6B]"
                                    aria-label="Close"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-none w-full relative min-h-[260px] flex items-center justify-center">
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                            {chartData.length > 0 ? (
                                <svg viewBox={`0 0 ${SVG_CHART.w} ${SVG_CHART.h}`} className="w-full max-h-[260px] block" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                        <linearGradient id="colorMoodDetailModal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    {/* 虚线网格 */}
                                    {[0, 25, 50, 75, 100].map((v, i) => (
                                        <line key={v} x1={SVG_CHART.pad.l} y1={SVG_CHART.pad.t + (1 - v / 100) * (SVG_CHART.h - SVG_CHART.pad.t - SVG_CHART.pad.b)} x2={SVG_CHART.w - SVG_CHART.pad.r} y2={SVG_CHART.pad.t + (1 - v / 100) * (SVG_CHART.h - SVG_CHART.pad.t - SVG_CHART.pad.b)} stroke="#E5E7EB" strokeDasharray="3 3" strokeWidth={1} />
                                    ))}
                                    {/* 面积 */}
                                    <path d={areaPath} fill="url(#colorMoodDetailModal)" />
                                    {/* 折线 */}
                                    <path d={linePath} fill="none" stroke="#2D2D2D" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                    {/* 数据点 */}
                                    {points.map((p, i) => (
                                        <g key={i}>
                                            <title>{p.time} · {p.value === 100 ? t('mood.thrilled') : p.value === 75 ? t('mood.pleasant') : p.value === 50 ? t('mood.calm') : p.value === 25 ? t('mood.stressful') : t('mood.irritating')}</title>
                                            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#2D2D2D" strokeWidth={2} />
                                        </g>
                                    ))}
                                    {/* Y 轴标签 */}
                                    {[100, 75, 50, 25, 0].map((v) => (
                                        <text key={v} x={SVG_CHART.pad.l - 6} y={SVG_CHART.pad.t + (1 - v / 100) * (SVG_CHART.h - SVG_CHART.pad.t - SVG_CHART.pad.b) + 4} textAnchor="end" fill="#9CA3AF" fontSize={11} fontWeight="bold" fontFamily="system-ui, sans-serif">
                                            {v === 100 ? t('mood.thrilled') : v === 75 ? t('mood.pleasant') : v === 50 ? t('mood.calm') : v === 25 ? t('mood.stressful') : t('mood.irritating')}
                                        </text>
                                    ))}
                                    {/* X 轴时间 */}
                                    {points.map((p, i) => (
                                        <text key={i} x={p.x} y={SVG_CHART.h - 8} textAnchor="middle" fill="#9CA3AF" fontSize={10} fontWeight="bold" fontFamily="system-ui, sans-serif">{p.time}</text>
                                    ))}
                                </svg>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
                                    <Activity size={32} className="mb-2 opacity-30" />
                                    <p className="text-xs font-bold uppercase tracking-widest">{t('dashboard.no_data')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </BlobBackground>
  );
};

export default Dashboard;
