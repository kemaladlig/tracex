import React, { useState, useRef } from 'react';
import {
  FolderKanban,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import type { PortfolioBackupData } from '../../types/crypto';

export const PortfolioGroupSwitcher: React.FC = () => {
  const portfolioGroups = useCryptoStore((state) => state.portfolioGroups);
  const activeGroupId = useCryptoStore((state) => state.activeGroupId);
  const switchPortfolioGroup = useCryptoStore((state) => state.switchPortfolioGroup);
  const createPortfolioGroup = useCryptoStore((state) => state.createPortfolioGroup);
  const renamePortfolioGroup = useCryptoStore((state) => state.renamePortfolioGroup);
  const deletePortfolioGroup = useCryptoStore((state) => state.deletePortfolioGroup);
  const exportBackupData = useCryptoStore((state) => state.exportBackupData);
  const importBackupData = useCryptoStore((state) => state.importBackupData);

  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGroup = portfolioGroups.find((g) => g.id === activeGroupId) || portfolioGroups[0];

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMessage({ text, isError });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createPortfolioGroup(newGroupName.trim());
    setNewGroupName('');
    setIsCreating(false);
    showFeedback('Yeni portföy grubu oluşturuldu.');
  };

  const handleStartRename = (group: { id: string; name: string }) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
  };

  const handleSaveRename = (groupId: string) => {
    if (editName.trim()) {
      renamePortfolioGroup(groupId, editName.trim());
      showFeedback('Grup adı güncellendi.');
    }
    setEditingGroupId(null);
    setEditName('');
  };

  const handleDelete = (groupId: string, name: string) => {
    if (portfolioGroups.length <= 1) {
      showFeedback('Tek kalan ana portföy grubu silinemez.', true);
      return;
    }
    if (window.confirm(`"${name}" portföy grubunu ve içindeki kayıtları silmek istediğinize emin misiniz?`)) {
      deletePortfolioGroup(groupId);
      showFeedback(`"${name}" grubu silindi.`);
    }
  };

  const handleExportJSON = () => {
    try {
      const data = exportBackupData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `tracex-portfolio-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showFeedback('Yedek JSON dosyası indirildi.');
    } catch {
      showFeedback('Yedek dışa aktarma hatası oluştu.', true);
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text) as PortfolioBackupData;
        const result = importBackupData(parsed);
        showFeedback(result.message, !result.success);
      } catch {
        showFeedback('Geçersiz JSON formatı. Lütfen TraceX yedeği seçin.', true);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-lg bg-stone-100/90 border-2 border-stone-900 p-2.5 mb-3 shadow-hard-sm font-mono">
      {/* Top Bar: Group Title & Backup/Restore Action Stamps */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-300">
        <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
          <FolderKanban className="w-3.5 h-3.5 stroke-2.5" />
          <span>PORTFÖY GRUPLARI</span>
          <span className="text-[10px] bg-amber-200 border border-stone-900 px-1 py-0.2 rounded-xs">
            {portfolioGroups.length}
          </span>
        </div>

        {/* JSON Backup / Restore Buttons */}
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={handleExportJSON}
            title="Tüm portföyü ve takip listesini JSON olarak indir"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-stone-900 bg-white hover:bg-stone-200 text-stone-900 text-[10px] font-bold shadow-hard-xs btn-hard cursor-pointer"
          >
            <Download className="w-3 h-3 stroke-2.5" />
            <span>YEDEK AL</span>
          </button>

          <button
            onClick={handleTriggerFileInput}
            title="Daha önce indirdiğiniz TraceX JSON yedeğini yükleyin"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-stone-900 bg-white hover:bg-stone-200 text-stone-900 text-[10px] font-bold shadow-hard-xs btn-hard cursor-pointer"
          >
            <Upload className="w-3 h-3 stroke-2.5" />
            <span>YÜKLE</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner if any */}
      {feedbackMessage && (
        <div
          className={`mb-2 px-2 py-1 rounded border text-[10px] font-black tracking-wide flex items-center gap-1.5 ${
            feedbackMessage.isError
              ? 'bg-rose-100 border-rose-900 text-rose-900'
              : 'bg-emerald-100 border-emerald-900 text-emerald-900'
          }`}
        >
          <FileSpreadsheet className="w-3 h-3" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Horizontal Group Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {portfolioGroups.map((group) => {
          const isActive = group.id === activeGroupId;
          const isEditing = editingGroupId === group.id;

          if (isEditing) {
            return (
              <div
                key={group.id}
                className="flex items-center gap-1 bg-amber-100 border-2 border-stone-900 px-2 py-1 rounded shadow-hard-xs shrink-0"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={18}
                  className="bg-white border border-stone-900 px-1 py-0.5 text-xs font-bold text-stone-900 rounded focus:outline-none w-24"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveRename(group.id)}
                  className="p-1 bg-emerald-300 border border-stone-900 rounded hover:bg-emerald-400 cursor-pointer"
                  title="Kaydet"
                >
                  <Check className="w-3 h-3 stroke-3" />
                </button>
                <button
                  onClick={() => setEditingGroupId(null)}
                  className="p-1 bg-stone-200 border border-stone-900 rounded hover:bg-stone-300 cursor-pointer"
                  title="Vazgeç"
                >
                  <X className="w-3 h-3 stroke-3" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={group.id}
              className={`group flex items-center rounded border-2 border-stone-900 text-xs font-black shrink-0 transition-all ${
                isActive
                  ? 'bg-stone-900 text-amber-300 shadow-hard-sm'
                  : 'bg-white text-stone-800 hover:bg-stone-50 shadow-hard-xs'
              }`}
            >
              <button
                onClick={() => switchPortfolioGroup(group.id)}
                className="px-2.5 py-1 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="truncate max-w-27.5">{group.name}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    isActive ? 'bg-amber-300 text-stone-900' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {group.assets.length}
                </span>
              </button>

              {/* Group Mini Actions (Rename & Delete) */}
              <div
                className={`flex items-center gap-0.5 pr-1.5 border-l ${
                  isActive ? 'border-stone-700' : 'border-stone-300'
                }`}
              >
                <button
                  onClick={() => handleStartRename(group)}
                  title="Grubu Yeniden Adlandır"
                  className={`p-0.5 rounded hover:opacity-100 cursor-pointer ${
                    isActive ? 'text-stone-300 hover:text-white' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Edit2 className="w-2.5 h-2.5 stroke-2.5" />
                </button>
                {portfolioGroups.length > 1 && (
                  <button
                    onClick={() => handleDelete(group.id, group.name)}
                    title="Grubu Sil"
                    className={`p-0.5 rounded hover:opacity-100 cursor-pointer ${
                      isActive ? 'text-rose-400 hover:text-rose-300' : 'text-stone-400 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="w-2.5 h-2.5 stroke-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add New Group Button or Inline Input */}
        {isCreating ? (
          <form
            onSubmit={handleCreateSubmit}
            className="flex items-center gap-1 bg-amber-100 border-2 border-stone-900 px-2 py-1 rounded shadow-hard-xs shrink-0"
          >
            <input
              type="text"
              placeholder="Grup Adı..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              maxLength={18}
              className="bg-white border border-stone-900 px-1.5 py-0.5 text-xs font-bold text-stone-900 rounded focus:outline-none w-24"
              autoFocus
            />
            <button
              type="submit"
              className="p-1 bg-amber-300 border border-stone-900 rounded hover:bg-amber-400 cursor-pointer"
              title="Ekle"
            >
              <Check className="w-3 h-3 stroke-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewGroupName('');
              }}
              className="p-1 bg-stone-200 border border-stone-900 rounded hover:bg-stone-300 cursor-pointer"
              title="İptal"
            >
              <X className="w-3 h-3 stroke-3" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2 py-1 rounded border-2 border-stone-900 bg-amber-200 hover:bg-amber-300 text-stone-900 text-xs font-black shadow-hard-xs btn-hard cursor-pointer shrink-0"
            title="Yeni Portföy Grubu Ekle"
          >
            <Plus className="w-3 h-3 stroke-3" />
            <span className="text-[10px]">YENİ GRUP</span>
          </button>
        )}
      </div>

      {/* Active Group Context Caption */}
      <div className="flex items-center justify-between text-[9px] text-stone-600 font-bold mt-1.5 pt-1 border-t border-stone-200">
        <span>
          Aktif Kasa: <strong className="text-stone-900 uppercase">[{activeGroup?.name}]</strong>
        </span>
        <span>{activeGroup?.assets.length || 0} Pozisyon Kayıtlı</span>
      </div>
    </div>
  );
};
