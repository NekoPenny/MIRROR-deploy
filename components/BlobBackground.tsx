
import React from 'react';

interface BlobBackgroundProps {
  mood?: string;
  children: React.ReactNode;
}

const BlobBackground: React.FC<BlobBackgroundProps> = ({ children, mood = '' }) => {
  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center font-sans transition-colors duration-500"
      style={{
        backgroundColor: 'var(--color-surface, #EAE8E1)',
      }}
      data-mood={mood}
    >
      {/* 仅作背景：铺满整屏的网格层，保证所有界面下都能铺满屏幕 */}
      <div
        className="absolute inset-0 bg-grid-paper paper-texture pointer-events-none"
        style={{ zIndex: 0, minHeight: '100dvh' }}
        aria-hidden
      />

      {/* Desk Shadow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          minHeight: '100dvh',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Mood-based tint overlay (subtle) */}
      {mood && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-[5]"
          style={{
            minHeight: '100dvh',
            background: `var(--mood-tint, transparent)`,
            mixBlendMode: 'multiply',
          }}
          aria-hidden
        />
      )}

      {/* Notebook/Journal Container - 全高填满，网格铺满所有界面 */}
      <div className="relative z-10 w-full h-full min-h-0 max-w-md mx-auto flex flex-col transition-all duration-500">
        {/* Physical Notebook Appearance - 网格与纸张纹理铺满容器 */}
        <div className="absolute inset-0 bg-grid-paper paper-texture sm:rounded-[4px] sm:shadow-2xl overflow-hidden transform sm:rotate-0" style={{ minHeight: '100dvh' }}>
          <div className="absolute top-0 right-0 bottom-0 w-2 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-0" />
          {/* The Main Content */}
          <div className="relative z-10 flex flex-col h-full min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlobBackground;
