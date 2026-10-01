import React, { useState, useMemo } from 'react';
import { LabMember, ResearcherRole } from '../types';
import { Users, X, Plus, Trash2, UserPlus, Check, Pencil } from 'lucide-react';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: LabMember[];
  onAddMember: (member: LabMember) => void;
  onUpdateMember: (member: LabMember) => void;
  onDeleteMember: (id: string) => void;
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

export const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  onClose,
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<ResearcherRole>('Mestrado');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<ResearcherRole>('Mestrado');

  // Sorted members in alphabetical order
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [members]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddMember({
      id: `mem-${Date.now()}`,
      name: name.trim(),
      role,
    });

    setName('');
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const startEdit = (mem: LabMember) => {
    setEditingId(mem.id);
    setEditName(mem.name);
    setEditRole(mem.role);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateMember({
      id,
      name: editName.trim(),
      role: editRole,
    });
    setEditingId(null);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Pessoal do Laboratório</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Add form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Cadastrar Novo Pesquisador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Cargo / Função no Laboratório
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ResearcherRole)}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs focus:border-blue-500 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              {addedSuccess ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Adicionado com sucesso!
                </span>
              ) : <span />}

              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Membro</span>
              </button>
            </div>
          </form>

          {/* Members list (Sorted alphabetically) */}
          <div>
            <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Pesquisadores Cadastrados ({members.length}) — Ordem Alfabética</span>
              <span className="text-[11px] text-slate-400 font-normal">Aparecerão no menu ao agendar</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-64 overflow-y-auto bg-white">
              {sortedMembers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic">
                  Nenhum pesquisador cadastrado.
                </div>
              ) : (
                sortedMembers.map((mem) => {
                  const isEditing = editingId === mem.id;

                  if (isEditing) {
                    return (
                      <div
                        key={mem.id}
                        className="p-2.5 bg-blue-50/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="p-1.5 text-xs border border-blue-400 rounded bg-white font-medium focus:outline-none"
                            placeholder="Nome"
                            autoFocus
                          />
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as ResearcherRole)}
                            className="p-1.5 text-xs border border-blue-400 rounded bg-white focus:outline-none"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(mem.id)}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1 hover:bg-emerald-700"
                            title="Salvar alterações"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={mem.id}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {mem.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{mem.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{mem.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(mem)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Editar nome e cargo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMember(mem.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Excluir pesquisador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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
