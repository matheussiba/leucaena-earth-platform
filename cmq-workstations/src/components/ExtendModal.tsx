import React, { useEffect, useState } from 'react';
import { Reservation, Workstation } from '../types';
import { calculateDurationHours, formatDateShort, formatTime, formatBayLabel, isSameDay } from '../utils/dateUtils';
import { reservationsHardConflict } from '../utils/sharedUse';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { Clock, X, AlertTriangle, CheckCircle2, Pencil } from 'lucide-react';

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  workstation: Workstation | null;
  allReservations: Reservation[];
  mode?: 'extend' | 'edit';
  onConfirmExtend: (reservationId: string, newEndIso: string) => void;
}

function formatDelta(mins: number) {
  const sign = mins > 0 ? '+' : mins < 0 ? '−' : '';
  const abs = Math.abs(mins);
  if (abs === 0) return '0';
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h && m) return `${sign}${h}h${m}m`;
  if (h) return `${sign}${h}h`;
  return `${sign}${m}m`;
}

export const ExtendModal: React.FC<ExtendModalProps> = ({
  isOpen,
  onClose,
  reservation,
  workstation,
  allReservations,
  mode = 'extend',
  onConfirmExtend,
}) => {
  const [addedMinutes, setAddedMinutes] = useState<number>(30);
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isOpen) setAddedMinutes(isEdit ? 0 : 30);
  }, [isOpen, isEdit, reservation?.id]);

  if (!isOpen || !reservation || !workstation) return null;

  const currentStart = new Date(reservation.startTime);
  const currentEnd = new Date(reservation.endTime);
  const minDeltaMinutes = Math.ceil(
    (currentStart.getTime() + 15 * 60 * 1000 - currentEnd.getTime()) / 60000
  );
  const potentialNewEnd = new Date(currentEnd.getTime() + addedMinutes * 60 * 1000);
  const tooShort = potentialNewEnd.getTime() - currentStart.getTime() < 15 * 60 * 1000;
  const noChange = addedMinutes === 0;

  const adjust = (delta: number) => {
    setAddedMinutes((prev) => Math.max(minDeltaMinutes, prev + delta));
  };

  // Check collision of the full new interval with other reservations (respects uso compartilhado)
  const extendedCandidate = {
    ...reservation,
    endTime: potentialNewEnd.toISOString(),
  };
  const nextReservations = allReservations.filter((r) => {
    if (r.id === reservation.id) return false;
    if (r.workstationId !== workstation.id) return false;
    if (r.status !== 'active') return false;
    return reservationsHardConflict(extendedCandidate, r);
  });

  const hasConflict = nextReservations.length > 0;
  const conflictingRes = nextReservations[0];
  const canConfirm = !hasConflict && !tooShort && !noChange;
  const currentHours = calculateDurationHours(reservation.startTime, reservation.endTime);
  const nextHours = calculateDurationHours(reservation.startTime, potentialNewEnd.toISOString());
  const endLabel = isSameDay(potentialNewEnd, currentEnd)
    ? formatTime(potentialNewEnd.toISOString())
    : `${formatDateShort(potentialNewEnd.toISOString())} ${formatTime(potentialNewEnd.toISOString())}`;

  const handleConfirm = () => {
    if (!canConfirm) return;
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
            {isEdit ? (
              <Pencil className="w-5 h-5 text-blue-600" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600" />
            )}
            <h3 className="font-bold text-slate-900 text-sm">
              {isEdit ? 'Editar duração' : 'Prorrogar Sessão'}
            </h3>
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
              {isEdit ? 'Ajustar o término na ' : 'Prorrogar tempo na '}
              <strong>
                {formatBayLabel(workstation.bayNumber)} ({workstation.name})
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
              <span className="font-mono font-bold text-blue-700">{endLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duração:</span>
              <span className="font-mono font-semibold text-slate-800">
                {currentHours.toFixed(1)}h → {nextHours.toFixed(1)}h
              </span>
            </div>
          </div>

          {isEdit ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Alongar ou diminuir o término:
              </label>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => adjust(-60)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    −1h
                  </button>
                  <button
                    type="button"
                    onClick={() => adjust(-15)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    −15m
                  </button>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${
                    addedMinutes < 0 ? 'text-amber-700' : addedMinutes > 0 ? 'text-blue-700' : 'text-slate-400'
                  }`}
                >
                  {formatDelta(addedMinutes)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => adjust(15)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => adjust(60)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    +1h
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
          )}

          {hasConflict ? (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  {isEdit ? 'Não é possível salvar:' : 'Não é possível prorrogar:'}
                </span>
                <div>
                  Há uma reserva agendada por {conflictingRes.researcherName} às{' '}
                  {formatTime(conflictingRes.startTime)}.
                </div>
              </div>
            </div>
          ) : tooShort ? (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>A reserva precisa ter pelo menos 15 minutos.</span>
            </div>
          ) : noChange ? (
            <div className="p-2 bg-slate-100 border border-slate-200 rounded text-slate-600">
              Ajuste o término para alongar ou diminuir a duração.
            </div>
          ) : (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {addedMinutes < 0
                  ? 'Horário livre. A duração vai diminuir.'
                  : 'Horário vago. Prorrogação disponível.'}
              </span>
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
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors shadow-2xs ${
              canConfirm
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isEdit ? 'Salvar horário' : 'Confirmar Prorrogação'}
          </button>
        </div>
      </div>
    </div>
  );
};
