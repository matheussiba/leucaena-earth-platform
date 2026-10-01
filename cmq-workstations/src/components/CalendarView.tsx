import React, { useState, useEffect } from 'react';
import { Workstation, Reservation, CalendarViewMode } from '../types';
import { formatTime, formatDateFull, isSameDay, formatBayNumber } from '../utils/dateUtils';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  AlertTriangle,
  Monitor
} from 'lucide-react';

export const getWorkstationColorInfo = (bayNumber: number | string) => {
  const num = Number(bayNumber);
  if (num === 4) {
    return {
      badge: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
      icon: 'text-blue-700',
      borderLeft: 'border-l-4 border-l-blue-600',
      name: 'Baia 04 (Azul)',
    };
  }
  if (num === 7) {
    return {
      badge: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
      icon: 'text-purple-700',
      borderLeft: 'border-l-4 border-l-purple-600',
      name: 'Baia 07 (Roxo)',
    };
  }
  if (num === 2) {
    return {
      badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      icon: 'text-amber-700',
      borderLeft: 'border-l-4 border-l-amber-600',
      name: 'Baia 02 (Âmbar)',
    };
  }
  return {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    icon: 'text-emerald-700',
    borderLeft: 'border-l-4 border-l-emerald-600',
    name: `Baia ${bayNumber}`,
  };
};

interface CalendarViewProps {
  workstations: Workstation[];
  reservations: Reservation[];
  onSlotClick: (workstationId: string, date: Date, startHour: number, endHour?: number) => void;
  onReservationClick: (reservation: Reservation) => void;
  onQuickCheckIn?: (workstationId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  workstations,
  reservations,
  onSlotClick,
  onReservationClick,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWsFilter, setSelectedWsFilter] = useState<string>('all');

  // Drag-to-schedule state for timeline
  const [dragState, setDragState] = useState<{
    wsId: string;
    startHour: number;
    currentHour: number;
  } | null>(null);

  // Global mouseup listener so dragging outside the element releases cleanly
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState) {
        const minH = Math.min(dragState.startHour, dragState.currentHour);
        const maxH = Math.max(dragState.startHour, dragState.currentHour);
        const finalEndH = minH === maxH ? Math.min(23, minH + 3) : Math.min(24, maxH + 1);
        onSlotClick(dragState.wsId, selectedDate, minH, finalEndH);
        setDragState(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState, onSlotClick, selectedDate]);

  const isToday = isSameDay(selectedDate, new Date());
  const now = new Date();

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    setSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const visibleWorkstations =
    selectedWsFilter === 'all'
      ? workstations
      : workstations.filter((w) => w.id === selectedWsFilter);

  // 1. DAY VIEW
  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const currentLinePercent = (currentHourDecimal / 24) * 100;

  const dayReservations = reservations.filter((r) => {
    if (r.status === 'cancelled') return false;
    const rStart = new Date(r.startTime);
    const rEnd = new Date(r.endTime);

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    return rStart <= dayEnd && rEnd >= dayStart;
  });

  // 2. WEEK VIEW
  const weekStart = (() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  })();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // 3. MONTH VIEW
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthCells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    monthCells.push({ date: d, isCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    monthCells.push({ date: d, isCurrentMonth: true });
  }
  const remaining = 35 - monthCells.length;
  if (remaining > 0) {
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      monthCells.push({ date: d, isCurrentMonth: false });
    }
  }

  // Base styles: only green (live) and blue (scheduled), NO yellow!
  const getBaseStyle = (res: Reservation) => {
    const start = new Date(res.startTime);
    const end = new Date(res.endTime);
    const isNowActive = now >= start && now <= end && res.status === 'active';

    if (isNowActive) {
      return {
        bg: 'bg-emerald-100 border-emerald-400 text-emerald-950 hover:bg-emerald-200/90',
        badgeColor: 'text-emerald-900 bg-emerald-200/80',
        isLive: true,
      };
    }

    return {
      bg: 'bg-blue-50 border-blue-300 text-blue-950 hover:bg-blue-100',
      badgeColor: 'text-blue-900 bg-blue-100',
      isLive: false,
    };
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3 select-none">
      {/* Top Calendar Toolbar */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 lg:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Date Navigation */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <div className="flex items-center border border-slate-200 rounded-lg bg-white shadow-2xs">
            <button
              onClick={handlePrev}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-200"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold ${
                isToday ? 'text-blue-700 bg-blue-50/50' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l border-slate-200"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
            <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="capitalize truncate">
              {viewMode === 'day' && formatDateFull(selectedDate)}
              {viewMode === 'week' &&
                `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              {viewMode === 'month' &&
                selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* View Mode Switcher & Bay Filter */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Workstation filter dropdown */}
          <select
            value={selectedWsFilter}
            onChange={(e) => setSelectedWsFilter(e.target.value)}
            className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none max-w-[150px] sm:max-w-none truncate"
          >
            <option value="all">Todas as Baias</option>
            {workstations.map((w) => (
              <option key={w.id} value={w.id}>
                Baia {formatBayNumber(w.bayNumber)}
              </option>
            ))}
          </select>

          {/* Segmented View Mode: Dia | Semana | Mês */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Standardized Legend Bar */}
      <div className="shrink-0 bg-white rounded-lg border border-slate-200 px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
        {viewMode === 'day' && (
          <span className="font-mono text-[11px] text-blue-700 font-bold flex items-center gap-1.5">
            <span>👉 CLIQUE E ARRASTE NO CRONOGRAMA PARA MARCAR O INTERVALO</span>
          </span>
        )}

        {viewMode === 'week' && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-semibold text-slate-500">Cores das Baias:</span>
            {workstations.map((w) => {
              const info = getWorkstationColorInfo(w.bayNumber);
              return (
                <span
                  key={w.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] shadow-2xs ${info.badge}`}
                >
                  <Monitor className={`w-3 h-3 ${info.icon}`} />
                  <span>Baia {formatBayNumber(w.bayNumber)}</span>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3.5 ml-auto text-[11px] font-medium">
          {/* 1. Em Uso Agora (Verde) */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            </span>
            <span className="text-slate-800">Em Uso Agora</span>
          </div>

          {/* 2. Agendamento Normal (Azul) */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-50 border border-blue-300"></span>
            <span className="text-slate-800">Agendamento Normal</span>
          </div>

          {/* 3. Excesso Fair-Use */}
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-100 shrink-0" />
            <span className="text-slate-800 font-semibold">Excedente Fair-Use</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. DIA VIEW: 24h Interactive Timeline with Click & Drag to Schedule  */}
      {/* --------------------------------------------------------------------- */}
      {viewMode === 'day' && (
        <div className="flex-1 min-h-[280px] lg:min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="h-full min-h-[280px] lg:min-h-full min-w-[960px] xl:min-w-0 flex flex-col">
            {/* Hours Header */}
            <div className="shrink-0 flex border-b border-slate-200 bg-slate-50/50">
              <div className="sticky left-0 z-40 w-[4.5rem] sm:w-24 shrink-0 px-1.5 py-2 border-r border-slate-200 bg-slate-50 text-[10px] sm:text-xs font-semibold text-slate-600 text-center shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]">
                Baia
              </div>
              <div className="flex-1 flex relative min-w-0">
                {hoursArray.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 min-w-[2.25rem] xl:min-w-0 text-center py-2 border-r border-slate-100 text-[10px] sm:text-[11px] font-mono tabular-nums text-slate-500 last:border-r-0"
                  >
                    {String(hour).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* Workstations Rows — share remaining height on desktop */}
            <div className="flex-1 min-h-0 flex flex-col divide-y divide-slate-100">
              {visibleWorkstations.map((ws) => {
                const wsReservations = dayReservations.filter((r) => r.workstationId === ws.id);

                return (
                  <div key={ws.id} className="flex flex-1 min-h-[92px] lg:min-h-[140px] xl:min-h-[160px] group">
                    {/* Frozen bay column: thumb + name only */}
                    <div className="sticky left-0 z-30 w-[4.5rem] sm:w-24 shrink-0 px-1.5 py-2 border-r border-slate-200 bg-white flex flex-col items-center justify-center gap-0.5 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]">
                      <WorkstationThumbnail workstation={ws} size="sm" showBadge={false} />
                      <div className="font-mono text-[9px] sm:text-[10px] font-bold text-slate-500 leading-none">
                        B{formatBayNumber(ws.bayNumber)}
                      </div>
                      <div className="w-full text-[9px] sm:text-[10px] font-semibold text-slate-800 text-center leading-tight line-clamp-2 px-0.5">
                        {ws.name}
                      </div>
                    </div>

                    {/* Right Column: 24h timeline track with Click & Drag */}
                    <div className="flex-1 relative flex cursor-crosshair min-w-0">
                      {hoursArray.map((hour) => (
                        <div
                          key={hour}
                          onMouseDown={(e) => {
                            if (e.button === 0) {
                              setDragState({
                                wsId: ws.id,
                                startHour: hour,
                                currentHour: hour,
                              });
                            }
                          }}
                          onMouseEnter={() => {
                            if (dragState && dragState.wsId === ws.id) {
                              setDragState((prev) => (prev ? { ...prev, currentHour: hour } : null));
                            }
                          }}
                          className="flex-1 min-w-[2.25rem] xl:min-w-0 border-r border-slate-100 hover:bg-blue-50/50 transition-colors"
                          title={`Clique e arraste a partir das ${hour}:00`}
                        />
                      ))}

                      {/* Current Time Red Line */}
                      {isToday && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                          style={{ left: `${currentLinePercent}%` }}
                        >
                          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                        </div>
                      )}

                      {/* Real-time Drag-to-Schedule Selection Box */}
                      {dragState && dragState.wsId === ws.id && (() => {
                        const minH = Math.min(dragState.startHour, dragState.currentHour);
                        const maxH = Math.max(dragState.startHour, dragState.currentHour);
                        const selEnd = maxH + 1;
                        const leftPct = (minH / 24) * 100;
                        const widthPct = ((selEnd - minH) / 24) * 100;
                        const duration = selEnd - minH;

                        return (
                          <div
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            className="absolute top-1.5 bottom-1.5 rounded-lg bg-blue-500/25 border-2 border-blue-600 z-30 pointer-events-none flex items-center justify-between px-2 text-[10px] font-bold text-blue-950 shadow-md backdrop-blur-xs"
                          >
                            <span className="font-mono bg-white/95 px-1.5 py-0.5 rounded shadow-2xs">
                              {minH < 10 ? `0${minH}` : minH}:00
                            </span>
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-mono shadow-2xs">
                              {duration}h {duration === 1 ? 'hora' : 'horas'}
                            </span>
                            <span className="font-mono bg-white/95 px-1.5 py-0.5 rounded shadow-2xs">
                              {selEnd >= 24 ? '23:59' : `${selEnd < 10 ? `0${selEnd}` : selEnd}:00`}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Reservation Blocks */}
                      {wsReservations.map((res) => {
                        const resStart = new Date(res.startTime);
                        const resEnd = new Date(res.endTime);

                        const selStartOfDay = new Date(selectedDate);
                        selStartOfDay.setHours(0, 0, 0, 0);
                        const selEndOfDay = new Date(selectedDate);
                        selEndOfDay.setHours(24, 0, 0, 0);

                        const effectiveStart = Math.max(resStart.getTime(), selStartOfDay.getTime());
                        const effectiveEnd = Math.min(resEnd.getTime(), selEndOfDay.getTime());
                        if (effectiveEnd <= effectiveStart) return null;

                        const startHours = (effectiveStart - selStartOfDay.getTime()) / (1000 * 60 * 60);
                        const durationHours = (effectiveEnd - effectiveStart) / (1000 * 60 * 60);

                        const leftPercent = (startHours / 24) * 100;
                        const widthPercent = (durationHours / 24) * 100;

                        const baseStyle = getBaseStyle(res);

                        // Check if fair-use is exceeded specifically after a threshold
                        const threshold = res.nonFairUseThreshold
                          ? new Date(res.nonFairUseThreshold)
                          : null;

                        const hasSplitExcess =
                          res.isNonFairUse &&
                          threshold &&
                          threshold.getTime() > effectiveStart &&
                          threshold.getTime() < effectiveEnd;

                        const splitPercent = hasSplitExcess
                          ? ((threshold!.getTime() - effectiveStart) / (effectiveEnd - effectiveStart)) * 100
                          : 100;

                        const isEntirelyExcess =
                          res.isNonFairUse && (!threshold || threshold.getTime() <= effectiveStart);

                        return (
                          <div
                            key={res.id}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReservationClick(res);
                            }}
                            style={{
                              left: `${Math.max(0, leftPercent)}%`,
                              width: `${Math.min(100 - leftPercent, Math.max(widthPercent, 1.8))}%`,
                            }}
                            className={`absolute top-1.5 bottom-1.5 rounded-md z-10 cursor-pointer overflow-hidden border transition-all text-left flex shadow-2xs ${
                              isEntirelyExcess
                                ? 'border-dashed border-slate-400 bg-slate-100 text-slate-800'
                                : baseStyle.bg
                            }`}
                          >
                            {/* Regular part (within Fair-Use) */}
                            <div
                              style={{ width: `${hasSplitExcess ? splitPercent : 100}%` }}
                              className="p-1.5 flex flex-col justify-between min-w-0 h-full overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs truncate flex items-center gap-1">
                                  {baseStyle.isLive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                                  )}
                                  <span className="truncate">{res.researcherName}</span>
                                </span>
                                {isEntirelyExcess && (
                                  <span title="Excede Fair-Use">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-100 shrink-0" />
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] opacity-85 font-mono truncate">
                                {formatTime(res.startTime)} - {formatTime(hasSplitExcess && threshold ? threshold.toISOString() : res.endTime)}
                              </div>
                            </div>

                            {/* Excess portion (A partir do momento que ultrapassa o Fair-Use) */}
                            {hasSplitExcess && (
                              <div
                                style={{ width: `${100 - splitPercent}%` }}
                                className="border-l-2 border-l-amber-500 border-dashed border-amber-300 bg-amber-50/80 p-1 flex flex-col justify-between items-center text-amber-950 h-full relative overflow-hidden"
                                title={`Limite de fair-use ultrapassado a partir das ${formatTime(threshold!.toISOString())}. Horário cedível no WhatsApp.`}
                              >
                                <div className="w-full flex items-center justify-between gap-1">
                                  <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-200/90 px-1 rounded truncate">
                                    às {formatTime(threshold!.toISOString())}
                                  </span>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 fill-amber-100 shrink-0" />
                                </div>
                                <div className="text-[9px] font-mono text-amber-800 font-semibold truncate text-right w-full">
                                  fim {formatTime(res.endTime)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. SEMANA VIEW: 7-Day Grid */}
      {/* --------------------------------------------------------------------- */}
      {viewMode === 'week' && (
        <div className="flex-1 min-h-[320px] lg:min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {weekDays.map((day) => {
              const isDayToday = isSameDay(day, new Date());
              const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;

              const dayRes = reservations.filter((r) => {
                if (selectedWsFilter !== 'all' && r.workstationId !== selectedWsFilter) return false;
                if (r.status === 'cancelled') return false;

                const rStart = new Date(r.startTime);
                const rEnd = new Date(r.endTime);

                const dStart = new Date(day);
                dStart.setHours(0, 0, 0, 0);
                const dEnd = new Date(day);
                dEnd.setHours(23, 59, 59, 999);

                return rStart <= dEnd && rEnd >= dStart;
              });

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[220px] md:min-h-0 md:h-full p-2.5 sm:p-3 flex flex-col justify-between ${
                    isDayToday ? 'bg-blue-50/20' : isWeekendDay ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  {/* Day Header */}
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase font-semibold text-slate-500">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                      <div
                        className={`text-base font-bold font-mono ${
                          isDayToday ? 'text-blue-700' : 'text-slate-900'
                        }`}
                      >
                        {day.getDate()}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          {day.toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                      </div>
                    </div>

                    {isDayToday && (
                      <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Day reservations list */}
                  <div className="flex-1 min-h-0 py-2 space-y-1.5 overflow-y-auto">
                    {dayRes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-2">
                        <span className="text-xs text-slate-400">Livre</span>
                        <button
                          onClick={() => onSlotClick(visibleWorkstations[0]?.id || '', day, 9, 12)}
                          className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Reservar</span>
                        </button>
                      </div>
                    ) : (
                      dayRes.map((r) => {
                        const ws = workstations.find((w) => w.id === r.workstationId);
                        const wsColor = ws ? getWorkstationColorInfo(ws.bayNumber) : null;
                        const baseStyle = getBaseStyle(r);

                        return (
                          <div
                            key={r.id}
                            onClick={() => onReservationClick(r)}
                            className={`p-2 rounded-lg border cursor-pointer transition-colors text-left ${baseStyle.bg} ${
                              wsColor ? wsColor.borderLeft : ''
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono font-semibold gap-1">
                              <span>
                                {formatTime(r.startTime)} - {formatTime(r.endTime)}
                              </span>
                              {ws && wsColor && (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] shadow-2xs ${wsColor.badge}`}>
                                  <Monitor className={`w-3 h-3 ${wsColor.icon}`} />
                                  <span>B{formatBayNumber(ws.bayNumber)}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold mt-1 truncate flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1 truncate">
                                {baseStyle.isLive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                                )}
                                <span className="truncate">{r.researcherName}</span>
                              </span>
                              {r.isNonFairUse && (
                                <span title="Excede Fair-Use">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-100 shrink-0" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Add Button */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onSlotClick(visibleWorkstations[0]?.id || '', day, 9, 12)}
                      className="w-full py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Agendar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. MÊS VIEW: Monthly Calendar Grid */}
      {/* --------------------------------------------------------------------- */}
      {viewMode === 'month' && (
        <div className="flex-1 min-h-[360px] lg:min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="shrink-0 grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 text-xs font-semibold text-slate-600">
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div className="text-slate-500">Sáb</div>
            <div className="text-slate-500">Dom</div>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {monthCells.map(({ date, isCurrentMonth }) => {
              const isCellToday = isSameDay(date, new Date());

              const cellRes = reservations.filter((r) => {
                if (selectedWsFilter !== 'all' && r.workstationId !== selectedWsFilter) return false;
                if (r.status === 'cancelled') return false;

                const rStart = new Date(r.startTime);
                const rEnd = new Date(r.endTime);

                const dStart = new Date(date);
                dStart.setHours(0, 0, 0, 0);
                const dEnd = new Date(date);
                dEnd.setHours(23, 59, 59, 999);

                return rStart <= dEnd && rEnd >= dStart;
              });

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    setViewMode('day');
                  }}
                  className={`min-h-[72px] sm:min-h-[88px] lg:min-h-0 h-full p-1.5 sm:p-2 flex flex-col justify-between hover:bg-blue-50/20 cursor-pointer transition-colors ${
                    !isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-300'
                      : isCellToday
                      ? 'bg-blue-50/30'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isCellToday
                          ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center'
                          : isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {cellRes.length > 0 && (
                      <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                        {cellRes.length} {cellRes.length === 1 ? 'uso' : 'usos'}
                      </span>
                    )}
                  </div>

                  {/* Reservation markers */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {cellRes.slice(0, 2).map((r) => {
                      const ws = workstations.find((w) => w.id === r.workstationId);
                      const wsColor = ws ? getWorkstationColorInfo(ws.bayNumber) : null;
                      const baseStyle = getBaseStyle(r);

                      return (
                        <div
                          key={r.id}
                          className={`text-[9px] sm:text-[10px] p-0.5 px-1 rounded truncate font-medium border flex items-center justify-between gap-1 ${baseStyle.bg} ${
                            wsColor ? wsColor.borderLeft : ''
                          }`}
                        >
                          <span className="truncate flex items-center gap-1">
                            {ws && (
                              <Monitor className={`w-2.5 h-2.5 shrink-0 ${wsColor?.icon || 'text-slate-600'}`} />
                            )}
                            <span className="truncate">
                              B{formatBayNumber(ws?.bayNumber || '')}: {r.researcherName.split(' ')[0]}
                            </span>
                          </span>
                          {r.isNonFairUse && (
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500 fill-amber-100 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {cellRes.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-mono">
                        +{cellRes.length - 2} mais
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-blue-600 font-medium hidden sm:block opacity-0 hover:opacity-100 transition-opacity">
                    Ver dia →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
