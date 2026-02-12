
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sprout, Plus, Sparkles, Flower2 } from 'lucide-react';
import { useAppContext } from '../App';
import { AppRoute, MoodEntry } from '../types';
import BlobBackground from '../components/BlobBackground';
import { generateGrowthGoals, analyzeMoodEntry, getGrowthFallbackForMood } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

// Custom "Hold to Clear Mist" Button
const LongPressButton = ({ onComplete, label }: { onComplete: () => void, label: string }) => {
    const [progress, setProgress] = useState(0);
    const intervalRef = React.useRef<any>(null);

    const startPress = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(intervalRef.current);
                    onComplete();
                    return 100;
                }
                return prev + 2; // Speed of filling
            });
        }, 20);
    };

    const endPress = () => {
        clearInterval(intervalRef.current);
        setProgress(0);
    };

    return (
        <button
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            className="relative overflow-hidden bg-white/30 backdrop-blur-sm border border-white/50 text-[#2D2D2D] font-bold h-16 w-48 shadow-lg select-none active:scale-95 transition-transform crayon-button"
        >
            <div 
                className="absolute inset-0 bg-white opacity-80 transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
            ></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles size={16} /> {label}
            </span>
        </button>
    );
};

const GrowthSeed: React.FC = () => {
  const { currentEntry, addToHistory, user, t } = useAppContext();
  const navigate = useNavigate();

  const mood = currentEntry?.moodType || 'Neutral';
  const initialFallback = getGrowthFallbackForMood(mood);

  const [step, setStep] = useState<'loading' | 'selection' | 'planting'>('selection');
  const [suggestions, setSuggestions] = useState<string[]>(initialFallback.actions);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mood = currentEntry?.moodType || 'Neutral';
    const context = currentEntry?.guidanceAnswer || currentEntry?.note || t('growth.general_reflection');
    const categories = currentEntry?.categories || [];

    const fetchContent = async () => {
        try {
            const result = await generateGrowthGoals(
                mood,
                context,
                categories,
                user.preferences.language,
                user.preferences.aiEnabled
            );
            if (cancelled) return;
            setSuggestions(result.actions);
        } catch (e) {
            console.error("Failed to generate growth content", e);
            if (!cancelled) {
                const fallback = getGrowthFallbackForMood(mood);
                setSuggestions(fallback.actions);
            }
        }
    };
    fetchContent();
    return () => { cancelled = true; };
  }, []);

  const handleSkip = () => {
      const entry: MoodEntry = {
        ...(currentEntry as MoodEntry),
        id: Date.now().toString(),
        timestamp: new Date(),
        intensity: currentEntry?.intensity ?? 50,
        emotions: currentEntry?.emotions || [],
        note: currentEntry?.note || '',
        aiAnalysis: currentEntry?.aiAnalysis,
      };
      addToHistory(entry);
      navigate(AppRoute.DASHBOARD);
  };

  const handleSeedSelect = (seed: string) => {
      setSelectedSeed(seed);
  };

  const handlePlant = async () => {
      if (!selectedSeed) return;
      setStep('planting');

      // Finalize the entry
      let finalEmotions = currentEntry.emotions || [];
      let finalSummary = currentEntry.note || selectedSeed;

      // Quick fallback analysis if needed
      if (finalEmotions.length === 0) {
        try {
            const analysis = await analyzeMoodEntry(
                currentEntry.moodType || 'Neutral',
                finalSummary,
                user.preferences.language,
                undefined,
                user.preferences.aiEnabled
            );
            finalEmotions = analysis.emotions;
            finalSummary = analysis.summary;
        } catch (e) {}
      }

      const finalEntry: MoodEntry = {
        ...(currentEntry as MoodEntry),
        id: Date.now().toString(),
        timestamp: new Date(),
        intensity: currentEntry.intensity || 50,
        emotions: finalEmotions,
        note: finalSummary, 
        aiAnalysis: finalSummary,
        growthGoal: {
            text: selectedSeed,
            isCompleted: false
        }
      };

      addToHistory(finalEntry);
      
      // Artificial delay for animation
      setTimeout(() => {
          navigate(AppRoute.DASHBOARD);
      }, 1500);
  };

  return (
    <BlobBackground mood={currentEntry?.moodType}>
      <div className="flex flex-col h-full min-h-0 relative font-sans overflow-hidden">
        
        {/* 目标选择（直接进入，无前置洞察页） */}
        <AnimatePresence>
            {step === 'selection' && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col h-full min-h-0 overflow-y-auto px-6 pt-12 pb-10 relative z-30"
                >
                    <button type="button" onClick={() => navigate(-1)} className="absolute top-12 left-6 btn-icon -ml-1">
                        <ArrowLeft size={24} strokeWidth={2} />
                    </button>

                    <div className="mt-20 mb-8">
                        <h1 className="text-2xl font-black text-black leading-tight mb-2 flex items-center gap-3">
                            {t('growth.seed_prompt')}
                        </h1>
                        <p className="text-sm text-gray-500">{t('growth.if_then_hint')}</p>
                    </div>

                    <div className="grid gap-4">
                        {suggestions.map((seed, idx) => (
                            <motion.button
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => handleSeedSelect(seed)}
                                className={`
                                    p-5 text-left border-2 transition-all duration-300 flex items-center gap-4 group crayon-box relative overflow-hidden
                                    ${selectedSeed === seed 
                                        ? 'bg-[#FEFCE8] border-[#FEF08A] text-[#451a03] shadow-lg scale-105' 
                                        : 'bg-white border-gray-100 text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/50'}
                                `}
                            >
                                {/* Tape Visual for Selected State */}
                                {selectedSeed === seed && (
                                     <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-8 h-24 bg-white/40 backdrop-blur-[2px] transform -rotate-2 z-20 border-r border-white/50 shadow-sm"></div>
                                )}

                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-colors relative z-10 shrink-0
                                    ${selectedSeed === seed ? 'bg-[#FDE68A] text-[#B45309]' : 'bg-gray-100 text-gray-400 group-hover:bg-yellow-100 group-hover:text-yellow-600'}
                                `}>
                                    <Sprout size={20} />
                                </div>
                                <span className="font-bold text-sm relative z-10 leading-tight">{seed}</span>
                            </motion.button>
                        ))}
                        
                        {/* Custom Input Option */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4"
                        >
                             <div className="bg-white/50 crayon-box p-4 border border-gray-200 border-dashed flex items-center gap-3 focus-within:bg-white focus-within:border-solid focus-within:shadow-md transition-all">
                                <Plus size={20} className="text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder={t('growth.placeholder')}
                                    className="bg-transparent w-full outline-none text-gray-700 placeholder-gray-400 font-medium"
                                    onChange={(e) => handleSeedSelect(e.target.value)}
                                    // Don't auto-select on focus, wait for typing
                                />
                             </div>
                        </motion.div>
                    </div>

                    {/* 选择目标后：展示所选目标 + 长按确认 */}
                    {selectedSeed && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-5 rounded-2xl bg-[#FEFCE8] border-2 border-[#FEF08A] shadow-lg"
                        >
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                                {t('growth.selected_goal')}
                            </p>
                            <p className="text-base font-bold text-[#451a03] leading-snug mb-4">
                                {selectedSeed}
                            </p>
                            <div className="flex justify-center">
                                <LongPressButton
                                    onComplete={handlePlant}
                                    label={t('growth.hold_instruction')}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                                {t('growth.release_instruction')}
                            </p>
                        </motion.div>
                    )}

                    {/* 视觉指引：完成后在花园中收获花朵 */}
                    <div className="mt-6 mx-2 flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200/80">
                        <Flower2 size={20} className="text-amber-600 shrink-0" />
                        <p className="text-xs font-medium text-amber-800  leading-snug">
                            {t('growth.garden_flower_hint')}
                        </p>
                    </div>

                    <div className="mt-auto w-full flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="text-sm font-medium text-gray-500 hover:text-[var(--color-pencil)] transition-colors"
                        >
                            {t('growth.skip')}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Step 4: Planting Ritual (Transition) */}
        <AnimatePresence>
            {step === 'planting' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-50 bg-[#EAE8E1] flex flex-col items-center justify-center text-center"
                >
                    <motion.div
                        initial={{ scale: 0.5, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="mb-8"
                    >
                        <Sprout size={80} className="text-[#C83025]" />
                    </motion.div>
                    <h2 className="text-2xl font-bold  text-[#2D2D2D] animate-pulse">
                        {t('growth.planting')}
                    </h2>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </BlobBackground>
  );
};

export default GrowthSeed;
