import React, { useState } from 'react';
import { Reservation, Workstation } from '../types';
import { formatTime, formatBayNumber } from '../utils/dateUtils';
import { isOverlapping } from '../utils/fairUseValidator';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { Clock, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  workstation: Workstation | null;
  allReservations: Reservation[];
  onConfirmExtend: (reservationId: string, newEndIso: string) => void;
}

export const ExtendModal: React.FC<ExtendModalProps> = ({
  isOpen,
  onClose,
  reservation,
  workstation,
  allReservations,
  onConfirmExtend,
}) => {
  const [addedMinutes, setAddedMinutes] = useState<number>(30);

  if (!isOpen || !reservation || !workstation) return null;

  const currentEnd = new Date(reservation.endTime);
  const potentialNewEnd = new Date(currentEnd.getTime() + addedMinutes * 60 * 1000);

  // Check collision with subsequent reservations
  const nextReservations = allReservations.filter((r) => {
    if (r.id === reservation.id) return false;
    if (r.workstationId !== workstation.id) return false;
    if (r.status === 'cancelled') return false;

    const rStart = new Date(r.startTime);
    const rEnd = new Date(r.endTime);

    return isOverlapping(currentEnd, potentialNewEnd, rStart, rEnd);
  });

  const hasConflict = nextReservations.length > 0;
  const conflictingRes = nextReservations[0];

  const handleConfirm = () => {
    if (hasConflict) return;
    onConfirmExtend(reservation.id, potentialNewEnd.toISOString());
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-800">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Prorrogar Sessão</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <WorkstationThumbnail workstation={workstation} size="sm" />
            <div className="text-slate-700">
              Prorrogar tempo na{' '}
              <strong>
                Baia {formatBayNumber(workstation.bayNumber)} ({workstation.name})
              </strong>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Término Atual:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatTime(reservation.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Novo Término Previsto:</span>
              <span className="font-mono font-bold text-blue-700">
                {formatTime(potentialNewEnd.toISOString())}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Selecione o tempo adicional:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 60, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAddedMinutes(mins)}
                  className={`py-1.5 text-xs font-medium rounded border transition-colors ${
                    addedMinutes === mins
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  +{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {hasConflict ? (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Não é possível prorrogar:</span>
                <div>
                  Há uma reserva agendada por {conflictingRes.researcherName} às{' '}
                  {formatTime(conflictingRes.startTime)}.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Horário vago. Prorrogação disponível.</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={hasConflict}
            onClick={handleConfirm}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors shadow-2xs ${
              !hasConflict
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Confirmar Prorrogação
          </button>
        </div>
      </div>
    </div>
  );
};
