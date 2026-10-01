import React, { useState } from 'react';
import { FairUseRules } from '../types';
import { ShieldCheck, X, Settings2, Sliders, Check, Clock, CalendarRange, Hourglass, LogOut } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: FairUseRules;
  onUpdateRules: (newRules: FairUseRules) => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  onUpdateRules,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftRules, setDraftRules] = useState<FairUseRules>(rules);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRules(draftRules);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    const defaults: FairUseRules = {
      maxContinuousHoursWeekday: 12,
      maxContinuousHoursWeekend: 36,
      maxAdvanceDays: 14,
      maxWeeklyHoursPerUser: 28,
      maxActiveBookingsPerUser: 4,
      toleranceCheckInMinutes: 20,
    };
    setDraftRules(defaults);
    onUpdateRules(defaults);
    setIsEditing(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Regras do Laboratório (Uso Justo)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
            >
              {isEditing ? 'Voltar para Leitura' : 'Ajustar Parâmetros'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Regras do laboratório salvas com sucesso!</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-3.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Editar Limites de Alocação</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Restaurar Padrões
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Máx. Antecedência (Dias)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={draftRules.maxAdvanceDays}
                    onChange={(e) =>
                      setDraftRules({ ...draftRules, maxAdvanceDays: parseInt(e.target.value) || 14 })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Impede fechar 3 semanas</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Duração Contínua Dia Útil (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={draftRules.maxContinuousHoursWeekday}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxContinuousHoursWeekday: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Máx. consecutivo</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Duração Fim de Semana (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={draftRules.maxContinuousHoursWeekend}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxContinuousHoursWeekend: parseInt(e.target.value) || 36,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Sábado / Domingo</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Cota Semanal por Pessoa (h)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={draftRules.maxWeeklyHoursPerUser}
                    onChange={(e) =>
                      setDraftRules({
                        ...draftRules,
                        maxWeeklyHoursPerUser: parseInt(e.target.value) || 28,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Horas acumuladas/semana</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
                >
                  Salvar Limites
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <CalendarRange className="w-4 h-4 text-blue-700" />
                  <span>Trava Anti-Monopólio (Máx. {rules.maxAdvanceDays} Dias)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Não é permitido bloquear máquinas com mais de <strong>{rules.maxAdvanceDays} dias de antecedência</strong>. Isso impede que alguém feche três semanas seguidas todos os dias e garante rotatividade entre os pesquisadores.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <LogOut className="w-4 h-4 text-rose-700" />
                  <span>Pontualidade & Liberação Imediata</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Como um pesquisador pode sair logo e o próximo já precisa entrar, <strong>coloque exatamente o horário planejado</strong>. Se terminar o processamento antes, use o botão <strong>"Liberar Máquina Agora"</strong> para desocupar para os colegas.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Hourglass className="w-4 h-4 text-amber-700" />
                  <span>Duração Máxima Contínua</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Cada reserva pode ter no máximo <strong>{rules.maxContinuousHoursWeekday} horas seguidas</strong> em dias úteis ou <strong>{rules.maxContinuousHoursWeekend} horas</strong> em fins de semana.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
