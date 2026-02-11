
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, X, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { ANIMALS, getAnimalDetails } from '../services/animalService';
import { AnimatePresence, motion } from 'framer-motion';

const AnimalCollection: React.FC = () => {
  const { user, t } = useAppContext();
  const navigate = useNavigate();
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  // Forced to Chinese per app preference in App.tsx
  const lang = 'Chinese';
  
  const totalAnimals = ANIMALS.length;
  const unlockedCount = user.unlockedAnimals ? user.unlockedAnimals.length : 0;
  const progress = Math.round((unlockedCount / totalAnimals) * 100);

  const handleAnimalClick = (id: string) => {
     setSelectedAnimalId(id);
  };

  const selectedDetails = selectedAnimalId ? getAnimalDetails(selectedAnimalId, lang) : null;
  const isSelectedUnlocked = selectedAnimalId ? (user.unlockedAnimals || []).includes(selectedAnimalId) : false;

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full min-h-0 font-sans relative overflow-hidden">
        
        {/* Header - Scrapbook Style */}
        <div className="px-6 pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-[#EAE8E1]/80 backdrop-blur-sm">
             <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1">
                <ArrowLeft size={24} strokeWidth={2} />
             </button>
             
             {/* Title Tape */}
             <div className="relative transform -rotate-1">
                <div className="absolute inset-0 bg-[#FEF3C7] shadow-sm border border-yellow-200/50 skew-x-1"></div>
                {/* Tape strips at ends */}
                <div className="absolute -left-2 top-1 w-4 h-6 bg-white/40 -rotate-12 backdrop-blur-sm"></div>
                <div className="absolute -right-2 top-1 w-4 h-6 bg-white/40 rotate-12 backdrop-blur-sm"></div>
                
                <span className="relative z-10 text-lg font-black text-[#4E342E] px-8 py-1 block tracking-wider">
                    {t('animal.collection_title', { defaultValue: '小动物图鉴' })}
                </span>
             </div>
             
             <div className="w-8"></div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-nav no-scrollbar pt-4">
            
            {/* Progress - Note Card */}
            <div className="mb-10 mx-2 relative">
                 {/* Top Tape */}
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-32 h-8 bg-red-100/50 tape transform rotate-1"></div>
                 
                 <div className="bg-white paper-texture p-4 pb-6 shadow-[3px_5px_15px_rgba(0,0,0,0.07)] transform rotate-[0.5deg] border border-gray-200 flex flex-col items-center rounded-[2px]">
                    <h2 className="font-bold text-xl text-[#2D2D2D] mb-2">{t('animal.your_guides', { defaultValue: '已解锁的伙伴' })}</h2>
                    
                    <div className="w-full flex items-center gap-3 px-4">
                        <span className="text-xs font-bold text-gray-400 font-mono">0</span>
                        {/* Sketchy Progress Bar */}
                        <div className="flex-1 h-3 border-2 border-[#2D2D2D] p-[2px] relative rounded-[2px]">
                            <div 
                                className="h-full bg-[#2D2D2D] relative transition-all duration-1000" 
                                style={{ width: `${progress}%` }}
                            >
                                {/* Scribble texture inside bar */}
                                <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/sketch.png')]"></div>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 font-mono">{totalAnimals}</span>
                    </div>
                 </div>
            </div>

            {/* Grid - Stamps */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 px-2 pb-10">
                {ANIMALS.map((animal, index) => {
                    const isUnlocked = (user.unlockedAnimals || []).includes(animal.id);
                    const details = getAnimalDetails(animal.id, lang);
                    
                    // Randomize rotation slightly
                    const rotation = index % 3 === 0 ? 'rotate-2' : index % 2 === 0 ? '-rotate-1' : 'rotate-1';
                    const tapeColor = index % 3 === 0 ? 'bg-blue-100/60' : index % 2 === 0 ? 'bg-yellow-100/60' : 'bg-green-100/60';

                    return (
                        <button 
                            key={animal.id}
                            onClick={() => handleAnimalClick(animal.id)}
                            className={`relative group focus:outline-none transition-all duration-300 hover:scale-105 hover:z-20 ${rotation} hover:rotate-0`}
                        >
                            <div className={`
                                aspect-[3/4] p-3 flex flex-col items-center relative
                                ${isUnlocked 
                                    ? 'bg-white shadow-[2px_4px_8px_rgba(0,0,0,0.1)] border border-gray-200' 
                                    : 'bg-transparent border-2 border-dashed border-gray-300 opacity-60 hover:opacity-100 hover:bg-gray-50'
                                }
                                rounded-[2px]
                            `}>
                                {isUnlocked && (
                                    <>
                                        {/* Washi Tape at top */}
                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 ${tapeColor} tape transform -rotate-1`}></div>
                                        
                                        {/* Image Area - Square Polaroid Style */}
                                        <div className="w-full aspect-square bg-gray-50 relative overflow-hidden border border-gray-100 mb-3 p-2 rounded-[2px]">
                                            <div className={`absolute inset-0 opacity-20 ${animal.color}`}></div>
                                            <img 
                                                src={animal.image} 
                                                className="w-full h-full object-contain mix-blend-multiply relative z-10" 
                                                alt={details?.displayName} 
                                            />
                                            {/* Corner texture */}
                                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-gray-200/50 transform rotate-45 translate-y-2 translate-x-2"></div>
                                        </div>
                                        
                                        {/* Name Label - Handwritten */}
                                        <div className="w-full border-t border-dashed border-gray-200 pt-2 mt-auto">
                                            <span className="text-sm font-black text-[#2D2D2D] block truncate text-center">
                                                {details?.displayName}
                                            </span>
                                        </div>

                                        {/* Stamp Mark */}
                                        <div className="absolute -bottom-2 -right-2 text-red-500 opacity-80 transform -rotate-12 border-2 border-red-500 rounded-full p-0.5 px-1 text-[8px] font-black uppercase tracking-widest bg-white/80">
                                            FOUND
                                        </div>
                                    </>
                                )}

                                {!isUnlocked && (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 border-2 border-gray-300 border-dashed rounded-[2px] flex items-center justify-center mb-2">
                                            <Lock size={20} className="text-gray-300" />
                                        </div>
                                        <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">LOCKED</span>
                                        <div className="mt-2 h-2 w-12 bg-gray-200/50 rounded-sm"></div>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Modal - Scrapbook Pop-up */}
        <AnimatePresence>
            {selectedAnimalId && selectedDetails && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-6">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-[#FDFBF7] w-full max-w-sm p-2 shadow-2xl relative paper-texture rounded-[2px]"
                    >
                        {/* Inner Border Container */}
                        <div className="border-[2px] border-[#2D2D2D] p-5 h-full relative rounded-[2px] border-dashed">
                             
                             {/* Corner Screws/Rivets visual */}
                             <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center"><div className="w-1 h-[1px] bg-gray-400 transform rotate-45"></div></div>
                             <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center"><div className="w-1 h-[1px] bg-gray-400 transform rotate-45"></div></div>
                             <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center"><div className="w-1 h-[1px] bg-gray-400 transform rotate-45"></div></div>
                             <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center"><div className="w-1 h-[1px] bg-gray-400 transform rotate-45"></div></div>

                             <button 
                                onClick={() => setSelectedAnimalId(null)}
                                className="absolute -top-3 -right-3 bg-[#2D2D2D] text-white p-2 hover:scale-110 transition-transform shadow-md rounded-[2px]"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center pt-2">
                                
                                {/* Image Card */}
                                <div className="bg-white p-3 pb-8 shadow-lg transform rotate-1 mb-6 relative border border-gray-200 rounded-[2px] w-full max-w-[200px]">
                                    {/* Tape */}
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-yellow-100/50 tape"></div>
                                    
                                    <div className="w-full aspect-square bg-gray-50 border border-gray-100 relative overflow-hidden rounded-[2px]">
                                         {isSelectedUnlocked ? (
                                            <>
                                                <div className={`absolute inset-0 opacity-20 ${selectedDetails.color}`}></div>
                                                <img src={selectedDetails.image} className="w-full h-full object-contain p-2 mix-blend-multiply" alt="Spirit" />
                                            </>
                                         ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Lock size={32} />
                                            </div>
                                         )}
                                    </div>
                                    <div className="absolute bottom-2 left-0 right-0 text-center">
                                        <span className="text-xs font-bold text-gray-500">FIG. {selectedDetails.id.toUpperCase()}</span>
                                    </div>
                                </div>

                                <div className="text-center w-full">
                                    <h2 className="text-3xl font-black text-[#2D2D2D] mb-1 uppercase tracking-tight">
                                        {isSelectedUnlocked ? selectedDetails.displayName : "???"}
                                    </h2>
                                    <div className="h-1 w-20 bg-gray-200 mx-auto mb-4 rounded-full"></div>

                                    {isSelectedUnlocked ? (
                                        <div className="bg-[#F5F5F4] p-4 border-l-4 border-[#2D2D2D] text-left">
                                             <p className="text-sm text-gray-700 font-serif italic leading-relaxed">
                                                "{selectedDetails.displayDesc}"
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 rounded-[2px]">
                                            <p className="text-xs font-bold text-gray-500 mb-1 font-mono uppercase tracking-widest">{t('animal.unlock_hint_title', {defaultValue: '解锁提示'})}</p>
                                            <p className="text-sm text-gray-400">{selectedDetails.displayHint}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </div>
    </BlobBackground>
  );
};

export default AnimalCollection;
