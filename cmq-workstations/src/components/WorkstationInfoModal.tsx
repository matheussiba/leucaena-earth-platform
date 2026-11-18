import React, { useState } from 'react';
import { Workstation, normalizeLab, labTagClass } from '../types';
import { formatBayLabel } from '../utils/dateUtils';
import { formatStorageFreeLabel, formatStorageTotalLabel } from '../api';
import type { StorageReport } from '../types';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { Copy, Check, X, Server } from 'lucide-react';

interface WorkstationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  workstation: Workstation | null;
  storage?: StorageReport | null;
}

function CopyRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const text = (value || '').trim();
  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-xs sm:text-sm text-slate-900 font-medium break-all mt-0.5">
          {text}
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        title="Copiar"
        className="shrink-0 p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

export const WorkstationInfoModal: React.FC<WorkstationInfoModalProps> = ({
  isOpen,
  onClose,
  workstation,
  storage,
}) => {
  if (!isOpen || !workstation) return null;

  const lab = normalizeLab(workstation.lab);
  const storageFree = formatStorageFreeLabel(storage);
  const storageTotal = formatStorageTotalLabel(storage);

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base min-w-0">
            <Server className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="truncate">Informações da máquina</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <WorkstationThumbnail workstation={workstation} size="lg" showBadge />
            <div className="min-w-0">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wide ${labTagClass(lab)}`}
              >
                {lab}
              </span>
              <div className="font-mono text-sm font-bold text-slate-600 mt-1">
                {formatBayLabel(workstation.bayNumber)}
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {workstation.name}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3">
            <CopyRow label="ID" value={workstation.id} />
            <CopyRow label="Laboratório" value={lab} />
            <CopyRow label="Baia / Código" value={formatBayLabel(workstation.bayNumber)} />
            <CopyRow label="Nome" value={workstation.name} />
            <CopyRow label="IP" value={workstation.ip} />
            <CopyRow label="GPU" value={workstation.gpu} />
            <CopyRow label="CPU" value={workstation.cpu} />
            <CopyRow label="RAM" value={workstation.ram} />
            <CopyRow label="HD / Storage" value={workstation.internalStorage} />
            <CopyRow label="Sistema" value={workstation.os} />
            <CopyRow label="Localização" value={workstation.location} />
            <CopyRow label="Notas" value={workstation.notes} />
            {storageTotal && (
              <CopyRow label="Disco total (último reporte)" value={storageTotal} />
            )}
            {storageFree && (
              <CopyRow label="Disco livre (último reporte)" value={`${storageFree} livres`} />
            )}
            {storage?.collectedAt && (
              <CopyRow
                label="Storage coletado em"
                value={new Date(storage.collectedAt).toLocaleString('pt-BR')}
              />
            )}
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            Somente leitura — use o ícone de copiar ao lado de cada campo. Para editar, abra
            Gerenciar Baias na barra superior.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
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
