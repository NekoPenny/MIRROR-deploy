import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Loader2 } from 'lucide-react';
import { useAppContext } from '../App';
import Button from '../components/Button';
import { generateWeeklyImprovementPlan } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { AppRoute } from '../types';
import { MoodEntry } from '../types';
type Stage = 'focus' | 'plan' | 'done';

const WeeklyReflection: React.FC = () => {
  const { user, history, addToHistory, t, showToast } = useAppContext();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('focus');
  const [selectedEntries, setSelectedEntries] = useState<MoodEntry[]>([]);
  const [improvementPlan, setImprovementPlan] = useState<{ patternSummary: string; actionSeedsIfThen: string[] } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<Record<number, string>>({});

  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const intenseCandidates = useMemo(() => {
    return history.filter(h => {
      const date = new Date(h.timestamp);
      if (date < oneWeekAgo) return false;
      const isPanic = !!(h.bodySensations?.length || h.advice);
      const isStressful = h.moodType === 'Stressful' || h.moodType === 'Irritating';
      return isPanic || isStressful;
    }).slice(0, 7);
  }, [history, oneWeekAgo]);

  const toggleSelect = (entry: MoodEntry) => {
    setSelectedEntries(prev => {
      const has = prev.some(e => e.id === entry.id);
      if (has) return prev.filter(e => e.id !== entry.id);
      if (prev.length >= 3) return prev;
      return [...prev, entry];
    });
  };

  const canProceedFocus = selectedEntries.length >= 1;

  /** 判断是否为「在…时，我会…」行为目标句式，避免在「选择激烈情绪时刻」里当作文案展示 */
  const looksLikeGrowthGoal = (s: string | undefined) =>
    typeof s === 'string' && /在.+时，我会.+。?$/.test(s.trim());

  /** 列表项展示文案：优先显示时刻描述（原因/AI 总结/备注），而非行为目标 */
  const getMomentDisplayText = (entry: MoodEntry): string => {
    if (entry.cause?.trim()) return entry.cause.trim();
    if (entry.aiAnalysis?.trim() && !looksLikeGrowthGoal(entry.aiAnalysis)) return entry.aiAnalysis.trim();
    if (entry.note?.trim() && !looksLikeGrowthGoal(entry.note)) return entry.note.trim();
    return t('mood.' + entry.moodType.toLowerCase());
  };

  const handleFocusNext = () => {
    if (!canProceedFocus) return;
    setPlanLoading(true);
    generateWeeklyImprovementPlan(
      selectedEntries,
      [],
      user.preferences.language,
      user.preferences.aiEnabled
    ).then(data => {
      setImprovementPlan(data);
      setSelectedGoals(
        data.actionSeedsIfThen.reduce((acc, text, i) => ({ ...acc, [i]: text }), {} as Record<number, string>)
      );
      setPlanLoading(false);
      setStage('plan');
    });
  };

  const handlePlanSubmit = () => {
    const toPlant = Object.entries(selectedGoals)
      .filter(([, text]) => text && text.trim())
      .map(([, text]) => text.trim());
    toPlant.forEach(text => {
      const entry: MoodEntry = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        timestamp: new Date(),
        moodType: 'Calm',
        emotions: [],
        intensity: 50,
        note: '[每周反思] ' + text,
        growthGoal: { text, isCompleted: false },
      };
      addToHistory(entry);
    });
    if (toPlant.length > 0 && showToast) showToast(t('weekly.planted', { count: String(toPlant.length) }));
    setStage('done');
    navigate(AppRoute.DASHBOARD);
  };

  const toggleGoalChecked = (index: number) => {
    setSelectedGoals(prev => {
      const next = { ...prev };
      if (next[index] !== undefined && next[index] !== '') {
        delete next[index];
        return next;
      }
      const text = improvementPlan?.actionSeedsIfThen[index] ?? '';
      next[index] = text;
      return next;
    });
  };

  const setGoalText = (index: number, text: string) => {
    setSelectedGoals(prev => ({ ...prev, [index]: text }));
  };

  const progressSteps = ['focus', 'plan'];
  const currentStepIndex = progressSteps.indexOf(stage);

  return (
    <div className="relative h-full w-full min-h-[100dvh] overflow-y-auto overflow-x-hidden weekly-page">
      <div className="absolute top-4 left-4 right-12 flex gap-2 z-50">
        {progressSteps.map((s, idx) => {
          const isActive = currentStepIndex >= idx;
          const label = s === 'focus' ? t('weekly.step_focus') : t('weekly.step_plan');
          return (
            <div
              key={s}
              className={`flex-1 py-2 px-3 text-center text-sm font-bold rounded-md weekly-progress-tab ${isActive ? 'active' : ''}`}
            >
              {label}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate(AppRoute.DASHBOARD)}
        className="absolute top-4 right-4 z-50 btn-icon"
        aria-label="Close"
      >
        <X size={24} strokeWidth={2} />
      </button>

      <AnimatePresence mode="wait">
        {stage === 'focus' && (
          <motion.div
            key="focus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 pt-16 pb-12 px-4"
          >
            <div className="relative z-10 w-full min-w-0 overflow-hidden" data-mood="Pleasant">
                <div className="mb-6">
                  <h1 className="text-2xl font-black text-[#3D2914] mb-1">{t('weekly.stage_focus_title')}</h1>
                  <span className="inline-block w-16 h-1 rounded-full bg-amber-300/70 -rotate-1" aria-hidden />
                  <p className="text-sm text-[#5D4037]/80 mt-3">{t('weekly.stage_focus_sub')}</p>
                </div>
                {intenseCandidates.length === 0 ? (
                  <div className="py-12 text-center text-[#5D4037]/80 paper-card paper-texture rounded-lg p-6">
                    <p>{t('weekly.no_intense')}</p>
                    <Button className="mt-6" variant="outline" onClick={() => navigate(AppRoute.DASHBOARD)}>{t('weekly.back_dashboard')}</Button>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {intenseCandidates.map((entry, i) => {
                        const isSelected = selectedEntries.some(e => e.id === entry.id);
                        return (
                          <li key={entry.id} className={isSelected ? 'transform -rotate-0.5' : ''}>
                            <button
                              type="button"
                              onClick={() => toggleSelect(entry)}
                              className={`w-full text-left p-4 weekly-entry-card ${isSelected ? 'selected' : ''}`}
                            >
                              {isSelected && <div className="tape-corner" aria-hidden />}
                              <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 flex-shrink-0 ${isSelected ? 'border-amber-600 bg-amber-100 text-amber-800' : 'border-[#E8E4D9] bg-white text-transparent'}`}>
                                  {isSelected && <Check size={14} strokeWidth={2.5} />}
                                </div>
                                {entry.image && (
                                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#E8E4D9] bg-gray-100 shrink-0 flex-shrink-0">
                                    <img src={entry.image} alt="" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[#5D4037]/70">
                                    {new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="font-bold text-[#3D2914] truncate">{getMomentDisplayText(entry)}</p>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-8 flex justify-end">
                      <Button variant="primary" onClick={handleFocusNext} disabled={!canProceedFocus}>
                        {t('weekly.next')} ({selectedEntries.length}/3)
                      </Button>
                    </div>
                  </>
                )}
              </div>
          </motion.div>
        )}

        {stage === 'plan' && improvementPlan && (
          <motion.div
            key="plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 pt-16 pb-12 px-4"
          >
            <div className="relative z-10 w-full min-w-0 overflow-hidden" data-mood="Pleasant">
                <h1 className="text-xl font-black text-[#3D2914] mb-1">{t('weekly.stage_pattern_title')}</h1>
                <span className="inline-block w-12 h-0.5 bg-amber-400/60 rounded-full -rotate-1 mb-3" aria-hidden />
                <p className="text-sm text-[#5D4037]/80 mb-3">{t('weekly.stage_pattern_sub')}</p>
                <div className="weekly-pattern-card p-4 pt-5 paper-texture rounded-r-lg mb-5 relative">
                  <div className="tape-strip" aria-hidden />
                  <p className="text-[#3D2914] text-sm leading-relaxed whitespace-pre-line relative z-10">
                    {improvementPlan.patternSummary}
                  </p>
                </div>
                <h2 className="text-base font-black text-[#3D2914] mb-1">{t('weekly.stage_plan_title')}</h2>
                <p className="text-sm text-[#5D4037]/80 mb-3">{t('weekly.stage_plan_sub')}</p>
                <div className="space-y-3 w-full">
                  {improvementPlan.actionSeedsIfThen.map((text, index) => (
                    <div key={index} className="weekly-goal-row p-3 paper-texture rounded-lg w-full min-w-0">
                      <label className="flex items-start gap-2.5 cursor-pointer w-full min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedGoals[index] !== undefined && selectedGoals[index] !== ''}
                          onChange={() => toggleGoalChecked(index)}
                          className="journal-checkbox mt-0.5 shrink-0"
                        />
                        <textarea
                          rows={2}
                          value={selectedGoals[index] ?? text}
                          onChange={e => setGoalText(index, e.target.value)}
                          onFocus={() => selectedGoals[index] === undefined && setGoalText(index, text)}
                          placeholder={text}
                          className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-transparent border-none outline-none text-sm text-[#3D2914] placeholder:text-[#5D4037]/50 resize-none leading-relaxed break-words"
                          style={{ minHeight: '2.25rem' }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="primary" onClick={handlePlanSubmit}>{t('weekly.plant_goals')}</Button>
                  <button
                    type="button"
                    onClick={() => { setStage('done'); navigate(AppRoute.DASHBOARD); }}
                    className="text-sm text-[#5D4037]/80 border-b border-dashed border-[#5D4037]/40 pb-0.5 hover:border-[#3D2914] hover:text-[#3D2914] transition-colors"
                  >
                    {t('weekly.skip_plant')}
                  </button>
                </div>
              </div>
          </motion.div>
        )}

        {planLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D2914]/15 backdrop-blur-[2px]"
          >
            <div className="weekly-loading-card p-8 flex flex-col items-center gap-5 paper-texture max-w-[280px]">
              <div className="tape-loading" aria-hidden />
              <Loader2 size={36} className="animate-spin text-amber-600" strokeWidth={2} />
              <p className="font-bold text-[#3D2914] text-sm">{t('weekly.generating')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeeklyReflection;
