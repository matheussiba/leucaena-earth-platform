import React from 'react';
import { 
  Monitor, 
  Calendar, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  Zap,
  Server
} from 'lucide-react';

interface NavbarProps {
  onOpenNewReservation: () => void;
  onOpenQuickCheckIn?: () => void;
  onOpenRules: () => void;
  onOpenMembers: () => void;
  onOpenWorkstations: () => void;
  onOpenStats: () => void;
  totalWorkstations: number;
  inUseCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewReservation,
  onOpenRules,
  onOpenMembers,
  onOpenWorkstations,
  onOpenStats,
  totalWorkstations,
  inUseCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-3 sm:px-5 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Zone 1: Brand wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 truncate block">
                CMQ Workstations
              </span>
              <span className="text-[10px] sm:text-xs font-mono text-slate-500 block -mt-0.5">
                {inUseCount}/{totalWorkstations} em uso
              </span>
            </div>
          </div>

          {/* Zone 2: Primary Section Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100/80 rounded-lg text-xs font-semibold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Calendário</span>
          </div>

          {/* Zone 3: Settings/Management Icons + Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Utility icons cluster */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 shadow-2xs">
              {/* Button: Configurar Baias (PC & Hardware) */}
              <button
                onClick={onOpenWorkstations}
                title="Configurar Baias (PC, RAM, GPU, HD)"
                className="p-1.5 sm:p-2 text-slate-700 hover:text-blue-700 hover:bg-white rounded-md transition-colors flex items-center gap-1"
              >
                <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Button: Membros do Laboratório */}
              <button
                onClick={onOpenMembers}
                title="Pessoal do Laboratório"
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
              </button>

              {/* Button: Regras do Lab */}
              <button
                onClick={onOpenRules}
                title="Regras do Lab (Uso Justo)"
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>

              {/* Button: Métricas */}
              <button
                onClick={onOpenStats}
                title="Métricas de Ocupação"
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Action: Reservar Button with Green Zap (raiozinho) icon */}
            <button
              onClick={onOpenNewReservation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              <span>Reservar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
