import React, { useState, useEffect, useMemo } from 'react';
import {
  Workstation,
  Reservation,
  ReservationStatus,
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
import { applyFairUseFlags } from './utils/fairUseValidator';
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
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

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
    setEditingReservation(null);
    setModalWorkstationId(wsId || workstations[0]?.id);
    setReservationModalType('scheduled');
    setModalDate(new Date());
    setModalHour(new Date().getHours() + 1);
    setModalEndHour(new Date().getHours() + 4);
    setIsReservationModalOpen(true);
  };

  const handleOpenQuickCheckIn = (wsId?: string) => {
    setEditingReservation(null);
    setModalWorkstationId(wsId || workstations[0]?.id);
    setReservationModalType('instant_checkin');
    setModalDate(new Date());
    setIsReservationModalOpen(true);
  };

  const handleTimelineSlotClick = (wsId: string, date: Date, startHour: number, endHour?: number) => {
    setEditingReservation(null);
    setModalWorkstationId(wsId);
    setReservationModalType('scheduled');
    setModalDate(date);
    setModalHour(startHour);
    setModalEndHour(endHour);
    setIsReservationModalOpen(true);
  };

  const handleOpenEditReservation = (res: Reservation) => {
    setEditingReservation(res);
    setModalWorkstationId(res.workstationId);
    setReservationModalType(res.type === 'instant_checkin' ? 'instant_checkin' : 'scheduled');
    setModalDate(new Date(res.startTime));
    setModalHour(new Date(res.startTime).getHours());
    setModalEndHour(new Date(res.endTime).getHours());
    setIsDetailsModalOpen(false);
    setIsReservationModalOpen(true);
  };

  const handleReservationClick = (res: Reservation) => {
    setSelectedDetailsReservation(res);
    setIsDetailsModalOpen(true);
  };

  const resolveReservationStatus = (
    startIso: string,
    endIso: string,
    previous: ReservationStatus = 'active'
  ): ReservationStatus => {
    if (previous === 'cancelled') return 'cancelled';
    const nowMs = Date.now();
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    if (endMs <= nowMs) return 'completed';
    if (startMs <= endMs) return 'active';
    return 'completed';
  };

  /** Persist reservation list and always refresh fair-use flags (avoids sticky gray). */
  const commitReservations = (
    updater: (prev: Reservation[]) => Reservation[]
  ): Reservation[] => {
    let next: Reservation[] = [];
    setReservations((prev) => {
      next = applyFairUseFlags(updater(prev), rules);
      return next;
    });
    return next;
  };

  const handleCreateReservation = (
    data: Omit<Reservation, 'id' | 'createdAt' | 'status'> | Array<Omit<Reservation, 'id' | 'createdAt' | 'status'>>
  ) => {
    if (editingReservation) {
      const draft = Array.isArray(data) ? data[0] : data;
      if (!draft) return;
      const editId = editingReservation.id;
      const status = resolveReservationStatus(
        draft.startTime,
        draft.endTime,
        editingReservation.status
      );
      const next = commitReservations((prev) =>
        prev.map((r) =>
          r.id === editId
            ? {
                ...r,
                ...draft,
                id: editId,
                createdAt: r.createdAt,
                status,
                seriesId: r.seriesId,
              }
            : r
        )
      );
      const updated = next.find((r) => r.id === editId) || null;
      setSelectedDetailsReservation((prev) =>
        prev?.id === editId ? updated : prev
      );
      setEditingReservation(null);
      showToast('Reserva atualizada com sucesso!');
      return;
    }

    const items = Array.isArray(data) ? data : [data];
    const createdAt = new Date().toISOString();
    const stamp = Date.now();
    const created: Reservation[] = items.map((item, idx) => ({
      ...item,
      id: `res-${stamp}-${idx}`,
      status: 'active' as const,
      createdAt,
    }));

    const next = commitReservations((prev) => [...created, ...prev]);
    const firstId = created[0]?.id;
    const first = firstId ? next.find((r) => r.id === firstId) : undefined;

    if (items.length > 1) {
      showToast(`${items.length} ocorrências agendadas no calendário.`);
    } else if (first?.isNonFairUse) {
      showToast('Reserva criada com destaque (fora do Fair-Use, combinável no WhatsApp).');
    } else if (items[0]?.type === 'instant_checkin') {
      showToast('Check-in realizado! Máquina marcada como em uso.');
    } else {
      showToast('Reserva confirmada no calendário!');
    }
  };

  const handleConfirmRelease = (reservationId: string) => {
    commitReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? { ...r, status: 'completed', endTime: new Date().toISOString() }
          : r
      )
    );
    showToast('Workstation liberada com sucesso!');
  };

  const handleConfirmExtend = (reservationId: string, newEndIso: string) => {
    const current = reservations.find((r) => r.id === reservationId);
    const next = commitReservations((prev) =>
      prev.map((r) => {
        if (r.id !== reservationId) return r;

        // Reabrir como ativa se o novo intervalo cobrir (ou for depois de) agora —
        // ex.: liberou a máquina e depois alongou o término de novo.
        const nowMs = Date.now();
        const startMs = new Date(r.startTime).getTime();
        const endMs = new Date(newEndIso).getTime();
        let status = r.status;
        if (r.status !== 'cancelled') {
          if (endMs <= nowMs) status = 'completed';
          else if (startMs <= endMs) status = 'active';
        }

        return { ...r, endTime: newEndIso, status };
      })
    );
    const updated = next.find((r) => r.id === reservationId) || null;
    if (updated) {
      setSelectedDetailsReservation((prev) =>
        prev?.id === reservationId ? updated : prev
      );
      setReservationToExtend((prev) => (prev?.id === reservationId ? updated : prev));
    }
    const shortened =
      current != null && new Date(newEndIso).getTime() < new Date(current.endTime).getTime();
    showToast(shortened ? 'Duração da reserva reduzida.' : 'Tempo de uso estendido com sucesso!');
  };

  const handleCancelReservation = (
    reservationId: string,
    mode: 'one' | 'all' | 'this_and_future' = 'one'
  ) => {
    const target = reservations.find((r) => r.id === reservationId);
    if (!target) return;

    const startMs = new Date(target.startTime).getTime();
    const doomed = reservations.filter((r) => {
      if (mode === 'one') return r.id === reservationId;
      if (!target.seriesId || r.seriesId !== target.seriesId) return r.id === reservationId;
      if (mode === 'all') return true;
      return new Date(r.startTime).getTime() >= startMs;
    });

    if (doomed.length === 0) return;

    const deletedAt = new Date().toISOString();
    setDeletionLog((log) => [
      ...doomed.map((reservation) => ({ deletedAt, reservation: { ...reservation } })),
      ...log,
    ]);
    const doomedIds = new Set(doomed.map((r) => r.id));
    commitReservations((prev) => prev.filter((r) => !doomedIds.has(r.id)));
    showToast(
      doomed.length > 1
        ? `${doomed.length} ocorrências removidas do cronograma.`
        : 'Atividade removida do cronograma.'
    );
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
    showToast(`Usuário ${member.name} cadastrado!`);
  };

  const handleUpdateMember = (updatedMember: LabMember) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    showToast(`Usuário ${updatedMember.name} atualizado!`);
  };

  const handleDeleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    showToast('Usuário removido.');
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-slate-100/60 text-slate-900 font-sans flex flex-col">
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

      {/* Main Content — no page scroll; only calendar hours area may scroll */}
      <main className="flex-1 min-h-0 overflow-hidden w-full px-2.5 sm:px-5 lg:px-8 xl:px-10 2xl:px-12 py-2 sm:py-3 lg:py-3.5 flex flex-col gap-2 sm:gap-3">
        {/* Mobile: single-row badges — livre/ocupado no contorno */}
        <div className="sm:hidden shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {liveWorkstations.map((ws) => {
            const activeRes = getCurrentActiveReservation(ws.id, reservations);
            const isBusy = !!activeRes;
            return (
              <WorkstationThumbnail
                key={ws.id}
                workstation={ws}
                size="md"
                showBadge
                statusBorder={isBusy ? 'in_use' : 'available'}
                onClick={() => {
                  if (isBusy && activeRes) handleReservationClick(activeRes);
                  else handleOpenQuickCheckIn(ws.id);
                }}
                title={
                  isBusy && activeRes
                    ? `${ws.lab} · B${formatBayNumber(ws.bayNumber)} · ${activeRes.researcherName.split(' ')[0]}`
                    : `${ws.lab} · B${formatBayNumber(ws.bayNumber)} · Livre`
                }
              />
            );
          })}
          <div className="flex items-center gap-2 pl-1 text-[9px] font-medium text-slate-500 shrink-0">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm border-2 border-emerald-400" />
              Livre
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm border-2 border-amber-500" />
              Ocup.
            </span>
          </div>
        </div>

        {/* Tablet/desktop: single-row compact cards */}
        <div className="hidden sm:flex shrink-0 flex-row gap-2 sm:gap-2.5 overflow-x-auto">
          {liveWorkstations.map((ws) => {
            const activeRes = getCurrentActiveReservation(ws.id, reservations);
            const isBusy = !!activeRes;
            const remaining = activeRes ? getTimeRemaining(activeRes.endTime) : null;

            return (
              <div
                key={ws.id}
                className={`bg-white rounded-xl border px-2.5 py-2 transition-all min-w-0 flex-1 basis-0 ${
                  isBusy
                    ? 'border-amber-300/80 ring-1 ring-amber-100 shadow-2xs'
                    : 'border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <WorkstationThumbnail
                      workstation={ws}
                      size="md"
                      statusBorder={isBusy ? 'in_use' : 'available'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                          {ws.lab}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
                          B{formatBayNumber(ws.bayNumber)}
                        </span>
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {ws.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {ws.gpu}
                        {ws.ip ? ` · ${ws.ip}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isBusy && activeRes ? (
                      <div>
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>{activeRes.researcherName.split(' ')[0]}</span>
                          {activeRes.isNonFairUse && (
                            <span title="Excede o limite de Fair-Use">
                              <AlertTriangle className="w-3 h-3 text-amber-500 fill-amber-100 shrink-0 ml-0.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-700 font-semibold mt-0.5">
                          {remaining?.formatted}
                        </div>
                        <button
                          onClick={() => {
                            setReservationToRelease(activeRes);
                            setIsReleaseModalOpen(true);
                          }}
                          className="text-[10px] font-semibold text-rose-700 hover:underline mt-0.5"
                        >
                          Liberar
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Livre</span>
                        </span>
                        <button
                          onClick={() => handleOpenQuickCheckIn(ws.id)}
                          className="mt-0.5 block text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          Usar Agora →
                        </button>
                      </div>
                    )}
                  </div>
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
      <footer className="shrink-0 bg-white border-t border-slate-200 py-1 lg:py-1.5 text-[10px] sm:text-xs text-slate-500">
        <div className="w-full px-2.5 sm:px-5 lg:px-8 xl:px-10 2xl:px-12 flex items-center justify-center sm:justify-between gap-2 whitespace-nowrap overflow-hidden">
          <div className="truncate">
            <span className="sm:hidden">
              Sugestões:{' '}
              <a
                href="mailto:ms.barros@usp.br"
                className="text-slate-700 font-medium hover:text-slate-900 hover:underline"
              >
                ms.barros@usp.br
              </a>
            </span>
            <span className="hidden sm:inline">
              <span className="font-bold text-slate-800">CMQ · CePE-Geo</span>
              <span className="mx-2">·</span>
              <span>Sugestões de melhoria: </span>
              <a
                href="mailto:ms.barros@usp.br"
                className="text-slate-700 font-medium hover:text-slate-900 hover:underline"
              >
                ms.barros@usp.br
              </a>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
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
        key={
          editingReservation
            ? `edit-${editingReservation.id}`
            : `new-${reservationModalType}-${modalWorkstationId ?? 'x'}-${modalDate?.getTime() ?? 0}-${modalHour ?? ''}`
        }
        isOpen={isReservationModalOpen}
        onClose={() => {
          setIsReservationModalOpen(false);
          setEditingReservation(null);
        }}
        workstations={liveWorkstations}
        reservations={reservations}
        members={members}
        rules={rules}
        initialWorkstationId={modalWorkstationId}
        initialDate={modalDate}
        initialHour={modalHour}
        initialEndHour={modalEndHour}
        initialType={reservationModalType}
        editingReservation={editingReservation}
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
        key={`${reservationToExtend?.id ?? 'none'}-extend`}
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        reservation={reservationToExtend}
        workstation={
          reservationToExtend
            ? liveWorkstations.find((w) => w.id === reservationToExtend.workstationId) || null
            : null
        }
        allReservations={reservations}
        mode="extend"
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
        allReservations={reservations}
        onReleaseNow={(res) => {
          setReservationToRelease(res);
          setIsReleaseModalOpen(true);
        }}
        onCancelReservation={handleCancelReservation}
        onExtend={(res, mode) => {
          if (mode === 'edit') {
            handleOpenEditReservation(res);
            return;
          }
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
