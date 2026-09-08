import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { GameState, PlayerProfile } from '../types';
import { INITIAL_GAME_STATE } from '../utils/storage';

export interface CloudSaveData {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  gameState: GameState;
  playerProfile: PlayerProfile;
  totalRolls: number;
  rebirthLevel: number;
  rolls: number;
  essence: number;
  lastSavedAt: number;
}

export type SyncStatus = 'synced' | 'saving' | 'error' | 'offline' | 'guest';

// In-memory cache of current user & sync status
let currentAuthUser: User | null = null;
let lastCloudSaveTime: number = 0;

export function getCurrentUser(): User | null {
  return currentAuthUser;
}

export function getLastCloudSaveTime(): number {
  return lastCloudSaveTime;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<{ user: User | null; error?: string }> {
  if (!auth) {
    return { user: null, error: 'Firebase Auth is not initialized.' };
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentAuthUser = result.user;
    return { user: result.user };
  } catch (err: any) {
    console.error('Sign in failed:', err);
    // Ignore user closed popup
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return { user: null, error: 'Sign in was cancelled.' };
    }
    return { user: null, error: err.message || 'Failed to sign in with Google.' };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  if (!auth) {
    return { success: true };
  }
  try {
    await signOut(auth);
    currentAuthUser = null;
    return { success: true };
  } catch (err: any) {
    console.error('Sign out failed:', err);
    return { success: false, error: err.message || 'Failed to sign out.' };
  }
}

/**
 * Subscribe to Firebase Auth state changes
 */
export function subscribeToAuth(
  onUserChanged: (user: User | null) => void
): () => void {
  if (!auth) {
    onUserChanged(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    currentAuthUser = user;
    onUserChanged(user);
  });
}

/**
 * Save game state and player profile directly to user's Cloud Save Slot
 */
export async function saveProgressToCloud(
  userId: string,
  gameState: GameState,
  playerProfile: PlayerProfile,
  user?: User | null
): Promise<{ success: boolean; error?: string }> {
  if (!db || !isFirebaseConfigured || !userId) {
    return { success: false, error: 'Cloud storage unavailable' };
  }

  try {
    const docRef = doc(db, 'user_progress', userId);
    const rolls = gameState.rolls ?? gameState.coins ?? 0;
    const now = Date.now();

    const payload: CloudSaveData = {
      userId,
      email: user?.email || null,
      displayName: user?.displayName || playerProfile.name,
      photoURL: user?.photoURL || null,
      gameState,
      playerProfile,
      totalRolls: gameState.totalRolls || 0,
      rebirthLevel: gameState.rebirthLevel || 0,
      rolls,
      essence: gameState.essence || 0,
      lastSavedAt: now,
    };

    await setDoc(docRef, payload, { merge: true });
    lastCloudSaveTime = now;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save progress to cloud:', err);
    return { success: false, error: err.message || 'Cloud save failed' };
  }
}

/**
 * Load user's cloud save data from Firestore
 */
export async function loadProgressFromCloud(
  userId: string
): Promise<{ data: CloudSaveData | null; error?: string }> {
  if (!db || !isFirebaseConfigured || !userId) {
    return { data: null, error: 'Database not configured' };
  }

  try {
    const docRef = doc(db, 'user_progress', userId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as CloudSaveData;
      return { data };
    }
    return { data: null };
  } catch (err: any) {
    console.error('Failed to load progress from cloud:', err);
    return { data: null, error: err.message || 'Failed to fetch cloud save' };
  }
}
