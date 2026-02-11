
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Loader2, ArrowRight, Activity, Snowflake, ImageOff, Paperclip, Plus } from 'lucide-react';
import { useAppContext } from '../App';
import { AppRoute, MoodEntry } from '../types';
import { analyzePanicEntry } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';

// 情绪大类：激动 → 高唤醒正面；恼火 → 负面/烦躁
const THRILLED_TAGS = [
  "兴奋", "惊喜", "期待", "狂喜", "感动", "激动", "振奋", "雀跃"
];
const IRRITATING_TAGS = [
  "焦虑", "害怕", "迷茫", "委屈", "愤怒", "烦躁", "无助", "沮丧", "恼火"
];

export default function PanicReflect() {
  const { user, setUser, addToHistory, t } = useAppContext();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'thawing' | 'input' | 'analyzing' | 'result'>('thawing');
  const [emotionCategory, setEmotionCategory] = useState<'Thrilled' | 'Irritating' | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  
  const [result, setResult] = useState<any>(null);

  const frozenEntry = user.pendingFrozenEntry;

  useEffect(() => {
      // Simulate "Thawing"
      if (frozenEntry) {
          const timer = setTimeout(() => {
              setStep('input');
          }, 2000);
          return () => clearTimeout(timer);
      } else {
          navigate(AppRoute.DASHBOARD);
      }
  }, [frozenEntry, navigate]);

  const toggleTag = (tag: string) => {
      if (selectedTags.includes(tag)) {
          setSelectedTags(prev => prev.filter(t => t !== tag));
      } else {
          setSelectedTags(prev => [...prev, tag]);
      }
  };

  const baseTagsForCategory = emotionCategory === 'Thrilled' ? THRILLED_TAGS : emotionCategory === 'Irritating' ? IRRITATING_TAGS : [];

  const handleAddTag = () => {
      const val = newTagInput.trim();
      const allTags = [...baseTagsForCategory, ...customTags];
      
      if (val && !allTags.includes(val)) {
          setCustomTags(prev => [...prev, val]);
          setSelectedTags(prev => [...prev, val]);
      }
      setNewTagInput('');
      setIsAddingTag(false);
  };

  const submitAnalysis = async () => {
      setStep('analyzing');
      if (!frozenEntry) return;

      try {
          const analysis = await analyzePanicEntry(
              frozenEntry.image || null,
              selectedTags, 
              user.preferences.language, 
              user.preferences.aiEnabled
          );
          setResult(analysis);
          setStep('result');
          
          const entry: MoodEntry = {
              id: Date.now().toString(),
              timestamp: frozenEntry.timestamp,
              moodType: emotionCategory || analysis.moodType,
              intensity: 85,
              emotions: analysis.emotions,
              note: analysis.summary,
              image: frozenEntry.image || undefined,
              bodySensations: selectedTags,
              advice: analysis.advice
          };
          addToHistory(entry);
          setUser(prev => ({ ...prev, pendingFrozenEntry: null }));

      } catch (e) {
          console.error(e);
          setStep('input');
      }
  };

  const handleExit = () => {
    navigate(AppRoute.DASHBOARD);
  };

  if (!frozenEntry && step !== 'result') return null;

  const allTags = [...baseTagsForCategory, ...customTags];

  return (
    <BlobBackground mood="Calm">
      <div className="flex flex-col h-full min-h-0 font-sans relative overflow-hidden">
        
        {/* Top Bar - Washi Tape Style */}
        <div className="px-6 pt-10 pb-4 flex items-center justify-between z-50 sticky top-0">
             <button 
                type="button"
                onClick={() => navigate(AppRoute.DASHBOARD)} 
                className="btn-icon -ml-1"
             >
                 <X size={24} strokeWidth={2} />
             </button>
             
             {/* Center Label on Tape */}
             <div className="bg-[#E0F2FE] px-4 py-1 transform -rotate-1 shadow-sm border border-blue-100 relative">
                 <div className="absolute -left-1 top-0 bottom-0 w-1 border-r border-dashed border-blue-200"></div>
                 <div className="absolute -right-1 top-0 bottom-0 w-1 border-l border-dashed border-blue-200"></div>
                 <span className="text-[10px] font-bold tracking-[0.2em] text-blue-800 uppercase flex items-center gap-2">
                     <Snowflake size={12} /> {step === 'thawing' ? '解冻中...' : '情绪反思'}
                 </span>
             </div>
             
             <div className="w-8"></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative flex flex-col items-center overflow-y-auto no-scrollbar pt-4 pb-20 px-6">
            
            <AnimatePresence mode="wait">
                
                {/* 1. THAWING */}
                {step === 'thawing' && (
                    <motion.div 
                        key="thawing"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center text-center"
                    >
                         <div className="relative mb-6">
                             <Snowflake size={64} className="text-blue-300 animate-spin-slow" strokeWidth={1} />
                             <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-40"></div>
                         </div>
                         <h2 className="text-2xl font-black text-[#2D2D2D] font-serif italic mb-2">
                             {t('panic.review_title')}
                         </h2>
                         <p className="text-gray-400 text-sm">正在解冻这一刻...</p>
                    </motion.div>
                )}

                {/* 2a. INPUT - 先选情绪大类（激动/恼火）手绘风 */}
                {step === 'input' && frozenEntry && emotionCategory === null && (
                    <motion.div 
                        key="input-category"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="w-full flex flex-col gap-8 pb-8 max-w-sm mx-auto"
                    >
                        {/* 手写标题 + 黄色高亮下划线 */}
                        <div className="relative px-2">
                            <h2 className="text-2xl font-black text-[#2D2D2D] leading-tight transform -rotate-1">
                                {t('emotion.category_title')}
                            </h2>
                            <div className="h-3 bg-yellow-200/60 -mt-1 w-3/4 transform rotate-1 rounded-sm" aria-hidden />
                            <p className="text-gray-500 text-sm mt-3">
                                {t('emotion.category_subtitle')}
                            </p>
                        </div>

                        {/* 两张「便签纸」式选项 */}
                        <div className="flex flex-col gap-6">
                            {/* 激动 - 灰蓝胶带 */}
                            <motion.button
                                type="button"
                                onClick={() => setEmotionCategory('Thrilled')}
                                whileTap={{ scale: 0.98 }}
                                className="relative w-full py-6 px-6 rounded-[2px] border border-gray-200 bg-[#FFFDF7] paper-texture shadow-[0_2px_8px_rgba(0,0,0,0.06)] transform -rotate-1 hover:rotate-0 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 text-center border-t-4 border-t-slate-200/80"
                            >
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-100/70 tape transform -rotate-1 backdrop-blur-sm z-10" aria-hidden />
                                <span className="relative z-10 font-bold text-xl text-[#2D2D2D] tracking-wide">
                                    {t('mood.thrilled')}
                                </span>
                            </motion.button>

                            {/* 恼火 - 粉/暖色胶带 */}
                            <motion.button
                                type="button"
                                onClick={() => setEmotionCategory('Irritating')}
                                whileTap={{ scale: 0.98 }}
                                className="relative w-full py-6 px-6 rounded-[2px] border border-gray-200 bg-[#FFFDF7] paper-texture shadow-[0_2px_8px_rgba(0,0,0,0.06)] transform rotate-2 hover:rotate-0 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 text-center border-t-4 border-t-pink-200/80"
                            >
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-6 bg-pink-100/70 tape transform rotate-1 backdrop-blur-sm z-10" aria-hidden />
                                <span className="relative z-10 font-bold text-xl text-[#2D2D2D] tracking-wide">
                                    {t('mood.irritating')}
                                </span>
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* 2b. INPUT - 已选大类，显示照片 + 细节词 */}
                {step === 'input' && frozenEntry && emotionCategory !== null && (
                    <motion.div 
                        key="input-tags"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="w-full flex flex-col gap-8 pb-8"
                    >
                        <button
                            type="button"
                            onClick={() => { setEmotionCategory(null); setSelectedTags([]); setCustomTags([]); }}
                            className="text-xs font-medium text-gray-400 hover:text-[#2D2D2D] self-end"
                        >
                            ← {t('emotion.category_title')}
                        </button>

                        {/* Polaroid Photo */}
                        <div className="bg-white p-3 pb-12 shadow-xl transform rotate-1 border border-gray-100 relative group max-w-sm mx-auto w-full rounded-[2px]">
                            {/* Blue Washi Tape */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-blue-100/60 tape transform -rotate-1 backdrop-blur-sm z-20"></div>
                            
                            <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative border border-gray-50">
                                {frozenEntry.image ? (
                                    <img src={frozenEntry.image} className="w-full h-full object-cover grayscale-[10%]" alt="Moment" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                        <ImageOff size={32} />
                                        <span className="text-xs font-bold">无影像记录</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                <span className="text-xs text-gray-400 font-bold">{new Date(frozenEntry.timestamp).toLocaleTimeString()}</span>
                                <span className="text-xs text-[#2D2D2D] font-bold">FIG. 001</span>
                            </div>
                        </div>

                        {/* Emotion Tags - Grid Style */}
                        <div>
                             <div className="flex items-center gap-2 mb-4">
                                 <Activity size={16} className="text-red-400" />
                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                     {t('panic.review_body_ask')}
                                 </span>
                             </div>
                             
                             <div className="grid grid-cols-4 gap-2 justify-center">
                                 {allTags.map((tag) => {
                                     const isSelected = selectedTags.includes(tag);
                                     
                                     return (
                                         <button
                                             key={tag}
                                             onClick={() => toggleTag(tag)}
                                             className={`
                                                 relative group transition-all duration-200 outline-none
                                                 ${isSelected ? 'z-10 scale-105' : 'hover:scale-105'}
                                             `}
                                         >
                                             <div className={`
                                                 px-1 py-2 font-bold text-xs border shadow-sm rounded-sm text-center
                                                 ${isSelected 
                                                     ? 'bg-[#2D2D2D] text-white border-[#2D2D2D] shadow-md' 
                                                     : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                 }
                                             `}>
                                                 {tag}
                                             </div>
                                             {isSelected && (
                                                 <div className="absolute -top-1.5 -right-1.5 bg-red-400 rounded-full p-0.5 border-2 border-white">
                                                     <Check size={8} className="text-white" strokeWidth={4} />
                                                 </div>
                                             )}
                                         </button>
                                     );
                                 })}

                                 {/* Custom Tag Add Button */}
                                 <div className="relative">
                                    {isAddingTag ? (
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={newTagInput}
                                            onChange={(e) => setNewTagInput(e.target.value)}
                                            onBlur={handleAddTag}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                            className="w-full h-full px-1 py-2 font-bold text-xs border-2 border-dashed border-gray-300 rounded-sm text-center outline-none bg-white text-gray-700 shadow-sm"
                                            placeholder="..."
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setIsAddingTag(true)}
                                            className="w-full h-full px-1 py-2 font-bold text-xs border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-sm text-center text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors bg-white/50"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}
                                 </div>
                             </div>
                        </div>

                        <div className="mt-4">
                            <Button onClick={submitAnalysis} disabled={selectedTags.length === 0} className="shadow-lg">
                                {t('onboarding.gen_profile')} <ArrowRight size={18} />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* 3. ANALYZING */}
                {step === 'analyzing' && (
                    <motion.div 
                        key="analyzing"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center text-center"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <Loader2 size={40} className="animate-spin text-[#2D2D2D] relative z-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[#2D2D2D] mt-6 tracking-widest uppercase">
                            {t('onboarding.analyzing')}
                        </h2>
                    </motion.div>
                )}

                {/* 4. RESULT */}
                {step === 'result' && result && (
                    <motion.div
                        key="result"
                        initial={{ scale: 0.9, opacity: 0, y: 50 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="w-full max-w-sm mt-4"
                    >
                        {/* Paper Report Card */}
                        <div className="bg-[#FFFDF7] p-6 pt-10 shadow-2xl relative paper-texture rounded-[2px] border border-gray-200 transform rotate-1">
                            
                            {/* Paperclip */}
                            <div className="absolute -top-4 right-8 text-gray-400 transform -rotate-12 drop-shadow-sm z-20">
                                <Paperclip size={32} />
                            </div>

                            {/* Header */}
                            <div className="border-b-2 border-[#2D2D2D] pb-4 mb-6 flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TYPE</div>
                                    <div className="text-xl font-black text-[#2D2D2D] font-sans uppercase">{result.moodType}</div>
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded-[2px]">
                                    <span className="font-mono text-xs font-bold text-gray-500">REF-{Date.now().toString().slice(-4)}</span>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        Summary
                                    </h3>
                                    <p className="text-lg font-serif italic text-gray-800 leading-relaxed">
                                        "{result.summary}"
                                    </p>
                                </div>

                                <div className="bg-[#FEF3C7] p-4 relative crayon-box-sm">
                                    <div className="absolute -left-1 top-4 bottom-4 w-1 border-l-2 border-dotted border-yellow-600/30"></div>
                                    <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Activity size={12} /> Suggestion
                                    </h3>
                                    <p className="font-bold text-[#2D2D2D] text-sm leading-6">
                                        {result.advice}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Stamp */}
                            <div className="mt-8 flex justify-end">
                                <div className="border-2 border-green-600/30 text-green-700/40 px-3 py-1 font-black text-xs uppercase transform -rotate-6 inline-block tracking-widest rounded-sm">
                                    PROCESSED
                                </div>
                            </div>

                        </div>

                        <div className="mt-8 px-4">
                            <Button onClick={handleExit} className="shadow-lg">
                                {t('onboarding.continue')}
                            </Button>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    </div>
    </BlobBackground>
  );
}
