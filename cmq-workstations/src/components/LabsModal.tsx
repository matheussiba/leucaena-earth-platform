import React, { useState } from 'react';
import {
  LabId,
  DEFAULT_LAB,
  UNALLOCATED_LAB,
  normalizeLab,
  labTagClass,
} from '../types';
import { Building2, Plus, Trash2, X } from 'lucide-react';

interface LabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  labs: LabId[];
  machineCounts: Record<string, number>;
  onAddLab: (lab: LabId) => void;
  onDeleteLab: (lab: LabId) => void;
}

export const LabsModal: React.FC<LabsModalProps> = ({
  isOpen,
  onClose,
  labs,
  machineCounts,
  onAddLab,
  onDeleteLab,
}) => {
  const [newLabName, setNewLabName] = useState('');

  if (!isOpen) return null;

  const managedLabs = labs.filter((l) => l !== UNALLOCATED_LAB);
  const unallocatedCount = machineCounts[UNALLOCATED_LAB] || 0;

  const handleAdd = () => {
    const next = (newLabName || '').trim();
    if (!next) return;
    if (next.toLowerCase() === UNALLOCATED_LAB.toLowerCase()) {
      alert(`“${UNALLOCATED_LAB}” é reservado pelo sistema.`);
      return;
    }
    const normalized = normalizeLab(next);
    if (managedLabs.some((l) => l.toLowerCase() === normalized.toLowerCase())) {
      alert(`Laboratório “${normalized}” já existe.`);
      return;
    }
    onAddLab(normalized);
    setNewLabName('');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Laboratórios</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Ao excluir um laboratório, as máquinas vão para{' '}
            <span className="font-semibold text-slate-800">{UNALLOCATED_LAB}</span>.
            Esse grupo só aparece no site enquanto tiver máquinas.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newLabName}
              onChange={(e) => setNewLabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="ex: CePE-Geo"
              className="flex-1 min-w-0 p-2 border border-slate-300 rounded-md bg-white text-xs font-medium"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>

          <div className="space-y-2">
            {managedLabs.map((lab) => {
              const count = machineCounts[lab] || 0;
              const canDelete = managedLabs.length > 1 || lab !== DEFAULT_LAB;
              return (
                <div
                  key={lab}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-white"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${labTagClass(lab)}`}
                    >
                      {lab}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {count} {count === 1 ? 'máquina' : 'máquinas'}
                    </span>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        const msg =
                          count > 0
                            ? `Excluir “${lab}”? ${count} máquina(s) vão para “${UNALLOCATED_LAB}”.`
                            : `Excluir laboratório “${lab}”?`;
                        if (confirm(msg)) onDeleteLab(lab);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Excluir laboratório"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 px-1">principal</span>
                  )}
                </div>
              );
            })}

            {unallocatedCount > 0 && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={`font-mono text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${labTagClass(UNALLOCATED_LAB)}`}
                  >
                    {UNALLOCATED_LAB}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {unallocatedCount}{' '}
                    {unallocatedCount === 1 ? 'máquina' : 'máquinas'} · fallback
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
