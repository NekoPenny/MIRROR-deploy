
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Sparkles, Quote, Calendar, Paperclip, Tag, MapPin, Edit2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { generateInsight } from '../services/geminiService';
import { ResponsiveContainer, Area, AreaChart, XAxis } from 'recharts';
import { translateTag } from '../utils/translateTag';
import html2canvas from 'html2canvas';
import { MOOD_HEX_CODES } from '../types';

const DailySummary: React.FC = () => {
  const { history, user, t } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [insight, setInsight] = useState("...");
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const targetDate = useMemo(() => {
    if (location.state?.targetDate) {
        return new Date(location.state.targetDate);
    }
    return new Date();
  }, [location.state]);

  const dateKey = targetDate.toISOString().split('T')[0];
  const cacheKey = `mirror_summary_${dateKey}`;

  // 1. Filter Today's Data
  const todayData = useMemo(() => {
    return history.filter(entry => {
        const d = new Date(entry.timestamp);
        return d.getDate() === targetDate.getDate() &&
               d.getMonth() === targetDate.getMonth() &&
               d.getFullYear() === targetDate.getFullYear();
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [history, targetDate]);

  // 2. Extract Photos
  const todayPhotos = useMemo(() => {
    return todayData.filter(e => e.image).map(e => e.image!);
  }, [todayData]);

  useEffect(() => setCurrentPhotoIndex(0), [dateKey, todayPhotos.length]);

  // 3. Extract Keywords (Unique emotions + categories)
  const todayKeywords = useMemo(() => {
      const tags = new Set<string>();
      todayData.forEach(e => {
          if (e.emotions) e.emotions.forEach(em => tags.add(em));
          if (e.categories) e.categories.forEach(c => tags.add(c));
          // If no specific tags, maybe use moodType
          if ((!e.emotions || e.emotions.length === 0) && (!e.categories || e.categories.length === 0)) {
              tags.add(t(`mood.${e.moodType.toLowerCase()}`));
          }
      });
      return Array.from(tags).slice(0, 8); // Limit to 8 to fit layout
  }, [todayData, t]);

  // 4. Determine Dominant Mood
  const dominantMood = useMemo(() => {
      if (todayData.length === 0) return 'Pleasant';
      const counts: Record<string, number> = {};
      todayData.forEach(e => { counts[e.moodType] = (counts[e.moodType] || 0) + 1; });
      return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }, [todayData]);

  const moodColor = MOOD_HEX_CODES[dominantMood] || '#C83025';

  // 5. Chart Data
  const chartData = useMemo(() => {
     if (todayData.length === 0) return [];
     
     const getMoodValue = (mood: string) => {
        switch(mood) {
            case 'Thrilled': return 100;
            case 'Pleasant': return 80;
            case 'Calm': return 60;
            case 'Stressful': return 30;
            case 'Irritating': return 10;
            default: return 50;
        }
     };

     let data = todayData.map(e => ({
         time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         value: getMoodValue(e.moodType),
     }));

     if (data.length === 1) {
         data = [{ ...data[0], time: 'Start' }, { ...data[0], time: 'End' }];
     }

     return data;
  }, [todayData]);

  // Sync edited text with insight
  useEffect(() => {
      setEditedText(insight);
  }, [insight]);

  // 6. Fetch/Cache Insight
  useEffect(() => {
      const fetchDailyInsight = async () => {
          try {
              const cachedData = localStorage.getItem(cacheKey);
              if (cachedData) {
                  const parsed = JSON.parse(cachedData);
                  if (parsed.insight && parsed.language === user.preferences.language) {
                      setInsight(parsed.insight);
                      if (todayData.length > 0) return; 
                  }
              }
          } catch (e) { console.error(e); }

          if (todayData.length > 0) {
              const text = await generateInsight(user.name, todayData.slice(0, 5), user.preferences.language, user.preferences.aiEnabled);
              const cleanedText = text.replace(new RegExp(`^${user.name || 'Friend'}[:,\s]*`, 'i'), '');
              setInsight(cleanedText);

              try {
                  const existingCache = localStorage.getItem(cacheKey);
                  const parsedCache = existingCache ? JSON.parse(existingCache) : {};
                  localStorage.setItem(cacheKey, JSON.stringify({
                      ...parsedCache,
                      insight: cleanedText,
                      language: user.preferences.language
                  }));
              } catch (e) { console.error(e); }

          } else {
              setInsight(t('dashboard.no_data'));
          }
      };
      
      fetchDailyInsight();
  }, [todayData, user.name, user.preferences.language, user.preferences.aiEnabled, t, cacheKey]);

  const handleSaveEdit = () => {
      setInsight(editedText);
      setIsEditing(false);
      
      try {
          const existingCache = localStorage.getItem(cacheKey);
          const parsedCache = existingCache ? JSON.parse(existingCache) : {};
          localStorage.setItem(cacheKey, JSON.stringify({
              ...parsedCache,
              insight: editedText,
              // Keep language consistent or update it? Keeping as is for cache validity checks
          }));
      } catch (e) { console.error(e); }
  };

  const handleExport = async () => {
      if (!exportRef.current) return;
      setIsExporting(true);
      
      try {
          await new Promise(r => setTimeout(r, 100)); // UI settle
          const canvas = await html2canvas(exportRef.current, {
              useCORS: true,
              scale: 3, 
              backgroundColor: null, // Keep transparent so border radius works if wrapper has it
          });

          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `Mirror-Journal-${targetDate.toISOString().split('T')[0]}.png`;
          link.click();
      } catch (err) {
          console.error("Export failed", err);
      } finally {
          setIsExporting(false);
      }
  };

  const formattedDate = targetDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <BlobBackground mood={dominantMood}>
      <div className="flex flex-col h-full min-h-0 font-sans relative overflow-hidden">
        
        {/* Nav */}
        <div className="px-4 pt-10 pb-2 flex items-center justify-between z-30 sticky top-0 bg-[#FFFDF7]/90 backdrop-blur-md gap-2">
             <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1" aria-label={t('errors.back_home')}>
                <ArrowLeft size={24} strokeWidth={2} />
             </button>
             <span className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase flex-1 text-center truncate">{t('summary.title')}</span>
             <div className="w-[52px] shrink-0" aria-hidden />
        </div>

        {/* Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-32 no-scrollbar flex flex-col items-center pt-2">
            
            {/* --- EXPORTABLE SCRAPBOOK PAGE --- */}
            <div 
                ref={exportRef} 
                className="bg-[#FFFDF9] w-full max-w-[360px] shadow-2xl relative flex flex-col overflow-hidden transform rotate-1"
                style={{
                    // Simulating a physical page - 刚好容纳完整图表
                    minHeight: '680px',
                    backgroundImage: `
                        linear-gradient(#F3F4F6 1px, transparent 1px),
                        linear-gradient(90deg, #F3F4F6 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                    boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                }}
            >
                {/* Visual Binding / Holes */}
                <div className="absolute top-0 left-0 bottom-0 w-8 border-r border-dashed border-gray-200 bg-white/50 z-20 flex flex-col justify-evenly items-center py-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="w-3 h-3 rounded-full bg-gray-100 shadow-inner"></div>
                    ))}
                </div>

                <div className="relative z-10 flex flex-col pl-10 pr-4 py-6 shrink-0">
                    
                    {/* 1. Header: Date + Location Stamp */}
                    <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-2 relative">
                        <div>
                            <div className="text-3xl font-black text-[#2D2D2D] leading-none">
                                {targetDate.getDate()}
                            </div>
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                {targetDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                             <span className="font-bold text-gray-400 text-xs uppercase">{targetDate.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                             <MapPin size={16} className="text-[#FF6B6B] mt-1" />
                        </div>
                        {/* Washi Tape Decoration */}
                        <div className="absolute -top-4 right-10 w-20 h-6 bg-[#FF6B6B]/30 transform -rotate-2 backdrop-blur-sm tape"></div>
                    </div>

                    {/* 2. Photo Collage - 点击将当前图叠到底部，露出下一张 */}
                    {todayPhotos.length > 0 ? (
                        <div 
                            className="relative min-h-[160px] mb-10 flex justify-center items-center cursor-pointer"
                            onClick={() => todayPhotos.length > 1 && setCurrentPhotoIndex(i => (i + 1) % todayPhotos.length)}
                        >
                            {(() => {
                                const n = todayPhotos.length;
                                const stackIndices = Array.from({ length: Math.min(3, n) }, (_, i) => (currentPhotoIndex + 1 + i) % n);
                                return stackIndices.map((photoIdx, stackPos) => {
                                    const rotation = stackPos === 0 ? -2 : stackPos === 1 ? 3 : -1;
                                    const offset = stackPos * 4;
                                    return (
                                        <motion.div
                                            key={photoIdx}
                                            layout
                                            initial={false}
                                            animate={{
                                                rotate: rotation,
                                                x: offset,
                                                y: offset,
                                            }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                            className="absolute p-2 bg-white shadow-md"
                                            style={{ 
                                                zIndex: stackPos,
                                                width: '80%',
                                                left: '50%',
                                                top: '50%',
                                                marginLeft: '-40%',
                                                marginTop: '-30%',
                                            }}
                                        >
                                            <div className="aspect-[4/3] bg-gray-100 overflow-hidden border border-gray-100">
                                                <img src={todayPhotos[photoIdx]} className="w-full h-full object-cover grayscale-[10%]" alt="Moment" />
                                            </div>
                                            {stackPos === 2 && (
                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-yellow-100/60 tape"></div>
                                            )}
                                        </motion.div>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-300 h-32 rotate-1 bg-gray-50/50">
                             <div className="bg-white p-2 rounded-full mb-2 shadow-sm border border-gray-100">
                                <Sparkles size={20} />
                             </div>
                             <span className="text-sm">{t('summary.no_photos')}</span>
                        </div>
                    )}

                    {/* 3. Keywords / Stickers Section */}
                    {todayKeywords.length > 0 && (
                        <div className="mb-6 mt-2 flex flex-wrap gap-2 relative">
                             {/* Paperclip Graphic */}
                             <div className="absolute -top-3 -left-2 text-gray-400 transform -rotate-45">
                                 <Paperclip size={20} />
                             </div>
                             
                             {todayKeywords.map((tag, i) => (
                                 <div 
                                    key={i} 
                                    className={`
                                        px-2 py-1 bg-white border border-gray-100 font-bold text-xs uppercase shadow-sm text-[#2D2D2D]
                                        ${i % 2 === 0 ? 'transform -rotate-1' : 'transform rotate-1'}
                                    `}
                                 >
                                     #{translateTag(tag, t)}
                                 </div>
                             ))}
                        </div>
                    )}

                    {/* 4. Handwritten Summary Area */}
                    <div className="mb-6 relative group">
                        {/* Sticky Note Background */}
                        <div className="absolute inset-0 bg-yellow-50 transform rotate-1 shadow-sm -z-10 rounded-sm"></div>
                        
                        {/* Edit Button */}
                        {!isEditing && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="absolute top-2 right-2 p-1.5 text-yellow-600/60 hover:text-yellow-800 bg-yellow-100/50 hover:bg-yellow-200 rounded-full transition-all z-20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label="Edit summary"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}

                        <div className="p-4 relative">
                             <Quote size={20} className="text-yellow-400 absolute top-2 left-2 opacity-50" fill="currentColor" />
                             
                             {isEditing ? (
                                <div className="relative z-10">
                                    <textarea
                                        value={editedText}
                                        onChange={(e) => setEditedText(e.target.value)}
                                        className="w-full bg-transparent outline-none text-lg text-gray-800 leading-8 resize-none overflow-hidden"
                                        style={{ 
                                            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 32px)',
                                            lineHeight: '32px',
                                            minHeight: '128px',
                                            backgroundAttachment: 'local'
                                        }}
                                        autoFocus
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            onClick={handleSaveEdit}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold hover:bg-yellow-300 shadow-sm transition-colors"
                                        >
                                            <Check size={12} /> {t('summary.apply') || "Apply"}
                                        </button>
                                    </div>
                                </div>
                             ) : (
                                 <p className="text-lg text-gray-800 leading-8 relative z-10 whitespace-pre-wrap" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 32px)', lineHeight: '32px' }}>
                                     {insight}
                                 </p>
                             )}
                        </div>
                    </div>

                    {/* 5. Mood Sketch Chart */}
                    <div className="relative pt-4 pb-6 border-t border-dashed border-gray-200 mt-4">
                         <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase font-sans">{t('summary.mood_flow')}</span>
                             <div className="flex-1 h-px bg-gray-200 border-t border-dashed"></div>
                         </div>
                         
                         <div className="h-24 min-h-[96px] w-full relative">
                             {chartData.length > 0 ? (
                                 <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <pattern id="sketchPattern" patternUnits="userSpaceOnUse" width="4" height="4">
                                                <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke={moodColor} strokeWidth="1" opacity="0.3" />
                                            </pattern>
                                        </defs>
                                        <XAxis dataKey="time" hide />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke={moodColor} 
                                            strokeWidth={3}
                                            fill="url(#sketchPattern)" 
                                            isAnimationActive={false}
                                            dot={{ stroke: '#2D2D2D', strokeWidth: 2, fill: '#fff', r: 3 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                             ) : (
                                 <div className="flex items-center justify-center h-full text-gray-300 text-xs">
                                     {t('summary.no_mood_data') || '记录今日心情后显示'}
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
            </div>
            {/* --- END EXPORTABLE CARD --- */}

        </div>

        {/* Floating Action Button */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-40 px-6">
             <Button 
                onClick={handleExport}
                disabled={isExporting}
                variant="primary"
                className="max-w-[240px] py-4 flex items-center justify-center gap-2 shadow-xl"
             >
                {isExporting ? (
                    <>
                        <Sparkles size={18} className="animate-spin" />
                        {t('summary.downloading')}
                    </>
                ) : (
                    <>
                        <Download size={18} />
                        {t('summary.export')}
                    </>
                )}
             </Button>
        </div>

      </div>
    </BlobBackground>
  );
};

export default DailySummary;
