
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Fingerprint, PenTool } from 'lucide-react';
import { useAppContext } from '../App';
import { AppRoute } from '../types';
import Button from '../components/Button';
import BlobBackground from '../components/BlobBackground';
import { generateUserPersona } from '../services/geminiService';
import { motion } from 'framer-motion';

const OnboardingAnalysis: React.FC = () => {
  const { user, setUser, t } = useAppContext();
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar simulation
    const startTime = Date.now();
    const duration = 3000; // Animation duration aligns roughly with minDelay

    const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min((elapsed / duration) * 100, 100);
        setProgress(p);
        if (p >= 100 && !analyzing) clearInterval(interval);
    }, 30);

    const createPersona = async () => {
      const minDelay = new Promise(resolve => setTimeout(resolve, 3000));
      const genPromise = generateUserPersona(
          user.name, 
          user.mbti || 'Unknown', 
          user.quizAnswers || { stressHandling: '', rechargeMethod: '' },
          user.preferences.language,
          user.preferences.aiEnabled
      );

      const [_, result] = await Promise.all([minDelay, genPromise]);
      
      setUser(prev => ({ 
          ...prev, 
          emotionalProfile: result,
          hasOnboarded: true 
      }));
      setAnalyzing(false);
      clearInterval(interval);
      setProgress(100);
    };

    createPersona();
    return () => clearInterval(interval);
  }, [user.name, user.mbti, user.quizAnswers, setUser, user.preferences.language, user.preferences.aiEnabled]);

  const handleFinish = () => {
    navigate(AppRoute.IMAGE_JOURNAL, { state: { isOnboarding: true } });
  };

  const loadingText = progress < 40 ? t('onboarding.connecting') : 
                      progress < 80 ? t('onboarding.analyzing') : 
                      t('onboarding.drawing_map');

  return (
    <BlobBackground mood="Thrilled">
      <div className="flex flex-col h-full px-8 pt-12 pb-10 relative z-10 font-sans">
        
        {analyzing ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center">
                
                {/* Sketching Animation Container */}
                <div className="relative mb-12">
                    {/* The Canvas */}
                    <motion.div 
                        animate={{ rotate: [1, -1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-48 h-48 bg-white border-[3px] border-[#2D2D2D] rounded-[24px] shadow-[8px_8px_0px_#2D2D2D] flex items-center justify-center relative overflow-hidden crayon-box"
                    >
                         {/* Animated Scribbles */}
                         <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 100 100">
                            <motion.path 
                                d="M10,50 Q25,20 50,50 T90,50"
                                fill="none"
                                stroke="#FF6B6B"
                                strokeWidth="6"
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                            />
                            <motion.path 
                                d="M10,30 Q25,60 50,30 T90,30"
                                fill="none"
                                stroke="#FCD34D"
                                strokeWidth="6"
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.8, delay: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                            />
                             <motion.path 
                                d="M20,80 Q50,40 80,80"
                                fill="none"
                                stroke="#60A5FA"
                                strokeWidth="6"
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 2, delay: 0.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                            />
                         </svg>
                    </motion.div>
                    
                    {/* Floating Pencil */}
                    <motion.div 
                        className="absolute -right-8 -bottom-2 text-[#2D2D2D] drop-shadow-xl z-20"
                        animate={{ 
                            x: [-5, 5, -5],
                            y: [-5, 5, -5],
                            rotate: [-5, 5, -5]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <PenTool size={56} fill="#FFF" strokeWidth={2.5} />
                    </motion.div>
                </div>

                <motion.h2 
                    key={loadingText}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-[#2D2D2D] mb-6 min-h-[2rem]"
                >
                    {loadingText}
                </motion.h2>

                {/* Hand-drawn Progress Bar */}
                <div className="w-64 h-5 border-2 border-[#2D2D2D] rounded-full p-1 bg-white relative overflow-hidden shadow-sm">
                    <motion.div 
                        className="h-full bg-[#2D2D2D] rounded-full relative"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                    >
                         {/* Texture overlay for crayon feel */}
                         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/crumpled-paper.png')]"></div>
                    </motion.div>
                </div>

            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-700">
                
                {/* Result Card - Retro File Folder Style */}
                <div className="relative w-full mb-8">
                    {/* Paper Clip */}
                    <div className="absolute -top-4 right-8 w-4 h-12 rounded-full border-2 border-gray-400 z-20 bg-transparent"></div>
                    
                    <div className="bg-[#FFFDF7] p-6 pt-10 rounded-sm shadow-[5px_10px_20px_rgba(0,0,0,0.15)] border border-gray-200 relative transform rotate-1">
                        
                        {/* Stamp */}
                        <div className="absolute top-4 right-4 border-2 border-red-800/30 text-red-900/30 p-1 px-2 font-black text-[10px] uppercase transform rotate-12 select-none tracking-widest">
                            {t('onboarding.confidential')}
                        </div>

                        <div className="flex items-center gap-3 border-b-2 border-[#2D2D2D] pb-4 mb-6">
                            <div className="p-2 bg-[#2D2D2D] text-white">
                                <Fingerprint size={24} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">{t('onboarding.identity')}</h3>
                                <h1 className="text-2xl font-black text-[#2D2D2D] font-mono uppercase">{user.name}</h1>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-[10px] font-bold bg-black text-white px-1 py-0.5 mb-2 inline-block">{t('onboarding.type')}</span>
                            <div className="text-5xl font-black text-[#2D2D2D] tracking-tighter">{user.mbti || 'N/A'}</div>
                        </div>
                        
                        <div className="bg-gray-50 p-4 border border-gray-100 font-serif text-lg text-gray-800 leading-relaxed italic relative">
                            <span className="absolute top-[-10px] left-2 text-4xl text-gray-200">“</span>
                            {user.emotionalProfile || t('onboarding.default_persona')}
                            <span className="absolute bottom-[-20px] right-2 text-4xl text-gray-200">”</span>
                        </div>

                        {/* Barcode Deco */}
                        <div className="mt-6 h-8 w-full opacity-30 flex gap-1 items-end justify-center">
                            {Array.from({length: 30}).map((_,i) => (
                                <div key={i} className="bg-black w-1" style={{ height: `${Math.random() * 100}%`, width: Math.random() > 0.5 ? '2px' : '4px' }}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full px-4">
                    <Button 
                        onClick={handleFinish} 
                        className="py-4 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-shadow"
                    >
                        {t('onboarding.begin')} <ArrowRight size={20} />
                    </Button>
                </div>
            </div>
        )}
      </div>
    </BlobBackground>
  );
};

export default OnboardingAnalysis;
