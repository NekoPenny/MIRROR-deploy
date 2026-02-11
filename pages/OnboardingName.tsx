
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { AppRoute } from '../types';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { PenTool } from 'lucide-react';

const OnboardingName: React.FC = () => {
  const { setUser, t } = useAppContext();
  const [nameInput, setNameInput] = useState('');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (nameInput.trim()) {
      setUser(prev => ({ ...prev, name: nameInput }));
      navigate(AppRoute.ONBOARDING_MBTI);
    }
  };

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full min-h-0 relative font-sans">
        {/* 可滚动区域，保证小屏与安全区下「继续」按钮完整可见 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Lined Paper Background Effect for this page */}
          <div className="absolute inset-4 top-12 bottom-24 bg-white shadow-sm border border-gray-200 transform rotate-1 -z-10"
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #a5b4fc 40px)',
                 backgroundSize: '100% 40px'
               }}>
            <div className="absolute top-0 bottom-0 left-8 w-px bg-red-200/50 border-r border-red-200" />
          </div>

          <div className="flex flex-col px-10 pt-14 pb-6">
            <div className="ml-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 mb-8 opacity-60">
                <PenTool size={18} className="text-[#2D2D2D]" />
                <span className="text-xs font-bold tracking-widest uppercase text-[#2D2D2D]">Journal Entry #001</span>
              </div>

              <div className="mb-8">
                <h1 className="text-4xl font-black text-[#2D2D2D] mb-2 leading-tight transform -rotate-1">
                  {t('onboarding.hello')}
                </h1>
                <p className="text-xl text-gray-500 leading-relaxed">
                  {t('onboarding.name_ask')}
                </p>
              </div>

              <div className="relative mt-6">
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 font-sans">Name:</label>
                <input
                  type="text"
                  placeholder={t('onboarding.name_placeholder')}
                  className="w-full text-4xl font-bold text-[#2D2D2D] placeholder-gray-200 outline-none bg-transparent border-b-4 border-[#2D2D2D] py-2 focus:border-[#FF6B6B] transition-colors"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                  autoFocus
                  style={{ lineHeight: '1.5' }}
                />
                <div className="absolute right-0 bottom-4 text-gray-300 pointer-events-none">
                  <PenTool size={24} className="transform rotate-180" />
                </div>
              </div>
            </div>

            {/* Footer：留出安全区，避免按钮被裁切或遮挡 */}
            <div className="mt-10 w-full flex justify-end pb-[calc(1.5rem+var(--safe-bottom,0px))]">
              <Button
                onClick={handleContinue}
                disabled={!nameInput}
                className="max-w-[160px] rotate-2"
              >
                {t('onboarding.continue')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </BlobBackground>
  );
};

export default OnboardingName;
