
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sprout, CheckCircle2, Flower2, ChevronRight, X, Sparkles } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { AppRoute } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSeedDisplay } from '../utils/seedDisplay';

const SeedsList: React.FC = () => {
  const { history, updateEntry, t, markNewlyHarvested } = useAppContext();
  const navigate = useNavigate();
  const [showCompletedHint, setShowCompletedHint] = useState(false);

  // --- LIST VIEW DATA (Weekly Focus) ---
  const weeklyData = useMemo(() => {
      const now = new Date();
      // Start of week (Sunday) or just last 7 days? Let's do last 7 days for simplicity "This Week"
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      
      return history.filter(h => {
          if (!h.growthGoal) return false;
          const d = new Date(h.timestamp);
          // Show if created recently OR if it's still active (legacy tasks shouldn't disappear until done)
          const isRecent = d >= oneWeekAgo;
          const isActive = !h.growthGoal.isCompleted;
          return isRecent || isActive;
      });
  }, [history]);

  const weeklyActive = weeklyData.filter(h => !h.growthGoal.isCompleted);
  const weeklyCompleted = weeklyData.filter(h => h.growthGoal.isCompleted);

  const toggleSeed = (entry: any) => {
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
        markNewlyHarvested(entry.id);
        setShowCompletedHint(true);
      }
  };

  const goToGarden = () => {
    setShowCompletedHint(false);
    navigate(AppRoute.GARDEN);
  };

  return (
    <BlobBackground mood="Pleasant">
       <div className="flex flex-col h-full min-h-0 font-sans relative overflow-hidden">
        
        {/* Header */}
        <div className="px-6 pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-[#FFFDF7]/90 backdrop-blur-md">
             <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1">
                <ArrowLeft size={24} strokeWidth={2} />
             </button>
             <span className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">{t('growth.title')}</span>
             <div className="w-8"></div>
        </div>

        {/* 完成行为目标后的增强引导：庆祝 + 去花园 CTA */}
        <AnimatePresence>
          {showCompletedHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="mx-4 mb-4 rounded-2xl overflow-hidden border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100/80 shadow-lg"
            >
              {/* 顶部庆祝标题 */}
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center shrink-0"
                >
                  <Sparkles size={18} className="text-amber-700" />
                </motion.div>
                <span className="text-lg font-black text-amber-900">
                  {t('seeds.completed_celebration')}
                </span>
              </div>
              {/* 花朵提示 + 副文案 */}
              <div className="px-4 pb-3 flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-white/90 border-2 border-amber-200 flex items-center justify-center shrink-0 shadow-inner">
                  <Flower2 size={22} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-amber-900 leading-snug">
                    {t('seeds.flower_bloom_hint')}
                  </p>
                  <p className="text-xs text-amber-700/80 mt-1 font-sans">
                    {t('seeds.flower_in_garden_sub')}
                  </p>
                </div>
              </div>
              {/* 主 CTA + 关闭 */}
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToGarden}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-md hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Flower2 size={18} />
                  {t('seeds.go_garden_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompletedHint(false)}
                  className="px-3 py-2 text-xs font-medium text-amber-600 hover:text-amber-800 hover:bg-amber-200/50 rounded-lg transition-colors"
                >
                  {t('seeds.later')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompletedHint(false)}
                  className="p-2 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-200/50"
                  aria-label="关闭"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-nav no-scrollbar relative z-10 space-y-6 pt-2">
            
            <div className="px-2 mb-4">
                <h1 className="text-3xl font-black text-gray-900 mb-1">{t('seeds.week_list')}</h1>
                <p className="text-gray-500 text-sm font-medium">{t('seeds.week_list_sub')}</p>
            </div>

            {/* --- LIST VIEW --- */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Active Section */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                        <Sprout size={14} className="text-green-600" /> {t('seeds.in_progress')} ({weeklyActive.length})
                    </h2>
                    {weeklyActive.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 crayon-box bg-gray-50/50">
                            <p className="text-gray-400 text-xs font-medium">{t('seeds.all_done')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {weeklyActive.map((entry) => (
                                <div 
                                    key={entry.id}
                                    onClick={() => toggleSeed(entry)}
                                    className="relative bg-white crayon-box p-4 shadow-sm border border-gray-100 hover:border-[#C83025]/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group active:scale-[0.99]"
                                >
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center group-hover:border-[#C83025] transition-colors"></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-800">{formatSeedDisplay(entry.growthGoal?.text)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed Section */}
                {weeklyCompleted.length > 0 && (
                    <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-gray-400" /> {t('seeds.completed')} ({weeklyCompleted.length})
                        </h2>
                        <div className="flex flex-col gap-3 opacity-60">
                            {weeklyCompleted.map((entry) => (
                                <div 
                                    key={entry.id}
                                    onClick={() => toggleSeed(entry)}
                                    className="relative bg-gray-50 crayon-box p-4 border border-transparent flex items-center gap-4 cursor-pointer group"
                                >
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-500 line-through decoration-gray-400/50">{formatSeedDisplay(entry.growthGoal?.text)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 视觉指引：完成任务 → 花园中绽放花朵 */}
                <div className="px-2 pt-4 pb-6">
                    <button
                        type="button"
                        onClick={() => navigate(AppRoute.GARDEN)}
                        className="w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/80 hover:bg-amber-100/80 hover:border-amber-300 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Flower2 size={24} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-900 leading-snug">
                                {t('seeds.guide_to_garden')}
                            </p>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                {t('seeds.guide_go_garden')}
                                <ChevronRight size={14} />
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>

      </div>
    </BlobBackground>
  );
};

export default SeedsList;
