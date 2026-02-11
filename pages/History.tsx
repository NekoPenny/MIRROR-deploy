
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, MapPin, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { MOOD_HEX_CODES, AppRoute } from '../types';
import { motion } from 'framer-motion';
import { translateTag } from '../utils/translateTag';

const HistoryPage: React.FC = () => {
  const ctx = useAppContext();
  const navigate = useNavigate();
  const history = Array.isArray(ctx?.history) ? ctx.history : [];
  const t = ctx?.t ?? ((k: string) => k);

  const handleEntryClick = (dateStr: string) => {
    navigate(AppRoute.DAILY_SUMMARY, { state: { targetDate: dateStr } });
  };

  const safeMoodKey = (mood: unknown) => {
    if (mood && typeof mood === 'string') return mood.toLowerCase();
    return 'pleasant';
  };

  const safeDate = (ts: unknown) => {
    const d = ts ? new Date(ts as string | number | Date) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full min-h-0 font-sans overflow-hidden relative">
        <div className="px-4 pt-10 pb-2 z-20 flex items-center gap-2">
          <button type="button" onClick={() => navigate(AppRoute.HISTORY)} className="btn-icon -ml-1" aria-label={t('timeline.back')}>
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#2D2D2D] tracking-tight leading-none truncate">
              {(t('history.title') || '历史').toString().replace(/\n/g, ' ')}
            </h1>
            <div className="h-2 bg-yellow-200/50 -mt-1 w-2/3 transform -rotate-1" />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 pt-4 pb-nav">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative pl-4 pr-2 pt-2">
            <div className="absolute top-0 bottom-0 left-[27px] w-px border-l-2 border-dashed border-gray-300 z-0" />

            {history.length > 0 ? (
              history.map((entry: Record<string, unknown>, idx: number) => {
                const date = safeDate(entry.timestamp);
                const moodType = safeMoodKey(entry.moodType);
                const emotions = Array.isArray(entry.emotions) ? entry.emotions : [];
                const text = [entry.note, entry.aiAnalysis, entry.cause].find(Boolean) as string | undefined;
                const image = typeof entry.image === 'string' ? entry.image : null;

                return (
                  <motion.div
                    key={String(entry.id ?? idx)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                    className="relative flex gap-4 mb-8 group cursor-pointer"
                    onClick={() => handleEntryClick(safeDate(entry.timestamp).toISOString())}
                  >
                    <div className="flex flex-col items-center gap-1 z-10 pt-1">
                      <div className="w-3 h-3 bg-[#2D2D2D] rounded-full border-2 border-[#EAE8E1]" />
                      <div className="text-[9px] font-bold text-gray-400 font-sans tracking-tight">
                        {date.getMonth() + 1}/{date.getDate()}
                      </div>
                    </div>

                    <div
                      className={
                        idx % 2 === 0
                          ? 'flex-1 bg-white p-4 shadow-sm border border-gray-100 relative transition-transform duration-300 group-hover:-translate-y-1 group-active:scale-[0.99] transform rotate-1'
                          : 'flex-1 bg-white p-4 shadow-sm border border-gray-100 relative transition-transform duration-300 group-hover:-translate-y-1 group-active:scale-[0.99] transform -rotate-1'
                      }
                    >
                      <div className="absolute -top-3 -left-2 text-gray-400 transform -rotate-45 z-20">
                        <Paperclip size={20} />
                      </div>
                      {!image && (
                        <div className="absolute -top-2 right-4 w-12 h-4 bg-yellow-100/50 tape transform rotate-2" />
                      )}

                      <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background:
                                (MOOD_HEX_CODES as Record<string, string>)[String(entry.moodType || 'Pleasant')] ||
                                '#E5E7EB',
                            }}
                          />
                          <span className="font-bold text-[#2D2D2D] text-sm uppercase">
                            {t('mood.' + moodType)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold font-sans">
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {emotions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {emotions.map((em, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {translateTag(String(em), t)}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                        {text || t('history.no_note')}
                      </p>

                      {image && (
                        <div className="mt-3 relative h-24 w-full bg-gray-50 border border-gray-200 p-1 transform rotate-1 overflow-hidden">
                          <img
                            src={image}
                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                            alt=""
                          />
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-red-100/50 tape" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-xl opacity-60">
                <MapPin size={32} className="mb-2" />
                <p>{t('history.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </BlobBackground>
  );
};

export default HistoryPage;
