import React, { useEffect, useMemo, useState } from 'react';
import { Reservation, Workstation } from '../types';
import { formatTime, formatDateFull, calculateDurationHours, formatBayLabel } from '../utils/dateUtils';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { X, Trash2, AlertTriangle, Pencil } from 'lucide-react';

export type SeriesDeleteMode = 'one' | 'all' | 'this_and_future';

interface ReservationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  workstation: Workstation | null;
  allReservations: Reservation[];
  onReleaseNow: (reservation: Reservation) => void;
  onCancelReservation: (reservationId: string, mode?: SeriesDeleteMode) => void;
  onExtend: (reservation: Reservation, mode?: 'extend' | 'edit') => void;
}

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  isOpen,
  onClose,
  reservation,
  workstation,
  allReservations,
  onReleaseNow,
  onCancelReservation,
  onExtend,
}) => {
  const [showSeriesDelete, setShowSeriesDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) setShowSeriesDelete(false);
  }, [isOpen, reservation?.id]);

  const seriesPeers = useMemo(() => {
    if (!reservation?.seriesId) return [];
    return allReservations
      .filter((r) => r.seriesId === reservation.seriesId && r.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allReservations, reservation]);

  const futureInSeries = useMemo(() => {
    if (!reservation?.seriesId) return [];
    const startMs = new Date(reservation.startTime).getTime();
    return seriesPeers.filter((r) => new Date(r.startTime).getTime() >= startMs);
  }, [reservation, seriesPeers]);

  if (!isOpen || !reservation || !workstation) return null;

  const now = new Date();
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const isNowActive = now >= start && now <= end && reservation.status === 'active';
  const isFuture = start > now && reservation.status === 'active';
  const durationHours = calculateDurationHours(reservation.startTime, reservation.endTime);
  const isSeries = Boolean(reservation.seriesId) && seriesPeers.length > 1;

  const confirmSingleDelete = () => {
    const msg = isNowActive
      ? 'Excluir esta atividade em uso agora? O horário some do cronograma.'
      : isFuture
      ? 'Excluir este agendamento? O horário volta a ficar livre.'
      : 'Excluir esta atividade do histórico?';
    if (confirm(msg)) {
      onCancelReservation(reservation.id, 'one');
      onClose();
    }
  };

  const applySeriesDelete = (mode: SeriesDeleteMode) => {
    onCancelReservation(reservation.id, mode);
    setShowSeriesDelete(false);
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
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <WorkstationThumbnail workstation={workstation} size="sm" />
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                {formatBayLabel(workstation.bayNumber)}
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                {workstation.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Non-Fair-Use Highlight Notice */}
          {reservation.isNonFairUse && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-lg text-amber-950 space-y-1.5">
              <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                <span>Excedente de Fair-Use</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Esta reserva excede as regras padrão do laboratório. Caso você precise usar a máquina neste horário, converse com <strong>{reservation.researcherName}</strong> no grupo do WhatsApp para alinhamento.
              </p>
              {reservation.nonFairUseReasons && reservation.nonFairUseReasons.length > 0 && (
                <ul className="list-disc pl-4 text-[10px] text-amber-800 space-y-0.5">
                  {reservation.nonFairUseReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Status banner */}
          {isNowActive ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-950">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Em Execução Agora no Laboratório
              </span>
              <span className="font-mono text-[11px] font-bold">
                Até {formatTime(reservation.endTime)}
              </span>
            </div>
          ) : isFuture ? (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-center justify-between">
              <span className="font-semibold">Reserva Futura Agendada</span>
              <span className="font-mono text-[11px]">
                {start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ) : null}

          {/* Researcher details */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                {reservation.researcherName.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {reservation.researcherName}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {reservation.researcherRole}
                </div>
              </div>
            </div>

            {reservation.isSharedUse && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-indigo-800 flex items-start gap-1.5">
                <span className="font-semibold shrink-0">Uso compartilhado</span>
                <span className="text-indigo-700/90">
                  {reservation.sharedFrom &&
                  new Date(reservation.sharedFrom).getTime() >
                    new Date(reservation.startTime).getTime() + 1000
                    ? `exclusivo até ${formatTime(reservation.sharedFrom)}; depois 50% (outro usuário pode usar)`
                    : 'todo o intervalo em 50% (outro usuário pode usar)'}
                </span>
              </div>
            )}

            {reservation.notes && (
              <div className="pt-2 border-t border-slate-200 text-slate-600 italic">
                "{reservation.notes}"
              </div>
            )}
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded border border-slate-200 bg-white">
              <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                Horário
              </span>
              <div className="font-mono font-bold text-slate-900 text-xs">
                {formatTime(reservation.startTime)} às {formatTime(reservation.endTime)}
              </div>
              <div className="text-slate-500 text-[10px] mt-0.5">
                {formatDateFull(start)}
              </div>
            </div>

            <div className="p-2.5 rounded border border-slate-200 bg-white">
              <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                Duração
              </span>
              <div className="font-mono font-bold text-blue-700 text-xs">
                {durationHours.toFixed(1)} horas
              </div>
              <div className="text-slate-500 text-[10px] mt-0.5">
                {reservation.type === 'instant_checkin' ? 'Check-in Imediato' : 'Agendamento Prévio'}
                {isSeries ? ` · série (${seriesPeers.length})` : ''}
              </div>
            </div>
          </div>

          {showSeriesDelete && isSeries && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/80 space-y-2">
              <div className="font-semibold text-rose-900 text-xs">Excluir ocorrência da série</div>
              <p className="text-[11px] text-rose-800/90 leading-relaxed">
                Esta reserva faz parte de uma série com {seriesPeers.length} ocorrências. Escolha o
                escopo da exclusão:
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => applySeriesDelete('one')}
                  className="w-full text-left px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-800"
                >
                  Somente esta ocorrência
                </button>
                <button
                  type="button"
                  onClick={() => applySeriesDelete('this_and_future')}
                  className="w-full text-left px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-800"
                >
                  Esta e todas as seguintes ({futureInSeries.length})
                </button>
                <button
                  type="button"
                  onClick={() => applySeriesDelete('all')}
                  className="w-full text-left px-2.5 py-2 text-xs bg-white border border-rose-200 rounded-md hover:bg-rose-50 text-rose-800 font-medium"
                >
                  Toda a série ({seriesPeers.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSeriesDelete(false)}
                className="text-[11px] text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (isSeries) {
                setShowSeriesDelete(true);
                return;
              }
              confirmSingleDelete();
            }}
            className="px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md font-medium flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => {
                onExtend(reservation, 'edit');
                onClose();
              }}
              className="px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-semibold transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            {isNowActive && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onExtend(reservation, 'extend');
                    onClose();
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-semibold transition-colors"
                >
                  Prorrogar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReleaseNow(reservation);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-md font-semibold transition-colors shadow-2xs"
                >
                  Liberar Máquina
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
