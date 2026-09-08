import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0c0c0e] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-950/40 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h3 className="text-base font-bold text-white tracking-tight">Purge All Save Data?</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          This will wipe all discovered auras, rolling analytics, coin balances, essence, and upgrades from your
          local browser storage. This action cannot be reversed.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            id="confirm-reset-progress-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            <span>PURGE DATA & RESET</span>
          </button>

          <button
            id="cancel-reset-progress-btn"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
