
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, RefreshCw } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { generateInsight } from '../services/geminiService';

const Insight: React.FC = () => {
  const { user, history, t } = useAppContext();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      setLoading(true);
      const recentHistory = history.slice(0, 5); 
      // Pass the user's language preference
      const text = await generateInsight(user.name || 'Friend', recentHistory, user.preferences.language, user.preferences.aiEnabled);
      setInsight(text);
      setLoading(false);
    };

    fetchInsight();
  }, [user.name, history, user.preferences.language, user.preferences.aiEnabled]);

  return (
    <BlobBackground>
      <div className="flex flex-col h-full px-6 pt-12 pb-10 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1">
                <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">{t('chat.brand')}</span>
            <div className="w-6"></div>
        </div>

        <h1 className="text-3xl font-black text-black mb-1">{t('insight.title')}</h1>
        <p className="text-gray-300 font-light text-xl mb-12">{t('insight.curated')}</p>

        <div className="flex-1 flex flex-col justify-center items-center px-4 relative">
             <div className="absolute top-0 left-0 text-gray-100 text-9xl font-serif leading-none">“</div>
             
             {loading ? (
                 <div className="flex flex-col items-center">
                     <RefreshCw className="animate-spin text-gray-300 mb-4" />
                     <p className="text-gray-400 text-sm">{t('insight.reflecting')}</p>
                 </div>
             ) : (
                <p className="text-2xl text-center font-script text-black leading-relaxed relative z-10 px-4">
                    {insight}
                </p>
             )}
        </div>

        <div className="mt-auto w-full flex justify-center">
             <button className="w-14 h-14 bg-[#C83025] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#A02018] transition-colors">
                <Download size={24} />
             </button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default Insight;
