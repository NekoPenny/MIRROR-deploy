
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flower2, Wind, X, Calendar, Leaf, RefreshCcw, Sprout, Sun, Cat } from 'lucide-react';
import { useAppContext } from '../App';
import { translateTag } from '../utils/translateTag';
import { AppRoute } from '../types';
import BlobBackground from '../components/BlobBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSeedDisplay } from '../utils/seedDisplay';

const GardenPage: React.FC = () => {
  const { history, updateEntry, t, newlyHarvestedIds, clearNewlyHarvested } = useAppContext();
  const navigate = useNavigate();
  const [selectedSeed, setSelectedSeed] = useState<any>(null);
  const [showNewBloomBanner, setShowNewBloomBanner] = useState(false);

  const activeSeeds = history.filter(h => h.growthGoal && !h.growthGoal.isCompleted);
  const gardenSeeds = history.filter(h => h.growthGoal && h.growthGoal.isCompleted);

  // 新收获的花朵播完「从地里冒出」后，从标记中移除，下次进花园不再重播
  useEffect(() => {
    const newInGarden = newlyHarvestedIds.filter(id => gardenSeeds.some(e => e.id === id));
    if (newInGarden.length === 0) return;
    const timer = setTimeout(() => clearNewlyHarvested(newInGarden), 1400);
    return () => clearTimeout(timer);
  }, [gardenSeeds, newlyHarvestedIds, clearNewlyHarvested]);

  // 新花入场时显示简短引导条，约 4 秒后自动收起
  useEffect(() => {
    if (newlyHarvestedIds.length === 0) {
      setShowNewBloomBanner(false);
      return;
    }
    setShowNewBloomBanner(true);
    const timer = setTimeout(() => setShowNewBloomBanner(false), 4000);
    return () => clearTimeout(timer);
  }, [newlyHarvestedIds.length]);

  const toggleSeed = (entry: any) => {
      if (!entry.growthGoal) return;
      
      const updatedEntry = {
          ...entry,
          growthGoal: {
              ...entry.growthGoal,
              isCompleted: !entry.growthGoal.isCompleted
          }
      };
      updateEntry(updatedEntry);
  };

  const getPlantStyle = (id: string) => {
      const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hues = [340, 350, 0, 30, 320, 280];
      return {
          hue: hues[hash % hues.length],
          saturation: 75 + (hash % 15),
          lightness: 82 + (hash % 10),
          height: 1 + (hash % 40) / 100,
          stemHeight: 28 + (hash % 45),
          delay: (hash % 20) * 0.1,
          leafType: hash % 2,
          rotation: (hash % 12) - 6
      };
  };

  return (
    <BlobBackground mood="Pleasant">
       <div className="flex flex-col h-full min-h-0 font-sans relative overflow-hidden">
        
        {/* Header */}
        <div className="px-6 pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-[#FFFDF7]/90 backdrop-blur-md border-b border-gray-100/50">
             <button type="button" onClick={() => navigate(-1)} className="btn-icon rounded-full -ml-1">
                <ArrowLeft size={24} strokeWidth={2} />
             </button>
             <span className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">{t('nav.garden')}</span>
             
             {/* Animal Collection Entrance */}
             <button 
                onClick={() => navigate(AppRoute.ANIMAL_COLLECTION)}
                className="p-2 -mr-2 text-gray-400 hover:text-[#C83025] transition-colors rounded-full hover:bg-red-50 group relative"
                title={t('animal.collection_title')}
             >
                <Cat size={24} />
                {/* Tiny notification dot if needed, for now just the icon */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-[#FF6B6B] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-nav no-scrollbar relative z-10 space-y-10 pt-4">
            
            {/* --- GARDEN VIEW (The Collage Frame) --- */}
            <div className="relative group pt-16">
                {/* Title Sticker */}
                <div className="absolute top-0 left-4 z-20 bg-white/95 backdrop-blur-sm border border-gray-200/90 px-4 py-2 rounded-xl shadow-lg transform -rotate-2" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                    <span className="text-xs font-bold text-[#2D2D2D] uppercase tracking-widest">
                        {t('seeds.harvested_title')} ({gardenSeeds.length})
                    </span>
                </div>
                {/* 新花入场时的简短引导条（约 4 秒后自动收起） */}
                <AnimatePresence>
                  {showNewBloomBanner && newlyHarvestedIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: 'spring', damping: 20 }}
                      className="mt-2 mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200/90 text-amber-900 shadow-md"
                    >
                      <Flower2 size={18} className="text-amber-600 shrink-0" />
                      <p className="text-xs font-medium flex-1">{t('seeds.new_bloom_banner')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* 视觉指引：花朵来自完成的种子 */}
                {gardenSeeds.length > 0 && (
                    <div className="mt-2 mb-5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50/95 border border-amber-200/70 text-amber-800 shadow-sm">
                        <Flower2 size={18} className="text-amber-600 shrink-0" />
                        <p className="text-xs font-medium">{t('seeds.garden_flowers_from_seeds')}</p>
                    </div>
                )}

                {/* Main Frame */}
                <div 
                    className="relative w-full rounded-2xl overflow-hidden min-h-[380px] flex flex-col justify-end transform rotate-1 transition-transform duration-300 hover:rotate-0 paper-texture"
                    style={{
                        boxShadow: '0 24px 48px -16px rgba(0,0,0,0.12), 0 0 0 8px rgba(255,255,255,0.9), inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.04)',
                        background: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 22%, #E0F2FE 45%, #DCFCE7 75%, #BBF7D0 100%)',
                    }}
                >
                    {/* 天空高光与景深 */}
                    <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse 90% 60% at 65% 15%, rgba(255,255,255,0.5) 0%, transparent 55%)' }} />
                    <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 30% 30%, rgba(254,243,199,0.2) 0%, transparent 50%)' }} />

                    {/* Paper Sun + 柔和光晕 */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                        className="absolute top-5 right-5 w-24 h-24 z-[5]"
                    >
                        <div className="absolute inset-0 rounded-full bg-amber-100/50 blur-2xl scale-[2]" />
                        <div className="absolute inset-0 rounded-full bg-amber-200/30 blur-xl scale-150" />
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_20px_rgba(251,191,36,0.3)] overflow-visible relative">
                            {[...Array(12)].map((_, i) => (
                                <line 
                                    key={i}
                                    x1="50" y1="50" 
                                    x2="50" y2="8" 
                                    transform={`rotate(${i * 30} 50 50)`} 
                                    stroke="#FBBF24" 
                                    strokeWidth="2" 
                                    strokeLinecap="round"
                                    opacity="0.9"
                                />
                            ))}
                            <circle cx="50" cy="50" r="28" fill="#FDE68A" stroke="#FBBF24" strokeWidth="2" opacity="0.95" />
                            <circle cx="50" cy="50" r="24" fill="#FEF3C7" />
                        </svg>
                    </motion.div>

                    {/* Paper Clouds */}
                    <motion.div 
                        animate={{ x: [0, 18, 0] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-10 left-6 z-[5] opacity-90"
                    >
                        <div className="w-14 h-7 bg-white/95 rounded-full relative shadow-md" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                            <div className="absolute -top-3 left-1 w-7 h-7 bg-white/95 rounded-full" />
                            <div className="absolute -top-4 left-4 w-9 h-9 bg-white/95 rounded-full" />
                        </div>
                    </motion.div>
                    <motion.div 
                        animate={{ x: [0, -12, 0] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute top-16 right-16 z-[4] opacity-70"
                    >
                        <div className="w-10 h-5 bg-white/90 rounded-full shadow-sm">
                            <div className="absolute -top-2 left-2 w-5 h-5 bg-white/90 rounded-full" />
                        </div>
                    </motion.div>

                    {/* 多层柔和草地 */}
                    <div className="absolute bottom-0 left-0 right-0 h-40 z-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(134,239,172,0.85) 25%, rgba(74,222,128,0.95) 60%)', borderRadius: '55% 55% 0 0', transform: 'scale(1.2) translateY(6px) rotate(-1.5deg)', boxShadow: '0 -6px 20px rgba(34,197,94,0.25)' }} />
                    <div className="absolute bottom-0 left-0 right-0 h-28 z-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(74,222,128,0.9) 35%, rgba(34,197,94,0.95) 70%)', borderRadius: '50% 50% 0 0', transform: 'scale(1.25) translateY(4px) rotate(1deg)', boxShadow: '0 -4px 16px rgba(22,163,74,0.2)' }} />
                    <div className="absolute bottom-0 left-0 right-0 h-16 z-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.92) 45%)', borderRadius: '48% 48% 0 0', transform: 'scale(1.35) translateY(-2px)', boxShadow: '0 -2px 10px rgba(22,163,74,0.18)' }} />

                    {/* --- FLOWERS --- */}
                    <div className="relative z-10 px-4 pb-4 flex flex-wrap items-end justify-center gap-x-4 gap-y-2 min-h-[150px]">
                        {gardenSeeds.length > 0 ? (
                            gardenSeeds.map((entry) => {
                                const style = getPlantStyle(entry.id);
                                const isNew = newlyHarvestedIds.includes(entry.id);
                                return (
                                    <motion.button
                                        key={entry.id}
                                        layoutId={`flower-${entry.id}`}
                                        onClick={() => setSelectedSeed(entry)}
                                        initial={isNew ? { scale: 0, opacity: 0, y: 80 } : { scale: 1, opacity: 1, y: 0 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.12, y: -6 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={isNew ? { type: "spring", stiffness: 180, damping: 14, delay: style.delay } : { duration: 0 }}
                                        className="relative flex flex-col items-center group focus:outline-none"
                                        style={{ 
                                            zIndex: Math.floor(style.height * 10),
                                            transform: `rotate(${style.rotation}deg)`
                                        }} 
                                    >
                                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/80 text-[#2D2D2D] text-[10px] px-2.5 py-1 font-bold whitespace-nowrap pointer-events-none shadow-lg rounded-md -translate-y-1">
                                            {new Date(entry.timestamp).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                                        </div>

                                        <motion.div
                                            animate={{ rotate: [0, 3, -3, 0] }}
                                            transition={{ duration: 4 + style.delay, repeat: Infinity, ease: "easeInOut" }}
                                            className="relative z-20"
                                        >
                                            <Flower2 
                                                size={26 * style.height} 
                                                fill={`hsl(${style.hue}, ${style.saturation}%, ${style.lightness}%)`} 
                                                stroke="#2D2D2D"
                                                strokeWidth={1.5}
                                                className="transition-transform"
                                                style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.15)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))' }}
                                            />
                                            {/* Center dot */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-[20%] h-[20%] bg-[#2D2D2D] rounded-full opacity-80"></div>
                                            </div>
                                        </motion.div>

                                        <div className="relative flex justify-center -mt-0.5">
                                            {/* Hand-drawn stem */}
                                            <svg width="20" height={style.stemHeight} className="overflow-visible">
                                                <path 
                                                    d={`M10,0 Q${10 + style.rotation},${style.stemHeight/2} 10,${style.stemHeight}`} 
                                                    stroke="#2D2D2D" 
                                                    strokeWidth="1.5" 
                                                    fill="none" 
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            
                                            {/* Leaves */}
                                            {style.leafType === 0 ? (
                                                <>
                                                    <div className="absolute top-1/3 -left-2 text-[#4ADE80] transform -rotate-45 scale-75 drop-shadow-sm border-black"><Leaf size={12} fill="currentColor" stroke="#2D2D2D" strokeWidth={1} /></div>
                                                </>
                                            ) : (
                                                <div className="absolute bottom-2 -right-2 text-[#4ADE80] transform rotate-[30deg] scale-90 drop-shadow-sm"><Leaf size={14} fill="currentColor" stroke="#2D2D2D" strokeWidth={1} /></div>
                                            )}
                                        </div>
                                        {/* 土壤阴影 */}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full bg-black/10 blur-[3px]" />
                                        <div className="absolute -bottom-0.5 w-6 h-2">
                                            <svg viewBox="0 0 20 5">
                                                <path d="M0,2 Q5,5 10,2 T20,2" stroke="#2D2D2D" strokeWidth="1" fill="none" opacity="0.35" />
                                            </svg>
                                        </div>
                                    </motion.button>
                                );
                            })
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                                <motion.div 
                                    animate={{ opacity: [0.6, 1], scale: [0.96, 1.02] }}
                                    transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                                    className="bg-white/70 backdrop-blur-sm p-8 rounded-full border-2 border-dashed border-sky-200/70 mb-5 shadow-inner"
                                >
                                    <Wind size={44} className="text-sky-400" strokeWidth={1.5} />
                                </motion.div>
                                <p className="text-sky-700/95 text-xl font-bold transform -rotate-1 drop-shadow-sm">
                                    {t('seeds.empty_list')}
                                </p>
                                <p className="text-sky-500/90 text-sm mt-3 max-w-[240px] leading-relaxed">
                                    {t('seeds.garden_empty_hint')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ACTIVE SEEDS (Seed Packets) --- */}
            <div className="relative pt-2">
                {/* Washi Tape Header */}
                <div className="flex justify-center mb-5">
                     <div className="bg-gradient-to-b from-amber-100 to-amber-50 text-amber-900 px-5 py-2.5 font-bold text-sm rounded-xl shadow-md transform -rotate-1 border border-amber-200/80 relative" style={{ boxShadow: '0 4px 16px rgba(245,158,11,0.2)' }}>
                        <div className="absolute -left-2 top-2 w-2 h-6 bg-amber-300/40 -rotate-12 rounded-sm"></div>
                        <div className="absolute -right-2 top-1 w-2 h-6 bg-amber-300/40 rotate-12 rounded-sm"></div>
                        培育室 ({activeSeeds.length})
                     </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                        {activeSeeds.map((entry, idx) => (
                            <motion.div 
                                key={entry.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                className="relative p-4 pb-9 rounded-xl overflow-hidden transition-shadow duration-300 group"
                                style={{ 
                                    transform: `rotate(${idx % 2 === 0 ? '-1deg' : '1deg'})`,
                                    background: 'linear-gradient(165deg, #D4B896 0%, #C4A77D 48%, #B8956E 100%)',
                                    boxShadow: '0 10px 28px -6px rgba(139,90,43,0.22), inset 0 1px 0 rgba(255,255,255,0.25)',
                                }}
                            >
                                <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #000 3px)' }} />
                                {/* Folded Top */}
                                <div className="absolute top-0 left-0 right-0 h-3 bg-black/15 rounded-t-xl" />
                                
                                <div className="mt-5 mx-auto w-14 h-14 bg-white/95 rounded-full border-2 border-[#8D6E63]/60 flex items-center justify-center mb-3 shadow-inner relative z-10">
                                    <Sprout size={28} className="text-[#5D4037]" />
                                </div>
                                
                                <div className="text-center px-1 relative z-10">
                                    <h3 className="font-bold text-[#3E2723] leading-snug text-xs line-clamp-3">
                                        {formatSeedDisplay(entry.growthGoal?.text)}
                                    </h3>
                                </div>

                                <div className="absolute bottom-2 left-0 right-0 text-center relative z-10">
                                    <span className="text-[9px] font-bold text-[#5D4037]/70 uppercase tracking-widest border-t border-[#5D4037]/25 pt-1.5">
                                        GROWING
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        
                        {/* Empty State for Active */}
                        {activeSeeds.length === 0 && (
                            <div className="col-span-2 py-12 border-2 border-dashed border-amber-200/80 rounded-xl flex flex-col items-center justify-center text-amber-700/80 bg-amber-50/60">
                                <Sprout size={32} className="mb-3 opacity-60" />
                                <span className="text-sm font-medium">暂无种子</span>
                            </div>
                        )}
                </div>
            </div>

        </div>

        {/* --- Seed Detail Modal (Scrapbook Card) --- */}
        <AnimatePresence>
            {selectedSeed && (
                <div className="absolute inset-0 z-50 flex items-center justify-center px-6">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedSeed(null)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        layoutId={`flower-${selectedSeed.id}`}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-[#FFFDF7] w-full max-w-sm p-6 relative z-10 flex flex-col items-center text-center border-4 border-white transform rotate-1 paper-texture rounded-2xl"
                        style={{ boxShadow: '0 28px 56px -14px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)' }}
                    >
                        {/* Washi Tape */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-red-100/80 tape transform -rotate-1 rounded-sm" />

                        <button 
                            onClick={() => setSelectedSeed(null)}
                            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors z-20"
                        >
                            <X size={24} />
                        </button>

                        <div className="mt-8 mb-6 relative">
                             <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-32 h-32 rounded-full bg-pink-100/50 blur-2xl" />
                             </div>
                             <svg className="absolute -top-4 -left-4 w-36 h-36 text-amber-200/60 z-0" viewBox="0 0 100 100">
                                <path d="M50,10 Q90,10 90,50 Q90,90 50,90 Q10,90 10,50 Q10,10 50,10" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="6 8" />
                             </svg>
                            <Flower2 size={72} className="text-pink-400 relative z-10" strokeWidth={1.5} fill="#FECACA" style={{ filter: 'drop-shadow(0 4px 12px rgba(244,114,182,0.35))' }} />
                        </div>

                        <div className="mb-6 w-full relative z-10">
                            <div className="inline-block border-b-2 border-[#2D2D2D] pb-1 mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(selectedSeed.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-[#2D2D2D] leading-tight px-2">
                                "{formatSeedDisplay(selectedSeed.growthGoal?.text)}"
                            </h3>
                        </div>

                        {/* Note Card */}
                        <div className="bg-white/95 w-full p-4 shadow-md border border-gray-200/80 text-left relative overflow-hidden transform -rotate-1 rounded-xl">
                            {/* Lined paper bg */}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, #000 20px)' }}></div>
                            
                            <p className="text-xs text-gray-400 font-bold uppercase mb-2 relative z-10">当时的心情</p>
                            <div className="flex flex-wrap gap-2 relative z-10">
                                {selectedSeed.moodType && (
                                    <span className="text-xs font-bold text-[#2D2D2D] bg-[#F3F4F6] px-2 py-1 border border-gray-300 rounded-sm">
                                        #{translateTag(selectedSeed.moodType, t)}
                                    </span>
                                )}
                                {selectedSeed.emotions?.map((em: string) => (
                                    <span key={em} className="text-xs text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded-sm">
                                        {translateTag(em, t)}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Undo Button */}
                        <button
                            onClick={() => {
                                toggleSeed(selectedSeed);
                                setSelectedSeed(null);
                            }}
                            className="mt-8 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-[#C83025] transition-colors group"
                        >
                            <RefreshCcw size={14} className="group-hover:-rotate-180 transition-transform duration-500" /> 
                            <span className="border-b border-transparent group-hover:border-[#C83025]">移回培育室</span>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </div>
    </BlobBackground>
  );
};

export default GardenPage;
