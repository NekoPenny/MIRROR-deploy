
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { analyzeSpiritAnimal } from '../services/geminiService';
import { ANIMALS } from '../services/animalService';

const AnimalPersona: React.FC = () => {
  const { user, setUser, t } = useAppContext();
  const navigate = useNavigate();
  
  // Initialize from user state if available
  const [loading, setLoading] = useState(!user.spiritAnimal);
  const [animalData, setAnimalData] = useState<{ animal: string, reason: string } | null>(
      user.spiritAnimal ? { animal: user.spiritAnimal.animal, reason: user.spiritAnimal.reason } : null
  );
  const [animalImage, setAnimalImage] = useState<string | null>(
      user.spiritAnimal ? user.spiritAnimal.image : null
  );
  const [error, setError] = useState(false);

  const fetchPersona = async () => {
      setLoading(true);
      setError(false);
      try {
          // 1. Analyze text to get animal name
          const analysis = await analyzeSpiritAnimal(
              user.name, 
              user.mbti || 'Unknown', 
              user.quizAnswers || {}, 
              user.preferences.language,
              user.preferences.aiEnabled
          );
          
          // 2. Map animal name to our SVG assets
          // Normalize the name to lowercase ID
          const matchedAnimal = ANIMALS.find(a => a.id === analysis.animal.toLowerCase()) || ANIMALS[0];
          
          // Use the localized name if available for display, but keep original analysis reason
          const newSpiritAnimal = {
              animal: analysis.animal,
              reason: analysis.reason,
              image: matchedAnimal.image
          };

          // Update Local State
          setAnimalData({ animal: analysis.animal, reason: analysis.reason });
          setAnimalImage(matchedAnimal.image);

          // Update Global State (Persist)
          setUser(prev => ({
              ...prev,
              spiritAnimal: newSpiritAnimal
          }));

      } catch (e) {
          console.error("Failed to generate animal persona", e);
          setError(true);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    // Only fetch if no data exists
    if (!user.spiritAnimal) {
        fetchPersona();
    }
  }, []);

  const handleRegenerate = () => {
      fetchPersona();
  };

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full relative font-sans overflow-hidden">
        
        {/* Nav */}
        <div className="px-6 pt-10 pb-4 flex items-center justify-between z-30 sticky top-0">
             <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1">
                <ArrowLeft size={24} strokeWidth={2} />
             </button>
             <span className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">{t('animal.persona_header')}</span>
             
             <button 
                onClick={handleRegenerate} 
                disabled={loading}
                className="p-2 -mr-2 text-gray-400 hover:text-[#C83025] transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                title={t('animal.regenerate')}
             >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 pb-20">
            
            {loading ? (
                <div className="flex flex-col items-center gap-6 animate-pulse">
                     <div className="w-64 h-64 rounded-full border-[6px] border-gray-100 flex items-center justify-center bg-white relative">
                         <div className="absolute inset-0 bg-[#C83025] blur-3xl opacity-10 rounded-full animate-ping"></div>
                         <Sparkles size={48} className="text-gray-300" />
                     </div>
                     <div className="text-center">
                         <h2 className="text-xl font-bold text-gray-900 mb-2">{t('animal.analyzing')}</h2>
                         <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">{t('animal.analyzing_sub')}</p>
                     </div>
                </div>
            ) : error ? (
                <div className="text-center px-10">
                    <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">{t('animal.error')}</p>
                    <div className="flex flex-col gap-3 mt-8">
                        <Button onClick={handleRegenerate}>{t('animal.try_again')}</Button>
                        <button onClick={() => navigate(-1)} className="text-gray-400 text-sm font-bold">{t('animal.go_back')}</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
                    
                    {/* Title */}
                    <h1 className="text-4xl font-black text-gray-900 leading-[0.9] text-center mb-8 whitespace-pre-line tracking-tight">
                        {t('animal.title')}
                    </h1>

                    {/* Image Card */}
                    <div className="relative w-72 h-72 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border-4 border-white overflow-hidden mb-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                        {animalImage ? (
                            <img src={animalImage} alt="Spirit Animal" className="w-full h-full object-contain p-4 mix-blend-multiply" />
                        ) : (
                            <div className="text-gray-300 font-bold">{t('animal.image_unavailable')}</div>
                        )}
                        {/* Tape effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-100/50 backdrop-blur-sm rotate-1"></div>
                    </div>

                    {/* Text Details */}
                    <div className="text-center">
                        <div className="inline-block bg-black text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase mb-4 shadow-lg">
                            {animalData?.animal}
                        </div>
                        <p className="text-gray-600 font-medium font-serif italic text-lg leading-relaxed px-4">
                            "{animalData?.reason}"
                        </p>
                    </div>

                    {/* Share Button */}
                    <button className="mt-12 flex items-center gap-2 text-gray-400 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
                        <Share2 size={16} /> {t('animal.share')}
                    </button>

                </div>
            )}

        </div>
      </div>
    </BlobBackground>
  );
};

export default AnimalPersona;
