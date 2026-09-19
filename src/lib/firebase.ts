import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Request Google Sheets and Drive File capabilities
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Helper for Google Identity Services token acquisition fallback
const requestGisToken = (): Promise<{ user: User; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google-ի նույնականացման ծառայությունը դեռ չի բեռնվել։ Խնդրում ենք փորձել կրկին։'));
      return;
    }

    const clientId = (firebaseConfig as any).oAuthClientId || '854020054293-e5sd8vcb6ptagflaocebs0m447f0i2eo.apps.googleusercontent.com';

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        if (tokenResponse.access_token) {
          cachedAccessToken = tokenResponse.access_token;
          sessionStorage.setItem('delivery_tracker_google_access_token', cachedAccessToken);

          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${cachedAccessToken}` }
          })
            .then(res => res.json())
            .then(profile => {
              const userObj = {
                uid: profile.sub || 'google-user',
                displayName: profile.name || 'Google User',
                email: profile.email || 'user@google.com',
                photoURL: profile.picture || ''
              };
              resolve({ user: userObj as unknown as User, accessToken: cachedAccessToken! });
            })
            .catch(() => {
              const fallbackUser = {
                uid: 'google-user',
                displayName: 'Google User',
                email: 'user@google.com'
              };
              resolve({ user: fallbackUser as unknown as User, accessToken: cachedAccessToken! });
            });
        } else {
          reject(new Error('No access token received from Google Identity Services'));
        }
      },
      error_callback: (err: any) => {
        reject(err);
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = sessionStorage.getItem('delivery_tracker_google_access_token');
      }
      
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      const storedToken = sessionStorage.getItem('delivery_tracker_google_access_token');
      if (storedToken) {
        cachedAccessToken = storedToken;
        const mockUser = {
          uid: 'google-user',
          displayName: 'Google User',
          email: 'user@google.com'
        } as User;
        if (onAuthSuccess) onAuthSuccess(mockUser, storedToken);
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('delivery_tracker_google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain') || error?.code === 'auth/configuration-not-found') {
      console.warn('Firebase unauthorized domain error encountered. Switching to Google Identity Services popup...');
      return await requestGisToken();
    }

    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
      console.log('User closed Google sign in popup window');
    } else if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('Google sign in popup was blocked by browser');
    } else {
      console.error('Sign in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || sessionStorage.getItem('delivery_tracker_google_access_token');
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
  sessionStorage.removeItem('delivery_tracker_google_access_token');
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {
    // ignore
  }
  clearCachedToken();
};
