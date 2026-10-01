import React, { useState } from 'react';
import { Workstation } from '../types';
import { formatBayNumber } from '../utils/dateUtils';
import { Monitor } from 'lucide-react';

interface WorkstationThumbnailProps {
  workstation: Workstation;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const WorkstationThumbnail: React.FC<WorkstationThumbnailProps> = ({
  workstation,
  size = 'md',
  showBadge = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 text-[9px]',
    md: 'w-13 h-13 text-[10px]',
    lg: 'w-18 h-18 text-xs',
    xl: 'w-24 h-24 text-sm',
  }[size];

  const bayFormatted = formatBayNumber(workstation.bayNumber);

  return (
    <div className="relative shrink-0">
      {workstation.imageUrl && !imgError ? (
        <div
          className={`relative rounded-lg overflow-hidden border border-slate-200 shadow-2xs ${sizeClasses}`}
        >
          <img
            src={workstation.imageUrl}
            alt={`Baia ${workstation.bayNumber}`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
          {showBadge && (
            <div className="absolute bottom-0 right-0 left-0 bg-slate-950/85 backdrop-blur-xs text-white text-[8px] font-mono font-bold text-center py-0.5 leading-none">
              B{bayFormatted}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border border-slate-700/60 shadow-2xs flex flex-col items-center justify-center text-white ${sizeClasses}`}
          title={`Workstation Baia ${workstation.bayNumber} - ${workstation.name}`}
        >
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:5px_5px]" />
          
          {/* Unified clean PC / Monitor symbol for all workstations */}
          <div className="relative z-10 flex flex-col items-center">
            <Monitor
              className={`${
                size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-8 h-8' : 'w-5 h-5'
              } text-blue-400`}
            />
          </div>

          {showBadge && (
            <div className="absolute bottom-0 right-0 left-0 bg-black/85 backdrop-blur-xs text-slate-200 font-mono font-bold text-center py-0.5 leading-none text-[8px] tracking-tight border-t border-white/10">
              BAIA {bayFormatted}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
