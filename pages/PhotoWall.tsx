import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { AppRoute } from '../types';
import { MoodEntry } from '../types';
import { Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const PHOTO_WALL_COLS_KEY = 'mirror_photo_wall_cols';
const GRID_OPTIONS = [3, 6, 9] as const;
type GridCols = (typeof GRID_OPTIONS)[number];

const PhotoWall: React.FC = () => {
  const { history, t } = useAppContext();
  const navigate = useNavigate();

  const [gridCols, setGridCols] = useState<GridCols>(() => {
    try {
      const saved = localStorage.getItem(PHOTO_WALL_COLS_KEY);
      const n = saved ? parseInt(saved, 10) : 3;
      return GRID_OPTIONS.includes(n as GridCols) ? (n as GridCols) : 3;
    } catch {
      return 3;
    }
  });

  useEffect(() => {
    localStorage.setItem(PHOTO_WALL_COLS_KEY, String(gridCols));
  }, [gridCols]);

  const entriesWithImage = useMemo(() => {
    return history
      .filter((e): e is MoodEntry & { image: string } => Boolean(e.image))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [history]);

  const handlePhotoClick = (entry: MoodEntry & { image: string }) => {
    const dateStr = new Date(entry.timestamp).toISOString();
    navigate(AppRoute.DAILY_SUMMARY, { state: { targetDate: dateStr } });
  };

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full min-h-0 font-sans relative">
        {/* Header - 手账风 */}
        <div className="px-4 pt-10 pb-2 z-20 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#2D2D2D] tracking-tight leading-none">
              {t('photo_wall.title')}
            </h1>
            {entriesWithImage.length > 0 && (
              <p className="text-sm text-[var(--color-muted)] mt-1">
                {t('photo_wall.count', { n: String(entriesWithImage.length) })}
              </p>
            )}
            <div className="h-2 bg-yellow-200/50 -mt-1 w-2/3 transform -rotate-1" aria-hidden />
          </div>
        </div>

        {/* Grid or empty state */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 no-scrollbar relative z-10"
          style={{ paddingBottom: 'calc(var(--bottom-nav-clearance) + 3.5rem)' }}
        >
          {entriesWithImage.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 border-2 border-dashed border-[var(--color-grid)] rounded-[var(--radius-lg)] bg-[var(--color-paper)] paper-texture paper-card text-center transform -rotate-1"
            >
              <p className="text-[var(--color-muted)] text-sm mb-4">{t('photo_wall.empty')}</p>
              <button
                type="button"
                onClick={() => navigate(AppRoute.IMAGE_JOURNAL)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-highlight)] text-white rounded-lg font-bold text-sm shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all active:scale-[0.98]"
              >
                <Camera size={18} strokeWidth={2} />
                {t('photo_wall.add_first')}
              </button>
            </motion.div>
          ) : (
            <div
              className={`grid pt-2 pb-4 ${
                gridCols === 3 ? 'grid-cols-3 gap-3' : gridCols === 6 ? 'grid-cols-6 gap-2' : 'grid-cols-9 gap-1.5'
              }`}
            >
              {entriesWithImage.map((entry, idx) => {
                const d = new Date(entry.timestamp);
                const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
                const rotations = [-2, 1.5, -1, 2, -1.5, 0.5];
                const rotation = rotations[idx % rotations.length];
                const pad = gridCols === 9 ? 'p-0.5 pb-2' : gridCols === 6 ? 'p-1 pb-2.5' : 'p-1.5 pb-3';
                return (
                  <motion.button
                    key={entry.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.2) }}
                    onClick={() => handlePhotoClick(entry)}
                    className="relative w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pencil)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    {/* 拍立得：白框 + 底部留白 + 贴在本子上的阴影 */}
                    <div
                      className={`relative w-full bg-white rounded-[2px] overflow-visible border border-gray-100/90 shadow-[0_2px_6px_rgba(0,0,0,0.07),0_6px_18px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.08)] transition-shadow duration-200 active:scale-[0.98] ${pad}`}
                      style={{ aspectRatio: '1/1.2' }}
                    >
                      {/* 照片区域（上方与左右白边，底部留出日期区） */}
                      <div className="relative w-full rounded-[1px] overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
                        <img
                          src={entry.image}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {/* 拍立得底部白边 + 日期 */}
                      <div className="flex items-center justify-end pr-0.5 pt-0.5 min-h-[14px]">
                        <span className={`font-medium text-[var(--color-pencil)] ${gridCols === 9 ? 'text-[9px]' : gridCols === 6 ? 'text-[10px]' : 'text-xs'}`}>
                          {dateLabel}
                        </span>
                      </div>
                    </div>
                    {/* 胶带贴纸：统一纯色，位于照片上方（3/6 宫格时显示） */}
                    {gridCols !== 9 && (() => {
                      const size = gridCols === 3 ? { w: 32, h: 10 } : { w: 24, h: 8 };
                      return (
                        <div
                          className="absolute left-1/2 pointer-events-none z-10"
                          style={{
                            top: gridCols === 3 ? -2 : -1,
                            width: size.w,
                            height: size.h,
                            transform: 'translateX(-50%) rotate(-4deg)',
                            transformOrigin: 'center top',
                          }}
                          aria-hidden
                        >
                          <div
                            className="absolute inset-0 rounded-[1px] bg-[#FFECB3] border border-[#FFE082]/60"
                            style={{
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
                            }}
                          />
                        </div>
                      );
                    })()}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* 宫格密度选择器 - 手账风纸片浮条 */}
        <div
          className="fixed left-1/2 z-40 w-max max-w-[90vw] flex items-center gap-1 px-3 py-2 rounded-full bg-[#FFFDF7] paper-texture border border-gray-200 shadow-[var(--shadow-floating)]"
          style={{
            bottom: 'calc(1rem + 70px + 8px + var(--safe-bottom, 0px))',
            transform: 'translateX(-50%) rotate(-1deg)',
          }}
        >
          {GRID_OPTIONS.map((cols) => (
            <button
              key={cols}
              type="button"
              onClick={() => setGridCols(cols)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-bold transition-all text-center
                ${gridCols === cols
                  ? 'bg-yellow-200/80 text-[#2D2D2D] border border-amber-300/60'
                  : 'text-gray-500 hover:text-[var(--color-pencil)] hover:bg-white/60 border border-transparent'
                }
              `}
            >
              {cols === 3 ? t('photo_wall.row_3') : cols === 6 ? t('photo_wall.row_6') : t('photo_wall.row_9')}
            </button>
          ))}
        </div>
      </div>
    </BlobBackground>
  );
};

export default PhotoWall;
