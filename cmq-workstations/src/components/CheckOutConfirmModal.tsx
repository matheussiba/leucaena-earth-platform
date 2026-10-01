import React from 'react';
import { Reservation, Workstation } from '../types';
import { formatTime, calculateDurationHours, formatBayNumber } from '../utils/dateUtils';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { LogOut, X, AlertCircle } from 'lucide-react';

interface CheckOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  workstation: Workstation | null;
  onConfirmRelease: (reservationId: string) => void;
}

export const CheckOutConfirmModal: React.FC<CheckOutConfirmModalProps> = ({
  isOpen,
  onClose,
  reservation,
  workstation,
  onConfirmRelease,
}) => {
  if (!isOpen || !reservation || !workstation) return null;

  const originalHours = calculateDurationHours(reservation.startTime, reservation.endTime);
  const usedHours = calculateDurationHours(reservation.startTime, new Date().toISOString());

  const handleConfirm = () => {
    onConfirmRelease(reservation.id);
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
          <div className="flex items-center gap-2 text-rose-700">
            <LogOut className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-sm">Liberar Workstation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-center gap-3">
            <WorkstationThumbnail workstation={workstation} size="sm" />
            <div className="text-slate-700">
              Liberar antecipadamente a{' '}
              <strong>
                Baia {formatBayNumber(workstation.bayNumber)} ({workstation.name})
              </strong>
              .
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Pesquisador:</span>
              <span className="font-semibold text-slate-900">{reservation.researcherName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Período Reservado:</span>
              <span className="font-mono text-slate-700">
                {formatTime(reservation.startTime)} às {formatTime(reservation.endTime)} ({originalHours.toFixed(1)}h)
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-700 font-semibold">
              <span>Horas Efetivas de Uso:</span>
              <span className="font-mono">{Math.max(0.1, usedHours).toFixed(1)}h</span>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Certifique-se de salvar seus checkpoints ou encerrar scripts pendentes antes de desocupar a máquina para o próximo colega.
            </span>
          </div>
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
            onClick={handleConfirm}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-2xs"
          >
            Confirmar e Liberar Máquina
          </button>
        </div>
      </div>
    </div>
  );
};
