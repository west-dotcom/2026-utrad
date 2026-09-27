import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Workspace scopes for Sheets & Drive File access
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory cache for the OAuth access token (per security requirements)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes the auth state listener on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If token isn't cached yet, prompt user or keep clean
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Signs in using Firebase Auth Google popup and captures the OAuth access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token with Google Sheets permissions.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns currently cached access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Convenience wrapper for Google Sign In popup
 */
export const signInWithGooglePopup = async (): Promise<{ user: User; token: string }> => {
  const res = await googleSignIn();
  if (!res) throw new Error('Sign in was cancelled or failed.');
  return { user: res.user, token: res.accessToken };
};

export const initGoogleAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

/**
 * Logs out and clears token from memory
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const signOutGoogle = logout;
