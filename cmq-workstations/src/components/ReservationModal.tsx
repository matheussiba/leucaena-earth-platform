import React, { useState, useEffect, useMemo } from 'react';
import { Workstation, Reservation, FairUseRules, LabMember, ResearcherRole } from '../types';
import { validateReservation } from '../utils/fairUseValidator';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { formatBayNumber } from '../utils/dateUtils';
import { 
  X, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  UserPlus,
  MessageCircle,
  AlertCircle
} from 'lucide-react';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workstations: Workstation[];
  reservations: Reservation[];
  members: LabMember[];
  rules: FairUseRules;
  initialWorkstationId?: string;
  initialDate?: Date;
  initialHour?: number;
  initialEndHour?: number;
  initialType?: 'instant_checkin' | 'scheduled';
  onAddMember: (member: LabMember) => void;
  onSubmit: (reservationData: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => void;
}

const ROLES: ResearcherRole[] = [
  'TT',
  'Iniciação Científica',
  'Mestrado',
  'Doutorado',
  'Pós-Doc',
  'Professor',
  'Técnico do Lab',
];

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  workstations,
  reservations,
  members,
  rules,
  initialWorkstationId,
  initialDate,
  initialHour,
  initialEndHour,
  initialType = 'scheduled',
  onAddMember,
  onSubmit,
}) => {
  const [modalType, setModalType] = useState<'instant_checkin' | 'scheduled'>(initialType);
  const [selectedWsId, setSelectedWsId] = useState<string>(
    initialWorkstationId || workstations[0]?.id || ''
  );

  // Sorted members
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [members]);

  // Researcher selection
  const [selectedMemberName, setSelectedMemberName] = useState<string>(
    sortedMembers[0]?.name || ''
  );
  const [showAddNewMember, setShowAddNewMember] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<ResearcherRole>('Mestrado');

  // Instant Checkin presets
  const [instantDurationMinutes, setInstantDurationMinutes] = useState<number>(120);

  type PeriodPreset = 'morning' | 'afternoon' | 'evening' | 'night' | 'saturday' | 'sunday';
  const [activePeriodPreset, setActivePeriodPreset] = useState<PeriodPreset | null>(null);

  // Scheduled date/time states
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = initialDate || new Date();
    return d.toISOString().split('T')[0];
  });
  const [startTimeStr, setStartTimeStr] = useState<string>(() => {
    const h = initialHour !== undefined ? initialHour : new Date().getHours() + 1;
    const clampedH = Math.min(23, Math.max(0, h));
    return `${clampedH < 10 ? '0' : ''}${clampedH}:00`;
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    const d = initialDate || new Date();
    return d.toISOString().split('T')[0];
  });
  const [endTimeStr, setEndTimeStr] = useState<string>(() => {
    const h = (initialHour !== undefined ? initialHour : new Date().getHours() + 1) + 3;
    const clampedH = Math.min(23, Math.max(0, h));
    return `${clampedH < 10 ? '0' : ''}${clampedH}:00`;
  });

  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialWorkstationId) setSelectedWsId(initialWorkstationId);
    if (initialType) setModalType(initialType);
    if (initialDate) {
      const dStr = initialDate.toISOString().split('T')[0];
      setStartDateStr(dStr);
      setEndDateStr(dStr);
    }
    if (initialHour !== undefined) {
      const startH = Math.min(23, Math.max(0, initialHour));
      const endH = initialEndHour !== undefined
        ? Math.min(24, Math.max(startH + 1, initialEndHour))
        : Math.min(23, startH + 3);

      setStartTimeStr(`${startH < 10 ? '0' : ''}${startH}:00`);
      if (endH >= 24) {
        setEndTimeStr('23:59');
      } else {
        setEndTimeStr(`${endH < 10 ? '0' : ''}${endH}:00`);
      }
    }
    if (members.length > 0 && !selectedMemberName) {
      setSelectedMemberName(sortedMembers[0]?.name || members[0]?.name);
    }
  }, [initialWorkstationId, initialType, initialDate, initialHour, initialEndHour, isOpen, members, selectedMemberName, sortedMembers]);

  useEffect(() => {
    if (isOpen) setActivePeriodPreset(null);
  }, [isOpen]);

  // Quick period shortcuts for scheduled
  const applyPeriodPreset = (preset: PeriodPreset) => {
    const today = new Date(startDateStr);
    setActivePeriodPreset(preset);
    if (preset === 'morning') {
      setStartTimeStr('08:00');
      setEndTimeStr('12:00');
      setEndDateStr(startDateStr);
    } else if (preset === 'afternoon') {
      setStartTimeStr('13:00');
      setEndTimeStr('18:00');
      setEndDateStr(startDateStr);
    } else if (preset === 'evening') {
      setStartTimeStr('18:00');
      setEndTimeStr('23:00');
      setEndDateStr(startDateStr);
    } else if (preset === 'night') {
      setStartTimeStr('23:00');
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);
      setEndDateStr(nextDay.toISOString().split('T')[0]);
      setEndTimeStr('08:00');
    } else if (preset === 'saturday') {
      const sat = new Date();
      const day = sat.getDay();
      const diff = sat.getDate() + (6 - day + (day === 6 ? 0 : 7)) % 7;
      sat.setDate(diff);
      const satStr = sat.toISOString().split('T')[0];
      setStartDateStr(satStr);
      setEndDateStr(satStr);
      setStartTimeStr('08:00');
      setEndTimeStr('22:00');
    } else if (preset === 'sunday') {
      const sun = new Date();
      const day = sun.getDay();
      const diff = sun.getDate() + (7 - day) % 7;
      sun.setDate(diff);
      const sunStr = sun.toISOString().split('T')[0];
      setStartDateStr(sunStr);
      setEndDateStr(sunStr);
      setStartTimeStr('08:00');
      setEndTimeStr('22:00');
    }
  };

  const clearPeriodPreset = () => setActivePeriodPreset(null);

  const periodBtnClass = (preset: PeriodPreset) =>
    `px-2 py-1.5 text-[11px] font-medium rounded border transition-colors active:scale-[0.98] ${
      activePeriodPreset === preset
        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
    }`;

  // Compute final start and end ISO strings
  const computedStartIso = useMemo(() => {
    if (modalType === 'instant_checkin') {
      return new Date().toISOString();
    }
    return new Date(`${startDateStr}T${startTimeStr}:00`).toISOString();
  }, [modalType, startDateStr, startTimeStr]);

  const computedEndIso = useMemo(() => {
    if (modalType === 'instant_checkin') {
      const d = new Date();
      d.setMinutes(d.getMinutes() + instantDurationMinutes);
      return d.toISOString();
    }
    return new Date(`${endDateStr}T${endTimeStr}:00`).toISOString();
  }, [modalType, instantDurationMinutes, endDateStr, endTimeStr]);

  // Real-time validation
  const validation = useMemo(() => {
    if (!selectedWsId || !computedStartIso || !computedEndIso) {
      return {
        isValid: false,
        hardError: 'Preencha os campos de horário.',
        isNonFairUse: false,
        fairUseViolations: [],
      };
    }

    return validateReservation(
      {
        workstationId: selectedWsId,
        researcherName: selectedMemberName || 'Pesquisador',
        startTime: computedStartIso,
        endTime: computedEndIso,
      },
      reservations,
      rules
    );
  }, [selectedWsId, computedStartIso, computedEndIso, selectedMemberName, reservations, rules]);

  if (!isOpen) return null;

  const handleQuickAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: LabMember = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
    };
    onAddMember(newMember);
    setSelectedMemberName(newMember.name);
    setNewMemberName('');
    setShowAddNewMember(false);
  };

  // Submit is allowed if no hard time collision
  const canSubmit = validation.isValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!selectedMemberName.trim()) {
      alert('Por favor, selecione ou adicione um pesquisador.');
      return;
    }

    const currentMember = members.find((m) => m.name === selectedMemberName);
    const role = currentMember ? currentMember.role : 'Mestrado';

    onSubmit({
      workstationId: selectedWsId,
      researcherName: selectedMemberName.trim(),
      researcherRole: role,
      startTime: computedStartIso,
      endTime: computedEndIso,
      type: modalType,
      notes: notes.trim() || undefined,
      isNonFairUse: validation.isNonFairUse,
      nonFairUseThreshold: validation.isNonFairUse ? validation.thresholdIso : undefined,
      nonFairUseReasons: validation.isNonFairUse ? validation.fairUseViolations : undefined,
      checkedInAt: modalType === 'instant_checkin' ? new Date().toISOString() : undefined,
    });

    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {modalType === 'instant_checkin'
                ? 'Marcar Uso Agora (Check-in Imediato)'
                : 'Nova Reserva de Workstation'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Mode Selector */}
        <div className="px-4 sm:px-5 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setModalType('instant_checkin')}
              className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                modalType === 'instant_checkin'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>Usar Agora</span>
            </button>
            <button
              type="button"
              onClick={() => setModalType('scheduled')}
              className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                modalType === 'scheduled'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Agendar Futuro</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-5 py-3.5 space-y-3.5 text-xs overflow-y-auto flex-1">
          {/* Workstation Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Escolha a Baia
            </label>
            <div className="grid grid-cols-2 gap-2">
              {workstations.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => setSelectedWsId(ws.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all ${
                    selectedWsId === ws.id
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <WorkstationThumbnail workstation={ws} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      Baia {formatBayNumber(ws.bayNumber)}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{ws.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Researcher Picker from list OR Add New */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Pesquisador *
              </label>
              <button
                type="button"
                onClick={() => setShowAddNewMember(!showAddNewMember)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                <span>{showAddNewMember ? 'Escolher da Lista' : '+ Cadastrar Novo'}</span>
              </button>
            </div>

            {showAddNewMember ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do pesquisador"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as ResearcherRole)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddNewMember(false)}
                    className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddMember}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 rounded"
                  >
                    Salvar e Selecionar
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={selectedMemberName}
                onChange={(e) => setSelectedMemberName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-medium focus:border-blue-500 focus:outline-none"
                required
              >
                {sortedMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Time configuration */}
          {modalType === 'instant_checkin' ? (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">Duração Prevista</span>
                <span className="font-mono font-bold text-emerald-800">
                  {(instantDurationMinutes / 60).toFixed(1)} horas ({instantDurationMinutes} min)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '30 min', mins: 30 },
                  { label: '1 hora', mins: 60 },
                  { label: '2 horas', mins: 120 },
                  { label: '4 horas', mins: 240 },
                  { label: '8 horas', mins: 480 },
                  { label: '12 horas', mins: 720 },
                ].map((item) => (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => setInstantDurationMinutes(item.mins)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                      instantDurationMinutes === item.mins
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Atalhos de Turno
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('morning')}
                  className={periodBtnClass('morning')}
                  aria-pressed={activePeriodPreset === 'morning'}
                >
                  Manhã (08h-12h)
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('afternoon')}
                  className={periodBtnClass('afternoon')}
                  aria-pressed={activePeriodPreset === 'afternoon'}
                >
                  Tarde (13h-18h)
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('evening')}
                  className={periodBtnClass('evening')}
                  aria-pressed={activePeriodPreset === 'evening'}
                >
                  Noite (18h-23h)
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('night')}
                  className={periodBtnClass('night')}
                  aria-pressed={activePeriodPreset === 'night'}
                >
                  Madrugada
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('saturday')}
                  className={periodBtnClass('saturday')}
                  aria-pressed={activePeriodPreset === 'saturday'}
                >
                  Sábado
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('sunday')}
                  className={periodBtnClass('sunday')}
                  aria-pressed={activePeriodPreset === 'sunday'}
                >
                  Domingo
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => { clearPeriodPreset(); setStartDateStr(e.target.value); }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Hora Início
                  </label>
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => { clearPeriodPreset(); setStartTimeStr(e.target.value); }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={endDateStr}
                    onChange={(e) => { clearPeriodPreset(); setEndDateStr(e.target.value); }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Hora Fim
                  </label>
                  <input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => { clearPeriodPreset(); setEndTimeStr(e.target.value); }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validation & Fair-Use Override Flow */}
          <div>
            {validation.hardError ? (
              /* Hard conflict: overlapping booking */
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Horário Indisponível:</span>
                  <div>{validation.hardError}</div>
                </div>
              </div>
            ) : validation.isNonFairUse ? (
              /* Fair-Use policy exceeded: Automatically detects excess and informs researcher */
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">
                      Aviso de Uso Justo (Fair-Use):
                    </span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-slate-600">
                      {validation.fairUseViolations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[11px] text-slate-600">
                      A parte regular da reserva será exibida normalmente. A partir do momento em que ultrapassa as regras, o trecho excedente ficará marcado no calendário com o ícone <strong>(!)</strong> para que você possa combinar liberação no WhatsApp caso outro pesquisador precise.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Full compliance */
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Horário disponível e 100% em conformidade com o Fair-Use.</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick note input */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Observação (opcional)
            </label>
            <input
              type="text"
              placeholder="ex: rodando script longo, se alguém precisar avise no WhatsApp"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-4 py-2 text-xs font-semibold rounded transition-colors shadow-2xs ${
                canSubmit
                  ? validation.isNonFairUse
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {validation.isNonFairUse
                ? 'Confirmar (Fora do Fair-Use)'
                : modalType === 'instant_checkin'
                ? 'Iniciar Uso Agora'
                : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
