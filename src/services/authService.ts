import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '@/Firebase/ifreConfig';
import { ref, set, get } from 'firebase/database';
import { database } from '@/Firebase/ifreConfig';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  persona?: 'athlete' | 'trainer';
  organization?: string;
  role?: string;
  createdAt?: string;
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  persona: 'athlete' | 'trainer',
  organization?: string,
  role?: string
): Promise<UserProfile> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName });

    // Send email verification
    await sendEmailVerification(user);

    // Create user profile in Realtime Database
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName,
      photoURL: user.photoURL,
      persona,
      organization: persona === 'trainer' ? organization : undefined,
      role: persona === 'trainer' ? role : undefined,
      createdAt: new Date().toISOString(),
    };

    // Save to Realtime Database
    await set(ref(database, `users/${user.uid}`), userProfile);

    // Store persona in localStorage
    localStorage.setItem('userPersona', persona);

    return userProfile;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create account');
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string,
  persona: 'athlete' | 'trainer'
): Promise<UserProfile> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from Realtime Database
    const userRef = ref(database, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    let userProfile: UserProfile;
    
    if (snapshot.exists()) {
      userProfile = snapshot.val();
    } else {
      // Create profile if it doesn't exist
      userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        persona,
        createdAt: new Date().toISOString(),
      };
      await set(ref(database, `users/${user.uid}`), userProfile);
    }

    // Update persona if different
    if (userProfile.persona !== persona) {
      userProfile.persona = persona;
      await set(ref(database, `users/${user.uid}/persona`), persona);
    }

    // Store persona in localStorage
    localStorage.setItem('userPersona', persona);

    return userProfile;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (
  persona: 'athlete' | 'trainer'
): Promise<UserProfile> => {
  try {
    console.log('Starting Google sign-in...');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log('Google sign-in successful:', user.email);

    // Get user profile from Realtime Database
    const userRef = ref(database, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    let userProfile: UserProfile;
    
    if (snapshot.exists()) {
      userProfile = snapshot.val();
      console.log('Existing profile found:', userProfile);
      // Update persona if different
      if (userProfile.persona !== persona) {
        userProfile.persona = persona;
        await set(ref(database, `users/${user.uid}/persona`), persona);
      }
      // Update display name and photo if available from Google
      if (user.displayName && userProfile.displayName !== user.displayName) {
        await set(ref(database, `users/${user.uid}/displayName`), user.displayName);
      }
      if (user.photoURL && userProfile.photoURL !== user.photoURL) {
        await set(ref(database, `users/${user.uid}/photoURL`), user.photoURL);
      }
    } else {
      // Create new profile
      console.log('Creating new profile for Google user');
      userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        persona,
        createdAt: new Date().toISOString(),
      };
      await set(ref(database, `users/${user.uid}`), userProfile);
      console.log('Profile created:', userProfile);
    }

    // Store persona in localStorage
    localStorage.setItem('userPersona', persona);

    return userProfile;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Handle specific Firebase errors
    let errorMessage = 'Failed to sign in with Google';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in popup was closed. Please try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Only one popup request is allowed at a time. Please try again.';
          break;
        case 'auth/unauthorized-domain':
          errorMessage = 'This domain is not authorized for Google sign-in. Please contact support.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google sign-in is not enabled. Please contact support.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message || `Google sign-in failed: ${error.code}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Sign out
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    localStorage.removeItem('user');
    localStorage.removeItem('userPersona');
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out');
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get user profile from database
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get user profile');
  }
};

/**
 * Update user profile in Firebase Auth and Realtime Database
 */
export const updateUserProfile = async (
  displayName?: string,
  photoURL?: string,
  organization?: string,
  role?: string
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Update Firebase Auth profile
    const updates: { displayName?: string; photoURL?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    
    if (Object.keys(updates).length > 0) {
      await updateProfile(user, updates);
    }

    // Update Realtime Database profile
    const profileUpdates: any = {};
    if (displayName !== undefined) profileUpdates.displayName = displayName;
    if (photoURL !== undefined) profileUpdates.photoURL = photoURL;
    if (organization !== undefined) profileUpdates.organization = organization;
    if (role !== undefined) profileUpdates.role = role;

    if (Object.keys(profileUpdates).length > 0) {
      const existingProfile = await getUserProfile(user.uid);
      await set(ref(database, `users/${user.uid}`), {
        ...(existingProfile || {}),
        ...profileUpdates,
        uid: user.uid,
        email: user.email,
      });
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update profile');
  }
};

/**
 * Update user email
 */
export const updateUserEmail = async (newEmail: string, password: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in');
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Update email
    await updateEmail(user, newEmail);

    // Update in Realtime Database
    await set(ref(database, `users/${user.uid}/email`), newEmail);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update email');
  }
};

/**
 * Change user password
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in');
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to change password');
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (password: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in');
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Delete from Realtime Database
    await set(ref(database, `users/${user.uid}`), null);

    // Delete user account
    await deleteUser(user);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete account');
  }
};

/**
 * Resend email verification
 */
export const resendEmailVerification = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    await sendEmailVerification(user);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send verification email');
  }
};

