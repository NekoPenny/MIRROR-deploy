import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileQuestion } from 'lucide-react';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';
import { useAppContext } from '../App';
import { AppRoute } from '../types';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppContext();

  return (
    <BlobBackground>
      <div className="flex flex-col h-full items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[#FFFDF7] border-2 border-gray-200 flex items-center justify-center mb-6 shadow-sm">
          <FileQuestion className="text-gray-400" size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-black text-[#2D2D2D] mb-2">
          {t('errors.not_found_title')}
        </h1>
        <p className="text-gray-500 text-sm mb-8 max-w-[260px]">
          {t('errors.not_found_desc')}
        </p>
        <Button
          onClick={() => navigate(AppRoute.DASHBOARD)}
          className="flex items-center gap-2"
        >
          <Home size={18} />
          {t('errors.back_home')}
        </Button>
      </div>
    </BlobBackground>
  );
};

export default NotFound;
