
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Snowflake, Camera, Check } from 'lucide-react';
import { useAppContext } from '../App';
import { AppRoute } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';

export default function PanicMode() {
  const { setUser, t } = useAppContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
              // Resize logic
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 800;
              let w = img.width;
              let h = img.height;
              
              if (w > h) {
                  if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
              } else {
                  if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
              }
              
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, w, h);
              
              setSelectedImage(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFreeze = () => {
      if (isFrozen) return; // Prevent double click
      setIsFrozen(true);
      
      setUser(prev => ({
          ...prev,
          pendingFrozenEntry: {
              timestamp: new Date(),
              image: selectedImage || ''
          }
      }));

      // Wait a bit longer to see the stamp effect, then exit
      setTimeout(() => {
          navigate(AppRoute.DASHBOARD);
      }, 2000);
  };

  return (
    <div className="h-full w-full bg-[#121212] relative overflow-hidden flex flex-col font-sans">
        
        {/* Background Texture (Dark Paper) */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ 
                 backgroundImage: `url("https://www.transparenttextures.com/patterns/black-paper.png")`,
                 backgroundSize: '300px'
             }}>
        </div>

        {/* Top Bar */}
        <div className="px-6 pt-12 pb-4 flex justify-between items-center z-20">
            <button 
                onClick={() => navigate(-1)} 
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-md"
            >
                <X size={20} />
            </button>
            
            <div className="flex items-center gap-2 opacity-60">
                 <div className="h-px w-8 bg-white/20"></div>
                 <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.3em] font-sans">{t('panic.mode')}</span>
                 <div className="h-px w-8 bg-white/20"></div>
            </div>
            
            <div className="w-10"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 pb-10">
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm flex flex-col items-center"
            >
                {/* Title Section */}
                <div className="text-center mb-10 transition-opacity duration-500" style={{ opacity: isFrozen ? 0.5 : 1 }}>
                    <h1 className="text-3xl font-black text-white/90 font-serif italic mb-2 tracking-wide">
                        {isFrozen ? t('panic.frozen_title') : t('panic.snap_hint')}
                    </h1>
                    <p className="text-[#666] text-xs font-bold uppercase tracking-widest">
                        {isFrozen ? t('panic.frozen_desc') : t('panic.snap_hint_sub')}
                    </p>
                </div>

                {/* Polaroid Frame */}
                <div 
                    onClick={() => !isFrozen && fileInputRef.current?.click()}
                    className={`relative w-full max-w-[280px] mb-12 group transition-all duration-500 ${!isFrozen ? 'cursor-pointer' : ''}`}
                >
                    {/* Translucent Tape */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/20 backdrop-blur-sm transform -rotate-1 z-20 shadow-sm border-l border-r border-white/10"></div>

                    {/* Card Body */}
                    <div className="bg-[#FDFBF7] p-3 pb-12 shadow-2xl transform rotate-1 transition-transform duration-300 group-hover:rotate-0 rounded-[2px] relative overflow-hidden">
                        
                        {/* Photo Area */}
                        <div className="aspect-square bg-[#1A1A1A] relative flex flex-col items-center justify-center overflow-hidden border border-gray-100/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                            {selectedImage ? (
                                <img src={selectedImage} className={`w-full h-full object-cover transition-all duration-1000 ${isFrozen ? 'grayscale-[50%] contrast-125' : ''}`} alt="Evidence" />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-[#444]">
                                    <Camera size={32} strokeWidth={1.5} />
                                    <span className="font-bold text-[10px] tracking-widest uppercase">点击上传照片</span>
                                </div>
                            )}
                        </div>

                        {/* --- THE STAMP ANIMATION --- */}
                        <AnimatePresence>
                            {isFrozen && (
                                <motion.div
                                    initial={{ scale: 2, opacity: 0, rotate: -25 }}
                                    animate={{ scale: 1, opacity: 0.85, rotate: -15 }}
                                    transition={{ 
                                        type: "spring", 
                                        stiffness: 300, 
                                        damping: 15,
                                        mass: 1.5
                                    }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                                >
                                    <div className="border-[6px] border-blue-400/80 px-6 py-2 rounded-sm mix-blend-multiply">
                                        <span className="text-3xl font-black text-blue-400/80 tracking-[0.2em] uppercase font-sans whitespace-nowrap">
                                            FROZEN
                                        </span>
                                    </div>
                                    {/* Ink Splatter Effect (Simulated with div blobs) */}
                                    <div className="absolute -top-2 -left-2 w-2 h-2 bg-blue-400/60 rounded-full blur-[1px]"></div>
                                    <div className="absolute bottom-1 -right-3 w-3 h-3 bg-blue-400/40 rounded-full blur-[2px]"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                    
                    {/* Paperclip Note appearing on freeze */}
                    <AnimatePresence>
                        {isFrozen && (
                            <motion.div
                                initial={{ y: -50, opacity: 0, rotate: 5 }}
                                animate={{ y: 0, opacity: 1, rotate: 2 }}
                                transition={{ delay: 0.4, type: "spring" }}
                                className="absolute -bottom-6 -right-4 bg-[#FEF3C7] text-[#451a03] p-3 shadow-lg max-w-[150px] transform z-30 text-xs font-bold leading-tight border border-yellow-200/50"
                            >
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 text-gray-300">
                                    {/* Paperclip Icon simulation or SVG */}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 transform rotate-45">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                    </svg>
                                </div>
                                已封存。稍后再处理。
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="w-full relative h-20">
                    <AnimatePresence mode="wait">
                        {!isFrozen ? (
                            <motion.div 
                                key="btn-freeze"
                                exit={{ opacity: 0, y: 10 }}
                                className="w-full"
                            >
                                <button 
                                    onClick={handleFreeze}
                                    className="w-full py-4 bg-white hover:bg-gray-100 text-[#2D2D2D] font-black text-xl rounded-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all flex items-center justify-center gap-2 transform -rotate-1 relative"
                                >
                                    <Snowflake size={22} className="text-[#2D2D2D]" /> 
                                    {t('panic.frozen_title')}
                                </button>
                                
                                <div className="text-center mt-6">
                                    <button onClick={handleFreeze} className="text-[#444] text-[10px] font-black tracking-[0.2em] uppercase hover:text-[#666] transition-colors">
                                        {t('panic.skip_photo')}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="btn-done"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full flex justify-center pt-2"
                            >
                                <div className="flex flex-col items-center gap-2 text-white/50">
                                    <Check className="w-8 h-8 text-green-400" />
                                    <span className="text-xs font-bold tracking-widest uppercase">Safe</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </motion.div>
        </div>

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
        />
    </div>
  );
}
