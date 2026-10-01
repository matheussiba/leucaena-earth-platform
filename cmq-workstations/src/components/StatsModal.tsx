import React, { useRef, useState } from 'react';
import { Workstation, Reservation, DeletedReservationEntry } from '../types';
import { calculateDurationHours, formatBayNumber } from '../utils/dateUtils';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { BarChart3, X, Clock, Users, TrendingUp, AlertTriangle } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workstations: Workstation[];
  reservations: Reservation[];
  deletionLog: DeletedReservationEntry[];
}

type PeriodFilter = 'day' | 'week' | 'month';

const pad2 = (n: number) => String(n).padStart(2, '0');

function formatLocalStamp(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatIsoLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatLocalStamp(d);
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  workstations,
  reservations,
  deletionLog,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('week');
  const logClickRef = useRef({ count: 0, timer: 0 as number | ReturnType<typeof setTimeout> });

  if (!isOpen) return null;

  // Compute period boundaries based on today
  const now = new Date();
  const getPeriodRange = (p: PeriodFilter) => {
    const start = new Date(now);
    const end = new Date(now);

    if (p === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (p === 'week') {
      const dayOfWeek = start.getDay(); // 0 is Sunday
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const { start: periodStart, end: periodEnd } = getPeriodRange(period);

  // Filter reservations overlapping the period
  const activeOrCompleted = reservations.filter((r) => {
    if (r.status === 'cancelled') return false;
    const rStart = new Date(r.startTime).getTime();
    const rEnd = new Date(r.endTime).getTime();
    return rEnd >= periodStart.getTime() && rStart <= periodEnd.getTime();
  });

  // Calculate duration of each reservation within the selected period
  const getReservationHoursInPeriod = (r: Reservation) => {
    const rStart = Math.max(new Date(r.startTime).getTime(), periodStart.getTime());
    const rEnd = Math.min(new Date(r.endTime).getTime(), periodEnd.getTime());
    if (rEnd <= rStart) return 0;
    return (rEnd - rStart) / (1000 * 60 * 60);
  };

  const totalHours = activeOrCompleted.reduce((sum, r) => {
    return sum + getReservationHoursInPeriod(r);
  }, 0);

  // Hours by Workstation
  const hoursByWs: { [id: string]: number } = {};
  workstations.forEach((ws) => (hoursByWs[ws.id] = 0));
  activeOrCompleted.forEach((r) => {
    if (hoursByWs[r.workstationId] !== undefined) {
      hoursByWs[r.workstationId] += getReservationHoursInPeriod(r);
    }
  });

  // Hours by Researcher
  const hoursByResearcher: { [name: string]: { hours: number; role: string } } = {};
  activeOrCompleted.forEach((r) => {
    if (!hoursByResearcher[r.researcherName]) {
      hoursByResearcher[r.researcherName] = { hours: 0, role: r.researcherRole };
    }
    hoursByResearcher[r.researcherName].hours += getReservationHoursInPeriod(r);
  });

  const sortedResearchers = Object.entries(hoursByResearcher)
    .sort((a, b) => b[1].hours - a[1].hours)
    .slice(0, 5);

  // Calculate excess hours outside Fair-Use
  const getExcessHours = (r: Reservation): number => {
    if (!r.isNonFairUse) return 0;
    if (r.nonFairUseThreshold) {
      const threshTime = new Date(r.nonFairUseThreshold).getTime();
      const endTime = new Date(r.endTime).getTime();
      if (endTime > threshTime) {
        return (endTime - threshTime) / (1000 * 60 * 60);
      }
    }
    // If no threshold specified, calculate duration exceeding 12h or whole duration
    const dur = calculateDurationHours(r.startTime, r.endTime);
    return dur > 12 ? dur - 12 : dur;
  };

  const nonFairUseRes = activeOrCompleted.filter((r) => r.isNonFairUse);
  const totalExcessHours = nonFairUseRes.reduce((sum, r) => sum + getExcessHours(r), 0);
  const avgExcessHours = nonFairUseRes.length > 0 ? totalExcessHours / nonFairUseRes.length : 0;

  const periodLabels: Record<PeriodFilter, string> = {
    day: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mês',
  };

  const buildOccupancyLogTxt = () => {
    const exportedAt = formatLocalStamp(now);
    const wsById = Object.fromEntries(workstations.map((w) => [w.id, w]));
    const lines: string[] = [
      'CMQ Workstations — Log de Ocupação & Métricas',
      `Exportado em: ${exportedAt}`,
      `Filtro do painel: ${periodLabels[period]} (${formatLocalStamp(periodStart)} → ${formatLocalStamp(periodEnd)})`,
      '',
      '=== RESUMO DO PERÍODO ===',
      `Total de horas: ${totalHours.toFixed(2)}h`,
      `Reservas (ativas/concluídas no período): ${activeOrCompleted.length}`,
      `Pesquisadores ativos: ${Object.keys(hoursByResearcher).length}`,
      `Excedentes Fair-Use: ${nonFairUseRes.length}`,
      `Horas totais fora Fair-Use: ${totalExcessHours.toFixed(2)}h`,
      `Média horas fora Fair-Use: ${avgExcessHours.toFixed(2)}h`,
      '',
      '=== OCUPAÇÃO POR BAIA ===',
    ];

    workstations.forEach((ws) => {
      const h = hoursByWs[ws.id] || 0;
      const pct = totalHours > 0 ? (h / totalHours) * 100 : 0;
      lines.push(
        `Baia ${formatBayNumber(ws.bayNumber)} | ${ws.name} | IP ${ws.ip || '-'} | ${h.toFixed(2)}h (${pct.toFixed(1)}%)`
      );
    });

    lines.push('', '=== USO POR PESQUISADOR ===');
    Object.entries(hoursByResearcher)
      .sort((a, b) => b[1].hours - a[1].hours)
      .forEach(([name, data], idx) => {
        lines.push(`${idx + 1}. ${name} (${data.role}): ${data.hours.toFixed(2)}h`);
      });
    if (Object.keys(hoursByResearcher).length === 0) {
      lines.push('(nenhum uso no período)');
    }

    const sortedAll = [...reservations].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const formatReservationLine = (r: Reservation, idx: number, extra?: string) => {
      const ws = wsById[r.workstationId];
      const bay = ws ? `Baia ${formatBayNumber(ws.bayNumber)}` : r.workstationId;
      const hours = calculateDurationHours(r.startTime, r.endTime);
      return [
        `#${idx + 1}`,
        `id=${r.id}`,
        bay,
        ws?.name || '-',
        r.researcherName,
        r.researcherRole,
        `tipo=${r.type}`,
        `status=${r.status}`,
        `inicio=${formatIsoLocal(r.startTime)}`,
        `fim=${formatIsoLocal(r.endTime)}`,
        `duracao=${hours.toFixed(2)}h`,
        r.isNonFairUse ? 'fairuse=EXCEDENTE' : 'fairuse=ok',
        r.notes ? `notas=${r.notes.replace(/\s+/g, ' ').trim()}` : '',
        extra,
      ]
        .filter(Boolean)
        .join(' | ');
    };

    lines.push('', `=== LOG COMPLETO DE RESERVAS (${sortedAll.length}) ===`);
    sortedAll.forEach((r, idx) => {
      lines.push(formatReservationLine(r, idx));
    });

    const sortedDeleted = [...deletionLog].sort(
      (a, b) => new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
    );
    lines.push('', `=== RESERVAS EXCLUÍDAS (${sortedDeleted.length}) ===`);
    if (sortedDeleted.length === 0) {
      lines.push('(nenhuma exclusão registrada ainda — só valem exclusões a partir desta versão)');
    } else {
      sortedDeleted.forEach((entry, idx) => {
        lines.push(
          formatReservationLine(
            entry.reservation,
            idx,
            `excluida_em=${formatIsoLocal(entry.deletedAt)}`
          )
        );
      });
    }

    lines.push('', '=== FIM DO LOG ===', '');
    return lines.join('\n');
  };

  const handleHiddenLogClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = logClickRef.current;
    if (state.timer) clearTimeout(state.timer);
    state.count += 1;
    if (state.count >= 3) {
      state.count = 0;
      const text = buildOccupancyLogTxt();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = `cmq-ocupacao-log-${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    state.timer = setTimeout(() => {
      state.count = 0;
    }, 900);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Ocupação & Métricas do Laboratório</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented Period Filter: Dia | Semana | Mês */}
            <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setPeriod('day')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  period === 'day'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  period === 'week'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  period === 'month'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mês
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Horas */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Total Horas</span>
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {totalHours.toFixed(1)}h
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                {periodLabels[period]}
              </span>
            </div>

            {/* 2. Reservas */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span>Reservas</span>
                </span>
                <div className="text-xl font-bold font-mono text-blue-700 mt-1">
                  {activeOrCompleted.length}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                {periodLabels[period]}
              </span>
            </div>

            {/* 3. Pesquisadores */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-500" />
                  <span>Pesquisadores</span>
                </span>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                  {Object.keys(hoursByResearcher).length}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                ativos no período
              </span>
            </div>

            {/* 4. Média Horas Fora Fair-Use */}
            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-amber-900 block flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 fill-amber-100" />
                  <span className="truncate">Média Horas Fora Fair-Use</span>
                </span>
                <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                  {avgExcessHours.toFixed(1)}h
                </div>
              </div>
              <span className="text-[10px] text-amber-800/80 font-mono mt-1">
                {nonFairUseRes.length} excedente(s)
              </span>
            </div>
          </div>

          {/* Workstations breakdown */}
          <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs">Ocupação por Baia</h4>
              <span className="text-[10px] font-mono text-slate-400">
                Filtro: {periodLabels[period]}
              </span>
            </div>
            <div className="space-y-3">
              {workstations.map((ws) => {
                const wsHours = hoursByWs[ws.id] || 0;
                const percent = totalHours > 0 ? (wsHours / totalHours) * 100 : 0;

                return (
                  <div key={ws.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <WorkstationThumbnail workstation={ws} size="sm" />
                        <span className="font-semibold text-slate-800">
                          Baia {formatBayNumber(ws.bayNumber)} ({ws.name})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {wsHours.toFixed(1)}h ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Researchers */}
          <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs">Uso por Pesquisador</h4>
              <span className="text-[10px] font-mono text-slate-400">
                Filtro: {periodLabels[period]}
              </span>
            </div>
            <div className="space-y-1.5">
              {sortedResearchers.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs">
                  Nenhum uso registrado neste período.
                </div>
              ) : (
                sortedResearchers.map(([name, data], idx) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{name}</span>
                      <span className="text-slate-400">({data.role})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{data.hours.toFixed(1)}h</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {/* Hidden export: 3 sequential clicks; label only visible via selection (Ctrl+A) */}
          <button
            type="button"
            onClick={handleHiddenLogClick}
            aria-hidden="true"
            tabIndex={-1}
            title=""
            className="inline-flex items-center gap-1.5 select-text cursor-default border-0 bg-transparent p-0 m-0 outline-none focus:outline-none"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-200/70" />
            <span className="text-[10px] font-mono tracking-wide text-slate-50">
              3xLOG
            </span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
