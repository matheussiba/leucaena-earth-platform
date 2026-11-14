import React, { useState } from 'react';
import { Workstation, WorkstationStatus } from '../types';
import { formatBayLabel } from '../utils/dateUtils';
import { Monitor } from 'lucide-react';

interface WorkstationThumbnailProps {
  workstation: Workstation;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  /** Contour color for livre / ocupado */
  statusBorder?: WorkstationStatus | 'available' | 'in_use';
  className?: string;
  onClick?: () => void;
  title?: string;
}

export const WorkstationThumbnail: React.FC<WorkstationThumbnailProps> = ({
  workstation,
  size = 'md',
  showBadge = true,
  statusBorder,
  className = '',
  onClick,
  title,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 text-[9px]',
    md: 'w-13 h-13 text-[10px]',
    lg: 'w-18 h-18 text-xs',
    xl: 'w-24 h-24 text-sm',
  }[size];

  const bayFormatted = formatBayLabel(workstation.bayNumber);
  const borderCls =
    statusBorder === 'in_use'
      ? 'border-2 border-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]'
      : statusBorder === 'available'
      ? 'border-2 border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]'
      : 'border border-slate-200';

  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        title:
          title ||
          `${workstation.name} · ${statusBorder === 'in_use' ? 'Ocupada' : 'Livre'}`,
      }
    : { title: title || `${workstation.name} · ${bayFormatted}` };

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative shrink-0 rounded-lg overflow-hidden shadow-2xs ${sizeClasses} ${borderCls} ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {workstation.imageUrl && !imgError ? (
        <>
          <img
            src={workstation.imageUrl}
            alt={workstation.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
          {showBadge && (
            <div className="absolute bottom-0 right-0 left-0 bg-slate-950/85 backdrop-blur-xs text-white text-[8px] font-mono font-bold text-center py-0.5 leading-none">
              {bayFormatted}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950" />
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:5px_5px]" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
            <Monitor
              className={`${
                size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-8 h-8' : 'w-5 h-5'
              } text-blue-400`}
            />
          </div>
          {showBadge && (
            <div className="absolute bottom-0 right-0 left-0 bg-slate-950/85 backdrop-blur-xs text-white text-[8px] font-mono font-bold text-center py-0.5 leading-none">
              {bayFormatted}
            </div>
          )}
        </>
      )}
    </Wrapper>
  );
};
