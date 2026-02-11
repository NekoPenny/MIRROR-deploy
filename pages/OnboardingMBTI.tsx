
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { AppRoute } from '../types';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const OnboardingMBTI: React.FC = () => {
  const { user, setUser, t } = useAppContext();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);

  const handleSelect = (type: string) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      setUser(prev => ({ ...prev, mbti: selectedType }));
      navigate(AppRoute.ONBOARDING_QUIZ);
    }
  };

  return (
    <BlobBackground mood="Calm">
      <div className="flex flex-col h-full px-6 pt-10 pb-6 relative z-10 font-sans">
        
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
            <button 
onClick={() => navigate(-1)} 
                className="btn-icon -ml-1"
              >
                <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <div className="border-b-2 border-[#2D2D2D] px-2">
                <span className="text-sm font-bold text-[#2D2D2D]">PAGE 2</span>
            </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-[#2D2D2D] bg-[#FFFBEB] inline-block px-4 py-1 transform -rotate-1 border border-[#2D2D2D] crayon-box-sm shadow-[2px_2px_0px_#000]">
                {t('onboarding.mbti_title')}
            </h1>
            <p className="mt-4 text-gray-500 text-sm leading-relaxed px-4">
                {t('onboarding.mbti_desc')}
            </p>
        </div>

        {/* Sticker Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-2">
            <div className="grid grid-cols-4 gap-3">
                {MBTI_TYPES.map((type, idx) => {
                    const isSelected = selectedType === type;
                    // Random slight rotation for natural look
                    const rotation = (idx % 3 === 0 ? 2 : idx % 2 === 0 ? -2 : 0);
                    
                    return (
                        <button
                            key={type}
                            onClick={() => handleSelect(type)}
                            style={{ transform: `rotate(${rotation}deg)` }}
                            className={`
                                aspect-square flex items-center justify-center relative group transition-all duration-200
                                ${isSelected ? 'scale-110 z-10' : 'hover:scale-105'}
                            `}
                        >
                            {/* Sticker Body */}
                            <div className={`
                                absolute inset-0 crayon-box shadow-[2px_2px_0px_rgba(0,0,0,0.1)]
                                ${isSelected ? 'bg-[#FF6B6B] border-[#2D2D2D]' : 'bg-white'}
                            `}>
                                {/* Perforated Edges Effect (CSS Mask would be better but simple border works for sketchy style) */}
                                <div className="absolute top-1 left-1 right-1 bottom-1 border border-dashed border-gray-300 opacity-50 crayon-box-sm"></div>
                            </div>

                            <span className={`relative z-10 font-bold text-sm ${isSelected ? 'text-white' : 'text-[#2D2D2D]'}`}>
                                {type}
                            </span>

                            {/* Selection Mark */}
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-white rounded-full text-[#2D2D2D] border-2 border-[#2D2D2D] z-20">
                                    <CheckCircle2 size={16} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-8 text-center">
               <button 
                  onClick={() => {
                      setUser(prev => ({ ...prev, mbti: 'Unknown' }));
                      navigate(AppRoute.ONBOARDING_QUIZ);
                  }}
                  className="text-xs text-gray-400 font-bold underline decoration-wavy decoration-gray-300 hover:text-black transition-colors"
                >
                  {t('onboarding.dont_know')}
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 px-6">
            <Button 
                onClick={handleContinue} 
                disabled={!selectedType}
                className="w-full shadow-xl"
            >
                {t('onboarding.continue')}
            </Button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default OnboardingMBTI;
