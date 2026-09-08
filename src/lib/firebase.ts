import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Use specified database ID if available
  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
  firebaseAuth = app ? getAuth(app) : null;
} catch (err) {
  console.warn('Firebase initialization notice (offline mode available):', err);
}

export const db = firestoreDb;
export const auth = firebaseAuth;
export const googleProvider = new GoogleAuthProvider();
export const isFirebaseConfigured = Boolean(firestoreDb);

