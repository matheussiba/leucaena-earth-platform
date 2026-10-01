import React, { useState, useEffect, useMemo } from 'react';
import {
  Workstation,
  Reservation,
  FairUseRules,
  LabMember,
  DeletedReservationEntry,
} from './types';
import { getCurrentActiveReservation, getTimeRemaining, formatTime, formatBayNumber } from './utils/dateUtils';
import { Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { WorkstationThumbnail } from './components/WorkstationThumbnail';
import { ReservationModal } from './components/ReservationModal';
import { RulesModal } from './components/RulesModal';
import { MembersModal } from './components/MembersModal';
import { WorkstationsManagerModal } from './components/WorkstationsManagerModal';
import { StatsModal } from './components/StatsModal';
import { CheckOutConfirmModal } from './components/CheckOutConfirmModal';
import { ExtendModal } from './components/ExtendModal';
import { ReservationDetailsModal } from './components/ReservationDetailsModal';
import { Check, AlertTriangle, Zap } from 'lucide-react';
import { defaultState, loadState, saveState } from './api';

export default function App() {
  const seed = defaultState();
  const [workstations, setWorkstations] = useState<Workstation[]>(seed.workstations);
  const [members, setMembers] = useState<LabMember[]>(seed.members);
  const [reservations, setReservations] = useState<Reservation[]>(seed.reservations);
  const [deletionLog, setDeletionLog] = useState<DeletedReservationEntry[]>(seed.deletionLog);
  const [rules, setRules] = useState<FairUseRules>(seed.rules);
  const [hydrated, setHydrated] = useState(false);

  // 2. Modals state
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationModalType, setReservationModalType] = useState<'instant_checkin' | 'scheduled'>('scheduled');
  const [modalWorkstationId, setModalWorkstationId] = useState<string | undefined>(undefined);
  const [modalDate, setModalDate] = useState<Date | undefined>(undefined);
  const [modalHour, setModalHour] = useState<number | undefined>(undefined);
  const [modalEndHour, setModalEndHour] = useState<number | undefined>(undefined);

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isWorkstationsModalOpen, setIsWorkstationsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [reservationToRelease, setReservationToRelease] = useState<Reservation | null>(null);

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [reservationToExtend, setReservationToExtend] = useState<Reservation | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailsReservation, setSelectedDetailsReservation] = useState<Reservation | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live timer tick every 2 seconds for countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load shared state from the platform DB (survives deploys on DATA_PATH).
  useEffect(() => {
    let cancelled = false;
    loadState()
      .then((state) => {
        if (cancelled) return;
        setWorkstations(state.workstations);
        setMembers(state.members);
        setReservations(state.reservations);
        setDeletionLog(state.deletionLog);
        setRules(state.rules);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Persist to server after local edits (debounced).
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      saveState({ workstations, members, reservations, deletionLog, rules }).catch(() => {
        showToast('Falha ao salvar no servidor. Tente de novo.');
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [workstations, members, reservations, deletionLog, rules, hydrated]);

  // Compute live workstations with dynamic occupancy status
  const liveWorkstations = useMemo(() => {
    return workstations.map((ws) => {
      const active = getCurrentActiveReservation(ws.id, reservations);
      return {
        ...ws,
        status: active ? ('in_use' as const) : ('available' as const),
      };
    });
  }, [workstations, reservations]);

  const inUseCount = liveWorkstations.filter((ws) => ws.status === 'in_use').length;

  // Handlers
  const handleOpenNewReservation = (wsId?: string) => {
    setModalWorkstationId(wsId || workstations[0]?.id);
    setReservationModalType('scheduled');
    setModalDate(new Date());
    setModalHour(new Date().getHours() + 1);
    setModalEndHour(new Date().getHours() + 4);
    setIsReservationModalOpen(true);
  };

  const handleOpenQuickCheckIn = (wsId?: string) => {
    setModalWorkstationId(wsId || workstations[0]?.id);
    setReservationModalType('instant_checkin');
    setModalDate(new Date());
    setIsReservationModalOpen(true);
  };

  const handleTimelineSlotClick = (wsId: string, date: Date, startHour: number, endHour?: number) => {
    setModalWorkstationId(wsId);
    setReservationModalType('scheduled');
    setModalDate(date);
    setModalHour(startHour);
    setModalEndHour(endHour);
    setIsReservationModalOpen(true);
  };

  const handleReservationClick = (res: Reservation) => {
    setSelectedDetailsReservation(res);
    setIsDetailsModalOpen(true);
  };

  const handleCreateReservation = (
    data: Omit<Reservation, 'id' | 'createdAt' | 'status'>
  ) => {
    const newReservation: Reservation = {
      ...data,
      id: `res-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setReservations((prev) => [newReservation, ...prev]);

    if (data.isNonFairUse) {
      showToast('Reserva criada com destaque (fora do Fair-Use, combinável no WhatsApp).');
    } else if (data.type === 'instant_checkin') {
      showToast('Check-in realizado! Máquina marcada como em uso.');
    } else {
      showToast('Reserva confirmada no calendário!');
    }
  };

  const handleConfirmRelease = (reservationId: string) => {
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? { ...r, status: 'completed', endTime: new Date().toISOString() }
          : r
      )
    );
    showToast('Workstation liberada com sucesso!');
  };

  const handleConfirmExtend = (reservationId: string, newEndIso: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, endTime: newEndIso } : r))
    );
    showToast('Tempo de uso estendido com sucesso!');
  };

  const handleCancelReservation = (reservationId: string) => {
    const doomed = reservations.find((r) => r.id === reservationId);
    if (doomed) {
      setDeletionLog((log) => [
        { deletedAt: new Date().toISOString(), reservation: { ...doomed } },
        ...log,
      ]);
    }
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    showToast('Atividade removida do cronograma.');
  };

  const handleSaveWorkstation = (ws: Workstation) => {
    setWorkstations((prev) => {
      const idx = prev.findIndex((w) => w.id === ws.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = ws;
        return copy;
      }
      return [...prev, ws];
    });
    showToast(`Baia ${ws.bayNumber} (${ws.name}) salva com sucesso!`);
  };

  const handleDeleteWorkstation = (id: string) => {
    setWorkstations((prev) => prev.filter((w) => w.id !== id));
    showToast('Workstation removida.');
  };

  const handleAddMember = (member: LabMember) => {
    setMembers((prev) => [...prev, member]);
    showToast(`Pesquisador ${member.name} cadastrado!`);
  };

  const handleUpdateMember = (updatedMember: LabMember) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    showToast(`Pesquisador ${updatedMember.name} atualizado!`);
  };

  const handleDeleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    showToast('Pesquisador removido.');
  };

  return (
    <div className="min-h-screen lg:h-dvh lg:max-h-dvh lg:overflow-hidden bg-slate-100/60 text-slate-900 font-sans flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-lg shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenNewReservation={() => handleOpenNewReservation()}
        onOpenQuickCheckIn={() => handleOpenQuickCheckIn()}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenMembers={() => setIsMembersModalOpen(true)}
        onOpenWorkstations={() => setIsWorkstationsModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        totalWorkstations={liveWorkstations.length}
        inUseCount={inUseCount}
      />

      {/* Main Content — fill remaining viewport height on desktop */}
      <main className="flex-1 min-h-0 w-full px-3 sm:px-5 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-4 lg:py-4 flex flex-col gap-3 sm:gap-3.5 lg:overflow-hidden">
        {/* Compact Live Workstations Bar (Clean, without any "Trocar" text) */}
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
          {liveWorkstations.map((ws) => {
            const activeRes = getCurrentActiveReservation(ws.id, reservations);
            const isBusy = !!activeRes;
            const remaining = activeRes ? getTimeRemaining(activeRes.endTime) : null;

            return (
              <div
                key={ws.id}
                className={`bg-white rounded-xl border p-3 flex items-center justify-between gap-2.5 sm:gap-3 transition-all ${
                  isBusy
                    ? 'border-slate-300 ring-1 ring-emerald-200/60 shadow-2xs'
                    : 'border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <WorkstationThumbnail workstation={ws} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        BAIA {formatBayNumber(ws.bayNumber)}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {ws.name}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                      {ws.gpu}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <span>RAM: {ws.ram}</span>
                      <span>·</span>
                      <span>HD: {ws.internalStorage}</span>
                    </div>

                    {ws.ip ? (
                      <div className="text-[10px] font-mono font-semibold text-slate-700 mt-0.5 truncate" title="IP da máquina">
                        IP {ws.ip}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right Action / Status in bay card */}
                <div className="shrink-0 text-right">
                  {isBusy && activeRes ? (
                    <div>
                      <div
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-900"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>{activeRes.researcherName.split(' ')[0]}</span>
                        {activeRes.isNonFairUse && (
                          <span title="Excede o limite de Fair-Use">
                            <AlertTriangle className="w-3 h-3 text-amber-500 fill-amber-100 shrink-0 ml-0.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-700 font-semibold mt-0.5">
                        restam {remaining?.formatted}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <button
                          onClick={() => {
                            setReservationToRelease(activeRes);
                            setIsReleaseModalOpen(true);
                          }}
                          className="text-[10px] font-semibold text-rose-700 hover:underline"
                        >
                          Liberar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Livre</span>
                      </span>
                      <button
                        onClick={() => handleOpenQuickCheckIn(ws.id)}
                        className="mt-1 block text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        Usar Agora →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary View: Unified Calendário (Dia | Semana | Mês) */}
        <div className="flex-1 min-h-0 flex flex-col">
          <CalendarView
            workstations={liveWorkstations}
            reservations={reservations}
            onSlotClick={handleTimelineSlotClick}
            onReservationClick={handleReservationClick}
            onQuickCheckIn={handleOpenQuickCheckIn}
          />
        </div>
      </main>

      {/* Simplified Footer */}
      <footer className="shrink-0 bg-white border-t border-slate-200 py-2.5 lg:py-3 text-xs text-slate-500">
        <div className="w-full px-3 sm:px-5 lg:px-8 xl:px-10 2xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-800">CMQ Workstations</span>
            <span className="mx-2">·</span>
            <span>Controle & Agendamento de Workstations do Laboratório</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsWorkstationsModalOpen(true)}
              className="text-slate-600 hover:text-slate-900 hover:underline"
            >
              Configurar Baias
            </button>
            <span>·</span>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="text-slate-600 hover:text-slate-900 hover:underline"
            >
              Regras do Lab
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        workstations={liveWorkstations}
        reservations={reservations}
        members={members}
        rules={rules}
        initialWorkstationId={modalWorkstationId}
        initialDate={modalDate}
        initialHour={modalHour}
        initialEndHour={modalEndHour}
        initialType={reservationModalType}
        onAddMember={handleAddMember}
        onSubmit={handleCreateReservation}
      />

      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rules}
        onUpdateRules={(newRules) => {
          setRules(newRules);
          showToast('Regras de uso do laboratório atualizadas!');
        }}
      />

      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={members}
        onAddMember={handleAddMember}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
      />

      <WorkstationsManagerModal
        isOpen={isWorkstationsModalOpen}
        onClose={() => setIsWorkstationsModalOpen(false)}
        workstations={liveWorkstations}
        onSaveWorkstation={handleSaveWorkstation}
        onDeleteWorkstation={handleDeleteWorkstation}
      />

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        workstations={liveWorkstations}
        reservations={reservations}
        deletionLog={deletionLog}
      />

      <CheckOutConfirmModal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        reservation={reservationToRelease}
        workstation={
          reservationToRelease
            ? liveWorkstations.find((w) => w.id === reservationToRelease.workstationId) || null
            : null
        }
        onConfirmRelease={handleConfirmRelease}
      />

      <ExtendModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        reservation={reservationToExtend}
        workstation={
          reservationToExtend
            ? liveWorkstations.find((w) => w.id === reservationToExtend.workstationId) || null
            : null
        }
        allReservations={reservations}
        onConfirmExtend={handleConfirmExtend}
      />

      <ReservationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        reservation={selectedDetailsReservation}
        workstation={
          selectedDetailsReservation
            ? liveWorkstations.find((w) => w.id === selectedDetailsReservation.workstationId) || null
            : null
        }
        onReleaseNow={(res) => {
          setReservationToRelease(res);
          setIsReleaseModalOpen(true);
        }}
        onCancelReservation={handleCancelReservation}
        onExtend={(res) => {
          setReservationToExtend(res);
          setIsExtendModalOpen(true);
        }}
      />

      {/* Floating Action Button (FAB) for Mobile - Bottom Right */}
      <button
        onClick={() => handleOpenNewReservation()}
        className="sm:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white font-semibold text-xs rounded-full shadow-2xl hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/60"
        aria-label="Reservar Baia"
      >
        <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
        <span>Reservar</span>
      </button>
    </div>
  );
}
