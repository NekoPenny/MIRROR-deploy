
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { AppRoute } from '../types';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { ArrowLeft } from 'lucide-react';

const OnboardingQuiz: React.FC = () => {
  const { user, setUser, t } = useAppContext();
  const navigate = useNavigate();
  
  const [stressHandling, setStressHandling] = useState('');
  const [rechargeMethod, setRechargeMethod] = useState('');

  const handleContinue = () => {
    if (stressHandling && rechargeMethod) {
      setUser(prev => ({ 
        ...prev, 
        quizAnswers: { stressHandling, rechargeMethod } 
      }));
      navigate(AppRoute.ONBOARDING_ANALYSIS);
    }
  };

  const handleSkip = () => {
      navigate(AppRoute.ONBOARDING_ANALYSIS);
  };

  const stressOptions = [
    t('onboarding.q1_opt1'),
    t('onboarding.q1_opt2'),
    t('onboarding.q1_opt3'),
    t('onboarding.q1_opt4')
  ];

  const rechargeOptions = [
    t('onboarding.q2_opt1'),
    t('onboarding.q2_opt2'),
    t('onboarding.q2_opt3'),
    t('onboarding.q2_opt4')
  ];

  const QuestionBlock = ({ title, options, value, onChange }: any) => (
    <div className="mb-10 relative">
        {/* Question Title */}
        <h3 className="text-xl font-bold text-[#2D2D2D] mb-4 flex items-start gap-2">
            <span className="text-[#FF6B6B]">Q:</span> 
            {title}
        </h3>
        
        {/* Hand-drawn List */}
        <div className="flex flex-col gap-2 pl-2">
            {options.map((opt: string) => {
                const isSelected = value === opt;
                return (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`group flex items-center gap-3 py-3 text-left transition-colors px-4 -mx-2 crayon-box-sm border border-transparent ${isSelected ? 'bg-white border-[#2D2D2D] shadow-sm' : 'hover:bg-white/50'}`}
                    >
                        {/* Checkbox Graphic */}
                        <div className={`
                            w-6 h-6 border-2 border-[#2D2D2D] rounded-md flex items-center justify-center bg-white flex-shrink-0 relative
                            transition-transform duration-200 group-active:scale-95
                        `}>
                             {isSelected && (
                                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="absolute -top-1 -right-1 text-[#C83025]">
                                     <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                                 </svg>
                             )}
                        </div>
                        
                        {/* Text */}
                        <span className={`
 text-lg leading-tight transition-colors
                            ${isSelected ? 'text-[#2D2D2D] font-bold underline decoration-wavy decoration-[#FF6B6B]/50' : 'text-gray-600'}
                        `}>
                            {opt}
                        </span>
                    </button>
                )
            })}
        </div>
    </div>
  );

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full px-6 pt-10 pb-10 relative z-10 font-sans">
        
        {/* Background Texture: Graph Paper */}
        <div className="absolute inset-4 top-16 bg-[#FFFDF7] shadow-sm border border-gray-200 -z-10"
             style={{
                 backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                 backgroundSize: '20px 20px'
             }}>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1">
                <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <div className="font-bold text-gray-400 text-sm tracking-widest">CHECK-IN</div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-20">
            <h1 className="text-4xl font-black text-[#2D2D2D] mb-8 text-center transform -rotate-1">
                {t('onboarding.quiz_title')}
            </h1>

            <QuestionBlock 
                title={t('onboarding.q1')} 
                options={stressOptions} 
                value={stressHandling} 
                onChange={setStressHandling} 
            />

            <div className="border-t-2 border-dashed border-gray-300 my-2 opacity-50"></div>

            <QuestionBlock 
                title={t('onboarding.q2')} 
                options={rechargeOptions} 
                value={rechargeMethod} 
                onChange={setRechargeMethod} 
            />
        </div>

        <div className="absolute bottom-8 left-6 right-6 flex flex-col gap-3">
           <Button 
             onClick={handleContinue} 
             disabled={!stressHandling || !rechargeMethod}
             className="shadow-[4px_4px_0px_#2D2D2D] active:shadow-none"
           >
             {t('onboarding.gen_profile')}
           </Button>

           <button 
              onClick={handleSkip}
              className="text-gray-400 text-xs font-bold hover:text-black transition-colors text-center"
           >
              ( {t('onboarding.skip_quiz')} )
           </button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default OnboardingQuiz;
