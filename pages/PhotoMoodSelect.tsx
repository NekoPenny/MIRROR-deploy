import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppRoute, MoodEntry } from '../types';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { translateTag } from '../utils/translateTag';
import Button from '../components/Button';
import { MOOD_HEX_CODES } from '../types';
import { DEFAULT_EMOTIONS_BY_MOOD } from '../services/geminiService';

const MOOD_ORDER: MoodEntry['moodType'][] = ['Thrilled', 'Pleasant', 'Calm', 'Stressful', 'Irritating'];

const PhotoMoodSelect: React.FC = () => {
  const { currentEntry, setCurrentEntry, addToHistory, user, t } = useAppContext();
  const navigate = useNavigate();

  const image = currentEntry?.image;
  const moodType = currentEntry?.moodType || 'Pleasant';
  const selectedEmotions = currentEntry?.emotions || [];

  /** 可选情绪词：AI 建议 + 预设词合并去重，不预选 */
  const emotionOptions = useMemo(() => {
    const fromAI = currentEntry?.aiSuggestedEmotions || [];
    const fromMood = DEFAULT_EMOTIONS_BY_MOOD[moodType] || DEFAULT_EMOTIONS_BY_MOOD['Pleasant'] || [];
    const seen = new Set<string>();
    return [...fromAI, ...fromMood].filter(w => { if (seen.has(w)) return false; seen.add(w); return true; });
  }, [currentEntry?.aiSuggestedEmotions, moodType]);

  const handleEmotionToggle = (word: string) => {
    setCurrentEntry(prev => {
      if (!prev) return prev;
      const curr = prev.emotions || [];
      const next = curr.includes(word) ? curr.filter(e => e !== word) : [...curr, word];
      return { ...prev, emotions: next };
    });
  };

  const handleJustRecord = () => {
    if (!currentEntry || !image) return;
    const entry: MoodEntry = {
      ...(currentEntry as Partial<MoodEntry>),
      id: Date.now().toString(),
      timestamp: new Date(currentEntry.timestamp || Date.now()),
      moodType: (currentEntry.moodType as MoodEntry['moodType']) || 'Pleasant',
      emotions: currentEntry.emotions || [],
      intensity: currentEntry.intensity ?? 50,
      categories: currentEntry.categories || [],
      image,
    };
    addToHistory(entry);
    navigate(AppRoute.DASHBOARD);
  };

  const handleNext = () => {
    if (!currentEntry || !image) return;
    navigate(AppRoute.GROWTH_SEED);
  };

  const handleMoodChange = (mood: MoodEntry['moodType']) => {
    setCurrentEntry(prev => prev ? { ...prev, moodType: mood, emotions: [] } : prev);
  };

  if (!image) {
    navigate(AppRoute.IMAGE_JOURNAL);
    return null;
  }

  return (
    <BlobBackground mood={moodType}>
      <div className="flex flex-col h-full px-6 pt-16 pb-8 relative z-10 font-sans overflow-y-auto">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-8 left-6 z-50 p-3 bg-white/80 w-12 h-12 flex items-center justify-center backdrop-blur-md active:scale-95 hover:bg-white shadow-sm border border-gray-200 rounded-full"
        >
          <ArrowLeft size={24} className="text-gray-900" />
        </button>

        <div className="mb-6">
          <p className="text-gray-600 text-sm font-medium">
            {t('photo_mood_select.subtitle')}
          </p>
        </div>

        {/* Photo preview */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white p-3 pb-8 shadow-xl border border-gray-100 rotate-[-1deg] w-full max-w-[260px]">
            <div className="aspect-square bg-gray-100 overflow-hidden">
              <img src={image} alt="Moment" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Mood selection */}
        <div className="mb-6">
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-3">
            {t('photo_mood_select.mood_label')}
          </span>
          <div className="flex flex-wrap gap-2">
            {MOOD_ORDER.map((mood) => (
              <button
                key={mood}
                onClick={() => handleMoodChange(mood)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  moodType === mood
                    ? 'text-white shadow-md'
                    : 'bg-white/60 text-gray-600 border border-gray-200'
                }`}
                style={moodType === mood ? { backgroundColor: MOOD_HEX_CODES[mood] || '#888' } : {}}
              >
                {t(`mood.${mood.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Emotions - 可点击选择/取消细分情绪词 */}
        {emotionOptions.length > 0 && (
          <div className="mb-6">
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-2">
              {t('photo_mood_select.emotions_label')}
            </span>
            <div className="flex flex-wrap gap-2">
              {emotionOptions.map((word, i) => {
                const isSelected = selectedEmotions.includes(word);
                return (
                  <button
                    key={`${word}-${i}`}
                    type="button"
                    onClick={() => handleEmotionToggle(word)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'text-white shadow-md border-transparent'
                        : 'bg-white/50 border-gray-200 text-gray-500 hover:bg-white/80'
                    }`}
                    style={isSelected ? { backgroundColor: MOOD_HEX_CODES[moodType] || '#888' } : undefined}
                  >
                    {translateTag(word, t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 space-y-3">
          <button
            type="button"
            onClick={handleJustRecord}
            className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg bg-white/60 hover:bg-white/80 transition-colors"
          >
            {t('growth.skip')}
          </button>
          <Button
            onClick={handleNext}
            variant="primary"
            className="w-full py-4 shadow-xl"
          >
            <span className="flex items-center justify-center gap-2">
              {t('photo_mood_select.next')} <ArrowRight size={20} />
            </span>
          </Button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default PhotoMoodSelect;
