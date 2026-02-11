
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, X, Sparkles, Loader2 } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { generateDetailedReport } from '../services/geminiService';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, history, t } = useAppContext();
  
  // Image state removed for cost savings
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const handleDetailedReport = async () => {
    setShowSummary(true);
    if (!summary) {
        setIsLoadingSummary(true);
        const text = await generateDetailedReport(user.name, history.slice(0, 10), user.preferences.language, user.preferences.aiEnabled);
        setSummary(text);
        setIsLoadingSummary(false);
    }
  };

  return (
    <BlobBackground>
      <div className="flex flex-col h-full px-6 pt-12 pb-10 relative">
        
        {/* Header */}
        <button type="button" onClick={() => navigate(-1)} className="absolute top-12 left-6 btn-icon -ml-1 z-20">
            <ChevronLeft size={24} strokeWidth={2} />
        </button>

        <div className="mt-12 text-center mb-8 relative z-10">
             <h1 className="text-[36px] font-black text-black leading-[1.1] tracking-tight whitespace-pre-line">
                {t('report.title')}
             </h1>
        </div>

        {/* Center Graphic - Simplified to non-generative placeholder */}
        <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="relative w-72 h-72 crayon-box flex items-center justify-center bg-gray-50 overflow-hidden shadow-sm">
                 <Sparkles size={48} className="text-gray-200" />
            </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col items-center gap-6 w-full relative z-10">
            <Button 
                onClick={handleDetailedReport}
                className="max-w-[200px] bg-[#C83025] hover:bg-[#A02018] text-white py-4 text-sm font-bold tracking-wide shadow-xl"
            >
                {t('report.detailed')}
            </Button>
            
            <button className="w-14 h-14 bg-black crayon-button flex items-center justify-center text-white hover:scale-105 transition-transform shadow-lg">
                <Download size={24} />
            </button>
        </div>

        {/* Summary Modal */}
        {showSummary && (
            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
                <div 
                    className="bg-white w-full rounded-t-[2.5rem] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-500"
                    style={{ maxHeight: '80%' }}
                >
                    <button 
                        onClick={() => setShowSummary(false)}
                        className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-black text-black mb-4 flex items-center gap-2">
                        {t('report.summary')} <Sparkles size={18} className="text-[#C83025]" />
                    </h2>

                    <div className="overflow-y-auto max-h-[60vh]">
                        {isLoadingSummary ? (
                            <div className="flex items-center gap-3 text-gray-500 py-10">
                                <Loader2 size={24} className="animate-spin" />
                                <span className="text-sm font-medium">{t('report.analyzing')}</span>
                            </div>
                        ) : (
                            <p className="text-lg text-gray-700 leading-relaxed font-medium">
                                {summary}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </BlobBackground>
  );
};

export default ReportPage;
