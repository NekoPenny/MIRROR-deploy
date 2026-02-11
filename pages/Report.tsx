import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import Button from '../components/Button';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { history } = useAppContext();

  return (
    <BlobBackground>
      <div className="flex flex-col h-full px-6 pt-12 pb-10 relative bg-white">
        <button type="button" onClick={() => navigate(-1)} className="absolute top-12 left-6 btn-icon -ml-1">
            <ChevronLeft size={24} strokeWidth={2} />
        </button>

        <div className="mt-16 text-center mb-10">
             <h1 className="text-4xl font-black text-black leading-tight">
                Here's<br/>Your<br/>Personal Report
             </h1>
        </div>

        <div className="flex-1 flex items-center justify-center">
            {/* Chart Placeholder - Thick black circle */}
            <div className="w-64 h-64 rounded-full border-[6px] border-black flex items-center justify-center">
                 {/* Inner content can be added later */}
            </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 w-full">
            <Button className="max-w-[200px] text-xs py-4">
                Detailed Report
            </Button>
            
            <button className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform">
                <Download size={24} />
            </button>
        </div>
      </div>
    </BlobBackground>
  );
};

export default ReportPage;