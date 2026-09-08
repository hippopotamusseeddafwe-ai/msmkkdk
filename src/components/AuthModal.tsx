import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOutUser,
  saveProgressToCloud,
  loadProgressFromCloud,
  SyncStatus,
} from '../services/authService';
import { GameState, PlayerProfile } from '../types';
import { formatBigNumber } from '../utils/rngEngine';
import { sound } from '../utils/audio';
import {
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  User as UserIcon,
  Shield,
  Sparkles,
  Award,
  Crown,
  Coins,
  Dices,
  Flame,
} from 'lucide-react';

interface AuthModalProps {
  user: User | null;
  gameState: GameState;
  playerProfile: PlayerProfile;
  syncStatus: SyncStatus;
  lastSavedAt: number;
  onClose: () => void;
  onRestoreState: (state: GameState, profile?: PlayerProfile) => void;
  onManualSync: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  gameState,
  playerProfile,
  syncStatus,
  lastSavedAt,
  onClose,
  onRestoreState,
  onManualSync,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sound.playButtonClick();

    const result = await signInWithGoogle();
    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
      return;
    }

    if (result.user) {
      sound.playTradeSuccess();
      // Check if remote save exists
      const cloudData = await loadProgressFromCloud(result.user.uid);
      if (cloudData.data && cloudData.data.gameState) {
        // If remote save has more rolls, offer restore or auto restore
        const remoteRolls = cloudData.data.gameState.totalRolls || 0;
        const localRolls = gameState.totalRolls || 0;
        if (remoteRolls > localRolls) {
          onRestoreState(cloudData.data.gameState, cloudData.data.playerProfile);
          setSuccessMessage(`Welcome back, ${result.user.displayName || 'Player'}! Restored your cloud save (${remoteRolls.toLocaleString()} rolls).`);
        } else {
          // Save local higher progress to cloud
          await saveProgressToCloud(result.user.uid, gameState, playerProfile, result.user);
          setSuccessMessage(`Signed in as ${result.user.displayName || 'Player'}! Your progress is now synced to the cloud.`);
        }
      } else {
        // Save initial progress
        await saveProgressToCloud(result.user.uid, gameState, playerProfile, result.user);
        setSuccessMessage(`Account created! Progress is backed up to the cloud.`);
      }
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    sound.playButtonClick();
    const result = await signOutUser();
    if (result.success) {
      setSuccessMessage('Signed out successfully. Playing in Guest / Local mode.');
    } else {
      setErrorMessage(result.error || 'Failed to sign out');
    }
    setIsLoading(false);
  };

  const handleSyncNow = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sound.playButtonClick();
    try {
      await onManualSync();
      setSuccessMessage('Progress successfully saved to the Cloud!');
      sound.playUpgrade();
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cloudData = await loadProgressFromCloud(user.uid);
      if (cloudData.data && cloudData.data.gameState) {
        onRestoreState(cloudData.data.gameState, cloudData.data.playerProfile);
        setSuccessMessage('Successfully loaded and restored your save from the cloud!');
        sound.playAchievement();
      } else {
        setErrorMessage('No cloud save found for this account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore');
    } finally {
      setIsLoading(false);
    }
  };

  const rolls = gameState.rolls ?? gameState.coins ?? 0;
  const inventoryCount = Object.keys(gameState.inventory).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-md bg-black/70 overflow-y-auto">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-[#0e0e16]/95 shadow-2xl backdrop-blur-2xl text-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Account & Cloud Save</h2>
              <p className="text-xs text-white/50">Save and synchronize your RNG Omni progress across devices</p>
            </div>
          </div>
          <button
            id="auth-modal-close-btn"
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Status Message Alerts */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* User Account Card */}
          {user ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Player'}
                      className="h-12 w-12 rounded-full border border-cyan-400/50 object-cover shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-900/60 text-cyan-200">
                      <UserIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{user.displayName || 'Logged In Player'}</span>
                      <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                        CLOUD SYNCED
                      </span>
                    </div>
                    <p className="text-xs text-white/50">{user.email || 'Google Account Connected'}</p>
                  </div>
                </div>

                <button
                  id="auth-signout-btn"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition active:scale-95 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>

              {/* Save info info row */}
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/60">
                <span>Last Cloud Save:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {lastSavedAt > 0 ? new Date(lastSavedAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 text-cyan-300">
                <CloudOff className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Playing as Guest</h3>
                <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                  Sign in with your Google account to automatically save your auras, rebirths, and rolls money to the cloud!
                </p>
              </div>

              <button
                id="auth-google-signin-btn"
                onClick={handleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-600/30 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>{isLoading ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>
            </div>
          )}

          {/* Current Local Progress Preview */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Current Game Progress
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="flex flex-col rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <Dices className="h-3 w-3 text-purple-400" /> Total Rolls
                </span>
                <span className="font-mono text-sm font-black text-white">{gameState.totalRolls.toLocaleString()}</span>
              </div>
              <div className="flex flex-col rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-400" /> Rebirth
                </span>
                <span className="font-mono text-sm font-black text-amber-300">Lv. {gameState.rebirthLevel || 0}</span>
              </div>
              <div className="flex flex-col rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <Coins className="h-3 w-3 text-cyan-400" /> Rolls Money
                </span>
                <span className="font-mono text-sm font-black text-cyan-200">{formatBigNumber(rolls)}</span>
              </div>
              <div className="flex flex-col rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-pink-400" /> Unique Auras
                </span>
                <span className="font-mono text-sm font-black text-pink-200">{inventoryCount}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {user && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="auth-manual-sync-btn"
                onClick={handleSyncNow}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Save Progress to Cloud</span>
              </button>

              <button
                id="auth-cloud-restore-btn"
                onClick={handleRestoreFromCloud}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white active:scale-95 transition disabled:opacity-50"
              >
                <Cloud className="h-4 w-4 text-cyan-400" />
                <span>Restore from Cloud</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
