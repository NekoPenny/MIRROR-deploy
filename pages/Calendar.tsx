import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { MOOD_HEX_CODES, AppRoute } from '../types';
import { MoodEntry } from '../types';

const WEEKDAY_LABELS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDominantMood(entries: MoodEntry[]): string {
  if (entries.length === 0) return '';
  const counts: Record<string, number> = {};
  entries.forEach(e => {
    const m = e.moodType || 'Pleasant';
    counts[m] = (counts[m] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b));
}

const CalendarPage: React.FC = () => {
  const { history, user, t } = useAppContext();
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const entriesByDay = useMemo(() => {
    const map: Record<string, MoodEntry[]> = {};
    (history || []).forEach(entry => {
      const d = new Date(entry.timestamp);
      const key = dateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [history]);

  const isEn = user?.preferences?.language === 'English';
  const monthLabel = useMemo(() => {
    return viewMonth.toLocaleDateString(
      isEn ? 'en-US' : 'zh-CN',
      { month: 'long', year: 'numeric' }
    );
  }, [viewMonth, isEn]);

  const weekLabels = isEn ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_ZH;

  const gridDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDow = first.getDay();
    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];
    const prevMonth = new Date(year, month, 0);
    const prevDays = prevMonth.getDate();
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month - 1, prevDays - startDow + 1 + i);
      cells.push({ date: d, isCurrentMonth: false, key: dateKey(d) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, isCurrentMonth: true, key: dateKey(date) });
    }
    const remaining = totalCells - cells.length;
    for (let i = 0; i < remaining; i++) {
      const date = new Date(year, month + 1, i + 1);
      cells.push({ date, isCurrentMonth: false, key: dateKey(date) });
    }
    return cells;
  }, [viewMonth]);

  const todayKey = dateKey(new Date());

  const monthStats = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const monthEntries: MoodEntry[] = [];
    Object.entries(entriesByDay).forEach(([k, list]) => {
      const [y, m, d] = k.split('-').map(Number);
      if (y === year && m === month + 1) monthEntries.push(...list);
    });
    const daysWithRecords = new Set(
      monthEntries.map(e => {
        const d = new Date(e.timestamp);
        return dateKey(d);
      })
    ).size;
    const dominant = getDominantMood(monthEntries);
    return { daysWithRecords, dominant };
  }, [viewMonth, entriesByDay]);

  const isViewingCurrentMonth =
    viewMonth.getFullYear() === new Date().getFullYear() &&
    viewMonth.getMonth() === new Date().getMonth();

  const goPrevMonth = () => {
    setSelectedDayKey(null);
    setViewMonth(d => {
      const next = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return next;
    });
  };
  const goNextMonth = () => {
    setSelectedDayKey(null);
    setViewMonth(d => {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return next;
    });
  };
  const goToToday = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), 1);
    setViewMonth(next);
  };

  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, []);

  const dayStats = useMemo(() => {
    let future = 0;
    let currentMonth = 0;
    let currentMonthFuture = 0;
    for (const { date, isCurrentMonth } of gridDays) {
      const cellStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const isFuture = cellStart > todayStart;
      if (isFuture) future += 1;
      if (isCurrentMonth) currentMonth += 1;
      if (isCurrentMonth && isFuture) currentMonthFuture += 1;
    }
    return {
      totalCells: gridDays.length,
      future,
      currentMonth,
      currentMonthFuture,
      todayStart,
      todayKey,
      viewMonthKey: dateKey(viewMonth),
    };
  }, [gridDays, todayKey, todayStart, viewMonth]);


  const formatDateForAria = (d: Date) =>
    d.toLocaleDateString(isEn ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const handleDayClick = (key: string, date: Date) => {
    const cellStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const isFuture = cellStart > todayStart;
    if (isFuture) return;
    const entries = entriesByDay[key] || [];
    if (entries.length === 0) {
      const iso = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();
      navigate(AppRoute.DAILY_SUMMARY, { state: { targetDate: iso } });
      return;
    }
    setSelectedDayKey(key);
  };

  const handleViewDetail = () => {
    if (!selectedDayKey) return;
    const [y, m, d] = selectedDayKey.split('-').map(Number);
    const iso = new Date(y, m - 1, d, 12, 0, 0).toISOString();
    navigate(AppRoute.DAILY_SUMMARY, { state: { targetDate: iso } });
  };

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <div className="px-4 pt-10 pb-2 flex-shrink-0">
          <div className="relative">
            <h1 className="text-2xl font-black text-[var(--color-pencil)] tracking-tight relative z-10">
              {t('calendar.title')}
            </h1>
            <div className="absolute -bottom-0.5 left-0 w-16 h-2 bg-yellow-200/60 -rotate-1 rounded-sm" aria-hidden />
          </div>
          <p className="text-sm text-[var(--color-muted)] mt-1.5">{t('calendar.subtitle')}</p>
        </div>

        <div className="px-3 pt-4 pb-nav flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between gap-2 mb-3 px-2 py-2.5 rounded-xl bg-white/60 border border-[var(--color-grid)]/80 shadow-sm">
            <button
              type="button"
              onClick={goPrevMonth}
              className="btn-icon flex-shrink-0 w-10 h-10 rounded-lg hover:bg-amber-50/80"
              aria-label={t('calendar.prev_month')}
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
            <span className="text-base font-bold text-[var(--color-pencil)] min-w-0 truncate text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="btn-icon flex-shrink-0 w-10 h-10 rounded-lg hover:bg-amber-50/80"
              aria-label={t('calendar.next_month')}
            >
              <ChevronRight size={22} strokeWidth={2} />
            </button>
          </div>
          {!isViewingCurrentMonth && (
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={goToToday}
                className="text-sm font-bold text-amber-800 bg-amber-100 hover:bg-amber-200/90 px-4 py-2 rounded-full border border-amber-200/70 shadow-sm transition-colors active:scale-[0.98]"
              >
                {t('calendar.today')}
              </button>
            </div>
          )}

          {/* 本月统计 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 px-3 py-2.5 rounded-xl bg-white/70 border border-[var(--color-grid)]/60 text-sm">
            {monthStats.daysWithRecords > 0 ? (
              <>
                <span className="font-medium text-[var(--color-pencil)]">
                  {t('calendar.month_recorded', { n: String(monthStats.daysWithRecords) })}
                </span>
                {monthStats.dominant && (
                  <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: MOOD_HEX_CODES[monthStats.dominant] || '#E5E7EB' }}
                    />
                    {t('calendar.month_dominant', { mood: t(`mood.${monthStats.dominant.toLowerCase()}`) })}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[var(--color-muted)]">{t('calendar.month_no_records')}</span>
            )}
          </div>

          <div className="calendar-card flex flex-col flex-shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-grid)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] paper-texture">
            <div className="calendar-tape tape tape-yellow" aria-hidden />
            <div className="calendar-weekdays grid grid-cols-7 flex-shrink-0 calendar-weekdays--scrapbook">
              {weekLabels.map((label, i) => (
                <div
                  key={i}
                  className={`py-3 text-center text-xs font-bold ${i === 0 || i === 6 ? 'text-amber-700/70' : 'text-[var(--color-muted)]'}`}
                >
                  {label}
                </div>
              ))}
            </div>
            <div ref={gridRef} className="calendar-grid grid grid-cols-7 auto-rows-[var(--calendar-cell-size)] gap-2.5 p-4 flex-shrink-0">
              {gridDays.map(({ date, isCurrentMonth, key }) => {
                const entries = entriesByDay[key] || [];
                const dominant = getDominantMood(entries);
                const hex = dominant ? (MOOD_HEX_CODES[dominant] || '#E5E7EB') : null;
                const isToday = key === todayKey;
                const isSelected = selectedDayKey === key;
                const cellStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                const isFuture = cellStart > todayStart;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={isFuture ? undefined : () => handleDayClick(key, date)}
                    disabled={isFuture}
                    aria-disabled={isFuture}
                    aria-label={isFuture ? t('calendar.future_day_aria', { date: formatDateForAria(date) }) : t('calendar.day_aria', { date: formatDateForAria(date) })}
                    className={`
                      calendar-day flex flex-col items-center justify-center min-h-0 p-1.5 rounded-xl border transition-all duration-150
                      ${
                        isFuture
                          ? 'bg-[var(--color-surface)]/40 text-gray-400 opacity-60 cursor-not-allowed border-transparent'
                          : isCurrentMonth
                            ? 'bg-white/95 text-[var(--color-pencil)] border-[var(--color-grid)]/40 hover:border-amber-200/60'
                            : 'bg-[var(--color-surface)]/50 text-[var(--color-muted)] border-transparent'
                      }
                      ${isToday ? 'calendar-day--today !bg-amber-50 border-amber-300/60 shadow-[0_0_0_2px_rgba(251,191,36,0.4)]' : ''}
                      ${isSelected ? '!border-amber-400 !bg-amber-50/90 border-2 shadow-[0_0_0_2px_rgba(251,191,36,0.5)]' : ''}
                      ${isFuture ? '' : 'hover:bg-amber-50/80 active:bg-amber-100/70 active:scale-[0.98]'}
                    `}
                  >
                    <span className="text-lg font-bold tabular-nums leading-tight">{date.getDate()}</span>
                    {hex && (
                      <span
                        className="calendar-mood-dot w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ring-2 ring-white/80 shadow-sm"
                        style={{ backgroundColor: hex }}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 选中日预览 */}
          {selectedDayKey && (() => {
            const entries = entriesByDay[selectedDayKey] || [];
            const [y, m, d] = selectedDayKey.split('-').map(Number);
            const previewDate = new Date(y, m - 1, d);
            const previewLabel = previewDate.toLocaleDateString(isEn ? 'en-US' : 'zh-CN', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <div className="mt-4 flex-shrink-0">
                <div className="rounded-xl border border-[var(--color-grid)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] paper-texture overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-dashed border-[var(--color-grid)] bg-amber-50/50 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--color-pencil)]">
                      {t('calendar.preview_title', { date: previewLabel })}
                    </span>
                    <button
                      type="button"
                      onClick={handleViewDetail}
                      className="flex items-center gap-1 text-[var(--color-highlight)] font-bold text-sm hover:underline"
                    >
                      {t('calendar.view_detail')} <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    {entries.slice(0, 2).map((entry, i) => (
                      <div
                        key={entry.id || i}
                        className="p-3 rounded-lg bg-white/80 border border-[var(--color-grid)]/50 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: MOOD_HEX_CODES[entry.moodType || 'Pleasant'] || '#E5E7EB' }}
                          />
                          <span className="text-xs font-bold text-[var(--color-muted)] uppercase">
                            {t(`mood.${(entry.moodType || 'Pleasant').toLowerCase()}`)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-pencil)] line-clamp-2">
                          {entry.note || entry.aiAnalysis || entry.guidanceAnswer || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </BlobBackground>
  );
};

export default CalendarPage;
