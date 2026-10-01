import React, { useState, useRef } from 'react';
import { Workstation } from '../types';
import { WorkstationThumbnail } from './WorkstationThumbnail';
import { formatBayNumber } from '../utils/dateUtils';
import { 
  Server, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Camera, 
  Upload, 
  Image as ImageIcon,
  Check
} from 'lucide-react';

interface WorkstationsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workstations: Workstation[];
  onSaveWorkstation: (ws: Workstation) => void;
  onDeleteWorkstation: (id: string) => void;
  initialEditWsId?: string;
}

export const WorkstationsManagerModal: React.FC<WorkstationsManagerModalProps> = ({
  isOpen,
  onClose,
  workstations,
  onSaveWorkstation,
  onDeleteWorkstation,
  initialEditWsId,
}) => {
  const [editingWs, setEditingWs] = useState<Workstation | null>(() => {
    if (initialEditWsId) {
      return workstations.find((w) => w.id === initialEditWsId) || null;
    }
    return null;
  });
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form states
  const [bayNumber, setBayNumber] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [ip, setIp] = useState<string>('');
  const [gpu, setGpu] = useState<string>('');
  const [cpu, setCpu] = useState<string>('');
  const [ram, setRam] = useState<string>('');
  const [internalStorage, setInternalStorage] = useState<string>('');
  const [additionalStorage, setAdditionalStorage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const startEdit = (ws: Workstation) => {
    setEditingWs(ws);
    setIsCreatingNew(false);
    setBayNumber(String(ws.bayNumber));
    setName(ws.name);
    setLocation(ws.location || '');
    setImageUrl(ws.imageUrl || '');
    setIp(ws.ip || '');
    setGpu(ws.gpu);
    setCpu(ws.cpu);
    setRam(ws.ram);
    setInternalStorage(ws.internalStorage || '');
    setAdditionalStorage(ws.additionalStorage || '');
  };

  const startCreate = () => {
    const nextBay =
      workstations.length > 0
        ? Math.max(...workstations.map((w) => Number(w.bayNumber) || 0)) + 1
        : 1;
    setEditingWs(null);
    setIsCreatingNew(true);
    setBayNumber(String(nextBay));
    setName(`Workstation Baia ${nextBay}`);
    setLocation(`Baia ${nextBay} - Laboratório CMQ`);
    setImageUrl('');
    setIp('');
    setGpu('1x NVIDIA RTX 4090 24GB');
    setCpu('AMD Ryzen 9 7950X');
    setRam('64 GB DDR5');
    setInternalStorage('2 TB NVMe SSD');
    setAdditionalStorage('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bayNumber.trim() || !name.trim()) return;

    const bayNumParsed = parseInt(bayNumber, 10);
    const updatedWs: Workstation = {
      id: editingWs
        ? editingWs.id
        : `ws-baia-${bayNumber}-${Date.now().toString().slice(-4)}`,
      bayNumber: isNaN(bayNumParsed) ? bayNumber : bayNumParsed,
      name: name.trim(),
      location: location.trim(),
      imageUrl: imageUrl.trim() || undefined,
      ip: ip.trim() || undefined,
      gpu: gpu.trim(),
      cpu: cpu.trim(),
      ram: ram.trim(),
      internalStorage: internalStorage.trim(),
      additionalStorage: additionalStorage.trim() || undefined,
      status: editingWs ? editingWs.status : 'available',
      isCustom: true,
    };

    onSaveWorkstation(updatedWs);
    setEditingWs(null);
    setIsCreatingNew(false);
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
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Server className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Gerenciar Baias & Características</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5 text-xs overflow-y-auto flex-1">
          {/* Workstations List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-bold text-slate-800 text-xs">
                Workstations Cadastradas ({workstations.length})
              </span>
              <button
                type="button"
                onClick={startCreate}
                className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Baia</span>
              </button>
            </div>

            <div className="space-y-2">
              {workstations.map((ws) => (
                <div
                  key={ws.id}
                  className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    editingWs?.id === ws.id
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-400/40'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <WorkstationThumbnail
                      workstation={ws}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          BAIA {formatBayNumber(ws.bayNumber)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {ws.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        {ws.ip && (
                          <>
                            <span className="font-mono font-semibold text-slate-800">IP {ws.ip}</span>
                            <span>·</span>
                          </>
                        )}
                        <span className="font-semibold text-slate-800">{ws.gpu}</span>
                        <span>·</span>
                        <span>RAM: {ws.ram}</span>
                        <span>·</span>
                        <span>HD: {ws.internalStorage}</span>
                        {ws.additionalStorage && (
                          <>
                            <span>·</span>
                            <span>Ext: {ws.additionalStorage}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => startEdit(ws)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                      <span>Editar / Trocar Foto</span>
                    </button>
                    {workstations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir ${ws.name} (Baia ${ws.bayNumber})?`)) {
                            onDeleteWorkstation(ws.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Excluir workstation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit / Create Form */}
          {(editingWs || isCreatingNew) && (
            <form
              onSubmit={handleSaveForm}
              className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  <span>
                    {isCreatingNew
                      ? 'Cadastrar Nova Baia'
                      : `Editar Baia ${editingWs?.bayNumber} (${editingWs?.name})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWs(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bay Number, Name & IP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Número da Baia *
                  </label>
                  <input
                    type="number"
                    value={bayNumber}
                    onChange={(e) => setBayNumber(e.target.value)}
                    placeholder="ex: 4, 7, 11"
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nome de Identificação *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Workstation Alpha"
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    IP da Máquina
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="ex: 143.107.215.230"
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Dedicated Easy Photo Management */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
                <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fotinha / Imagem da Baia</span>
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Photo Preview */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 text-center px-1">
                        Avatar Padrão
                      </span>
                    )}
                  </div>

                  {/* Upload and presets */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Foto (Celular / PC)</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] underline"
                        >
                          Limpar foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Specs: GPU, CPU, RAM, HD Interno, HD Adicional */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Placa de Vídeo (GPU) *
                  </label>
                  <input
                    type="text"
                    value={gpu}
                    onChange={(e) => setGpu(e.target.value)}
                    placeholder="ex: 2x NVIDIA RTX 4090 24GB"
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Processador (CPU) *
                    </label>
                    <input
                      type="text"
                      value={cpu}
                      onChange={(e) => setCpu(e.target.value)}
                      placeholder="ex: AMD Ryzen Threadripper 32c"
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Memória RAM *
                    </label>
                    <input
                      type="text"
                      value={ram}
                      onChange={(e) => setRam(e.target.value)}
                      placeholder="ex: 128 GB DDR5 ECC"
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      HD Interno (Principal) *
                    </label>
                    <input
                      type="text"
                      value={internalStorage}
                      onChange={(e) => setInternalStorage(e.target.value)}
                      placeholder="ex: 4 TB NVMe Gen4"
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      HD Adicional (se existir)
                    </label>
                    <input
                      type="text"
                      value={additionalStorage}
                      onChange={(e) => setAdditionalStorage(e.target.value)}
                      placeholder="ex: 16 TB HDD RAID (opcional)"
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Localização Física / Observações
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ex: Baia 04 - Laboratório CMQ"
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                  />
                </div>
              </div>

              {/* Form Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingWs(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-2xs"
                >
                  {isCreatingNew ? 'Salvar Nova Baia' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}
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
