
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Settings, Flower2, LayoutGrid } from 'lucide-react';
import { AppRoute } from '../types';
import { useAppContext } from '../App';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppContext();

  const getActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: t('nav.today'), icon: Home, path: AppRoute.DASHBOARD },
    { label: t('nav.photo_wall'), icon: LayoutGrid, path: AppRoute.PHOTO_WALL },
    { label: t('nav.garden'), icon: Flower2, path: AppRoute.GARDEN }, 
    { label: t('nav.calendar'), icon: CalendarDays, path: AppRoute.HISTORY },
    { label: t('nav.settings'), icon: Settings, path: AppRoute.PROFILE },
  ];

  const handleNavClick = (item: any) => {
    navigate(item.path, { state: item.state || {} });
  };

  return (
    <div
      className="fixed left-1/2 transform -translate-x-1/2 w-[95%] max-w-[380px] z-50"
      style={{ bottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
    >
      {/* Floating Paper Strip */}
      <div 
        className="bg-[#FFFDF7] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.1)] border border-gray-200 px-6 py-2 flex items-center justify-between h-[70px] relative overflow-hidden paper-texture"
        style={{
            transform: 'rotate(-1deg)'
        }}
      >
        
        {navItems.map((item) => {
          const isActive = getActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className="relative flex-1 group transition-all duration-300 h-full flex flex-col items-center justify-center"
            >
              {/* Marker Highlight Circle (Active State) - Positioned relative to the button */}
              {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <svg 
                        width="64" 
                        height="64" 
                        viewBox="0 0 100 100" 
                        className="opacity-90 rotate-12 translate-y-3" // Shifted down to capture text
                      >
                          <path 
                            d="M20,50 Q20,20 50,20 T80,50 T50,80 T20,50" 
                            fill="none" 
                            stroke="#FF6B6B" // Marker Color
                            strokeWidth="4" 
                            strokeLinecap="round"
                            className="animate-in fade-in duration-500"
                            style={{ strokeDasharray: 300, strokeDashoffset: 0 }}
                          />
                      </svg>
                  </div>
              )}

              {/* Icon Container */}
              <div className={`relative z-10 transition-transform duration-300 ${isActive ? '-translate-y-2' : ''}`}>
                  <div className={`transition-colors duration-300 ${isActive ? 'text-[#2D2D2D]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    <item.icon 
                      size={24} 
                      strokeWidth={2}
                    />
                  </div>
              </div>

              {/* Label - Handwritten */}
              <span className={`
                  text-[10px] font-bold uppercase tracking-widest transition-all duration-300 absolute bottom-2 z-10
                  ${isActive ? 'text-[#2D2D2D] opacity-100 scale-100' : 'text-gray-400 opacity-0 scale-90'}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
