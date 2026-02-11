
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, X, ArrowRight, SkipForward, Loader2 } from 'lucide-react';
import { AppRoute } from '../types';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { analyzeImageMood } from '../services/geminiService';

const ImageJournal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentEntry, user, t } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const isOnboarding = location.state?.isOnboarding === true;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContinue = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const result = await analyzeImageMood(
        image,
        user.preferences.language,
        user.preferences.aiEnabled
      );
      setCurrentEntry({
        image,
        timestamp: new Date(),
        moodType: result.moodType,
        emotions: [],
        aiSuggestedEmotions: result.emotions || [],
        intensity: 50,
        note: result.vibeDescription,
        categories: [],
      });
      navigate(AppRoute.PHOTO_MOOD_SELECT);
    } catch {
      setCurrentEntry({
        image,
        timestamp: new Date(),
        moodType: 'Pleasant',
        emotions: [],
        intensity: 50,
        categories: [],
      });
      navigate(AppRoute.PHOTO_MOOD_SELECT);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSkip = () => {
      navigate(AppRoute.DASHBOARD);
  };

  return (
    <BlobBackground mood="Calm">
      <div className="flex flex-col h-full px-6 pt-24 pb-8 relative z-10 font-sans overflow-y-auto">
        
        {isOnboarding ? (
             <button 
                onClick={handleSkip}
                className="absolute top-8 right-6 z-50 px-4 py-2 bg-white/80 hover:bg-white crayon-box-sm backdrop-blur-md transition-all text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 shadow-sm border border-gray-200"
             >
                {t('journal.skip')} <SkipForward size={14} />
             </button>
        ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className="absolute top-8 left-6 z-50 p-3 bg-white/80 w-12 h-12 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 hover:bg-white shadow-sm border border-gray-200 cursor-pointer crayon-button"
            >
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
        )}

        <div className="absolute top-11 left-0 right-0 flex justify-center pointer-events-none z-0">
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">
                {isOnboarding ? t('journal.onboarding_label') : t('journal.label')}
             </span>
        </div>

        <div className="mb-6">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
                {isOnboarding ? t('journal.onboarding_title') : t('journal.title')}
            </h1>
            <p className="text-gray-600 text-sm font-medium">
                {isOnboarding ? t('journal.onboarding_desc') : t('journal.desc')}
            </p>
        </div>

        {/* --- Polaroid Frame Area --- */}
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center mb-6">
            <div className="bg-white p-4 pb-12 shadow-xl border border-gray-100 rotate-1 w-full max-w-sm transition-transform duration-300 hover:rotate-0 relative">
                {image ? (
                    <div className="aspect-square bg-gray-100 overflow-hidden relative group">
                        <img src={image} alt="Journal" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => setImage(null)}
                            className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-20"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square w-full bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 hover:bg-gray-100 transition-colors group"
                    >
                         <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                            <ImageIcon size={32} className="text-gray-400" />
                        </div>
                        <span className="font-bold text-gray-400 text-sm group-hover:text-gray-600">{t('journal.tap_upload')}</span>
                    </button>
                )}
                
                {/* Hand-drawn caption line placeholder */}
                {image && (
                     <div className="absolute bottom-4 left-4 right-4 h-6 border-b border-gray-200"></div>
                )}
            </div>
        </div>

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
        />

        <div className="mt-auto pt-4">
             <Button 
                onClick={handleContinue} 
                disabled={!image || analyzing}
                variant="primary"
                className="py-4 shadow-xl"
             >
                <span className="flex items-center justify-center gap-2">
                    {analyzing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {t('mood.analyzing_image')}
                      </>
                    ) : (
                      <>
                        {t('journal.reflect')} <ArrowRight size={20} />
                      </>
                    )}
                </span>
             </Button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default ImageJournal;
