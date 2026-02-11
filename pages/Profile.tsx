
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Bell, Sparkles, BrainCircuit, Edit2, ChevronRight, Cpu, LogOut, Target } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';

const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
  'Unknown'
];

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  value: string | boolean;
  type: 'select' | 'toggle';
  options?: { value: string; label: string }[] | string[];
  onChange: (val: any) => void;
  last?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ 
  icon, title, value, type, options, onChange, last 
}) => {
  const getDisplayValue = () => {
      if (typeof value !== 'string') return '';
      if (Array.isArray(options) && options.length > 0) {
          const found = options.find((opt: any) => 
            typeof opt === 'object' ? opt.value === value : opt === value
          );
          if (found) {
              return typeof found === 'object' ? found.label : found;
          }
      }
      return value;
  };

  return (
    <div className={`profile-setting-row relative flex items-center justify-between py-4 ${!last ? 'border-b border-dashed border-[var(--color-grid)]' : ''} group`}>
      
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] group-hover:text-[var(--color-pencil)] transition-colors">
           {icon}
        </div>
        <h3 className="text-base font-bold text-[var(--color-pencil)]">{title}</h3>
      </div>

      <div className="flex items-center gap-2 relative z-10">
        {type === 'toggle' ? (
          <button
             type="button"
             onClick={() => onChange(!value)}
             className="profile-toggle relative w-12 h-7 rounded-[var(--radius-full)] border-2 border-[var(--color-grid)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pencil)] focus-visible:ring-offset-2"
             aria-checked={!!value}
             role="switch"
          >
             <span className={`
                absolute inset-0 rounded-[var(--radius-full)] transition-colors duration-200
                ${value ? 'bg-[var(--color-highlight)]' : 'bg-[var(--color-surface)]'}
             `} />
             <span className={`
                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white border border-[var(--color-grid)] shadow-sm transition-transform duration-200 ease-[var(--ease-spring)]
                ${value ? 'translate-x-5' : 'translate-x-0'}
             `} />
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[var(--color-muted)]">
             <span className="text-sm font-semibold truncate max-w-[140px] text-right text-[var(--color-pencil)] border-b border-dashed border-[var(--color-grid)] pb-0.5">
                {getDisplayValue()}
             </span>
             <ChevronRight size={18} strokeWidth={2} />
          </div>
        )}
      </div>

      {type === 'select' && options && (
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          aria-label={title}
        >
          {options.map((opt) => {
             const val = typeof opt === 'string' ? opt : opt.value;
             const label = typeof opt === 'string' ? opt : opt.label;
             return <option key={val} value={val}>{label}</option>;
          })}
        </select>
      )}
    </div>
  );
};

const Profile: React.FC = () => {
  const { user, setUser, t } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(user.name);

  useEffect(() => {
    setTempName(user.name);
  }, [user.name]);

  const updateGlobalState = (field: string, value: any) => {
      setUser(prev => {
          const updated = { ...prev };
          if (field === 'mbti') updated.mbti = value;
          if (field === 'name') updated.name = value;
          if (['notifications', 'aiStyle', 'language', 'aiEnabled', 'maxActiveGoals'].includes(field)) {
             updated.preferences = { ...prev.preferences, [field]: value };
          }
          return updated;
      });
  };

  const handleNameBlur = () => {
      setIsEditingName(false);
      if (tempName.trim() !== user.name) {
          updateGlobalState('name', tempName);
      }
  };

  const aiStyleOptions = [
    { value: 'Empathetic', label: t('profile.style_empathetic') },
    { value: 'Direct', label: t('profile.style_direct') },
    { value: 'Poetic', label: t('profile.style_poetic') }
  ];

  const languageOptions = [
    { value: 'Chinese', label: t('profile.lang_zh') },
    { value: 'English', label: t('profile.lang_en') },
    { value: 'Spanish', label: t('profile.lang_es') }
  ];

  const maxActiveGoalsOptions = [
    { value: '3', label: '3' },
    { value: '5', label: '5' },
    { value: '7', label: '7' }
  ];

  return (
    <BlobBackground mood="Pleasant">
      <div className="flex flex-col h-full min-h-0 font-sans relative overflow-hidden">
        
        {/* Header */}
        <div className="px-4 pt-10 pb-2 flex items-center justify-between z-20 flex-shrink-0">
          <button type="button" onClick={() => navigate(-1)} className="btn-icon -ml-1" aria-label={t('errors.back_home')}>
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <h1 className="text-xl font-black text-[var(--color-pencil)] tracking-tight">
            {t('profile.title')}
          </h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-nav no-scrollbar relative z-10 pt-2 space-y-6">
            
            {/* Avatar & Name */}
            <div className="flex flex-col items-center pt-2 pb-2">
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="profile-avatar-block relative p-2 bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border border-[var(--color-grid)] transition-transform duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-rotate-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pencil)]"
              >
                <div className="w-20 h-20 rounded-[var(--radius-md)] bg-[var(--color-surface)] flex items-center justify-center overflow-hidden">
                  <User size={36} className="text-[var(--color-muted)]" strokeWidth={1.5} />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-5 tape tape-yellow transform -rotate-6" aria-hidden />
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-highlight)] text-white flex items-center justify-center shadow-sm border-2 border-white">
                  <Edit2 size={12} strokeWidth={2.5} />
                </span>
              </button>
              <div className="flex flex-col items-center mt-3">
                {isEditingName ? (
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleNameBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                    autoFocus
                    className="text-2xl font-black text-center bg-transparent border-b-2 border-[var(--color-pencil)] outline-none pb-1 w-[200px] text-[var(--color-pencil)]"
                  />
                ) : (
                  <h2 
                    onClick={() => setIsEditingName(true)} 
                    className="text-2xl font-black text-[var(--color-pencil)] cursor-pointer hover:text-[var(--color-highlight)] transition-colors leading-none mb-2"
                  >
                    {user.name || 'User'}
                  </h2>
                )}
                <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-grid)] px-2 py-1 rounded-[var(--radius-sm)]">
                  {user.mbti} · {t('profile.free_plan')}
                </span>
              </div>
            </div>

            {/* Card: 我的 Mirror */}
            <div className="profile-card profile-card--mirror relative">
              <div className="absolute -top-2 left-4 w-16 h-5 tape tape-yellow transform -rotate-6 z-10" aria-hidden />
              <div className="bg-[var(--color-paper)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-grid)] shadow-[var(--shadow-card)] paper-texture relative">
                <h3 className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles size={12} strokeWidth={2} /> {t('profile.my_mirror')}
                </h3>
                <div className="flex flex-col">
                  <SettingRow 
                    icon={<BrainCircuit size={18} strokeWidth={2} />}
                    title={t('profile.mbti')}
                    type="select"
                    value={user.mbti || 'Unknown'}
                    options={MBTI_OPTIONS}
                    onChange={(val) => updateGlobalState('mbti', val)}
                  />
                  <SettingRow 
                    icon={<Cpu size={18} strokeWidth={2} />}
                    title={t('profile.ai_features')}
                    type="toggle"
                    value={user.preferences?.aiEnabled ?? true}
                    onChange={(val) => updateGlobalState('aiEnabled', val)}
                  />
                  {user.preferences?.aiEnabled && (
                    <SettingRow 
                      icon={<User size={18} strokeWidth={2} />}
                      title={t('profile.ai_style')}
                      type="select"
                      value={user.preferences?.aiStyle || 'Empathetic'}
                      options={aiStyleOptions}
                      onChange={(val) => updateGlobalState('aiStyle', val)}
                    />
                  )}
                  <SettingRow 
                    icon={<Bell size={18} strokeWidth={2} />}
                    title={t('profile.language')}
                    type="select"
                    value={user.preferences?.language || 'Chinese'}
                    options={languageOptions}
                    onChange={(val) => updateGlobalState('language', val)}
                  />
                  <SettingRow 
                    icon={<Target size={18} strokeWidth={2} />}
                    title={t('profile.max_active_goals')}
                    type="select"
                    value={String(user.preferences?.maxActiveGoals ?? 3)}
                    options={maxActiveGoalsOptions}
                    onChange={(val) => updateGlobalState('maxActiveGoals', Number(val) as 3 | 5 | 7)}
                    last
                  />
                </div>
              </div>
            </div>

            {/* Card: 系统 */}
            <div className="profile-card relative">
              <div className="absolute -top-2 right-4 w-14 h-5 tape tape-blue transform rotate-6 z-10" aria-hidden />
              <div className="bg-[var(--color-paper)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-grid)] shadow-[var(--shadow-card)] paper-texture relative">
                <h3 className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Bell size={12} strokeWidth={2} /> {t('profile.system')}
                </h3>
                <div className="flex flex-col">
                  <SettingRow 
                    icon={<Bell size={18} strokeWidth={2} />}
                    title={t('profile.notifications')}
                    type="toggle"
                    value={user.preferences?.notifications ?? true}
                    onChange={(val) => updateGlobalState('notifications', val)}
                    last
                  />
                </div>
              </div>
            </div>
            
            <button 
              type="button"
              className="profile-logout w-full py-3.5 rounded-[var(--radius-md)] text-[var(--color-muted)] font-bold text-sm border border-dashed border-[var(--color-grid)] hover:border-[var(--color-highlight)] hover:text-[var(--color-highlight)] hover:bg-[var(--color-paper)] transition-colors flex items-center justify-center gap-2 group"
            >
              <LogOut size={18} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
              {t('profile.logout')}
            </button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default Profile;
